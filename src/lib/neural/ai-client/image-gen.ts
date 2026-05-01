/**
 * Image Generation Client Helper
 * Extracted from orion-ai-client.ts (lines 1189-1203)
 */
import { supabase } from "../../../integrations/supabase/client";
import { wrapEdgeFunction } from "../../../lib/errors";

export async function generateImageWithOrion(
  prompt: string,
): Promise<{ success: boolean; image?: string; mimeType?: string; text?: string; error?: string }> {
  try {
    const data = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: { action: "generate_image", prompt },
      }),
      "neural-ops",
      { action: "generate_image" }
    );
    return data || { success: false, error: "No data returned" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}
