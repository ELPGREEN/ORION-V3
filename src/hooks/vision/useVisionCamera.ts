import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";

export function useVisionCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [active, setActive] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setActive(false);
  }, []);

  const startCamera = useCallback(async (options?: { announce?: boolean }) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Câmera não suportada");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve) => {
          const video = videoRef.current;
          if (!video) {
            resolve();
            return;
          }
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            video.onloadeddata = null;
            video.onloadedmetadata = null;
            resolve();
          };
          if (video.readyState >= 2) {
            finish();
            return;
          }
          video.onloadeddata = finish;
          video.onloadedmetadata = finish;
          setTimeout(finish, 1500);
          video.play().catch(() => {});
        });
        setActive(true);
      }
    } catch (err) {
      console.error("[Vision] startCamera failed:", err);
      toast.error("Erro ao acessar câmera");
      stopCamera();
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    streamRef,
    active,
    setActive,
    startCamera,
    stopCamera,
  };
}
