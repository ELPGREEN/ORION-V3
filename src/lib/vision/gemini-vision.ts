/**
 * ─── Gemini Vision — Clean Vision Utility ───
 * Single source of truth for vision: Canvas → Base64 JPEG → Gemini Flash
 * via the neural-ops edge function.
 */

import { supabase } from "@/integrations/supabase/client";

/** Capture a canvas frame as base64 JPEG (no data: prefix) */
export function captureFrame(canvas: HTMLCanvasElement, quality = 0.7): string {
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

/** Capture from video element → base64 JPEG. Returns empty string if video not ready. */
export function captureVideoFrame(video: HTMLVideoElement, maxWidth = 640, quality = 0.7): string {
  if (!video || video.readyState < 2 || video.videoWidth === 0) return "";
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * scale);
  canvas.height = Math.round(video.videoHeight * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  const base64 = dataUrl.split(",")[1];
  // Validate: must be substantial (>500 chars = ~375 bytes = real image)
  if (!base64 || base64.length < 500) return "";
  return base64;
}

export interface GeminiVisionResult {
  description: string | null;
  objects?: Array<{ name: string; confidence: number; category?: string; position?: string }>;
  error?: string;
}

/** Analyze a frame with Gemini via neural-ops edge function */
export async function analyzeFrame(
  imageBase64: string,
  question?: string,
  context?: string,
): Promise<GeminiVisionResult> {
  try {
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: {
        imageBase64,
        question: question || "Descreva detalhadamente o que você vê na imagem. Identifique todos os objetos, pessoas e elementos visíveis.",
        context: context || "",
        identificationMode: "universal",
        intentType: "visual",
      },
    });
    if (error) return { description: null, error: error.message };
    return {
      description: data?.description || null,
      objects: data?.identifiedObjects || [],
    };
  } catch (err: any) {
    return { description: null, error: err?.message || "Vision analysis failed" };
  }
}
