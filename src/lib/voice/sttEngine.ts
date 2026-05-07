/**
 * STT engine selector + audio metrics logger.
 * Optimized for Zero-Cost: Prefers Groq Whisper (Free/Fast) over Google Cloud.
 */
import { supabase } from "@/integrations/supabase/client";

export type STTEngine = "google-stt" | "groq-stt";

export interface STTInvokeArgs {
  audio: string;
  sampleRate: number;
  languageCode: string;
}

export interface STTInvokeResult {
  text: string;
  confidence: number;
  engine: STTEngine;
  fallbackUsed: boolean;
  latencyMs: number;
  error?: string;
}

/**
 * Fast STT (Groq Whisper Turbo) is the MANDATORY primary.
 * Google Cloud STT is only a legacy fallback that will likely fail if credits expired.
 */
function readFlag(): boolean {
  return true; // Always try fast path first
}

async function invokeGoogle(args: STTInvokeArgs) {
  const t0 = performance.now();
  try {
    const { data, error } = await supabase.functions.invoke("google-stt", { body: args });
    const latency = performance.now() - t0;
    if (error) throw new Error(error.message || "google-stt error");
    return {
      text: (data?.text || "").trim(),
      confidence: typeof data?.confidence === "number" ? data.confidence : 0,
      latency,
    };
  } catch (e: any) {
    console.warn("[STT] Google STT failed (Likely expired credits):", e.message);
    throw e;
  }
}

async function invokeGroq(args: STTInvokeArgs) {
  const t0 = performance.now();
  const { data, error } = await supabase.functions.invoke("groq-stt", { body: args });
  const latency = performance.now() - t0;
  if (error || (data && data.fallback)) throw new Error(error?.message || data?.error || "groq-stt error");
  return {
    text: (data?.text || "").trim(),
    confidence: typeof data?.confidence === "number" ? data.confidence : 0,
    latency,
  };
}

function logMetric(payload: {
  engine: STTEngine;
  stt_latency_ms: number;
  confidence: number;
  audio_duration_ms?: number;
  transcript_length: number;
  fallback_used: boolean;
  error?: string;
}) {
  try {
    supabase.auth.getUser().then(({ data }) => {
      const userId = data.user?.id;
      if (!userId) return;
      void supabase.from("orion_audio_metrics").insert({
        user_id: userId,
        engine: payload.engine,
        stt_latency_ms: Math.round(payload.stt_latency_ms),
        confidence: payload.confidence,
        audio_duration_ms: payload.audio_duration_ms ?? null,
        transcript_length: payload.transcript_length,
        fallback_used: payload.fallback_used,
        error: payload.error ?? null,
      });
    });
  } catch { /* ignore */ }
}

export async function transcribeUtterance(args: STTInvokeArgs, audioDurationMs?: number): Promise<STTInvokeResult> {
  let lastError: string | undefined;

  // PRIMARY: Groq (Whisper) — Free/Cheap & High Quality
  try {
    const r = await invokeGroq(args);
    if (r.text) {
      logMetric({
        engine: "groq-stt",
        stt_latency_ms: r.latency,
        confidence: r.confidence,
        audio_duration_ms: audioDurationMs,
        transcript_length: r.text.length,
        fallback_used: false,
      });
      return { ...r, engine: "groq-stt", fallbackUsed: false, latencyMs: r.latency };
    }
    lastError = "groq returned empty";
  } catch (e: any) {
    lastError = e?.message || "groq error";
    console.warn("[STT] groq failed, trying google-stt as last resort:", lastError);
  }

  // FALLBACK: Google (Might fail if credits expired)
  try {
    const r = await invokeGoogle(args);
    logMetric({
      engine: "google-stt",
      stt_latency_ms: r.latency,
      confidence: r.confidence,
      audio_duration_ms: audioDurationMs,
      transcript_length: r.text.length,
      fallback_used: true,
      error: lastError,
    });
    return { ...r, engine: "google-stt", fallbackUsed: true, latencyMs: r.latency };
  } catch (e: any) {
    return {
      text: "",
      confidence: 0,
      engine: "google-stt",
      fallbackUsed: true,
      latencyMs: 0,
      error: `All STT engines failed. Groq: ${lastError}, Google: ${e.message}`
    };
  }
}

export const sttEngineFlag = {
  isFastEnabled: () => true,
  enableFast() {},
  disableFast() {},
};
