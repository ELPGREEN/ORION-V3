import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CameraOff, Eye, Loader2, Send, RotateCcw, Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { useOrionTTS } from "@/hooks/useOrionTTS";

const MAX_IMAGE_SIZE = 512;
const JPEG_QUALITY = 0.6;

interface VisionResponse {
  text: string;
  tokensUsed: number;
  model: string;
}

export function NeuralVision() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [loading, setLoading] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState<VisionResponse | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      streamRef.current = stream;
      setCameraActive(true);
      setCapturedImage(null);
      setResponse(null);
    } catch (err) {
      console.error("Camera error:", err);
      toast.error("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  }, [facingMode]);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Capture frame as base64 JPEG
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return null;

    // Scale down to MAX_IMAGE_SIZE
    const scale = Math.min(MAX_IMAGE_SIZE / vw, MAX_IMAGE_SIZE / vh, 1);
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return dataUrl;
  }, []);

  // Capture and show preview
  const handleCapture = useCallback(() => {
    const dataUrl = captureFrame();
    if (!dataUrl) {
      toast.error("Nenhum frame disponível. Verifique a câmera.");
      return;
    }
    setCapturedImage(dataUrl);
    stopCamera();
  }, [captureFrame, stopCamera]);

  // Send to Gemini Vision
  const handleAnalyze = useCallback(async () => {
    if (!capturedImage) return;

    setLoading(true);
    setResponse(null);

    try {
      // Extract raw base64 from data URL
      const base64 = capturedImage.split(",")[1];
      if (!base64) throw new Error("Invalid image data");

      const { data, error } = await supabase.functions.invoke("neural-vision", {
        body: {
          imageBase64: base64,
          mimeType: "image/jpeg",
          prompt: prompt || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResponse(data as VisionResponse);
    } catch (err: any) {
      console.error("Vision analysis error:", err);
      toast.error(err?.message || "Erro ao analisar imagem");
    } finally {
      setLoading(false);
    }
  }, [capturedImage, prompt]);

  // Switch camera
  const toggleFacing = useCallback(() => {
    stopCamera();
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  }, [stopCamera]);

  // After toggling facing mode, restart if was active
  useEffect(() => {
    if (cameraActive) startCamera();
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-4 w-full max-w-2xl mx-auto">
      {/* Camera / Preview area */}
      <div className={`relative rounded-xl overflow-hidden bg-black/90 border border-border/30 ${expanded ? "h-[70vh]" : "h-64 sm:h-80"} transition-all`}>
        {/* Live video */}
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${!cameraActive || capturedImage ? "hidden" : ""}`}
          playsInline
          muted
        />

        {/* Captured image */}
        {capturedImage && (
          <img src={capturedImage} alt="Captura" className="w-full h-full object-contain" />
        )}

        {/* Placeholder */}
        {!cameraActive && !capturedImage && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
            <Camera className="h-12 w-12 opacity-30" />
            <p className="text-sm">Ative a câmera para iniciar a visão neural</p>
          </div>
        )}

        {/* Overlay controls */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/50 text-white hover:bg-black/70" onClick={() => setExpanded(!expanded)}>
            {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-white/80 tracking-widest">ANALISANDO...</p>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {!cameraActive && !capturedImage && (
          <Button onClick={startCamera} className="gap-2">
            <Camera className="h-4 w-4" />
            Ativar Câmera
          </Button>
        )}

        {cameraActive && !capturedImage && (
          <>
            <Button onClick={handleCapture} className="gap-2 bg-primary">
              <Eye className="h-4 w-4" />
              Capturar
            </Button>
            <Button variant="outline" onClick={toggleFacing} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Trocar Câmera
            </Button>
            <Button variant="ghost" onClick={stopCamera} className="gap-2 text-destructive">
              <CameraOff className="h-4 w-4" />
              Desligar
            </Button>
          </>
        )}

        {capturedImage && !loading && (
          <>
            <Button onClick={handleAnalyze} className="gap-2 bg-primary">
              <Send className="h-4 w-4" />
              Analisar com Gemini
            </Button>
            <Button variant="outline" onClick={() => { setCapturedImage(null); setResponse(null); startCamera(); }} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Nova Captura
            </Button>
          </>
        )}
      </div>

      {/* Custom prompt */}
      {capturedImage && (
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Prompt personalizado (opcional). Ex: 'Que documento é esse?', 'Transcreva o texto desta imagem'..."
          className="resize-none text-sm"
          rows={2}
        />
      )}

      {/* Response */}
      <AnimatePresence>
        {response && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-xl border border-primary/20 bg-card/80 backdrop-blur-sm p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Eye className="h-3.5 w-3.5 text-primary" />
                <span>Visão Neural — {response.model}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">{response.tokensUsed} tokens</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => tts.speaking ? tts.stop() : tts.speak(response.text)}
                  disabled={tts.loading}
                >
                  {tts.loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : tts.speaking ? <VolumeX className="h-3.5 w-3.5 text-primary" /> : <Volume2 className="h-3.5 w-3.5" />}
                </Button>
              </div>
            </div>
            </div>
            <div className="prose prose-sm prose-invert max-w-none text-foreground">
              <ReactMarkdown>{response.text}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
