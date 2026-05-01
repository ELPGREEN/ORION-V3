/**
 * STT engine selector + audio metrics logger.
 *
 * Default: keeps current `google-stt` (mic-continuous, no behavior change).
 * Opt-in via flag `orion_fast_stt` in localStorage → routes to `groq-stt` (Whisper Large v3 Turbo).
 * On Groq failure (any non-2xx, network error, or empty result), falls back to google-stt automatically
 * so the mic-continuous contract is never broken.
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
 * Fast STT (Groq Whisper Turbo) is ON by default.
 * Set `localStorage.orion_fast_stt = "0"` to opt-out and force google-stt.
 * Any other value (including unset) → fast path enabled.
 */
function readFlag(): boolean {
  try {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("orion_fast_stt") !== "0";
  } catch {
    return true;
  }
}

async function invokeGoogle(args: STTInvokeArgs) {
  const t0 = performance.now();
  const { data, error } = await supabase.functions.invoke("google-stt", { body: args });
  const latency = performance.now() - t0;
  if (error) throw new Error(error.message || "google-stt error");
  return {
    text: (data?.text || "").trim(),
    confidence: typeof data?.confidence === "number" ? data.confidence : 0,
    latency,
  };
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

/** Best-effort metrics logger — never throws, never blocks. */
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
      if (!userId) return; // RLS requires authenticated user
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
  } catch {
    /* ignore */
  }
}

/**
 * Transcribe an utterance using the configured engine, with automatic fallback.
 */
export async function transcribeUtterance(args: STTInvokeArgs, audioDurationMs?: number): Promise<STTInvokeResult> {
  const fastWanted = readFlag();
  let fallbackUsed = false;
  let lastError: string | undefined;

  if (fastWanted) {
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
      // Empty text → fall through to google
      lastError = "groq returned empty";
    } catch (e: any) {
      lastError = e?.message || "groq error";
      console.warn("[STT] groq failed, falling back to google-stt:", lastError);
    }
    fallbackUsed = true;
  }

  const r = await invokeGoogle(args);
  logMetric({
    engine: "google-stt",
    stt_latency_ms: r.latency,
    confidence: r.confidence,
    audio_duration_ms: audioDurationMs,
    transcript_length: r.text.length,
    fallback_used: fallbackUsed,
    error: lastError,
  });
  return { ...r, engine: "google-stt", fallbackUsed, latencyMs: r.latency };
}

/** Toggle helper for UI/devtools. Fast (Groq) is the default. */
export const sttEngineFlag = {
  isFastEnabled: readFlag,
  enableFast() {
    try { window.localStorage.removeItem("orion_fast_stt"); } catch {}
  },
  disableFast() {
    try { window.localStorage.setItem("orion_fast_stt", "0"); } catch {}
  },
};
