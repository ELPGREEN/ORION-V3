/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Optimized for real-time interaction and low latency.
 */
import { supabase } from "@/integrations/supabase/client";

export async function analyzeFrameWithAI(
  canvas: HTMLCanvasElement | null,
  question: string,
  context?: string,
  chatHistory?: any[],
  identificationMode: string = "universal",
  intentType: string = "visual"
) {
  let imageBase64 = "";
  if (canvas) {
    imageBase64 = canvas.toDataURL("image/jpeg", 0.6).split(",")[1];
  }

  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: {
      imageBase64,
      context,
      question,
      chatHistory: chatHistory?.slice(-5),
      intentType
    },
  });

  if (error) {
    console.error("[OrionAI] Vision analysis error:", error.message);
    return { description: null, identifiedObjects: [] };
  }

  return {
    description: data?.description || null,
    identifiedObjects: data?.identifiedObjects || [],
    learnedFacts: data?.learnedFacts || []
  };
}

export async function chatWithAI(text: string, chatHistory: any[] = []) {
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: {
      text,
      chatHistory: chatHistory.slice(-10),
      intentType: "text"
    },
  });

  if (error) {
    console.error("[OrionAI] Chat error:", error.message);
    return { text: "Desculpe, tive um problema ao processar sua mensagem." };
  }

  return {
    text: data?.text || data?.description || "Não consegui gerar uma resposta.",
    action: data?.action
  };
}

export async function classifyIntent(text: string) {
  const { data, error } = await supabase.functions.invoke("classify-intent", {
    body: { text }
  });

  if (error) return { intent: "general", confidence: 0.5, params: {} };
  return data;
}
