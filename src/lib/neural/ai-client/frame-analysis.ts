import { supabase } from "@/integrations/supabase/client";
import { wrapEdgeFunction } from "@/lib/errors";
import { buildCognitionContext } from "../neural-cognition-engine";
import { executeCorrectiveRAG } from "../corrective-rag";
import { getAdaptiveNeurolinguisticHead } from "../orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "../quantum-llm-router";
import { summarizeLongContextMamba } from "../mamba-orchestrator";
import { buildWorkingMemoryPrompt, pushToWorkingMemory } from "../orion-working-memory";
import { getMemoryFacts } from "../orion-memory";
import { stripMarkdown } from "@/lib/utils/text-utils";
import { getVS } from "../vision-state";

export async function analyzeFrameStreaming(
  canvas: HTMLCanvasElement | null,
  question: string,
  chatHistory: any[],
  includeImage: boolean,
  identificationMode: string,
  intentType: string,
  onToken: (t: string) => void,
  onSentence: (s: string) => void,
  signal?: AbortSignal,
) {
  let imageBase64: string | undefined;
  if (includeImage && canvas) {
    imageBase64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
  }

  const { data: stream } = await supabase.functions.invoke("ai-orchestrator", {
    body: {
      prompt: question,
      messages: chatHistory.slice(-5).map(m => ({ role: m.role, content: m.text })),
      stream: true,
      useCase: "vision",
      preferredProvider: "openrouter/google/gemini-2.5-flash:free",
      imageBase64
    }
  });

  if (stream instanceof ReadableStream) {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let spokenUpTo = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "token") {
                accumulated += data.content;
                onToken(accumulated);

                const sentences = accumulated.slice(spokenUpTo).split(/[.!?\n]/);
                if (sentences.length > 1) {
                  const s = sentences[0].trim();
                  if (s.length > 2) onSentence(s);
                  spokenUpTo += sentences[0].length + 1;
                }
              }
            } catch {}
          }
        }
      }
    } finally { reader.releaseLock(); }
    return { description: accumulated, learnedFacts: [], identifiedObjects: [] };
  }
  return { description: null, learnedFacts: [], identifiedObjects: [] };
}

export async function analyzeFrameWithAI(canvas: any, context: any, question: any, chatHistory: any, includeImage: any, identificationMode: any, intentType: any) {
   const res = await analyzeFrameStreaming(canvas, question, chatHistory || [], includeImage, identificationMode, intentType, () => {}, () => {});
   return res;
}

export function buildLocalDetections() { return {}; }
export function shouldUseVoiceFastShortcut() { return false; }
