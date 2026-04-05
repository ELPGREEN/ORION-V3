/**
 * ─── Orion Vision Hybrid Client ───
 * Calls the groq-vision-hybrid edge function for hybrid vision processing.
 * Local confidence check → multi-motor cascade fallback → auto-learn protocols.
 */

import { supabase } from "@/integrations/supabase/client";

export interface LocalDetection {
  label: string;
  confidence: number;
  bbox?: number[];
}

export interface VisionDetection {
  objeto: string;
  descricao: string;
  confianca: number;
  bbox?: number[];
  source: string;
  protocol_created?: boolean;
  categorias?: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  has_key: boolean;
  vision: boolean;
}

export interface HybridVisionResult {
  detections: VisionDetection[];
  mode: string;
  provider_used: string;
  providers_available: ProviderInfo[];
  protocols_available: number;
  auto_learned: number;
  evolution_status: string;
  duration_ms: number;
  timestamp: string;
}

export type VisionMode = "identify" | "describe" | "analyze" | "teach";

export async function hybridVisionAnalyze(
  imageBase64: string,
  options: {
    mode?: VisionMode;
    mimeType?: string;
    teachLabel?: string;
    localDetections?: LocalDetection[];
    context?: string;
  } = {}
): Promise<HybridVisionResult> {
  const { data, error } = await supabase.functions.invoke("groq-vision-hybrid", {
    body: {
      image_base64: imageBase64,
      mime_type: options.mimeType || "image/jpeg",
      mode: options.mode || "identify",
      teach_label: options.teachLabel,
      local_detections: options.localDetections || [],
      context: options.context || "",
    },
  });

  if (error) throw new Error(error.message || "Hybrid vision error");
  if (data?.error) throw new Error(data.error);
  return data as HybridVisionResult;
}

/** Convert a File to base64 (without the data:... prefix) */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
