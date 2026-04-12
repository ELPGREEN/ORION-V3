import { useState, useRef, useCallback, useEffect } from "react";
import { ScanFace, Camera, Loader2, Shield, AlertTriangle, Check, X, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
const logFaceAuthLearning = (_data: any) => { /* stub */ };
const loadFaceApiModels = async () => false;
const detectSingleFaceFull = async (_input: any): Promise<{ box: { x: number; y: number; width: number; height: number }; score: number } | null> => null;

interface FaceAuthLoginProps {
  onSuccess: () => void;
  onCancel: () => void;
}

type Status = "starting" | "ready" | "detecting" | "capturing" | "verifying" | "success" | "failed" | "locked";

interface FaceCenter {
  x: number;       // 0-1 relative center X
  y: number;       // 0-1 relative center Y
  size: number;    // face width / frame width ratio
  centered: boolean;
  confidence: number;
}

interface AutoCapture {
  base64: string;
  confidence: number;
  centeringQuality: number;
}

const REQUIRED_CAPTURES = 3;
const CAPTURE_INTERVAL_MS = 800;
const DETECTION_INTERVAL_MS = 250;
const TIMEOUT_MS = 15000;
const CENTER_THRESHOLD_X = 0.15;
const CENTER_THRESHOLD_Y = 0.15;
const MIN_SIZE_RATIO = 0.2;
const MIN_CONFIDENCE = 0.65;

function computeCentering(face: { x: number; y: number; width: number; height: number }, fw: number, fh: number): FaceCenter {
  const centerX = (face.x + face.width / 2) / fw;
  const centerY = (face.y + face.height / 2) / fh;
  const deviationX = Math.abs(centerX - 0.5);
  const deviationY = Math.abs(centerY - 0.5);
  const sizeRatio = face.width / fw;
  const centered = deviationX < CENTER_THRESHOLD_X && deviationY < CENTER_THRESHOLD_Y && sizeRatio > MIN_SIZE_RATIO;

  // Quality: 100 = perfectly centered, 0 = far off
  const quality = Math.max(0, Math.min(100,
    100 - (deviationX / CENTER_THRESHOLD_X) * 30 - (deviationY / CENTER_THRESHOLD_Y) * 30 - (sizeRatio < MIN_SIZE_RATIO ? 40 : 0)
  ));

  return { x: centerX, y: centerY, size: sizeRatio, centered, confidence: quality };
}

function getOvalColor(status: Status, faceCenter: FaceCenter | null): string {
  if (status === "success") return "border-emerald-500";
  if (status === "failed" || status === "locked") return "border-red-500";
  if (status === "verifying") return "border-[#d4a853] animate-pulse";
  if (!faceCenter) return "border-dashed border-[#d4a853]/30";
  if (faceCenter.centered && faceCenter.confidence >= 70) return "border-emerald-400 shadow-[0_0_15px_rgba(74,222,128,0.3)]";
  if (faceCenter.confidence >= 40) return "border-yellow-400";
  return "border-red-400";
}

function getInstruction(status: Status, faceCenter: FaceCenter | null, captures: number): string {
  if (status === "verifying") return "Verificando identidade...";
  if (status === "success") return "Identidade verificada!";
  if (status === "failed") return "Falha na verificação";
  if (status === "locked") return "Conta bloqueada";
  if (status === "capturing") return `Capturando... (${captures}/${REQUIRED_CAPTURES})`;
  if (!faceCenter) return "Posicione seu rosto no oval";
  if (!faceCenter.centered) {
    if (faceCenter.size < MIN_SIZE_RATIO) return "Aproxime-se da câmera";
    return "Centralize seu rosto no oval";
  }
  return "Mantenha a posição...";
}

export function FaceAuthLogin({ onSuccess, onCancel }: FaceAuthLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionLoopRef = useRef<number | null>(null);
  const lastCaptureTimeRef = useRef(0);
  const startTimeRef = useRef(0);
  const modelsLoadedRef = useRef(false);

  const [status, setStatus] = useState<Status>("starting");
  const [confidence, setConfidence] = useState(0);
  const [message, setMessage] = useState("");
  const [attemptsRemaining, setAttemptsRemaining] = useState(3);
  const [countdown, setCountdown] = useState(3);
  const [faceCenter, setFaceCenter] = useState<FaceCenter | null>(null);
  const [autoCaptures, setAutoCaptures] = useState<AutoCapture[]>([]);
  const [centeringQuality, setCenteringQuality] = useState(0);

  const capturesRef = useRef<AutoCapture[]>([]);

  useEffect(() => {
    loadFaceApiModels().then(ok => { modelsLoadedRef.current = ok; });
    startCamera();
    return () => {
      stopCamera();
      stopDetectionLoop();
    };
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const stopDetectionLoop = useCallback(() => {
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
  }, []);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -640, 0, 640, 480);
    ctx.restore();
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
  }, []);

  const sendBestCapture = useCallback(async (captures: AutoCapture[]) => {
    stopDetectionLoop();
    setStatus("verifying");

    // Pick the capture with highest confidence
    const best = captures.reduce((a, b) => a.confidence > b.confidence ? a : b);

    try {
      const { data, error } = await supabase.functions.invoke("face-auth", {
        body: { action: "login_verify", imageBase64: best.base64 },
      });

      if (error) {
        setStatus("failed");
        setMessage("Erro na verificação facial");
        return;
      }

      if (data.spoofDetected) {
        setStatus("locked");
        setMessage("Tentativa de spoofing detectada!");
        stopCamera();
        toast.error("⚠️ Spoofing detectado!");
        logFaceAuthLearning({ event: "spoof_detected", confidence: 0, captureCount: captures.length });
        return;
      }

      if (data.success && data.token_hash) {
        setStatus("success");
        setConfidence(data.confidence);
        setMessage("Identidade verificada!");
        stopCamera();
        logFaceAuthLearning({
          event: "login_success",
          confidence: data.confidence,
          captureCount: captures.length,
          centeringQuality: best.centeringQuality,
        });

        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: data.token_hash,
          type: "magiclink",
        });

        if (otpError) {
          console.error("OTP verify error:", otpError);
          setStatus("failed");
          setMessage("Erro ao criar sessão. Use e-mail e senha.");
          toast.error("Erro na autenticação facial");
          return;
        }

        toast.success("Login facial bem-sucedido!");
        setTimeout(() => onSuccess(), 1000);
      } else {
        setStatus("failed");
        setConfidence(data.confidence || 0);
        setMessage(data.message || "Rosto não reconhecido");
        setAttemptsRemaining(prev => prev - 1);
        logFaceAuthLearning({
          event: "login_failure",
          confidence: data.confidence || 0,
          captureCount: captures.length,
          centeringQuality: best.centeringQuality,
          errorMessage: data.message,
        });
      }
    } catch {
      setStatus("failed");
      setMessage("Erro de conexão");
      logFaceAuthLearning({ event: "login_failure", confidence: 0, errorMessage: "connection_error" });
    }
  }, [onSuccess, stopCamera, stopDetectionLoop]);

  const startDetectionLoop = useCallback(() => {
    setStatus("detecting");
    startTimeRef.current = performance.now();
    capturesRef.current = [];
    setAutoCaptures([]);
    setFaceCenter(null);
    setCenteringQuality(0);

    detectionLoopRef.current = window.setInterval(async () => {
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;

      const now = performance.now();
      const elapsed = now - startTimeRef.current;

      // Timeout: use best available capture or fail
      if (elapsed > TIMEOUT_MS) {
        if (capturesRef.current.length > 0) {
          sendBestCapture(capturesRef.current);
        } else {
          // Fallback: capture whatever we have
          const fallbackBase64 = captureFrame();
          if (fallbackBase64) {
            sendBestCapture([{ base64: fallbackBase64, confidence: 0.5, centeringQuality: 0 }]);
          } else {
            setStatus("failed");
            setMessage("Não foi possível detectar seu rosto. Tente novamente.");
          }
        }
        return;
      }

      // Detect face
      let detection: { box: { x: number; y: number; width: number; height: number }; score: number } | null = null;

      if (modelsLoadedRef.current) {
        const result = await detectSingleFaceFull(video);
        if (result) {
          detection = { box: result.box, score: result.score };
        }
      }

      if (!detection) {
        setFaceCenter(null);
        setCenteringQuality(0);
        return;
      }

      const fw = video.videoWidth || 640;
      const fh = video.videoHeight || 480;
      const centering = computeCentering(detection.box, fw, fh);
      setFaceCenter(centering);
      setCenteringQuality(Math.round(centering.confidence));

      // Auto-capture when centered with good confidence
      if (
        centering.centered &&
        detection.score >= MIN_CONFIDENCE &&
        capturesRef.current.length < REQUIRED_CAPTURES &&
        now - lastCaptureTimeRef.current > CAPTURE_INTERVAL_MS
      ) {
        const base64 = captureFrame();
        if (base64) {
          const capture: AutoCapture = {
            base64,
            confidence: detection.score,
            centeringQuality: centering.confidence,
          };
          capturesRef.current = [...capturesRef.current, capture];
          setAutoCaptures([...capturesRef.current]);
          lastCaptureTimeRef.current = now;
          setStatus("capturing");

          // All captures done — send best
          if (capturesRef.current.length >= REQUIRED_CAPTURES) {
            sendBestCapture(capturesRef.current);
          }
        }
      }
    }, DETECTION_INTERVAL_MS);
  }, [captureFrame, sendBestCapture]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus("ready");
      let count = 3;
      setCountdown(count);
      const timer = setInterval(() => {
        count--;
        setCountdown(count);
        if (count <= 0) {
          clearInterval(timer);
          startDetectionLoop();
        }
      }, 1000);
    } catch {
      toast.error("Câmera indisponível");
      onCancel();
    }
  };

  const handleRetry = () => {
    capturesRef.current = [];
    setAutoCaptures([]);
    setFaceCenter(null);
    setCenteringQuality(0);
    setConfidence(0);
    setMessage("");
    startDetectionLoop();
  };

  const instruction = getInstruction(status, faceCenter, autoCaptures.length);
  const ovalColor = getOvalColor(status, faceCenter);
  const isDetecting = status === "detecting" || status === "capturing";
  const captureProgress = (autoCaptures.length / REQUIRED_CAPTURES) * 100;

  return (
    <Card className="border-border max-w-sm mx-auto">
      <CardHeader className="pb-3 text-center">
        <div className="flex items-center justify-between">
          <div />
          <CardTitle className="text-base flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-[#d4a853]" />
            Login Facial
          </CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { stopCamera(); stopDetectionLoop(); onCancel(); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera View */}
        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video
            ref={videoRef}
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Face oval guide */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-44 h-56 border-2 rounded-[50%] transition-all duration-300 ${ovalColor}`} />
          </div>

          {/* Anti-spoofing badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="outline" className="text-[8px] border-[#d4a853]/30 text-[#d4a853]/70 bg-black/50">
              🔒 Anti-spoofing ativo
            </Badge>
          </div>

          {/* Centering quality badge */}
          {isDetecting && faceCenter && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="outline"
                className={`text-[9px] bg-black/50 font-mono ${
                  faceCenter.centered ? "border-emerald-500/50 text-emerald-400" : "border-yellow-500/50 text-yellow-400"
                }`}
              >
                <Target className="h-3 w-3 mr-1" />
                {centeringQuality}%
              </Badge>
            </div>
          )}

          {/* Countdown */}
          {status === "ready" && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-4xl font-bold text-white/80 font-mono">{countdown}</span>
            </div>
          )}

          {/* Instruction overlay */}
          {isDetecting && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center">
              <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full font-medium">
                {instruction}
              </span>
            </div>
          )}

          {/* Verifying */}
          {status === "verifying" && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#d4a853] mx-auto" />
                <p className="text-[11px] text-white/70 mt-2 font-mono">Verificando identidade...</p>
              </div>
            </div>
          )}

          {/* Success */}
          {status === "success" && (
            <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/10">
              <div className="text-center">
                <Check className="h-12 w-12 text-emerald-500 mx-auto" />
                <p className="text-sm text-white font-semibold mt-2">{(confidence * 100).toFixed(0)}% match</p>
              </div>
            </div>
          )}

          {/* Failed / Locked */}
          {(status === "failed" || status === "locked") && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
              <div className="text-center">
                <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
                <p className="text-xs text-white/80 mt-2 px-4">{message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Capture progress bar */}
        {isDetecting && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Capturas</span>
              <span className="font-mono">{autoCaptures.length}/{REQUIRED_CAPTURES}</span>
            </div>
            <Progress value={captureProgress} className="h-1.5" />
          </div>
        )}

        {/* Confidence bar */}
        {confidence > 0 && !isDetecting && (
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Confiança</span>
              <span className="font-mono">{(confidence * 100).toFixed(1)}%</span>
            </div>
            <Progress value={confidence * 100} className="h-1.5" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {status === "failed" && attemptsRemaining > 0 && (
            <Button onClick={handleRetry} className="flex-1 bg-gradient-to-r from-[#d4a853] to-[#b8942e] text-[#0a0a0f]">
              <Camera className="h-4 w-4 mr-2" /> Tentar Novamente
            </Button>
          )}
          <Button variant="outline" onClick={() => { stopCamera(); stopDetectionLoop(); onCancel(); }} className="flex-1">
            Usar Senha
          </Button>
        </div>

        <p className="text-[9px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Shield className="h-3 w-3" />
          Verificação anti-spoofing + vivacidade · LGPD Art. 11
        </p>

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
