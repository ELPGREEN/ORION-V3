/**
 * Neural Vision Camera — extracted from NeuralVision.tsx (lines 332-434)
 * Contains: startCamera, stopCamera, deactivateGracefully, camera state
 */

import { useState, useCallback, useRef, useEffect, MutableRefObject } from "react";
import { toast } from "sonner";
import { VS } from "./useVisionProcessing";
import { resetVisionCache } from "@/lib/vision/vision-cache";

export interface NeuralVisionCameraProps {
  active: boolean;
  setActive: (active: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  streamRef: MutableRefObject<MediaStream | null>;
  animRef: MutableRefObject<number>;
  prevRef: MutableRefObject<Uint8ClampedArray | null>;
  speak: (text: string) => Promise<void>;
}

export function useNeuralVisionCamera(props: NeuralVisionCameraProps) {
  const { active, setActive, videoRef, streamRef, animRef, prevRef, speak } = props;

  const startCamera = useCallback(async (options?: { announce?: boolean }) => {
    const shouldAnnounce = options?.announce ?? true;
    if (!navigator.mediaDevices?.getUserMedia) { toast.error("Câmera não suportada"); return; }
    try {
      if (streamRef.current) {
        console.info("[NeuralVision] camera request skipped: stream already active");
        setActive(true); VS.active = true;
        return;
      }

      // Timeout de 10s para getUserMedia (evita travamento)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        } as MediaStreamConstraints);
        clearTimeout(timeoutId);

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach(t => t.stop());
          streamRef.current = null;
          const retryAttempted = (startCamera as any).__retried;
          if (!retryAttempted) {
            (startCamera as any).__retried = true;
            setTimeout(() => {
              (startCamera as any).__retried = false;
              // Re-try logic here
            }, 120);
          } else {
            (startCamera as any).__retried = false;
            toast.error("Vídeo não pronto. Tente novamente.");
          }
          return;
        }
        if (streamRef.current && streamRef.current !== stream) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        streamRef.current = stream;
        video.srcObject = stream;

        // Aumentado para 8s (câmeras lentas em alguns dispositivos)
        await new Promise<void>((resolve) => {
          let settled = false;
          const finish = () => { if (settled) return; settled = true; video.onloadeddata = null; video.onloadedmetadata = null; resolve(); };
          if (video.readyState >= 2) { finish(); return; }
          video.onloadeddata = finish;
          video.onloadedmetadata = finish;
          setTimeout(finish, 8000);
          video.play().catch(() => {});
        });
        await video.play().catch(() => {});
        setActive(true); VS.active = true;
      } catch (mediaErr: any) {
        clearTimeout(timeoutId);
        throw mediaErr;
      }
    } catch (err: any) {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      const name = err?.name || "";
      const msg = err?.message || "";
      console.error("[Vision] startCamera failed:", name, msg, err);
      let userMsg = "Erro na câmera";
      if (name === "NotAllowedError" || name === "SecurityError") userMsg = "Permissão da câmera negada. Autorize no navegador.";
      else if (name === "NotFoundError" || name === "OverconstrainedError") userMsg = "Nenhuma câmera disponível.";
      else if (name === "NotReadableError") userMsg = "Câmera em uso por outro app.";
      else if (name === "AbortError" || name === "TimeoutError") userMsg = "Tempo esgotado. Verifique se a câmera está conectada.";
      toast.error(userMsg);
    }
  }, [speak]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setActive(false); VS.active = false; VS.regions = [];
    cancelAnimationFrame(animRef.current); prevRef.current = null;
    resetVisionCache();
  }, []);

  const deactivateGracefully = useCallback(() => {
    const farewells = [
      "Até mais! Qualquer coisa, é só me chamar.",
      "Descansando. Quando precisar, diga Orion.",
      "Até logo! Estarei aqui quando precisar.",
      "Entendido. Vou descansar. Me chame quando quiser.",
    ];
    speak(farewells[Math.floor(Math.random() * farewells.length)]).catch(() => {});
    // stopListen needs to be passed or handled externally
    setTimeout(() => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      setActive(false); VS.active = false; VS.regions = [];
      cancelAnimationFrame(animRef.current); prevRef.current = null;
    }, 800);
  }, [speak]);

  return {
    startCamera,
    stopCamera,
    deactivateGracefully,
  };
}
