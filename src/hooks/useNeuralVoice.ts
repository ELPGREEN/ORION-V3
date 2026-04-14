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
const STOP_PATTERNS = /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|pera|peraí|espera|stop|shut\s+up|wait)\s*[.!]?$/i;
const ECHO_WINDOW_MS = 18000;
const ECHO_JACCARD_THRESHOLD = 0.35;
const MAX_CONSECUTIVE_ABORTS = 3;
const MOBILE_REGEX = /android|iphone|ipad|ipod|mobile/i;

// ═══ Shared State ═══
export const VoiceState = { aiResponding: false };

let _voiceBootstrapDone = false;
function ensureVoiceBootstrapOnce() {
  if (_voiceBootstrapDone) return;
  _voiceBootstrapDone = true;
  initVoicePicker();
}

// ═══ Text Utilities ═══

export function cleanTextForSpeech(text: string): string {
  return text
    // Strip code blocks and markdown
    .replace(/```[\s\S]*?```/g, " código omitido ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    .replace(/_{1,3}([^_]+)_{1,3}/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/<[^>]*>/g, "")
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[\s]*[-•*+]\s+/gm, " ")
    .replace(/^\s*\d+\.\s+/gm, " ")
    .replace(/\|/g, " ")
    .replace(/[─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g, "")
    .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g, "")
    // KEY: Remove ALL pause-inducing punctuation — continuous flow
    .replace(/[;:!?]+/g, " ")
    .replace(/[–—]+/g, " ")
    .replace(/,+/g, " ")
    .replace(/\.+/g, " ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeSpeechText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mergeTranscriptSegments(existing: string, incoming: string): string {
  const current = existing.trim();
  const next = incoming.trim();
  if (!current) return next;
  if (!next) return current;

  // Exact duplicate or already contained
  const currentNorm = current.toLowerCase();
  const nextNorm = next.toLowerCase();
  if (currentNorm === nextNorm) return current;
  if (currentNorm.endsWith(nextNorm)) return current;
  if (nextNorm.startsWith(currentNorm)) return next;

  // Word-level overlap detection — only merge if overlap is significant
  const currentWords = current.split(/\s+/);
  const nextWords = next.split(/\s+/);
  const maxOverlap = Math.min(currentWords.length, nextWords.length, 5); // Max 5-word overlap check

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
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
  // Use min of both sets for stricter matching
  return overlap / Math.min(wordsA.size, wordsB.size) > ECHO_JACCARD_THRESHOLD;
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
  const [supported, setSupported] = useState(false);
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

  // ── Sync ──
  const updateAiResponding = useCallback((val: boolean) => {
    VoiceState.aiResponding = val;
    setAiResponding?.(val);
  }, [setAiResponding]);

  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      // GCP STT always supported (edge function), Web Speech as fallback
      setSupported(true);
    }
  }, []);

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
      const pending = speechBufferRef.current.trim();
      speechBufferRef.current = "";
      if (speechDebounceRef.current) {
        clearTimeout(speechDebounceRef.current);
        speechDebounceRef.current = null;
      }
      onCmdRef.current(pending);
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

  // ═══ Mic Watchdog — auto-resume GCP STT if it dies silently ═══
  useEffect(() => {
    micWatchdogRef.current = setInterval(() => {
      if (!voiceActiveRef.current || intentionalStopRef.current || speakingRef.current || VoiceState.aiResponding) return;
      if (!onCmdRef.current || !useGCPSTTRef.current) return;

      // If GCP session exists but is paused, just resume — no new session
      if (gcpSessionRef.current?.isActive() && gcpSessionRef.current.isPaused()) {
        console.log("[Voice] Watchdog: GCP STT paused — resuming (no new session)");
        gcpSessionRef.current.resume();
        setListening(true);
        return;
      }

      // Only recreate if session is truly dead (not active at all)
      if (gcpSessionRef.current && !gcpSessionRef.current.isActive()) {
        console.warn("[Voice] Watchdog: GCP STT died — will use startListeningFresh as fallback");
        gcpSessionRef.current = null;
        // Use Web Speech fallback since we can't call startListening here (circular)
        if (onCmdRef.current && !intentionalStopRef.current) {
          startListeningFresh(onCmdRef.current);
        }
      }
    }, 8000); // Check every 8s instead of 5s to reduce overhead

    return () => {
      if (micWatchdogRef.current) { clearInterval(micWatchdogRef.current); micWatchdogRef.current = null; }
    };
  }, [bargeIn, startListening]);

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
        const fullText = speechBufferRef.current.trim();
        speechBufferRef.current = "";
        if (!fullText || !onCmdRef.current) return;

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
        toast.error("Permissão do microfone bloqueada");
        return;
      }

      if (e.error === "no-speech") {
        // no-speech is normal — restart with long delay to avoid cycling
        scheduleRecognitionRestart(isMobile() ? 5000 : 1000);
        return;
      }

      if (e.error === "network") {
        console.warn("[Voice] Network error — will retry recognition");
        scheduleRecognitionRestart(isMobile() ? 5000 : 1500);
        return;
      }

      scheduleRecognitionRestart(isMobile() ? 5000 : 1500);
    };

    return rec;
  }, [bargeIn, scheduleRecognitionRestart]);

  // ═══ Start Fresh Recognition Instance ═══
  const startListeningFresh = useCallback((onCmd: (c: string) => void) => {
    if (!isMicOwner(singletonIdRef.current)) { setListening(false); return; }
    intentionalStopRef.current = false;
    try { recRef.current?.abort?.(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;

    const rec = createRecognition(onCmd);
    if (!rec) { setListening(false); return; }

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
                // During TTS, check for barge-in
                if (STOP_PATTERNS.test(text)) {
                  bargeIn();
                  return;
                }
                if (text.split(/\s+/).length >= 3) {
                  bargeIn();
                }
                return;
              }

              const normalized = normalizeSpeechText(text);
              if (normalized.length < 2) return;
              const wordCount = normalized.split(/\s+/).filter(Boolean).length;

              // Discard obvious low-confidence noise/hallucinations
              if (confidence > 0 && confidence < 0.35 && wordCount <= 4) {
                console.log(`[Voice] GCP STT descartado por baixa confiança: "${text}" (${(confidence * 100).toFixed(0)}%)`);
                speak("Não consegui entender tudo. Pode repetir ou digitar?").catch(() => {});
                return;
              }

              if (sentenceTimerRef.current) {
                clearTimeout(sentenceTimerRef.current);
                sentenceTimerRef.current = null;
              }
              sentenceAccumulatorRef.current = "";

              const now = Date.now();
              if (normalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000) return;

              if (lastSpokenTextRef.current && now - lastSpokenAtRef.current <= ECHO_WINDOW_MS) {
                if (isEchoOf(normalized, lastSpokenTextRef.current)) {
                  console.log("[Voice] GCP Echo suppressed:", normalized.slice(0, 50));
                  return;
                }
              }

              lastProcessedTranscriptRef.current = normalized;
              lastProcessedAtRef.current = now;

              // ═══ VOICE IDENTITY TRIGGER — notify NeuralVision on first GCP transcription ═══
              try { window.dispatchEvent(new CustomEvent("orion:voice-transcription", { detail: { text: text.trim() } })); } catch {}

              markSTTEnd();
              console.log(`[Voice] GCP STT utterance: "${text}" (${(confidence * 100).toFixed(0)}%)`);
              onCmdRef.current(text.trim());
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
