/**
 * Orion Voice Hook — STT + TTS Pipeline
 * 
 * Pipeline: STT (Google Cloud STT primary → Web Speech fallback) → Command Handler → TTS (Gemini Enceladus)
 * 
 * Architecture:
 * - Google Cloud STT as primary (via edge function google-stt)
 * - Web Speech API as fallback when GCP STT unavailable
 * - Single mic owner via MicArbiter (prevents duplicate recognition)
 * - Mic priming on startListening (auto-start without click when permission exists)
 * - Self-hearing guard (drops transcripts during TTS + echo detection)
 * - Dynamic turn detection (linguistic pattern matching for silence thresholds)
 * - Barge-in support (user can interrupt TTS with stop commands or 3+ words)
 * - Mic watchdog: auto-restarts GCP STT if it dies silently
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { OrbState } from "@/components/dashboard/neural/EnergyOrb";
import { toast } from "sonner";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";
import { detectTurnState, getOptimalSilenceDuration } from "@/lib/voice/turnDetection";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
// adaptiveVoiceStyle, sttFallbackChain, audioWorkletManager REMOVED — performance bottlenecks
import { markSTTStart, markSTTEnd, markTTSStart, markTTSEnd } from "@/lib/neural/pipeline-latency-tracker";
import { claimMic, isMicOwner, registerMicRec, registerMicCleanup, releaseMic } from "@/lib/voice/micArbiter";
import { ensurePersistentMic, isMobile as isMobilePersistent } from "@/lib/voice/persistentMic";
import { createGCPSTTSession, type GCPSTTSession } from "@/lib/voice/gcpSTT";

// ═══ Constants ═══
const MOBILE_REGEX = /android|iphone|ipad|ipod|mobile/i;
const STOP_PATTERNS = /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|pera|peraí|espera|stop|shut\s+up|wait)\s*[.!]?$/i;

// ═══ Pre-compiled Regexes for Speech Cleaning ═══
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
const INLINE_CODE_REGEX = /`([^`]+)`/g;
const BOLD_REGEX = /\*{1,3}([^*]+)\*{1,3}/g;
const ITALIC_REGEX = /_{1,3}([^_]+)_{1,3}/g;
const HEADER_CLEAN_REGEX = /^#{1,6}\s+/gm;
const LINK_CLEAN_REGEX = /\[([^\]]+)\]\([^)]+\)/g;
const URL_CLEAN_REGEX = /https?:\/\/\S+/g;
const TAG_CLEAN_REGEX = /<[^>]*>/g;
const COMMENT_CLEAN_REGEX = /\/\/[^\n]*/g;
const BLOCK_COMMENT_CLEAN_REGEX = /\/\*[\s\S]*?\*\//g;
const LIST_ITEM_REGEX = /^[\s]*[-•*+]\s+/gm;
const NUMBERED_LIST_REGEX = /^\s*\d+\.\s+/gm;
const PIPE_REGEX = /\|/g;
const BORDER_CLEAN_REGEX = /[─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g;
const EMOJI_CLEAN_REGEX = /[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g;
const PUNCTUATION_CLEAN_REGEX = /[;:!?]+/g;
const DASH_CLEAN_REGEX = /[–—]+/g;
const COMMA_CLEAN_REGEX = /,+/g;
const DOT_CLEAN_REGEX = /\.+/g;
const NEWLINE_CLEAN_REGEX = /\n+/g;
const WHITESPACE_CLEAN_REGEX = /\s+/g;

const NORMALIZE_DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NORMALIZE_NON_ALPHANUMERIC_REGEX = /[^\p{L}\p{N}\s]/gu;

const ECHO_WINDOW_MS = 18000;
const ECHO_JACCARD_THRESHOLD = 0.35;
const MAX_CONSECUTIVE_ABORTS = 5;
const MAX_CONSECUTIVE_NO_SPEECH = 8;
const NO_SPEECH_TIMEOUT_MS = 3000; // Tolerate natural pauses before considering speech ended
const RESTART_DELAY_MS = isMobile() ? 2000 : 500; // Optimized from 1500ms — 3x faster reconnect
const GCP_FINAL_MERGE_MS = 700; // Brief merge window to combine split STT segments into one command

// ═══ Shared State ═══
export const VoiceState = { aiResponding: false };

let _voiceBootstrapDone = false;
let _micPermissionToastShown = false;
function ensureVoiceBootstrapOnce() {
  if (_voiceBootstrapDone) return;
  _voiceBootstrapDone = true;
  initVoicePicker();
}

// ═══ Text Utilities ═══

export function cleanTextForSpeech(text: string): string {
  return text
    // Strip code blocks and markdown
    .replace(CODE_BLOCK_REGEX, " código omitido ")
    .replace(INLINE_CODE_REGEX, "$1")
    .replace(BOLD_REGEX, "$1")
    .replace(ITALIC_REGEX, "$1")
    .replace(HEADER_CLEAN_REGEX, "")
    .replace(LINK_CLEAN_REGEX, "$1")
    .replace(URL_CLEAN_REGEX, "")
    .replace(TAG_CLEAN_REGEX, "")
    .replace(COMMENT_CLEAN_REGEX, "")
    .replace(BLOCK_COMMENT_CLEAN_REGEX, "")
    .replace(LIST_ITEM_REGEX, " ")
    .replace(NUMBERED_LIST_REGEX, " ")
    .replace(PIPE_REGEX, " ")
    .replace(BORDER_CLEAN_REGEX, "")
    .replace(EMOJI_CLEAN_REGEX, "")
    // KEY: Remove ALL pause-inducing punctuation — continuous flow
    .replace(PUNCTUATION_CLEAN_REGEX, " ")
    .replace(DASH_CLEAN_REGEX, " ")
    .replace(COMMA_CLEAN_REGEX, " ")
    .replace(DOT_CLEAN_REGEX, " ")
    .replace(NEWLINE_CLEAN_REGEX, " ")
    .replace(WHITESPACE_CLEAN_REGEX, " ")
    .trim();
}

export function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(NORMALIZE_DIACRITICS_REGEX, "")
    .replace(NORMALIZE_NON_ALPHANUMERIC_REGEX, " ")
    .replace(WHITESPACE_CLEAN_REGEX, " ")
    .trim();
}

/** Remove repeated word sequences AND concatenated duplicates
 * - "ativar ativar" → "ativar"
 * - "ativarativar" → "ativar" (no-space concatenation from STT)
 * - "abrir música do ACDC abrir música do ACDC" → "abrir música do ACDC"
 * - "famosafamosa" → "famosa"
 */
function deduplicateRepeatedPhrases(text: string): string {
  let trimmed = text.trim();
  if (!trimmed) return trimmed;

  // Phase 0: Detect full-phrase concatenation without spaces
  // e.g. "abrir música do ACDCabrir música do ACDC" → "abrir música do ACDC"
  // Strategy: try splitting at each position and check if both halves match
  const lower = trimmed.toLowerCase();
  if (lower.length >= 8) {
    const half = Math.floor(lower.length / 2);
    // Check exact half split with wider tolerance for STT whitespace variations
    for (let offset = -4; offset <= 4; offset++) {
      const pos = half + offset;
      if (pos < 2 || pos >= lower.length - 2) continue;
      const left = lower.slice(0, pos).replace(/\s+/g, ' ').trim();
      const right = lower.slice(pos).replace(/\s+/g, ' ').trim();
      if (left === right) {
        trimmed = trimmed.slice(0, pos).trim();
        break;
      }
    }
  }

  // Phase 1: Detect concatenated word duplicates (no space between)
  // e.g. "ativarativar" → "ativar", "famosafamosa" → "famosa"
  trimmed = trimmed.replace(/\b(\w{3,})\1\b/gi, "$1");

  // Phase 2: Word-level phrase deduplication
  const words = trimmed.split(/\s+/);
  const len = words.length;
  for (let size = Math.floor(len / 2); size >= 1; size--) {
    if (len >= size * 2) {
      const first = words.slice(0, size).join(" ").toLowerCase();
      const second = words.slice(size, size * 2).join(" ").toLowerCase();
      if (first === second) {
        return [...words.slice(0, size), ...words.slice(size * 2)].join(" ").trim();
      }
    }
  }
  return trimmed;
}

function mergeTranscriptSegments(existing: string, incoming: string): string {
  const current = existing.trim();
  const next = incoming.trim();
  if (!current) return next;
  if (!next) return current;

  // Exact duplicate or already contained
  const currentNorm = current.toLowerCase().replace(/[.,!?;:]/g, "");
  const nextNorm = next.toLowerCase().replace(/[.,!?;:]/g, "");
  if (currentNorm === nextNorm) return current;
  if (currentNorm.endsWith(nextNorm)) return current;
  if (nextNorm.startsWith(currentNorm)) return next;

  // Word-level overlap detection — covers single-word repeats too
  const currentWords = current.split(/\s+/);
  const nextWords = next.split(/\s+/);
  const maxOverlap = Math.min(currentWords.length, nextWords.length, 5);

  // Single-word echo guard: if last word of current equals first word of next, drop it
  if (currentWords.length > 0 && nextWords.length > 0) {
    const lastCurrent = currentWords[currentWords.length - 1].toLowerCase().replace(/[.,!?;:]/g, "");
    const firstNext = nextWords[0].toLowerCase().replace(/[.,!?;:]/g, "");
    if (lastCurrent === firstNext && lastCurrent.length >= 3) {
      const remainder = nextWords.slice(1).join(" ").trim();
      return remainder ? `${current} ${remainder}` : current;
    }
  }

  for (let overlap = maxOverlap; overlap >= 2; overlap--) {
    const currentTail = currentWords.slice(-overlap).join(" ").toLowerCase();
    const nextHead = nextWords.slice(0, overlap).join(" ").toLowerCase();
    if (currentTail === nextHead) {
      const merged = `${current} ${nextWords.slice(overlap).join(" ")}`.trim();
      return merged;
    }
  }

  // No overlap found — just append with space
  return `${current} ${next}`;
}

// ═══ Helpers ═══

function isMobile(): boolean {
  return typeof navigator !== "undefined" && MOBILE_REGEX.test(navigator.userAgent);
}

/** Prime microphone hardware — always stores as persistent, NEVER stops tracks */
async function primeMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    // Check if persistent mic already active — no work needed
    const ps = (window as any).__orion_persistent_mic__;
    if (ps?.stream?.active) {
      ps.granted = true;
      return;
    }

    // Use persistent mic utility first
    const ready = await ensurePersistentMic();
    if (ready) return;

    // Check permission — only prime if already granted or prompt
    const perm = await navigator.permissions?.query?.({ name: "microphone" as any });
    if (perm?.state === "denied") return;
    if (perm?.state === "granted") {
      // Permission granted but no persistent stream — create one and KEEP it
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // ALWAYS store as persistent — NEVER stop tracks
      const state = (window as any).__orion_persistent_mic__ || { stream: null, granted: false, checking: false };
      (window as any).__orion_persistent_mic__ = state;
      state.stream = stream;
      state.granted = true;
      console.log("[Voice] Persistent mic primed — tracks will never be stopped");
      return;
    }
    // If prompt, request and store
    if (perm?.state === "prompt") {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const state = (window as any).__orion_persistent_mic__ || { stream: null, granted: false, checking: false };
      (window as any).__orion_persistent_mic__ = state;
      state.stream = stream;
      state.granted = true;
      console.log("[Voice] Persistent mic created from prompt — tracks will never be stopped");
    }
  } catch (err) {
    console.warn("[Voice] Mic priming failed:", err);
  }
}

/** Jaccard word-overlap echo detection — aggressive to prevent self-hearing */
function isEchoOf(input: string, spoken: string): boolean {
  if (!spoken || input.length < 5) return false;
  // Substring match (either direction, check more chars)
  if (spoken.includes(input.slice(0, 60)) || input.includes(spoken.slice(0, 60))) return true;
  // Shorter substring check too
  if (input.length >= 10 && spoken.includes(input.slice(0, 25))) return true;
  // Jaccard overlap
  const wordsA = new Set(input.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(spoken.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size < 2 || wordsB.size < 2) return false;

  let overlap = 0;
  // PERF: Iterate over the smaller set to find intersection
  if (wordsA.size <= wordsB.size) {
    for (const w of wordsA) {
      if (wordsB.has(w)) overlap++;
    }
  } else {
    for (const w of wordsB) {
      if (wordsA.has(w)) overlap++;
    }
  }

  // Use min of both sets for stricter matching
  return overlap / Math.min(wordsA.size, wordsB.size) > ECHO_JACCARD_THRESHOLD;
}

// ═══ Legacy Exported Functions ═══

export function feedUserSpeech(_text: string): void {
  // Legacy function - kept for backward compatibility
}

export function feedAIResponse(_text: string): void {
  // Legacy function - kept for backward compatibility
}

// ═══ Interface ═══

export interface UseNeuralVoiceReturn {
  listening: boolean;
  supported: boolean;
  ttsOn: boolean;
  setTtsOn: (on: boolean) => void;
  speak: (text: string, options?: { skipMicToggle?: boolean }) => Promise<void>;
  speakFast: (text: string) => Promise<void>;
  startListening: (onCmd: (c: string) => void) => void;
  stop: () => void;
  bargeIn: () => void;
  startThinking: () => void;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  speechQueueRef: React.MutableRefObject<string[]>;
  bargeInCallbackRef: React.MutableRefObject<(() => void) | null>;
  voiceActiveRef: React.MutableRefObject<boolean>;
}

// ═══ Hook ═══

export function useNeuralVoice(
  setAiResponding?: (val: boolean) => void,
): UseNeuralVoiceReturn {
  // ── State ──
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true); // GCP STT always available via edge function
  const [ttsOn, setTtsOn] = useState(true);
  const ttsRef = useRef(true);

  // ── Refs ──
  const recRef = useRef<any>(null);
  const speakingRef = useRef(false);
  const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const onCmdRef = useRef<((c: string) => void) | null>(null);
  const listeningRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const speechQueueRef = useRef<string[]>([]);
  const bargeInCallbackRef = useRef<(() => void) | null>(null);
  const speechBufferRef = useRef("");
  const speechDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSpokenTextRef = useRef("");
  const lastSpokenAtRef = useRef(0);
  const lastProcessedTranscriptRef = useRef("");
  const lastProcessedAtRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveAbortsRef = useRef(0);
  const voiceActiveRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const singletonIdRef = useRef(0);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioWorkletActiveRef = useRef(false);
  const gcpSessionRef = useRef<GCPSTTSession | null>(null);
  const useGCPSTTRef = useRef(true); // GCP STT as primary
  const sentenceAccumulatorRef = useRef(""); // Accumulate partial sentences
  const sentenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micWatchdogRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const suppressPendingFlushUntilRef = useRef(0);

  // ── Sync ──
  const updateAiResponding = useCallback((val: boolean) => {
    VoiceState.aiResponding = val;
    setAiResponding?.(val);
  }, [setAiResponding]);

  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  // ── Timer Management ──
  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // ── Init & Cleanup ──
  useEffect(() => {
    const cleanup = () => {
      voiceActiveRef.current = false;
      intentionalStopRef.current = true;
      try { recRef.current?.abort?.(); } catch {}
      try { recRef.current?.stop?.(); } catch {}
      recRef.current = null;
      releaseMic(singletonIdRef.current);
      clearRestartTimer();
    };
    registerMicCleanup(cleanup);

    ensureVoiceBootstrapOnce();
    const voice = getOrionVoice();
    if (voice) maleVoiceRef.current = voice;

    const handler = () => {
      const v = getOrionVoice();
      if (v) maleVoiceRef.current = v;
    };
    speechSynthesis?.addEventListener?.("voiceschanged", handler);

    // Expose mic rec ref for streaming queue to stop during TTS
    (window as any).__orionMicRec = recRef;

    return () => {
      speechSynthesis?.removeEventListener?.("voiceschanged", handler);
      cleanup();
    };
  }, [clearRestartTimer]);

  // ═══ STT Restart Scheduler ═══
  const scheduleRecognitionRestart = useCallback((delay?: number) => {
    clearRestartTimer();
    if (!isMicOwner(singletonIdRef.current)) { setListening(false); return; }
    if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
      setListening(false);
      return;
    }

    // Longer delays to prevent mic cycling — each start() triggers OS mic sound
    const restartDelay = delay ?? (isMobile() ? 3000 : 400);
    setListening(true);

    restartTimerRef.current = setTimeout(() => {
      if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
        setListening(false);
        return;
      }
      if (recRef.current) {
        try {
          recRef.current.start();
          setListening(true);
        } catch {
          try { recRef.current.stop(); } catch {}
          recRef.current = null;
          if (onCmdRef.current) {
            setTimeout(() => {
              if (!intentionalStopRef.current && onCmdRef.current) {
                startListeningFresh(onCmdRef.current);
              }
            }, 50);
          }
        }
        return;
      }
      if (onCmdRef.current) startListeningFresh(onCmdRef.current);
    }, restartDelay);
  }, [clearRestartTimer]);

  // ═══ Resume STT after TTS ═══
  const resumeSTT = useCallback(() => {
    OrbState.voiceState = "listening";
    if (!onCmdRef.current || intentionalStopRef.current) return;

    // Re-claim mic (wake word may have claimed it during TTS)
    singletonIdRef.current = claimMic("command");

    // Flush any pending speech buffer
    if (speechBufferRef.current.trim() && onCmdRef.current) {
      const shouldSuppressPendingFlush = Date.now() < suppressPendingFlushUntilRef.current;
      const pending = speechBufferRef.current.trim();
      speechBufferRef.current = "";
      if (speechDebounceRef.current) {
        clearTimeout(speechDebounceRef.current);
        speechDebounceRef.current = null;
      }
      if (!shouldSuppressPendingFlush) {
        onCmdRef.current(pending);
      } else {
        console.log("[Voice] Suppressed stale pending transcript after TTS:", pending.slice(0, 80));
      }
    }

    // If GCP STT is active (paused or running), just resume — no teardown
    if (gcpSessionRef.current?.isActive()) {
      if (gcpSessionRef.current.isPaused()) {
        gcpSessionRef.current.resume();
      }
      setListening(true);
      return;
    }

    scheduleRecognitionRestart(isMobile() ? 600 : 100);
  }, [scheduleRecognitionRestart]);

  // (Mic watchdog moved after bargeIn declaration)

  // ═══ Streaming TTS Queue Done → Resume Mic ═══
  useEffect(() => {
    const onQueueDone = () => {
      speakingRef.current = false;
      updateAiResponding(false);
      OrbState.voiceState = "listening";
      if (onCmdRef.current && !intentionalStopRef.current) {
        resumeSTT();
      }
    };
    window.addEventListener("orion-tts-queue-done", onQueueDone);
    return () => window.removeEventListener("orion-tts-queue-done", onQueueDone);
  }, [resumeSTT, updateAiResponding]);

  // ═══ Barge-In ═══
  const bargeIn = useCallback(() => {
    try { speechSynthesis.cancel(); } catch {}
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.currentTime = 0; activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speechQueueRef.current = [];
    if (sentenceTimerRef.current) { clearTimeout(sentenceTimerRef.current); sentenceTimerRef.current = null; }
    sentenceAccumulatorRef.current = "";
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    speakingRef.current = false;
    updateAiResponding(false);
    OrbState.voiceState = "listening";
    if (bargeInCallbackRef.current) bargeInCallbackRef.current();
  }, [updateAiResponding]);

  // ═══ Mic Watchdog — auto-resume GCP STT if paused ═══
  useEffect(() => {
    micWatchdogRef.current = setInterval(() => {
      if (!voiceActiveRef.current || intentionalStopRef.current || speakingRef.current || VoiceState.aiResponding) return;
      if (!onCmdRef.current || !useGCPSTTRef.current) return;

      // If GCP session exists but is paused, just resume — no new session needed
      if (gcpSessionRef.current?.isActive() && gcpSessionRef.current.isPaused()) {
        console.log("[Voice] Watchdog: GCP STT paused — resuming (no teardown)");
        gcpSessionRef.current.resume();
        setListening(true);
        return;
      }

      // If session is truly dead, mark it null so next startListening creates fresh
      if (gcpSessionRef.current && !gcpSessionRef.current.isActive()) {
        console.warn("[Voice] Watchdog: GCP STT died — clearing ref for next startListening");
        gcpSessionRef.current = null;
      }
    }, 10000); // Check every 10s — no aggressive polling

    return () => {
      if (micWatchdogRef.current) { clearInterval(micWatchdogRef.current); micWatchdogRef.current = null; }
    };
  }, []);

  // ═══ Web Speech TTS (Fallback) ═══
  const browserSpeak = useCallback((rawText: string) => {
    const text = cleanTextForSpeech(rawText);
    if (!text) return Promise.resolve();

    // Send entire text as one utterance — no chunking, no word cuts
    const chunks = [text];

    return new Promise<void>((resolve) => {
      const safetyTimeout = setTimeout(() => {
        try { speechSynthesis.cancel(); } catch {}
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        resolve();
      }, 60000);

      const keepAlive = setInterval(() => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        }
      }, 10000);
      keepAliveRef.current = keepAlive;

      const finish = () => {
        clearTimeout(safetyTimeout);
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        resolve();
      };

      try {
        speechSynthesis.cancel();

        const speakChunk = (idx: number) => {
          if (idx >= chunks.length) { finish(); return; }
          const pauseMs = idx > 0 ? 5 : 0;
          setTimeout(() => {
            const isQuestion = /\?/.test(chunks[idx]);
            const isLast = idx === chunks.length - 1;
            let rate: number = ORION_VOICE_PARAMS.rate + (Math.sin(idx * 2.1) * 0.02);
            let pitch: number = ORION_VOICE_PARAMS.pitch;
            if (isQuestion) pitch += 0.04;
            if (isLast && chunks.length > 2) rate -= 0.03;
            rate = Math.max(0.9, Math.min(1.35, rate));
            pitch = Math.max(0.75, Math.min(1.1, pitch));

            const u = new SpeechSynthesisUtterance(chunks[idx]);
            u.lang = "pt-BR";
            u.rate = rate;
            u.pitch = pitch;
            u.volume = ORION_VOICE_PARAMS.volume;
            if (maleVoiceRef.current) u.voice = maleVoiceRef.current;
            u.onend = () => speakChunk(idx + 1);
            u.onerror = (ev) => {
              if ((ev as any)?.error === "canceled" || (ev as any)?.error === "interrupted") { finish(); return; }
              speakChunk(idx + 1);
            };
            speechSynthesis.speak(u);
          }, pauseMs);
        };

        speakChunk(0);
      } catch { finish(); }
    });
  }, []);

  // ═══ PRIMARY TTS — Gemini TTS → Web Speech fallback ═══
  const speak = useCallback(async (text: string, options?: { skipMicToggle?: boolean }) => {
    console.log("[Voice] speak() called:", text.slice(0, 80), "ttsOn:", ttsRef.current);
    if (!ttsRef.current || typeof window === "undefined") {
      console.warn("[Voice] speak() skipped — ttsOn:", ttsRef.current);
      return;
    }

    // Cancel any ongoing speech
    try { speechSynthesis.cancel(); } catch {}
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }

    // Enter speaking state
    speakingRef.current = true;
    markTTSStart();
    updateAiResponding(true);
    OrbState.voiceState = "speaking";
    lastSpokenTextRef.current = normalizeSpeechText(text).slice(0, 800);
    lastSpokenAtRef.current = Date.now();
    suppressPendingFlushUntilRef.current = Date.now() + 2500;
    speechBufferRef.current = "";
    sentenceAccumulatorRef.current = "";
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    if (sentenceTimerRef.current) { clearTimeout(sentenceTimerRef.current); sentenceTimerRef.current = null; }
    clearRestartTimer();

    // Pause mic during TTS — GCP STT stays connected (no teardown/click sounds)
    if (gcpSessionRef.current?.isActive()) {
      gcpSessionRef.current.pause();
    }
    try { recRef.current?.stop(); } catch {}

    const cascadeAbort = new AbortController();
    abortControllerRef.current = cascadeAbort;

    // Safety timer: prevents infinite stuck state
    const safetyMs = Math.min(60000, Math.max(15000, 8000 + text.length * 80));
    const safetyTimer = setTimeout(() => {
      if (speakingRef.current) {
        console.warn(`[Voice] Safety timer ${safetyMs}ms — aborting TTS`);
        cascadeAbort.abort();
        speakingRef.current = false;
        updateAiResponding(false);
        if (!options?.skipMicToggle) resumeSTT();
      }
    }, safetyMs);

    const cleanText = cleanTextForSpeech(text);
    let played = false;

    // PRIMARY: Gemini TTS — Enceladus voice
    if (!cascadeAbort.signal.aborted) {
      try {
        console.log("[Voice] Trying Gemini TTS (Enceladus)...");
        const gemResult = await speakWithGeminiTTS(
          cleanText,
          "Enceladus",
          cascadeAbort.signal,
          "Você é ORION, assistente IA pessoal. Voz MASCULINA jovem-adulta clara e confiante. Fale CONTÍNUO sem pausas — máximo 0.15s entre frases. Tom natural e direto, com personalidade. NUNCA pare no meio de frase.",
          "pt-BR",
        );
        console.log("[Voice] Gemini TTS result:", gemResult.played ? "PLAYED" : "NOT PLAYED");
        if (gemResult.played) {
          played = true;
          if (gemResult.audio) activeAudioRef.current = gemResult.audio;
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.warn("[Voice] Gemini TTS failed:", (err as Error)?.message);
        }
      }
    }

    // FALLBACK: Web Speech API
    if (!played && !cascadeAbort.signal.aborted) {
      console.warn("[Voice] Gemini TTS unavailable — trying Web Speech fallback");
      try {
        await browserSpeak(cleanText);
        played = true;
        console.log("[Voice] Web Speech fallback PLAYED");
      } catch (err) {
        console.warn("[Voice] Web Speech fallback failed:", err);
      }
    }

    if (!played) {
      console.error("[Voice] ALL TTS backends failed — no audio output");
    }

    // Exit speaking state
    clearTimeout(safetyTimer);
    abortControllerRef.current = null;
    activeAudioRef.current = null;
    markTTSEnd();
    updateAiResponding(false);
    OrbState.voiceState = "listening";

    // ═══ POST-TTS ECHO COOLDOWN — keep speakingRef true for 1.5s after TTS ends ═══
    // This prevents the mic from picking up the tail-end echo of TTS audio
    await new Promise(r => setTimeout(r, 1500));
    speakingRef.current = false;

    if (!options?.skipMicToggle) resumeSTT();
  }, [browserSpeak, clearRestartTimer, resumeSTT, updateAiResponding]);

  /** speakFast: identical to speak (unified pipeline) */
  const speakFast = useCallback(async (text: string) => {
    await speak(text);
  }, [speak]);

  /** startThinking: processing indicator */
  const startThinking = useCallback(() => {
    OrbState.voiceState = "thinking";
  }, []);

  // ═══ Speech Recognition Factory ═══
  const createRecognition = useCallback((onCmd: (c: string) => void) => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => { setListening(true); markSTTStart(); };

    rec.onresult = (e: any) => {
      consecutiveAbortsRef.current = 0;

      let hasFinal = false;
      let fullInterimText = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        const transcript = result?.[0]?.transcript?.trim() || "";
        if (!transcript) continue;

        // ── SELF-HEARING GUARD ──
        if (speakingRef.current || VoiceState.aiResponding) {
          if (STOP_PATTERNS.test(transcript)) {
            bargeIn();
            speechBufferRef.current = "";
            return;
          }
          if (result.isFinal && transcript.split(/\s+/).length >= 3) {
            bargeIn();
          }
          continue;
        }

        if (result.isFinal) {
          hasFinal = true;
          // ═══ DEDUP: merge overlapping chunks instead of blind concat ═══
          const existing = speechBufferRef.current.trim();
          if (!existing) {
            speechBufferRef.current = transcript;
          } else if (existing === transcript || existing.endsWith(transcript)) {
            // exact duplicate or already contained — skip
          } else if (transcript.startsWith(existing)) {
            // new transcript is a superset — replace
            speechBufferRef.current = transcript;
          } else {
            // Check word-level overlap
            const aWords = existing.split(/\s+/);
            const bWords = transcript.split(/\s+/);
            const maxOverlap = Math.min(aWords.length, bWords.length);
            let merged = false;
            for (let ov = maxOverlap; ov > 0; ov--) {
              const aTail = aWords.slice(-ov).join(" ").toLowerCase();
              const bHead = bWords.slice(0, ov).join(" ").toLowerCase();
              if (aTail === bHead) {
                speechBufferRef.current = `${existing} ${bWords.slice(ov).join(" ")}`.trim();
                merged = true;
                break;
              }
            }
            if (!merged) {
              speechBufferRef.current = `${existing} ${transcript}`;
            }
          }
        } else {
          fullInterimText = transcript;
        }
      }

      if (speakingRef.current || VoiceState.aiResponding) return;
      if (!hasFinal) return;

      if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);

      const turnState = detectTurnState([speechBufferRef.current], "pt-BR");
      const silenceMs = getOptimalSilenceDuration(turnState);

      speechDebounceRef.current = setTimeout(() => {
        const rawText = speechBufferRef.current.trim();
        speechBufferRef.current = "";
        if (!rawText || !onCmdRef.current) return;

        // ═══ DEDUP repeated phrases before processing ═══
        const fullText = deduplicateRepeatedPhrases(rawText);

        const normalized = normalizeSpeechText(fullText);
        const now = Date.now();

        if (normalized.length < 3) return;

        // Duplicate guard
        if (normalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000) return;

        // Echo guard
        if (lastSpokenTextRef.current && now - lastSpokenAtRef.current <= ECHO_WINDOW_MS) {
          if (isEchoOf(normalized, lastSpokenTextRef.current)) {
            console.log("[Voice] Echo suppressed:", normalized.slice(0, 50));
            return;
          }
        }

        lastProcessedTranscriptRef.current = normalized;
        lastProcessedAtRef.current = now;

        // ═══ VOICE IDENTITY TRIGGER — notify NeuralVision on first transcription ═══
        try { window.dispatchEvent(new CustomEvent("orion:voice-transcription", { detail: { text: fullText } })); } catch {}

        markSTTEnd();
        onCmdRef.current(fullText);
      }, silenceMs);
    };

    rec.onend = () => {
      // Don't null recRef immediately — avoid creating new instances rapidly
      if (intentionalStopRef.current) { recRef.current = null; setListening(false); return; }
      if (speakingRef.current) { recRef.current = null; setListening(false); return; }
      // Keep listening state true during restart to avoid UI flicker
      if (onCmdRef.current) {
        recRef.current = null;
      // Long delay to prevent rapid mic cycling — each start() = OS mic sound
        scheduleRecognitionRestart(isMobile() ? 5000 : 800);
        return;
      }
      recRef.current = null;
      setListening(false);
    };

    rec.onerror = (e: any) => {
      console.warn("[Voice] STT error:", e.error);
      recRef.current = null;
      if (intentionalStopRef.current) return;

      if (e.error === "aborted") {
        consecutiveAbortsRef.current++;
        if (consecutiveAbortsRef.current >= MAX_CONSECUTIVE_ABORTS) {
          console.warn(`[Voice] ${MAX_CONSECUTIVE_ABORTS} consecutive aborts — cooldown 5s`);
          setListening(false);
          setTimeout(() => {
            if (!intentionalStopRef.current && onCmdRef.current && isMicOwner(singletonIdRef.current)) {
              consecutiveAbortsRef.current = 0;
              startListeningFresh(onCmdRef.current);
            }
          }, 5000);
          return;
        }
        scheduleRecognitionRestart(isMobile() ? 5000 : 1000 * Math.pow(2, consecutiveAbortsRef.current - 1));
        return;
      }

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setListening(false);
        intentionalStopRef.current = true; // stop further restart attempts
        if (!_micPermissionToastShown) {
          _micPermissionToastShown = true;
          toast.error("Permissão do microfone bloqueada", { id: "mic-blocked" });
        }
        return;
      }

      if (e.error === "no-speech") {
        // no-speech is normal — with 4s tolerance, just wait longer
        // DON'T restart immediately — wait for user to speak
        console.log("[Voice] No speech detected — waiting (4s tolerance)");
        setListening(true);
        return; // Keep listening open, don't restart
      }

      if (e.error === "network") {
        console.warn("[Voice] Network error — retry with long delay");
        scheduleRecognitionRestart(isMobile() ? 8000 : 3000);
        return;
      }

      // Other errors — long delay before retry
      scheduleRecognitionRestart(isMobile() ? 8000 : 3000);
    };

    return rec;
  }, [bargeIn, scheduleRecognitionRestart]);

  // ═══ Start Fresh Recognition Instance ═══
  const startListeningFresh = useCallback((onCmd: (c: string) => void) => {
    if (!isMicOwner(singletonIdRef.current)) { 
      console.log("[Voice] ❌ Not mic owner");
      setListening(false); 
      return; 
    }
    intentionalStopRef.current = false;
    try { recRef.current?.abort?.(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;

    const rec = createRecognition(onCmd);
    if (!rec) { 
      console.log("[Voice] ❌ Web Speech not supported in this browser");
      setListening(false); 
      return; 
    }

    recRef.current = rec;
    registerMicRec(rec, "command");

    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      recRef.current = null;
      setTimeout(() => {
        if (!intentionalStopRef.current && onCmdRef.current === onCmd && isMicOwner(singletonIdRef.current)) {
          startListeningFresh(onCmd);
        }
      }, 250);
    }
  }, [createRecognition]);

  // ═══ Public: Start Listening (with mic priming) ═══
  const startListening = useCallback((onCmd: (c: string) => void) => {
    console.log("[Voice] 📞 startListening called", { useGCPSTT: useGCPSTTRef.current });
    const boot = async () => {
      singletonIdRef.current = claimMic("command");
      intentionalStopRef.current = false;
      voiceActiveRef.current = true;
      clearRestartTimer();
      onCmdRef.current = onCmd;
      setListening(false);

      // Prime microphone for reliable auto-start
      await primeMicrophone();

      // Guard against stale state after async prime
      if (intentionalStopRef.current || onCmdRef.current !== onCmd) return;

      // ═══ TRY GCP STT FIRST ═══
      if (useGCPSTTRef.current) {
        try {
          const gcpChunkIntervalMs = 1400;

          // Reuse existing GCP session if active (just resume if paused)
          if (gcpSessionRef.current?.isActive()) {
            if (gcpSessionRef.current.isPaused()) {
              gcpSessionRef.current.resume();
            }
            setListening(true);
            markSTTStart();
            console.log("[Voice] ✅ GCP STT reused — no mic teardown");
            return;
          }

          const session = createGCPSTTSession({
            languageCode: "pt-BR",
            sampleRate: 16000,
            chunkIntervalMs: gcpChunkIntervalMs,
            onFinal: (text, confidence) => {
              if (!onCmdRef.current || intentionalStopRef.current) return;
              if (speakingRef.current || VoiceState.aiResponding) {
                if (STOP_PATTERNS.test(text)) {
                  bargeIn();
                  return;
                }
                if (text.split(/\s+/).length >= 3) {
                  bargeIn();
                }
                return;
              }

              const cleanedText = deduplicateRepeatedPhrases(text.trim());
              const normalized = normalizeSpeechText(cleanedText);
              if (normalized.length < 2) return;
              const wordCount = normalized.split(/\s+/).filter(Boolean).length;

              const SHORT_ACTION_WHITELIST = /^(olha|olhe|olho|ve|veja|le|leia|para|pare|stop|sim|nao|não|ok|certo|aqui|isso|isto|esse|essa|agora|chega|fala|hey|ei|oi)$/i;
              const hasShortAction = normalized.split(/\s+/).some(w => SHORT_ACTION_WHITELIST.test(w));

              if (confidence > 0 && confidence < 0.18 && wordCount <= 2 && !hasShortAction) {
                console.log(`[Voice] GCP STT descartado (silent): "${cleanedText}" (${(confidence * 100).toFixed(0)}%)`);
                return;
              }

              sentenceAccumulatorRef.current = mergeTranscriptSegments(sentenceAccumulatorRef.current, cleanedText);

              if (sentenceTimerRef.current) {
                clearTimeout(sentenceTimerRef.current);
                sentenceTimerRef.current = null;
              }

              // Adaptive merge window — fast for finished sentences, patient for trailing words.
              const turnState = detectTurnState([sentenceAccumulatorRef.current], "pt-BR");
              const mergeWindow = getOptimalSilenceDuration(turnState);

              sentenceTimerRef.current = setTimeout(() => {
                const mergedText = deduplicateRepeatedPhrases(sentenceAccumulatorRef.current.trim());
                sentenceAccumulatorRef.current = "";
                if (!mergedText || !onCmdRef.current || intentionalStopRef.current) return;

                const mergedNormalized = normalizeSpeechText(mergedText);
                const now = Date.now();
                if (mergedNormalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000) return;

                if (lastSpokenTextRef.current && now - lastSpokenAtRef.current <= ECHO_WINDOW_MS) {
                  if (isEchoOf(mergedNormalized, lastSpokenTextRef.current)) {
                    console.log("[Voice] GCP Echo suppressed:", mergedNormalized.slice(0, 50));
                    return;
                  }
                }

                lastProcessedTranscriptRef.current = mergedNormalized;
                lastProcessedAtRef.current = now;

                try { window.dispatchEvent(new CustomEvent("orion:voice-transcription", { detail: { text: mergedText } })); } catch {}

                markSTTEnd();
                console.log(`[Voice] GCP STT merged in ${mergeWindow}ms (turn=${turnState}): "${mergedText}" (${(confidence * 100).toFixed(0)}%)`);
                onCmdRef.current(mergedText);
              }, mergeWindow);
            },
            onError: (err) => {
              console.warn("[Voice] GCP STT error:", err, "— falling back to Web Speech silently");
              // Fallback to Web Speech API
              useGCPSTTRef.current = false;
              gcpSessionRef.current?.destroy();
              gcpSessionRef.current = null;
              if (onCmdRef.current && !intentionalStopRef.current) {
                setTimeout(() => {
                  if (onCmdRef.current && !intentionalStopRef.current) {
                    startListeningFresh(onCmdRef.current);
                  }
                }, 80);
              }
            },
          });

          gcpSessionRef.current = session;
          const started = await session.start();

          if (started && !intentionalStopRef.current) {
            setListening(true);
            markSTTStart();
            console.log("[Voice] ✅ Google Cloud STT ativo — streaming em tempo real");
            return; // GCP STT running, no need for Web Speech
          }
        } catch (err) {
          console.warn("[Voice] GCP STT init failed:", err);
        }
      }

      // ═══ FALLBACK: Web Speech API ═══
      console.log("[Voice] 🔄 Falling back to Web Speech API...");
      startListeningFresh(onCmd);
    };

    void boot();
  }, [clearRestartTimer, startListeningFresh, bargeIn]);

  // ═══ Public: Stop ═══
  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    voiceActiveRef.current = false;
    clearRestartTimer();
    onCmdRef.current = null;
    speakingRef.current = false;
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    if (sentenceTimerRef.current) { clearTimeout(sentenceTimerRef.current); sentenceTimerRef.current = null; }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    // Soft-stop GCP STT (keeps mic stream alive, no cycling)
    if (gcpSessionRef.current?.isActive()) {
      gcpSessionRef.current.stop();
    }
    // Don't null gcpSessionRef — can be resumed later
    speechBufferRef.current = "";
    sentenceAccumulatorRef.current = "";
    try { speechSynthesis.cancel(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    releaseMic(singletonIdRef.current);
    setListening(false);
  }, [clearRestartTimer]);

  // ── Cleanup on unmount — FULL teardown only here ──
  useEffect(() => () => {
    clearRestartTimer();
    voiceActiveRef.current = false;
    intentionalStopRef.current = true;
    // Full destroy on unmount — this is the only place we do full teardown
    if (gcpSessionRef.current) {
      try { gcpSessionRef.current.destroy(); } catch {}
    }
    gcpSessionRef.current = null;
    if (sentenceTimerRef.current) { clearTimeout(sentenceTimerRef.current); sentenceTimerRef.current = null; }
    sentenceAccumulatorRef.current = "";
    try { recRef.current?.abort?.(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    releaseMic(singletonIdRef.current);
  }, [clearRestartTimer]);

  return {
    listening, supported, ttsOn, setTtsOn,
    speak, speakFast, startListening, stop,
    bargeIn, startThinking,
    abortControllerRef, speechQueueRef, bargeInCallbackRef, voiceActiveRef,
  };
}
