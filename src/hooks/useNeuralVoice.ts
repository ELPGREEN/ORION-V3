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
import { speakWithKokoroTTS } from "@/lib/tts/kokoroTTS";
// adaptiveVoiceStyle, sttFallbackChain, audioWorkletManager REMOVED — performance bottlenecks
import { markSTTStart, markSTTEnd, markTTSStart, markTTSEnd } from "@/lib/neural/pipeline-latency-tracker";
import { claimMic, isMicOwner, releaseMic, primeSharedMic, startSharedMic, stopSharedMic, isMicStarted } from "@/lib/voice/micArbiter";
import { ensurePersistentMic, isMobile as isMobilePersistent } from "@/lib/voice/persistentMic";
import { createGCPSTTSession, type GCPSTTSession } from "@/lib/voice/gcpSTT";
import { getVoiceThresholds } from "@/lib/voice/voiceThresholds";

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
const ACTION_PHRASE_REGEX = "prepare-?se\\s+para\\s+(?:a\\s+)?a[cç][aã]o";
const MAXIMO_PHRASE_REGEX = "(?:d(?:eb|r)i?n?(?:e|in)?|debr\\w{0,8}|dri)\\s+(?:[ée]\\s+)?(?:ao|o)\\s+m[aá]ximo";
const FORBIDDEN_ORION_CATCHPHRASE_REGEXES = [
  new RegExp(`${ACTION_PHRASE_REGEX}[\\s,.!?-]*(?:${MAXIMO_PHRASE_REGEX}\\s*(?:e\\s+)?)?deixa\\s+que\\s+eu\\s+te\\s+proteja`, "gi"),
  new RegExp(`${ACTION_PHRASE_REGEX}[^.!?\\n]*?(?:proteja|proteger)[^.!?\\n]*`, "gi"),
  new RegExp(ACTION_PHRASE_REGEX, "gi"),
  new RegExp(`${MAXIMO_PHRASE_REGEX}(?:\\s+e\\s+deixa\\s+que\\s+eu\\s+te\\s+proteja)?`, "gi"),
  /deixa\s+que\s+eu\s+te\s+proteja/gi,
];

const NORMALIZE_DIACRITICS_REGEX = /[\u0300-\u036f]/g;
const NORMALIZE_NON_ALPHANUMERIC_REGEX = /[^\p{L}\p{N}\s]/gu;

const ECHO_WINDOW_MS = 18000;
const ECHO_JACCARD_THRESHOLD = 0.50;
const MAX_CONSECUTIVE_ABORTS = 5;
const MAX_CONSECUTIVE_NO_SPEECH = 8;
const NO_SPEECH_TIMEOUT_MS = 3000; // Tolerate natural pauses before considering speech ended
const RESTART_DELAY_MS = isMobile() ? 2000 : 500; // Optimized from 1500ms — 3x faster reconnect
const GCP_FINAL_MERGE_MS = 300; // Brief merge window to combine split STT segments into one command

// ═══ Shared State ═══
export const VoiceState = { aiResponding: false, lastSpokenText: "", lastSpokenAt: 0, lastSpokenTokens: new Set<string>() };

let _voiceBootstrapDone = false;
const _micPermissionToastShown = false;
function ensureVoiceBootstrapOnce() {
  if (_voiceBootstrapDone) return;
  _voiceBootstrapDone = true;
  initVoicePicker();
}

// ═══ Text Utilities ═══

export function cleanTextForSpeech(text: string): string {
  const sanitized = sanitizeOrionSpeechText(text);
  return sanitized
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

function sanitizeOrionSpeechText(text: string): string {
  let sanitized = text;
  for (const pattern of FORBIDDEN_ORION_CATCHPHRASE_REGEXES) {
    sanitized = sanitized.replace(pattern, " ");
  }
  const residue = sanitized
    .replace(/[.,!?;:-]+/g, " ")
    .replace(WHITESPACE_CLEAN_REGEX, " ")
    .trim();
  if (!residue || /^(?:e|a[ií]|ent[aã]o)$/i.test(residue)) {
    return "";
  }
  sanitized = sanitized.replace(WHITESPACE_CLEAN_REGEX, " ").trim();
  return deduplicateRepeatedPhrases(sanitized);
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
function isEchoOf(input: string, spoken: string, cachedTokens?: Set<string>): boolean {
  if (!spoken) return false;
  if (input.length < 5) return input === spoken;
  if (spoken.includes(input.slice(0, 60)) || input.includes(spoken.slice(0, 60))) return true;
  if (input.length >= 10 && spoken.includes(input.slice(0, 25))) return true;

  const wordsA = new Set(input.split(/\s+/).filter(w => w.length > 2));
  const wordsB = cachedTokens || new Set(spoken.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size < 2 || wordsB.size < 2) return false;

  let overlap = 0;
  if (wordsA.size <= wordsB.size) {
    for (const w of wordsA) { if (wordsB.has(w)) overlap++; }
  } else {
    for (const w of wordsB) { if (wordsA.has(w)) overlap++; }
  }

  return overlap / Math.min(wordsA.size, wordsB.size) > ECHO_JACCARD_THRESHOLD;
}

// ═══ Legacy Exported Functions ═══


// ═══ Interface ═══

export interface UseNeuralVoiceReturn {
  listening: boolean;
  noSpeechDetected: boolean;
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
  setAiRespondingOrPreferLocal?: ((val: boolean) => void) | boolean,
): UseNeuralVoiceReturn {
  const preferLocalWebSpeech = typeof setAiRespondingOrPreferLocal === "boolean"
    ? setAiRespondingOrPreferLocal
    : false;
  const setAiResponding = typeof setAiRespondingOrPreferLocal === "function"
    ? setAiRespondingOrPreferLocal
    : undefined;

  // ── State ──
  const [listening, setListening] = useState(false);
  const [noSpeechDetected, setNoSpeechDetected] = useState(false);
  const [supported, setSupported] = useState(true); // GCP STT always available via edge function
  const [ttsOn, setTtsOn] = useState(true);
  const ttsRef = useRef(true);

  // ── Refs ──

  const noSpeechTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const lastProcessedTranscriptRef = useRef("");
  const lastProcessedAtRef = useRef(0);
  const keepAliveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const consecutiveAbortsRef = useRef(0);
  const consecutiveNoSpeechRef = useRef(0);
  const voiceActiveRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const singletonIdRef = useRef(0);
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioWorkletActiveRef = useRef(false);

  // Wraps setListening + a "no speech" detection timer.
  // Threshold and suppression are platform-aware (see voiceThresholds.ts).
  const setListeningWithTimer = useCallback((val: boolean) => {
    setListening(val);
    if (val) {
      // Clear any stale "no sound" flag the moment we start listening again.
      setNoSpeechDetected(false);
      const cfg = getVoiceThresholds();
        // fallback) is started. Silence after that is just the user being quiet,
        // never "SEM SOM".
        const session = gcpSessionRef.current;
        const gcpHealthy = !!session && session.isActive() && !session.isPaused();
        const webSpeechHealthy = isMicStarted();
        if (gcpHealthy || webSpeechHealthy) return;
        setNoSpeechDetected(true);
        toast.info("Não estou te ouvindo... Verifique se o microfone está por perto.");
      }, cfg.noSpeechToastMs);
    } else {
      if (noSpeechTimerRef.current) clearTimeout(noSpeechTimerRef.current);
      setNoSpeechDetected(false);

    }
  }, []);
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
  useEffect(() => {
    useGCPSTTRef.current = !preferLocalWebSpeech;
  }, [preferLocalWebSpeech]);

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
      releaseMic(singletonIdRef.current);
      clearRestartTimer();
    };

    ensureVoiceBootstrapOnce();
    const voice = getOrionVoice();
    if (voice) maleVoiceRef.current = voice;

    const handler = () => {
      const v = getOrionVoice();
      if (v) maleVoiceRef.current = v;
    };
    speechSynthesis?.addEventListener?.("voiceschanged", handler);

    // Expose mic rec ref for streaming queue to stop during TTS


    return () => {
      speechSynthesis?.removeEventListener?.("voiceschanged", handler);
      cleanup();
    };
  }, [clearRestartTimer]);

  // ═══ STT Restart Scheduler ═══


  // ═══ Resume STT after TTS ═══
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

    // v32: On barge-in, ensure Web Speech hardware is stopped if it was running
    stopSharedMic();

    if (bargeInCallbackRef.current) bargeInCallbackRef.current();
  }, [updateAiResponding]);
  const startListeningFresh = useCallback((onCmd: (c: string) => void) => {
    if (!isMicOwner(singletonIdRef.current)) {
      setListeningWithTimer(false); OrbState.voiceState = "idle";
      return;
    }
    intentionalStopRef.current = false;

    // v32: Web Speech ONLY if GCP is explicitly disabled or failed.
    // Ensure Web Speech hardware is started explicitly.
    singletonIdRef.current = claimMic("command", {
      onStart: () => {
        setListeningWithTimer(true);
        markSTTStart();
        OrbState.voiceState = "listening";
        console.log("[Voice] Shared Mic session started for COMMAND");
      },
      onResult: (e) => {
        if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; }
        setNoSpeechDetected(false); consecutiveNoSpeechRef.current = 0;
        consecutiveAbortsRef.current = 0;

        let hasFinal = false;
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const result = e.results[i];
          const transcript = result?.[0]?.transcript?.trim() || "";
          if (!transcript) continue;

          if (speakingRef.current || VoiceState.aiResponding) {
            if (STOP_PATTERNS.test(transcript)) { bargeIn(); speechBufferRef.current = ""; return; }
            if (result.isFinal && transcript.split(/\s+/).length >= 3) { bargeIn(); }
            continue;
          }

          if (result.isFinal) {
            hasFinal = true;
            const existing = speechBufferRef.current.trim();
            if (!existing) speechBufferRef.current = transcript;
            else if (existing === transcript || existing.endsWith(transcript)) {}
            else if (transcript.startsWith(existing)) speechBufferRef.current = transcript;
            else {
              const aWords = existing.split(/\s+/);
              const bWords = transcript.split(/\s+/);
              const maxOverlap = Math.min(aWords.length, bWords.length);
              let merged = false;
              for (let ov = maxOverlap; ov > 0; ov--) {
                if (aWords.slice(-ov).join(" ").toLowerCase() === bWords.slice(0, ov).join(" ").toLowerCase()) {
                  speechBufferRef.current = `${existing} ${bWords.slice(ov).join(" ")}`.trim();
                  merged = true; break;
                }
              }
              if (!merged) speechBufferRef.current = `${existing} ${transcript}`;
            }
          }
        }

        if (speakingRef.current || VoiceState.aiResponding || !hasFinal) return;
        if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);

        const turnState = detectTurnState([speechBufferRef.current], "pt-BR");
        const silenceMs = Math.round(getOptimalSilenceDuration(turnState) * getVoiceThresholds().turnSilenceMultiplier);

        speechDebounceRef.current = setTimeout(() => {
          const rawText = speechBufferRef.current.trim();
          speechBufferRef.current = "";
          if (!rawText || !onCmdRef.current) return;
          const fullText = deduplicateRepeatedPhrases(rawText);
          const normalized = normalizeSpeechText(fullText);
          if (normalized.length < 3) return;
          if (normalized === lastProcessedTranscriptRef.current && Date.now() - lastProcessedAtRef.current < 6000) return;
          if (VoiceState.lastSpokenText && Date.now() - VoiceState.lastSpokenAt < ECHO_WINDOW_MS) { if (isEchoOf(normalized, VoiceState.lastSpokenText, VoiceState.lastSpokenTokens)) return; }

          lastProcessedTranscriptRef.current = normalized;
          lastProcessedAtRef.current = Date.now();
          window.dispatchEvent(new CustomEvent("orion:voice-transcription", { detail: { text: fullText } })); window.dispatchEvent(new CustomEvent("orion:user-transcript", { detail: { text: fullText } }));
          markSTTEnd();
          onCmdRef.current(fullText);
        }, silenceMs);
      },
      onEnd: () => {
        if (intentionalStopRef.current || speakingRef.current) {
          setListeningWithTimer(false); OrbState.voiceState = "idle"; return;
        }
        if (onCmdRef.current) {
          setListeningWithTimer(true); OrbState.voiceState = "listening";
        }
      },
      onError: (e) => {
        console.warn("[Voice] Shared Mic Error:", e.error);
        if (e.error === "no-speech") {
          consecutiveNoSpeechRef.current++;
          if (consecutiveNoSpeechRef.current >= MAX_CONSECUTIVE_NO_SPEECH) {
            console.log("[Voice] Too many consecutive no-speech errors, stopping auto-restart.");
            stop();
            return;
          }
          setListeningWithTimer(true); OrbState.voiceState = "listening";
        }
      }
    });

    // Explicitly start the Web Speech hardware
    startSharedMic();
  }, [bargeIn]);
  const resumeSTT = useCallback(() => {
    OrbState.voiceState = "listening";
    if (!onCmdRef.current || intentionalStopRef.current) return;

    // Re-claim mic reservation
    singletonIdRef.current = claimMic("command");

    // Flush any pending browser-STT buffer only when GCP STT is NOT the active path.
    if (speechBufferRef.current.trim() && onCmdRef.current && !gcpSessionRef.current?.isActive()) {
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

    // ESSENCIAL: Delay de segurança após o TTS para evitar eco (mesmo com fone)
    // v32: 800ms de "surdez" total após o Orion falar.
    setTimeout(() => {
      if (!onCmdRef.current || intentionalStopRef.current || speakingRef.current) return;

      // If GCP STT is active (paused or running), just resume — no teardown
      if (gcpSessionRef.current?.isActive()) {
        if (gcpSessionRef.current.isPaused()) {
          gcpSessionRef.current.resume();
        }
        setListeningWithTimer(true);
        OrbState.voiceState = "listening";
        console.log("[Voice] GCP STT resumed after safety delay");
        return;
      }

      // Fallback to Web Speech if GCP not used/failed
      if (!useGCPSTTRef.current) {
        startListeningFresh(onCmdRef.current);
      }
    }, 800);
  }, [startListeningFresh]);

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

  // ═══ Mic Watchdog — auto-resume GCP STT if paused ═══
  useEffect(() => {
    micWatchdogRef.current = setInterval(() => {
      if (!voiceActiveRef.current || intentionalStopRef.current || speakingRef.current || VoiceState.aiResponding) return;
      // v32: Watchdog ensures Web Speech is NOT running if GCP is active
      if (useGCPSTTRef.current && gcpSessionRef.current?.isActive() && isMicStarted()) {
        console.log("[Voice] Watchdog: Web Speech running while GCP active — stopping hardware");
        stopSharedMic();
      }
      if (!onCmdRef.current || !useGCPSTTRef.current) return;

      // If GCP session exists but is paused, just resume — no new session needed
      if (gcpSessionRef.current?.isActive() && gcpSessionRef.current.isPaused()) {
        console.log("[Voice] Watchdog: GCP STT paused — resuming (no teardown)");
        gcpSessionRef.current.resume();
        setListeningWithTimer(true);
            OrbState.voiceState = "listening";
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
  const speak = useCallback(async (text: string, options?: { skipMicToggle?: boolean; voice?: string; instructions?: string }) => {
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
    const normText = normalizeSpeechText(text).slice(0, 800);
    VoiceState.lastSpokenText = normText;
    VoiceState.lastSpokenTokens = new Set(normText.split(/\s+/).filter(w => w.length > 2));
    VoiceState.lastSpokenAt = Date.now();
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
    // v32: Explicitly stop Web Speech during TTS to avoid echo "beeps"
    stopSharedMic();


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
          options?.voice || "Enceladus",
          cascadeAbort.signal,
          options?.instructions || "Você é ORION, assistente IA pessoal. Voz MASCULINA jovem-adulta clara e confiante. Fale CONTÍNUO sem pausas — máximo 0.15s entre frases. Tom natural e direto, com personalidade. NUNCA pare no meio de frase.",
          "pt-BR",
        );
        console.log("[Voice] Gemini TTS result:", gemResult.played ? "PLAYED" : "NOT PLAYED");
        if (gemResult.played) {
          played = true;
          if (gemResult.audio) activeAudioRef.current = gemResult.audio;
        } else if (!cascadeAbort.signal.aborted) {
          // SECONDARY: Kokoro TTS — Local-first high quality alternative
          console.log("[Voice] Gemini failed, trying Kokoro TTS (af_heart)...");
          const kokResult = await speakWithKokoroTTS(cleanText, "af_heart", cascadeAbort.signal);
          if (kokResult.played) {
            played = true;
            if (kokResult.audio) activeAudioRef.current = kokResult.audio;
          }
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





  // ═══ Public: Start Listening (with mic priming) ═══
  const startListening = useCallback((onCmd: (c: string) => void) => {
    console.log("[Voice] 📞 startListening called", { useGCPSTT: useGCPSTTRef.current });
    const boot = async () => {
      singletonIdRef.current = claimMic("command");
      intentionalStopRef.current = false;
      voiceActiveRef.current = true;
      consecutiveNoSpeechRef.current = 0;

      clearRestartTimer();
      setListeningWithTimer(false); OrbState.voiceState = "idle";

      // Prime microphone for reliable auto-start
      await primeMicrophone();

      // Guard against stale state after async prime
      if (intentionalStopRef.current || onCmdRef.current !== onCmd) return;

      // ═══ TRY GCP STT FIRST ═══
      if (useGCPSTTRef.current) {
        try {
          // v32: Kill Web Speech before starting GCP to avoid competition/beeps
          stopSharedMic();

          const voiceCfg = getVoiceThresholds();
          const gcpChunkIntervalMs = voiceCfg.gcpChunkIntervalMs;

          // Reuse existing GCP session if active (just resume if paused)
          if (gcpSessionRef.current?.isActive()) {
            if (gcpSessionRef.current.isPaused()) {
              gcpSessionRef.current.resume();
            }
            setListeningWithTimer(true);
            OrbState.voiceState = "listening";
            markSTTStart();
            console.log("[Voice] ✅ GCP STT reused — no mic teardown");
            return;
          }

          const session = createGCPSTTSession({
            languageCode: "pt-BR", onInterim: (text) => { if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; } setNoSpeechDetected(false); consecutiveNoSpeechRef.current = 0; try { window.dispatchEvent(new CustomEvent("orion:voice-interim-transcription", { detail: { text } })); } catch {} },
            sampleRate: 16000,
            chunkIntervalMs: gcpChunkIntervalMs,
            onFinal: (text, confidence) => {
              if (noSpeechTimerRef.current) { clearTimeout(noSpeechTimerRef.current); noSpeechTimerRef.current = null; } setNoSpeechDetected(false); consecutiveNoSpeechRef.current = 0;

              if (!onCmdRef.current || intentionalStopRef.current) return;
              if (speakingRef.current || VoiceState.aiResponding) {
                if (STOP_PATTERNS.test(text)) {
                  bargeIn();
                  return;
                }
                if (text.split(/\s+/).length >= 2) {
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

              if (confidence > 0 && confidence < voiceCfg.shortUtteranceMinConfidence && wordCount <= 2 && !hasShortAction) {
                console.log(`[Voice] GCP STT descartado (silent): "${cleanedText}" (${(confidence * 100).toFixed(0)}%)`);
                return;
              }

              const duplicatedFinal =
                normalized === lastProcessedTranscriptRef.current &&
                Date.now() - lastProcessedAtRef.current < 2500;
              if (duplicatedFinal) {
                console.log(`[Voice] GCP duplicate final suppressed: "${cleanedText}"`);
                return;
              }

              sentenceAccumulatorRef.current = mergeTranscriptSegments(sentenceAccumulatorRef.current, cleanedText);

              if (sentenceTimerRef.current) {
                clearTimeout(sentenceTimerRef.current);
                sentenceTimerRef.current = null;
              }

              // Adaptive merge window — fast for finished sentences, patient for trailing words.
              const turnState = detectTurnState([sentenceAccumulatorRef.current], "pt-BR");
              const mergeWindow = Math.round(getOptimalSilenceDuration(turnState) * voiceCfg.turnSilenceMultiplier);

              OrbState.voiceState = "thinking"; sentenceTimerRef.current = setTimeout(() => {
                const mergedText = deduplicateRepeatedPhrases(sentenceAccumulatorRef.current.trim());
                sentenceAccumulatorRef.current = "";
                if (!mergedText || !onCmdRef.current || intentionalStopRef.current) return;

                const mergedNormalized = normalizeSpeechText(mergedText);
                const now = Date.now();
                if (mergedNormalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000) return;

                if (VoiceState.lastSpokenText && now - VoiceState.lastSpokenAt <= ECHO_WINDOW_MS) {
                  if (isEchoOf(mergedNormalized, VoiceState.lastSpokenText, VoiceState.lastSpokenTokens)) {
                    console.log("[Voice] GCP Echo suppressed:", mergedNormalized.slice(0, 50));
                    return;
                  }
                }

                lastProcessedTranscriptRef.current = mergedNormalized;
                lastProcessedAtRef.current = now;

                try { window.dispatchEvent(new CustomEvent("orion:voice-transcription", { detail: { text: mergedText } })); window.dispatchEvent(new CustomEvent("orion:user-transcript", { detail: { text: mergedText } })); } catch {}

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
            setListeningWithTimer(true);
            OrbState.voiceState = "listening";
            markSTTStart();
            console.log("[Voice] ✅ Google Cloud STT ativo — streaming em tempo real");
            return; // GCP STT running, no need for Web Speech
          }

          // start() returned false (mic unavailable / AudioContext suspended).
          // Drop the dead session ref so health checks don't think GCP is healthy.
          try { session.destroy(); } catch { /* noop */ }
          gcpSessionRef.current = null;
          console.warn("[Voice] GCP STT could not start — falling back to Web Speech");
        } catch (err) {
          console.warn("[Voice] GCP STT init failed:", err);
          try { gcpSessionRef.current?.destroy(); } catch { /* noop */ }
          gcpSessionRef.current = null;
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


    releaseMic(singletonIdRef.current);
    setListeningWithTimer(false); OrbState.voiceState = "idle";
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

    releaseMic(singletonIdRef.current);
  }, [clearRestartTimer]);

  return {
    listening, supported, ttsOn, setTtsOn,
    noSpeechDetected,
    speak, speakFast, startListening, stop,
    bargeIn, startThinking,
    abortControllerRef, speechQueueRef, bargeInCallbackRef, voiceActiveRef,
  };
}
