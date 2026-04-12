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

/** Capture from video element → base64 JPEG */
export function captureVideoFrame(video: HTMLVideoElement, maxWidth = 640, quality = 0.7): string {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxWidth / (video.videoWidth || 640));
  canvas.width = Math.round((video.videoWidth || 640) * scale);
  canvas.height = Math.round((video.videoHeight || 480) * scale);
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
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
