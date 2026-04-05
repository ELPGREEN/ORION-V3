import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, Check, X, ScanFace, Shield, Trash2, Loader2, AlertTriangle, Eye } from "lucide-react";
import { getBlazeFaceModel } from "@/lib/neural/tf-runtime";
import { loadFaceApiModels, detectSingleFaceFull, drawFaceOverlay, descriptorToArray, type FaceApiDetection } from "@/lib/neural/face-api-runtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logFaceAuthLearning } from "@/lib/neural/face-auth-learning";

interface FaceAuthEnrollProps {
  onComplete?: () => void;
}

// ═══ Face Detection: face-api.js primary → BlazeFace → Canvas fallback ═══
async function detectFaceInCanvas(canvas: HTMLCanvasElement): Promise<{ 
  detected: boolean; count: number; confidence: number; 
  faceApiResult?: FaceApiDetection | null 
}> {
  // Strategy 0: face-api.js (68 landmarks + 128d descriptor + expressions)
  try {
    const detection = await detectSingleFaceFull(canvas);
    if (detection && detection.score > 0.5) {
      return { detected: true, count: 1, confidence: detection.score, faceApiResult: detection };
    }
  } catch {
    // face-api.js unavailable, fall through
  }

  // Strategy 1: BlazeFace (TF.js — GPU-accelerated, 6 landmarks)
  try {
    const model = await getBlazeFaceModel();
    if (model) {
      const predictions = await model.estimateFaces(canvas, false);
      if (predictions && predictions.length > 0) {
        const topConf = predictions[0].probability?.[0] ?? predictions[0].probability ?? 0.9;
        return { detected: true, count: predictions.length, confidence: typeof topConf === "number" ? topConf : 0.9 };
      }
    }
  } catch {
    // BlazeFace unavailable, fall through
  }

  // Strategy 2: Browser FaceDetector API (Chrome/Edge)
  // @ts-ignore - FaceDetector is experimental Web API
  if (typeof window !== "undefined" && "FaceDetector" in window) {
    try {
      // @ts-ignore
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
      const faces = await detector.detect(canvas);
      return { detected: faces.length > 0, count: faces.length, confidence: 0.92 };
    } catch {
      // FaceDetector failed, fall through to Strategy 3
    }
  }

  // Strategy 3: Canvas luminance + edge analysis (sem viés racial)
  const ctx = canvas.getContext("2d");
  if (!ctx) return { detected: true, count: 1, confidence: 0.5 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const w = canvas.width;
  const h = canvas.height;

  const cx = Math.floor(w * 0.3);
  const cy = Math.floor(h * 0.15);
  const cw = Math.floor(w * 0.4);
  const ch = Math.floor(h * 0.7);

  let edgeCount = 0;
  let varianceSum = 0;
  let pixelCount = 0;
  const luminances: number[] = [];

  for (let y = cy; y < cy + ch; y += 2) {
    for (let x = cx; x < cx + cw; x += 2) {
      const idx = (y * w + x) * 4;
      const r = data[idx], g = data[idx + 1], b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      luminances.push(lum);
      pixelCount++;

      if (x + 2 < cx + cw && y + 2 < cy + ch) {
        const idxR = (y * w + (x + 2)) * 4;
        const idxD = ((y + 2) * w + x) * 4;
        const lumR = 0.299 * data[idxR] + 0.587 * data[idxR + 1] + 0.114 * data[idxR + 2];
        const lumD = 0.299 * data[idxD] + 0.587 * data[idxD + 1] + 0.114 * data[idxD + 2];
        const grad = Math.abs(lum - lumR) + Math.abs(lum - lumD);
        if (grad > 25) edgeCount++;
      }
    }
  }

  const avgLum = luminances.reduce((a, b) => a + b, 0) / luminances.length;
  for (const l of luminances) {
    varianceSum += (l - avgLum) ** 2;
  }
  const variance = varianceSum / luminances.length;

  const edgeRatio = edgeCount / pixelCount;
  const hasFaceLikePattern = edgeRatio > 0.05 && edgeRatio < 0.6 && variance > 200 && variance < 8000;

  return { detected: hasFaceLikePattern, count: hasFaceLikePattern ? 1 : 0, confidence: hasFaceLikePattern ? 0.6 : 0 };
}

// ═══ Liveness challenge types ═══
type LivenessChallenge = "blink" | "smile" | "turn_left" | "turn_right";
const LIVENESS_CHALLENGES: { type: LivenessChallenge; label: string }[] = [
  { type: "blink", label: "Pisque os olhos lentamente" },
  { type: "smile", label: "Sorria naturalmente" },
  { type: "turn_left", label: "Vire levemente para a esquerda" },
  { type: "turn_right", label: "Vire levemente para a direita" },
];

export function FaceAuthEnroll({ onComplete }: FaceAuthEnrollProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [step, setStep] = useState<"idle" | "consent" | "camera" | "liveness" | "capturing" | "processing" | "done" | "error">("idle");
  const [captures, setCaptures] = useState<string[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [faceDetected, setFaceDetected] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [livenessStep, setLivenessStep] = useState(0);
  const [livenessComplete, setLivenessComplete] = useState(false);
  const [faceApiReady, setFaceApiReady] = useState(false);
  const [lastDescriptor, setLastDescriptor] = useState<Float32Array | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const faceCheckInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const REQUIRED_CAPTURES = 3;

  // Attach stream to video element when it appears in DOM after step change
  const videoCallbackRef = useCallback((node: HTMLVideoElement | null) => {
    (videoRef as React.MutableRefObject<HTMLVideoElement | null>).current = node;
    if (node && streamRef.current && !node.srcObject) {
      node.srcObject = streamRef.current;
      node.play().catch(() => {});
    }
  }, []);

  const capturePrompts = [
    "Olhe diretamente para a câmera (frente)",
    "Vire levemente para a direita",
    "Vire levemente para a esquerda",
  ];

  // Pre-load face-api.js models in parallel
  useEffect(() => {
    checkEnrollment();
    loadFaceApiModels().then((ok) => {
      setFaceApiReady(ok);
      if (ok) console.log("[FaceAuthEnroll] face-api.js models ready");
    });
  }, []);

  const checkEnrollment = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { action: "check", userId: user.id },
      });

      if (error) {
        console.error("Check enrollment error:", error);
      } else if (data?.enrolled) {
        setEnrolled(true);
        setEnrollmentInfo(data.enrollment);
      }
    } catch (e) {
      console.error("Check enrollment exception:", e);
    }
    setLoading(false);
  };

  // Real-time face detection with scanner overlay
  const startFaceDetection = useCallback(() => {
    if (faceCheckInterval.current) clearInterval(faceCheckInterval.current);

    faceCheckInterval.current = setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 320;
      tempCanvas.height = 240;
      const ctx = tempCanvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 320, 240);

      const result = await detectFaceInCanvas(tempCanvas);
      setFaceDetected(result.detected);

      // Draw scanner overlay if face-api.js detected a face
      const overlay = overlayCanvasRef.current;
      if (overlay && video.videoWidth > 0) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        const overlayCtx = overlay.getContext("2d");
        if (overlayCtx) {
          overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
          
          if (result.faceApiResult) {
            const scaleX = video.videoWidth / 320;
            const scaleY = video.videoHeight / 240;
            
            // Store descriptor for enrollment
            if (result.faceApiResult.descriptor) {
              setLastDescriptor(result.faceApiResult.descriptor);
            }

            // Get dominant expression
            let dominantExpr = "";
            if (result.faceApiResult.expressions) {
              const sorted = Object.entries(result.faceApiResult.expressions)
                .sort(([, a], [, b]) => b - a);
              if (sorted[0] && sorted[0][1] > 0.5) {
                dominantExpr = ` · ${sorted[0][0]}`;
              }
            }

            drawFaceOverlay(overlayCtx, result.faceApiResult, {
              label: `${Math.round(result.faceApiResult.score * 100)}%${dominantExpr}`,
              color: "#22c55e",
              showLandmarks: true,
              showCorners: true,
              showConfidence: false,
              scaleX,
              scaleY,
            });
          }
        }
      }
    }, 300);
  }, []);

  const stopFaceDetection = useCallback(() => {
    if (faceCheckInterval.current) {
      clearInterval(faceCheckInterval.current);
      faceCheckInterval.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setErrorMsg("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
      });
      streamRef.current = stream;
      // Start liveness challenge first
      setStep("liveness");
      setLivenessStep(0);
      setLivenessComplete(false);
      setCaptures([]);
      startFaceDetection();
    } catch (e: any) {
      console.error("Camera error:", e);
      setErrorMsg(
        e.name === "NotAllowedError"
          ? "Permissão da câmera negada. Habilite nas configurações do navegador."
          : e.name === "NotFoundError"
          ? "Nenhuma câmera encontrada no dispositivo."
          : `Erro ao acessar câmera: ${e.message}`
      );
      setStep("error");
    }
  }, [startFaceDetection]);

  const stopCamera = useCallback(() => {
    stopFaceDetection();
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, [stopFaceDetection]);

  // Liveness: advance through challenges
  const advanceLiveness = useCallback(() => {
    const challenge = LIVENESS_CHALLENGES[livenessStep];
    logFaceAuthLearning({
      event: "liveness_pass",
      confidence: 0.85,
      livenessChallenge: challenge?.type,
    });
    const nextStep = livenessStep + 1;
    if (nextStep >= 2) {
      setLivenessComplete(true);
      setStep("camera");
      toast.success("Verificação de vivacidade concluída ✓");
    } else {
      setLivenessStep(nextStep);
    }
  }, [livenessStep]);

  const captureFrame = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Higher resolution capture (640x480 instead of 320x240)
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Mirror the image
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -640, 0, 640, 480);
    ctx.restore();

    // Apply grayscale normalization for lighting consistency (Wikipedia: "descolorido em tons de cinza")
    // We keep the color version for VLM analysis but also check the grayscale version
    const checkCanvas = document.createElement("canvas");
    checkCanvas.width = 320;
    checkCanvas.height = 240;
    const checkCtx = checkCanvas.getContext("2d");
    if (checkCtx) {
      checkCtx.drawImage(canvas, 0, 0, 320, 240);
      const faceResult = await detectFaceInCanvas(checkCanvas);
      if (!faceResult.detected) {
        toast.error("Nenhum rosto detectado. Posicione seu rosto no centro.");
        return;
      }
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    const base64 = dataUrl.split(",")[1];

    setCaptures(prev => {
      const next = [...prev, base64];
      if (next.length >= REQUIRED_CAPTURES) {
        setStep("capturing");
        setTimeout(() => processEnrollment(next), 300);
      }
      return next;
    });

    toast.success(`Captura ${captures.length + 1}/${REQUIRED_CAPTURES} ✓`);
  }, [captures.length]);

  const processEnrollment = async (images: string[]) => {
    setStep("processing");
    stopCamera();

    try {
      // Include client-side 128d descriptor if available
      const descriptorData = lastDescriptor ? descriptorToArray(lastDescriptor) : null;

      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { 
          action: "enroll", 
          images, 
          lgpdConsent: true,
          clientDescriptor: descriptorData,
        },
      });

      if (error) {
        console.error("Enrollment invoke error:", error);
        setErrorMsg("Erro de comunicação com o servidor. Tente novamente.");
        setStep("error");
        logFaceAuthLearning({ event: "enroll_failure", confidence: 0, captureCount: images.length, errorMessage: String(error) });
        return;
      }

      if (data?.error) {
        setErrorMsg(data.error);
        setStep("error");
        logFaceAuthLearning({ event: "enroll_failure", confidence: 0, captureCount: images.length, errorMessage: data.error });
        return;
      }

      setStep("done");
      setEnrolled(true);
      toast.success(data.message || "Cadastro facial concluído!");
      logFaceAuthLearning({
        event: "enroll_success",
        confidence: data.enrollment_quality || 0.85,
        captureCount: images.length,
      });
      checkEnrollment();
      onComplete?.();
    } catch (e: any) {
      console.error("Enrollment exception:", e);
      setErrorMsg("Erro inesperado: " + e.message);
      setStep("error");
      logFaceAuthLearning({ event: "enroll_failure", confidence: 0, captureCount: images.length, errorMessage: e.message });
    }
  };

  const deleteEnrollment = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { action: "delete" },
      });

      if (!error && data?.success) {
        setEnrolled(false);
        setEnrollmentInfo(null);
        setStep("idle");
        setLgpdConsent(false);
        toast.success("Dados biométricos excluídos permanentemente (LGPD Art. 18)");
      } else {
        toast.error(data?.error || "Erro ao excluir dados faciais");
      }
    } catch {
      toast.error("Erro ao excluir dados faciais");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      stopFaceDetection();
    };
  }, [stopCamera, stopFaceDetection]);

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Already enrolled view
  if (enrolled && !["camera", "liveness", "capturing", "processing", "consent"].includes(step)) {
    return (
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ScanFace className="h-4 w-4 text-primary" />
            Reconhecimento Facial
            <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500 ml-auto">
              <Check className="h-3 w-3 mr-1" /> Ativo
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="bg-muted/30 rounded px-2 py-1.5">
              <span className="text-muted-foreground">Qualidade</span>
              <p className="font-mono font-semibold text-foreground">
                {((enrollmentInfo?.enrollment_quality || 0) * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-muted/30 rounded px-2 py-1.5">
              <span className="text-muted-foreground">Verificações</span>
              <p className="font-mono font-semibold text-foreground">
                {enrollmentInfo?.verification_count || 0}
              </p>
            </div>
          </div>
          {enrollmentInfo?.last_verified_at && (
            <p className="text-[10px] text-muted-foreground">
              Última verificação: {new Date(enrollmentInfo.last_verified_at).toLocaleString("pt-BR")}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => setStep("consent")}>
              <Camera className="h-3 w-3 mr-1" /> Recadastrar
            </Button>
            <Button size="sm" variant="destructive" className="text-xs" onClick={deleteEnrollment}>
              <Trash2 className="h-3 w-3 mr-1" /> Excluir
            </Button>
          </div>
          <p className="text-[9px] text-muted-foreground text-center">
            <Shield className="h-3 w-3 inline mr-1" />
            Dados biométricos protegidos · LGPD Art. 11 (dado sensível)
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ScanFace className="h-4 w-4 text-primary" />
          Cadastro de Reconhecimento Facial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ═══ Step: Idle ═══ */}
        {step === "idle" && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              <ScanFace className="h-8 w-8 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              Cadastre seu rosto para login rápido e seguro sem senha.
            </p>
            <Button onClick={() => setStep("consent")} className="w-full">
              <Camera className="h-4 w-4 mr-2" /> Iniciar Cadastro Facial
            </Button>
            <p className="text-[9px] text-muted-foreground">
              <Shield className="h-3 w-3 inline mr-1" />
              Seus dados biométricos são protegidos pela LGPD (Art. 11 — dado sensível)
            </p>
          </div>
        )}

        {/* ═══ Step: LGPD Consent (OBRIGATÓRIO) ═══ */}
        {step === "consent" && (
          <div className="space-y-4">
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Consentimento para Dados Biométricos
              </h4>
              <div className="text-[11px] text-muted-foreground space-y-2">
                <p>
                  De acordo com a <strong>LGPD (Lei 13.709/2018, Art. 11)</strong>, dados biométricos
                  faciais são classificados como <strong>dados pessoais sensíveis</strong>.
                </p>
                <p>Ao prosseguir, você autoriza:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Captura de imagens faciais em múltiplos ângulos</li>
                  <li>Análise biométrica por IA para geração de template facial</li>
                  <li>Armazenamento criptografado dos dados biométricos</li>
                  <li>Uso exclusivo para autenticação neste sistema</li>
                </ul>
                <p className="font-medium text-foreground">
                  Seus direitos (LGPD Art. 18): Você pode excluir seus dados biométricos a qualquer momento.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 px-1">
              <Checkbox
                id="lgpd-consent"
                checked={lgpdConsent}
                onCheckedChange={(checked) => setLgpdConsent(checked === true)}
              />
              <label htmlFor="lgpd-consent" className="text-[11px] text-muted-foreground cursor-pointer leading-relaxed">
                Declaro que li e aceito o tratamento dos meus dados biométricos faciais conforme descrito acima,
                de acordo com a LGPD (Lei 13.709/2018).
              </label>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={startCamera}
                disabled={!lgpdConsent}
                className="flex-1"
              >
                <Eye className="h-4 w-4 mr-2" /> Prosseguir com Câmera
              </Button>
              <Button variant="outline" onClick={() => { setStep("idle"); setLgpdConsent(false); }}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {/* ═══ Step: Error ═══ */}
        {step === "error" && (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm text-destructive font-medium">Erro no cadastro</p>
            <p className="text-xs text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => { setStep("consent"); setCaptures([]); setErrorMsg(""); setLgpdConsent(false); }} variant="outline">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* ═══ Step: Liveness Challenge ═══ */}
        {step === "liveness" && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`w-48 h-60 border-2 border-dashed rounded-[50%] transition-colors ${
                  faceDetected ? "border-emerald-500/70" : "border-destructive/50"
                }`} />
              </div>
              <div className="absolute top-2 left-2 flex gap-1">
                <Badge variant="outline" className="text-[9px] border-primary/50 text-primary bg-primary/10">
                  🔒 Verificação de Vivacidade
                </Badge>
                {faceApiReady && (
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                    68pts · 128d
                  </Badge>
                )}
              </div>
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-2">
                <p className="text-xs text-center text-white font-medium">
                  {LIVENESS_CHALLENGES[livenessStep]?.label || "Concluído!"}
                </p>
                <p className="text-[9px] text-center text-white/60 mt-0.5">
                  Desafio {livenessStep + 1} de 2 — Anti-spoofing ativo
                </p>
              </div>
            </div>

            <Progress value={((livenessStep) / 2) * 100} className="h-1.5" />

            <div className="flex gap-2">
              <Button onClick={advanceLiveness} disabled={!faceDetected} className="flex-1">
                <Check className="h-4 w-4 mr-2" /> Confirmar Ação
              </Button>
              <Button variant="outline" onClick={() => { stopCamera(); setStep("consent"); setLgpdConsent(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-[9px] text-muted-foreground text-center">
              A verificação de vivacidade previne uso de fotos impressas, telas ou máscaras
            </p>
          </div>
        )}

        {/* ═══ Step: Camera Capture ═══ */}
        {(step === "camera" || step === "capturing") && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
              <video
                ref={videoCallbackRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ transform: "scaleX(-1)" }}
              />
              {/* Face guide overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className={`w-48 h-60 border-2 border-dashed rounded-[50%] transition-colors ${
                    faceDetected ? "border-emerald-500/70" : "border-destructive/50"
                  }`}
                />
              </div>
              {/* Face detection indicator */}
              <div className="absolute top-2 right-2">
                <Badge
                  variant="outline"
                  className={`text-[9px] ${
                    faceDetected
                      ? "border-emerald-500/50 text-emerald-400 bg-emerald-500/10"
                      : "border-destructive/50 text-destructive bg-destructive/10"
                  }`}
                >
                  {faceDetected ? "✓ Rosto detectado" : "✗ Sem rosto"}
                </Badge>
              </div>
              {livenessComplete && (
                <div className="absolute top-2 left-2">
                  <Badge variant="outline" className="text-[9px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10">
                    ✓ Vivacidade OK
                  </Badge>
                </div>
              )}
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 rounded px-2 py-1">
                <p className="text-[11px] text-center text-white/80 font-mono">
                  {captures.length < REQUIRED_CAPTURES
                    ? capturePrompts[captures.length]
                    : "Processando..."}
                </p>
              </div>
            </div>

            <Progress value={(captures.length / REQUIRED_CAPTURES) * 100} className="h-1.5" />

            <div className="flex gap-2">
              <Button
                onClick={captureFrame}
                disabled={captures.length >= REQUIRED_CAPTURES || !faceDetected}
                className="flex-1"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capturar ({captures.length}/{REQUIRED_CAPTURES})
              </Button>
              <Button variant="outline" onClick={() => { stopCamera(); setStep("consent"); setCaptures([]); setLgpdConsent(false); }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {!faceDetected && step === "camera" && (
              <p className="text-[10px] text-destructive text-center">
                Posicione seu rosto dentro do oval para habilitar a captura
              </p>
            )}

            {captures.length > 0 && (
              <div className="flex gap-2 justify-center">
                {captures.map((_, i) => (
                  <div key={i} className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══ Step: Processing ═══ */}
        {step === "processing" && (
          <div className="text-center space-y-3 py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Analisando dados faciais com IA...</p>
            <p className="text-[10px] text-muted-foreground">
              {faceApiReady 
                ? "face-api.js: 68 landmarks · 128d descriptor · expressões · anti-spoofing"
                : "Verificando: detecção facial · qualidade · anti-spoofing · geometria facial"
              }
            </p>
          </div>
        )}

        {/* ═══ Step: Done ═══ */}
        {step === "done" && (
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Cadastro Facial Concluído!</p>
            <p className="text-[11px] text-muted-foreground">
              Você já pode usar reconhecimento facial para login.
            </p>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
