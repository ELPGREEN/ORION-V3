import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { captureVideoFrame, analyzeFrame } from "@/lib/vision/gemini-vision";

export const NeuralVision = () => {
  const [isActive, setIsActive] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const toggleCamera = async () => {
    if (isActive) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      setIsActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsActive(true);
        }
      } catch (err) {
        toast.error("Erro ao acessar a câmera");
      }
    }
  };

  const analyzeCurrentFrame = async () => {
    if (!videoRef.current || !isActive) return;

    setIsAnalyzing(true);
    try {
      const base64 = captureVideoFrame(videoRef.current);
      if (base64) {
        const res = await analyzeFrame(base64);
        setResult(res.description);
      }
    } catch (err) {
      toast.error("Erro na análise de visão");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-4 bg-black/50 rounded-xl border border-[#00ff88]/30">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#00ff88] font-bold flex items-center gap-2">
          <Eye size={20} /> Visão Neural
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleCamera}
          className="border-[#00ff88]/50 text-[#00ff88] hover:bg-[#00ff88]/10"
        >
          {isActive ? <CameraOff size={16} /> : <Camera size={16} />}
          <span className="ml-2">{isActive ? "Desligar" : "Ligar"}</span>
        </Button>
      </div>

      <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-[#00ff88]/20">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isActive ? 'block' : 'hidden'}`}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center text-[#00ff88]/40">
            Câmera Desconectada
          </div>
        )}
      </div>

      {isActive && (
        <div className="mt-4">
          <Button
            className="w-full bg-[#00ff88] text-black hover:bg-[#00ff88]/80"
            onClick={analyzeCurrentFrame}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? "Analisando..." : "O que você está vendo?"}
          </Button>
        </div>
      )}

      {result && (
        <div className="mt-4 p-3 bg-[#00ff88]/10 rounded border border-[#00ff88]/30 text-[#00ff88] text-sm">
          {result}
        </div>
      )}
    </div>
  );
};

export default NeuralVision;
