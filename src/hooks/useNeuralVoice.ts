/**
 * NEUROCORE AI — Voice Synthesis Hook (JARVIS-Grade v2)
 * 
 * Pipeline: STT (Web Speech) → Command Handler → TTS (Gemini → Web Speech fallback)
 * 
 * Architecture:
 * - Single mic owner via MicArbiter (prevents duplicate recognition)
 * - Mic priming on startListening (auto-start without click when permission exists)
 * - Self-hearing guard (drops transcripts during TTS + echo detection)
 * - Dynamic turn detection (linguistic pattern matching for silence thresholds)
 * - Barge-in support (user can interrupt TTS with stop commands or 3+ words)
 * - STT fallback chain (Groq Whisper → Browser Whisper on network errors)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { OrbState } from "@/components/dashboard/neural/EnergyOrb";
import { toast } from "sonner";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";
import { detectTurnState, getOptimalSilenceDuration } from "@/lib/voice/turnDetection";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
import { loadVoicePrefs, detectStyleCommand, saveVoicePrefs, getCachedVoicePrefs } from "@/lib/voice/adaptiveVoiceStyle";
import { preloadPiper } from "@/lib/tts/piperTTS";
import { feedUserSpeech, feedAIResponse } from "@/lib/neural/voice-evolution-feedback";
import { fallbackTranscribe, chunksToWavBlob } from "@/lib/voice/sttFallbackChain";
import { getAudioWorkletManager } from "@/lib/voice/audioWorkletManager";
import { markSTTStart, markSTTEnd, markTTSStart, markTTSEnd } from "@/lib/neural/pipeline-latency-tracker";
import { claimMic, isMicOwner, registerMicRec, registerMicCleanup, releaseMic } from "@/lib/voice/micArbiter";

// ═══ Constants ═══
const STOP_PATTERNS = /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|pera|peraí|espera|stop|shut\s+up|wait)\s*[.!]?$/i;
const ECHO_WINDOW_MS = 12000;
const ECHO_JACCARD_THRESHOLD = 0.45;
const MAX_CONSECUTIVE_ABORTS = 3;
const MOBILE_REGEX = /android|iphone|ipad|ipod|mobile/i;

// ═══ Shared State ═══
export const VoiceState = { aiResponding: false };

// ═══ Text Utilities ═══

export function cleanTextForSpeech(text: string): string {
  return text
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
    .replace(/^[\s]*[-•*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|/g, " ")
    .replace(/[─═╔╗╚╝║╠╣╬┌┐└┘├┤┬┴┼]/g, "")
    .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️📊📈📉🔍🔎💡🔗📁📂🗂️🗃️]/g, "")
    .replace(/\.{3,}/g, "...")
    .replace(/([!?.])\1+/g, "$1")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/^\.\s*/, "")
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

// ═══ Helpers ═══

function isMobile(): boolean {
  return typeof navigator !== "undefined" && MOBILE_REGEX.test(navigator.userAgent);
}

/** Prime microphone hardware (necessary for reliable auto-start without user gesture) */
async function primeMicrophone(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  try {
    const perm = await navigator.permissions?.query?.({ name: "microphone" as any });
    if (perm?.state !== "granted") return;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    await new Promise(r => setTimeout(r, isMobile() ? 80 : 30));
    stream.getTracks().forEach(t => t.stop());
  } catch (err) {
    console.warn("[Voice] Mic priming failed:", err);
  }
}

/** Jaccard word-overlap echo detection */
function isEchoOf(input: string, spoken: string): boolean {
  if (!spoken || input.length < 5) return false;
  // Substring match (either direction, first 40 chars)
  if (spoken.includes(input.slice(0, 40)) || input.includes(spoken.slice(0, 40))) return true;
  // Jaccard overlap
  const wordsA = new Set(input.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(spoken.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size < 2 || wordsB.size < 2) return false;
  let overlap = 0;
  wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
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

  // ── Sync ──
  const updateAiResponding = useCallback((val: boolean) => {
    VoiceState.aiResponding = val;
    setAiResponding?.(val);
  }, [setAiResponding]);

  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
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

    initVoicePicker();
    const voice = getOrionVoice();
    if (voice) maleVoiceRef.current = voice;

    preloadPiper();
    loadVoicePrefs().catch(() => {});

    const handler = () => {
      const v = getOrionVoice();
      if (v) maleVoiceRef.current = v;
    };
    speechSynthesis?.addEventListener?.("voiceschanged", handler);
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

    const restartDelay = delay ?? (isMobile() ? 200 : 50);
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

    scheduleRecognitionRestart(isMobile() ? 600 : 100);
  }, [scheduleRecognitionRestart]);

  // ═══ Barge-In ═══
  const bargeIn = useCallback(() => {
    try { speechSynthesis.cancel(); } catch {}
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.currentTime = 0; activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speechQueueRef.current = [];
    if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; }
    speakingRef.current = false;
    updateAiResponding(false);
    OrbState.voiceState = "listening";
    if (bargeInCallbackRef.current) bargeInCallbackRef.current();
  }, [updateAiResponding]);

  // ═══ Web Speech TTS (Fallback) ═══
  const browserSpeak = useCallback((rawText: string) => {
    const text = cleanTextForSpeech(rawText);
    if (!text) return Promise.resolve();

    const splitIntoSentences = (t: string): string[] => {
      const sentences = t.match(/[^.!?…;]+[.!?…;]+\s*|[^.!?…;]+$/g) || [t];
      const chunks: string[] = [];
      let current = "";
      for (const s of sentences) {
        if (current.length + s.length > 180 && current.length > 0) {
          chunks.push(current.trim());
          current = s;
        } else { current += s; }
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks;
    };

    const chunks = splitIntoSentences(text);

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
          const pauseMs = idx > 0 ? 30 + Math.random() * 50 : 0;
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
    if (!ttsRef.current || typeof window === "undefined") return;

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
    lastSpokenTextRef.current = normalizeSpeechText(text).slice(0, 320);
    lastSpokenAtRef.current = Date.now();
    speechBufferRef.current = "";
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    clearRestartTimer();

    // ALWAYS stop mic during TTS
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
    feedAIResponse(text);

    const voicePrefs = getCachedVoicePrefs();
    let played = false;

    // PRIMARY: Gemini TTS
    if (!cascadeAbort.signal.aborted) {
      try {
        const gemResult = await speakWithGeminiTTS(
          cleanText,
          voicePrefs.voice_name || "Charon",
          cascadeAbort.signal,
          voicePrefs.style_prompt,
          voicePrefs.language,
        );
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
      console.warn("[Voice] Gemini TTS unavailable — Web Speech fallback");
      try {
        await browserSpeak(cleanText);
        played = true;
      } catch (err) {
        console.warn("[Voice] Web Speech fallback failed:", err);
      }
    }

    if (!played) {
      console.error("[Voice] ALL TTS backends failed");
    }

    // Exit speaking state
    clearTimeout(safetyTimer);
    abortControllerRef.current = null;
    activeAudioRef.current = null;
    speakingRef.current = false;
    markTTSEnd();
    updateAiResponding(false);
    OrbState.voiceState = "listening";

    if (!options?.skipMicToggle) resumeSTT();
  }, [browserSpeak, clearRestartTimer, resumeSTT, updateAiResponding]);

  /** speakFast: identical to speak (unified pipeline) */
  const speakFast = useCallback(async (text: string) => {
    await speak(text);
  }, [speak]);

  /** startThinking: JARVIS "PROCESSING" indicator */
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
      const lastResult = e.results[e.results.length - 1];
      const transcript = lastResult?.[0]?.transcript?.trim() || "";
      const isFinal = lastResult?.isFinal;

      consecutiveAbortsRef.current = 0;
      if (!transcript) return;

      // ── SELF-HEARING GUARD ──
      if (speakingRef.current || VoiceState.aiResponding) {
        if (STOP_PATTERNS.test(transcript.trim())) {
          bargeIn();
          speechBufferRef.current = "";
          return;
        }
        if (isFinal && transcript.split(/\s+/).length >= 3) {
          bargeIn();
        }
        return; // Drop — it's Orion hearing itself
      }

      if (!isFinal) return;

      // Accumulate final transcripts
      speechBufferRef.current = speechBufferRef.current
        ? `${speechBufferRef.current} ${transcript}`
        : transcript;

      if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);

      // Dynamic turn detection
      const turnState = detectTurnState(speechBufferRef.current, "pt-BR");
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

        feedUserSpeech(fullText);

        // Adaptive voice style learning
        const styleResult = detectStyleCommand(fullText, getCachedVoicePrefs());
        if (styleResult.matched) {
          saveVoicePrefs(styleResult.updatedPrefs);
          console.log("[Voice Style] Learned:", styleResult.feedback);
          return;
        }

        markSTTEnd();
        onCmdRef.current(fullText);
      }, silenceMs);
    };

    rec.onend = () => {
      recRef.current = null;
      if (intentionalStopRef.current) { setListening(false); return; }
      if (speakingRef.current) { setListening(false); return; } // resumeSTT handles restart
      if (onCmdRef.current) { scheduleRecognitionRestart(80); return; }
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
        scheduleRecognitionRestart(250 * Math.pow(2, consecutiveAbortsRef.current - 1));
        return;
      }

      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setListening(false);
        toast.error("Permissão do microfone bloqueada");
        return;
      }

      if (e.error === "no-speech") {
        scheduleRecognitionRestart(80);
        return;
      }

      if (e.error === "network") {
        console.warn("[Voice] Network error — STT fallback chain");
        const chunks = audioChunksRef.current;
        if (chunks.length > 0) {
          const wavBlob = chunksToWavBlob(chunks, 16000);
          audioChunksRef.current = [];
          fallbackTranscribe(wavBlob).then(({ text, provider, latencyMs }) => {
            if (text && text.trim().length > 2 && onCmdRef.current) {
              console.log(`[Voice] STT fallback via ${provider} (${latencyMs.toFixed(0)}ms): ${text.slice(0, 60)}`);
              feedUserSpeech(text);
              onCmdRef.current(text);
            }
          }).catch(err => console.warn("[Voice] STT fallback failed:", err));
        }
        scheduleRecognitionRestart(500);
        return;
      }

      scheduleRecognitionRestart(200);
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

      // Start AudioWorklet for STT fallback audio buffering
      if (!audioWorkletActiveRef.current) {
        audioWorkletActiveRef.current = true;
        try {
          const worklet = getAudioWorkletManager({ sampleRate: 16000, chunkSize: 4096 });
          worklet.initialize().then(ok => {
            if (!ok) return;
            worklet.onAudioChunk(chunk => {
              audioChunksRef.current.push(chunk);
              if (audioChunksRef.current.length > 20) audioChunksRef.current.shift();
            });
            worklet.start();
          }).catch(() => {});
        } catch {}
      }

      startListeningFresh(onCmd);
    };

    void boot();
  }, [clearRestartTimer, startListeningFresh]);

  // ═══ Public: Stop ═══
  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    voiceActiveRef.current = false;
    clearRestartTimer();
    onCmdRef.current = null;
    speakingRef.current = false;
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speechBufferRef.current = "";
    try { speechSynthesis.cancel(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    releaseMic(singletonIdRef.current);
    setListening(false);
  }, [clearRestartTimer]);

  // ── Cleanup on unmount ──
  useEffect(() => () => {
    clearRestartTimer();
    voiceActiveRef.current = false;
    intentionalStopRef.current = true;
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
