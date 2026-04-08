/**
 * NEUROCORE AI — Voice Synthesis Hook
 * PRIMARY: Orion Voice Engine (Cache → HuggingFace → Gemini → Piper)
 * All free, no paid APIs. Orion's own voice, independent from Google.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";
import { detectTurnState, getOptimalSilenceDuration } from "@/lib/voice/turnDetection";
import { speakWithOrionVoice } from "@/lib/tts/orionVoiceEngine";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
import { loadVoicePrefs, detectStyleCommand, saveVoicePrefs, getCachedVoicePrefs, type VoiceStylePrefs } from "@/lib/voice/adaptiveVoiceStyle";
import { speakWithPiper, isPiperAvailable, preloadPiper } from "@/lib/tts/piperTTS";
import { useNeuralConfig } from "@/hooks/useNeuralConfig";
import { feedUserSpeech, feedAIResponse, feedSelfSynthesis } from "@/lib/neural/voice-evolution-feedback";
import { speakWithEvolvedVoice } from "@/lib/neural/orion-voice-evolution";
import { fallbackTranscribe, chunksToWavBlob, getSTTFallbackState } from "@/lib/voice/sttFallbackChain";
import { getAudioWorkletManager } from "@/lib/voice/audioWorkletManager";
import { markSTTStart, markSTTEnd, markTTSStart, markTTSEnd } from "@/lib/neural/pipeline-latency-tracker";

// ═══ Text Cleaning for Natural Speech ═══

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

export const VoiceState = {
  aiResponding: false,
};

// ═══ Unified Mic Arbiter — single global owner ═══
import { claimMic, isMicOwner, registerMicRec, registerMicCleanup, releaseMic } from "@/lib/voice/micArbiter";

export interface UseNeuralVoiceReturn {
  listening: boolean;
  supported: boolean;
  ttsOn: boolean;
  setTtsOn: (on: boolean) => void;
  speak: (text: string) => Promise<void>;
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

// Simple barge-in patterns (user wants AI to stop)
const STOP_PATTERNS = /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|pera|peraí|espera|stop|shut\s+up|wait)\s*[.!]?$/i;

export function useNeuralVoice(
  setAiResponding?: (val: boolean) => void,
): UseNeuralVoiceReturn {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [ttsOn, setTtsOn] = useState(true);
  const ttsRef = useRef(true);
  const { config } = useNeuralConfig();
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
  const MAX_CONSECUTIVE_ABORTS = 3;
  /** voiceActiveRef: stays true across STT restart gaps — use to prevent wake word conflicts */
  const voiceActiveRef = useRef(false);
  /** Active Audio element for barge-in cancellation (Google TTS / Kokoro) */
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  /** Singleton ID — this mount's unique ownership token */
  const singletonIdRef = useRef(0);
  /** v30: AudioWorklet chunks for STT fallback */
  const audioChunksRef = useRef<Float32Array[]>([]);
  const audioWorkletActiveRef = useRef(false);

  const updateAiResponding = useCallback((val: boolean) => {
    VoiceState.aiResponding = val;
    setAiResponding?.(val);
  }, [setAiResponding]);

  useEffect(() => { ttsRef.current = ttsOn; }, [ttsOn]);
  useEffect(() => { listeningRef.current = listening; }, [listening]);

  useEffect(() => {
    if (typeof window !== "undefined") setSupported("webkitSpeechRecognition" in window || "SpeechRecognition" in window);
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // ═══ Init voice picker + cleanup — NO claimMic on mount (prevents race with wake word) ═══
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

  const scheduleRecognitionRestart = useCallback((delay?: number) => {
    clearRestartTimer();
    // Stale HMR instance guard
    if (!isMicOwner(singletonIdRef.current)) { setListening(false); return; }
    if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
      setListening(false);
      return;
    }

    const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
    const restartDelay = delay ?? (isMobile ? 200 : 50);

    setListening(true);
    restartTimerRef.current = setTimeout(() => {
      if (intentionalStopRef.current || speakingRef.current || !onCmdRef.current) {
        setListening(false);
        return;
      }
      // If existing recognition is still alive, don't create a new one
      if (recRef.current) {
        try {
          recRef.current.start();
          setListening(true);
        } catch {
          // Already running or failed — recreate
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
      // No existing rec — create fresh
      if (onCmdRef.current) {
        startListeningFresh(onCmdRef.current);
      }
    }, restartDelay);
  }, [clearRestartTimer]);

  const resumeSTT = useCallback(() => {
    // Always try to restart if we have a command handler, even if listeningRef drifted
    if (onCmdRef.current && !intentionalStopRef.current) {
      // ═══ FIX: Re-claim mic ownership after TTS ═══
      // During TTS, wake word or GlobalOrionListener may have claimed the mic.
      // We must re-claim before restarting, otherwise isMicOwner checks fail
      // and STT never restarts (the "listen→speak→DEAD" bug).
      singletonIdRef.current = claimMic("command");

      if (speechBufferRef.current.trim() && onCmdRef.current) {
        const pending = speechBufferRef.current.trim();
        speechBufferRef.current = "";
        if (speechDebounceRef.current) {
          clearTimeout(speechDebounceRef.current);
          speechDebounceRef.current = null;
        }
        onCmdRef.current(pending);
      }
      const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
      scheduleRecognitionRestart(isMobile ? 600 : 100);
    }
  }, [scheduleRecognitionRestart]);

  /** Stop all audio: Web Speech, Audio elements, abort controllers */
  const bargeIn = useCallback(() => {
    try { speechSynthesis.cancel(); } catch {}
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    // Cancel active Audio element (Google TTS / Kokoro)
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
        activeAudioRef.current.src = "";
      } catch {}
      activeAudioRef.current = null;
    }
    speechQueueRef.current = [];
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    speakingRef.current = false;
    updateAiResponding(false);
    if (bargeInCallbackRef.current) bargeInCallbackRef.current();
  }, [updateAiResponding]);

  const browserSpeak = useCallback((rawText: string) => {
    const text = cleanTextForSpeech(rawText);
    if (!text) return Promise.resolve();
    
    // Split into sentence-level chunks for natural prosody variation
    const splitIntoSentences = (t: string): string[] => {
      const sentences = t.match(/[^.!?…;]+[.!?…;]+\s*/g) || [t];
      const chunks: string[] = [];
      let current = "";
      for (const s of sentences) {
        if (current.length + s.length > 180 && current.length > 0) {
          chunks.push(current.trim());
          current = s;
        } else {
          current += s;
        }
      }
      if (current.trim()) chunks.push(current.trim());
      return chunks;
    };

    const chunks = splitIntoSentences(text);

    // ── Subtle prosody variation — just enough to avoid monotone ──
    const getProsodyForChunk = (chunk: string, idx: number, total: number) => {
      const isQuestion = /\?/.test(chunk);
      const isLast = idx === total - 1;
      
      // Minimal variation — sounds robotic when overdone
      let rate = ORION_VOICE_PARAMS.rate + (Math.sin(idx * 2.1) * 0.02);
      let pitch = ORION_VOICE_PARAMS.pitch;
      
      if (isQuestion) { pitch += 0.04; }
      if (isLast && total > 2) { rate -= 0.03; }
      
      return { rate: Math.max(0.9, Math.min(1.35, rate)), pitch: Math.max(0.75, Math.min(1.1, pitch)) };
    };

    return new Promise<void>((resolve) => {
      const webSpeechTimeout = setTimeout(() => {
        try { speechSynthesis.cancel(); } catch {}
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
        resolve();
      }, 60000);

      const keepAlive = setInterval(() => {
        if (speechSynthesis.speaking && !speechSynthesis.paused) {
          speechSynthesis.pause();
          speechSynthesis.resume();
        }
      }, 10000);
      keepAliveRef.current = keepAlive;

      try {
        speechSynthesis.cancel();
        
        const speakNextChunk = (idx: number) => {
          if (idx >= chunks.length) {
            clearTimeout(webSpeechTimeout);
            if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
            speakingRef.current = false;
            updateAiResponding(false);
            resumeSTT();
            resolve();
            return;
          }

          // Tiny natural pause between sentences (30-80ms)
          const pauseMs = idx > 0 ? 30 + Math.random() * 50 : 0;
          
          setTimeout(() => {
            const prosody = getProsodyForChunk(chunks[idx], idx, chunks.length);
            const u = new SpeechSynthesisUtterance(chunks[idx]);
            u.lang = "pt-BR";
            u.rate = prosody.rate;
            u.pitch = prosody.pitch;
            u.volume = ORION_VOICE_PARAMS.volume;
            if (maleVoiceRef.current) u.voice = maleVoiceRef.current;
            u.onend = () => speakNextChunk(idx + 1);
            u.onerror = (ev) => {
              if ((ev as any)?.error === "canceled" || (ev as any)?.error === "interrupted") {
                clearTimeout(webSpeechTimeout);
                if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
                speakingRef.current = false;
                updateAiResponding(false);
                resumeSTT();
                resolve();
                return;
              }
              speakNextChunk(idx + 1);
            };
            speechSynthesis.speak(u);
          }, pauseMs);
        };
        
        speakNextChunk(0);
      } catch {
        clearTimeout(webSpeechTimeout);
        if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
        resolve();
      }
    });
  }, [resumeSTT, updateAiResponding]);

  // speakFast defined after speak below

  /**
   * ═══ TTS — Gemini TTS (Algieba) — Única voz ativa ═══
   * Orion TTS desativado. Apenas Gemini Algieba funciona.
   */
  const speak = useCallback(async (text: string) => {
    if (!ttsRef.current || typeof window === "undefined") return;
    
    try { speechSynthesis.cancel(); } catch {}
    if (activeAudioRef.current) {
      try { activeAudioRef.current.pause(); activeAudioRef.current.src = ""; } catch {}
      activeAudioRef.current = null;
    }
    speakingRef.current = true;
    updateAiResponding(true);
    lastSpokenTextRef.current = normalizeSpeechText(text).slice(0, 320);
    lastSpokenAtRef.current = Date.now();
    speechBufferRef.current = "";
    if (speechDebounceRef.current) { clearTimeout(speechDebounceRef.current); speechDebounceRef.current = null; }
    clearRestartTimer();
    try { recRef.current?.stop(); } catch {}

    const cascadeAbort = new AbortController();
    abortControllerRef.current = cascadeAbort;

    // Dynamic safety timer: ~4s base + ~80ms per char (accounts for multi-sentence Gemini TTS)
    const safetyMs = Math.min(45000, Math.max(12000, 4000 + text.length * 80));
    const safetyTimer = setTimeout(() => {
      if (speakingRef.current) {
        console.warn(`[Voice] Safety timer fired after ${safetyMs}ms — aborting TTS`);
        cascadeAbort.abort();
        speakingRef.current = false;
        updateAiResponding(false);
        resumeSTT();
      }
    }, safetyMs);

    const cleanText = cleanTextForSpeech(text);
    feedAIResponse(text);

    const voicePrefs = getCachedVoicePrefs();
    let played = false;

    // ── PRIMARY: Gemini TTS Algieba ──
    if (!cascadeAbort.signal.aborted) {
      try {
        const gemResult = await speakWithGeminiTTS(
          cleanText,
          "Algieba",
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

    // ── FALLBACK: Browser SpeechSynthesis when Gemini fails ──
    if (!played && !cascadeAbort.signal.aborted) {
      console.warn("[Voice] Gemini TTS indisponível — fallback browser TTS");
      try {
        await browserSpeak(cleanText);
        played = true;
        console.log("[Voice] Browser TTS fallback played successfully");
      } catch (err) {
        console.error("[Voice] Browser TTS fallback also failed:", (err as Error)?.message);
      }
    }

    if (!played) {
      console.error("[Voice] ALL TTS backends failed — Orion is mute for this message");
    }

    clearTimeout(safetyTimer);
    abortControllerRef.current = null;
    activeAudioRef.current = null;
    speakingRef.current = false;
    updateAiResponding(false);
    resumeSTT();
  }, [browserSpeak, clearRestartTimer, resumeSTT, updateAiResponding]);

  /** speakFast: delegates to speak (no robotic SpeechSynthesis) */
  const speakFast = useCallback(async (text: string) => {
    await speak(text);
  }, [speak]);

  // No-op startThinking (filler audio removed)
  const startThinking = useCallback(() => {}, []);

  const createRecognition = useCallback((onCmd: (c: string) => void) => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return null;

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    
    rec.onstart = () => { setListening(true); };
    
    rec.onresult = (e: any) => {
      const lastResult = e.results[e.results.length - 1];
      const transcript = lastResult?.[0]?.transcript?.trim() || "";
      const isFinal = lastResult?.isFinal;
      
      // Reset abort counter only on actual speech data (not just onstart)
      consecutiveAbortsRef.current = 0;
      
      if (!transcript) return;

      // Barge-in: if AI is speaking and user says stop command
      if (speakingRef.current || VoiceState.aiResponding) {
        if (STOP_PATTERNS.test(transcript.trim())) {
          bargeIn();
          speechBufferRef.current = "";
          return;
        }
        // If user speaks 3+ words while AI is speaking, barge in
        if (isFinal && transcript.split(/\s+/).length >= 3) {
          bargeIn();
        }
      }

      if (!isFinal) return;

      speechBufferRef.current = speechBufferRef.current
        ? `${speechBufferRef.current} ${transcript}`
        : transcript;

      if (speechDebounceRef.current) clearTimeout(speechDebounceRef.current);
      
      // ── Dynamic Turn Detection: adapt silence based on phrase completeness ──
      const turnState = detectTurnState(speechBufferRef.current, "pt-BR");
      const silenceMs = getOptimalSilenceDuration(turnState);

      speechDebounceRef.current = setTimeout(() => {
        const fullText = speechBufferRef.current.trim();
        speechBufferRef.current = "";
        if (!fullText || !onCmdRef.current) return;

        const normalized = normalizeSpeechText(fullText);
        const now = Date.now();
        
        if (normalized.length < 3) return;
        
        // Duplicate check
        const isDuplicate = normalized === lastProcessedTranscriptRef.current && now - lastProcessedAtRef.current < 6000;
        
        // Echo detection — bidirectional substring match + Jaccard similarity
        const isEcho = (() => {
          if (!lastSpokenTextRef.current || now - lastSpokenAtRef.current > 8000) return false;
          if (normalized.length < 8) return false;
          const spoken = lastSpokenTextRef.current;
          // Substring match (either direction)
          if (spoken.includes(normalized.slice(0, 40)) || normalized.includes(spoken.slice(0, 40))) return true;
          // Jaccard word overlap: >60% match = echo
          const wordsA = new Set(normalized.split(/\s+/).filter(w => w.length > 2));
          const wordsB = new Set(spoken.split(/\s+/).filter(w => w.length > 2));
          if (wordsA.size < 3 || wordsB.size < 3) return false;
          let overlap = 0;
          wordsA.forEach(w => { if (wordsB.has(w)) overlap++; });
          return overlap / Math.min(wordsA.size, wordsB.size) > 0.6;
        })();

        if (isDuplicate || isEcho) {
          if (isEcho) console.log("[Voice] Echo suppressed:", normalized.slice(0, 50));
          return;
        }

        lastProcessedTranscriptRef.current = normalized;
        lastProcessedAtRef.current = now;
        
        // Feed user speech to voice evolution engine
        feedUserSpeech(fullText);
        
        // ── Adaptive Voice Style: detect style commands (learn silently) ──
        const styleResult = detectStyleCommand(fullText, getCachedVoicePrefs());
        if (styleResult.matched) {
          saveVoicePrefs(styleResult.updatedPrefs);
          console.log("[Voice Style] 🎓 Learned:", styleResult.feedback);
          return; // Don't pass style commands to the AI, just learn silently
        }
        
        onCmdRef.current(fullText);
      }, silenceMs);
    };
    
    rec.onend = () => {
      recRef.current = null;
      if (intentionalStopRef.current) {
        setListening(false);
        return;
      }
      if (speakingRef.current) {
        // ═══ FIX: During TTS, set listening=false (no active recognition) ═══
        // resumeSTT() will restart STT after TTS finishes.
        setListening(false);
        return;
      }
      if (onCmdRef.current) {
        scheduleRecognitionRestart(80);
        return;
      }
      setListening(false);
    };
    
    rec.onerror = (e: any) => {
      console.warn("[Voice] SpeechRecognition error:", e.error);
      recRef.current = null;
      if (intentionalStopRef.current) return;
      if (e.error === "aborted") {
        consecutiveAbortsRef.current++;
        if (consecutiveAbortsRef.current >= MAX_CONSECUTIVE_ABORTS) {
          console.warn(`[Voice] ${MAX_CONSECUTIVE_ABORTS} consecutive aborts — pausing STT for 5s`);
          setListening(false);
          // Auto-retry after 5s cooldown instead of permanently stopping
          setTimeout(() => {
            if (!intentionalStopRef.current && onCmdRef.current && isMicOwner(singletonIdRef.current)) {
              consecutiveAbortsRef.current = 0;
              startListeningFresh(onCmdRef.current);
            }
          }, 5000);
          return;
        }
        // Capped exponential backoff: 250ms, 500ms, 1000ms
        scheduleRecognitionRestart(250 * Math.pow(2, consecutiveAbortsRef.current - 1));
        return;
      }
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setListening(false);
        toast.error("Permissão do microfone bloqueada");
        return;
      }
      // ═══ STT Fallback v30: On network/no-speech errors, try Groq→Browser Whisper ═══
      if (e.error === "network" || e.error === "no-speech") {
        if (e.error === "no-speech") {
          scheduleRecognitionRestart(80);
          return;
        }
        // Network error: use STT fallback chain with buffered audio chunks
        console.warn("[Voice] Network error — activating STT fallback chain");
        const chunks = audioChunksRef.current;
        if (chunks.length > 0) {
          const wavBlob = chunksToWavBlob(chunks, 16000);
          audioChunksRef.current = [];
          fallbackTranscribe(wavBlob).then(({ text, provider, latencyMs }) => {
            if (text && text.trim().length > 2 && onCmdRef.current) {
              console.log(`[Voice] STT fallback success via ${provider} (${latencyMs.toFixed(0)}ms): ${text.slice(0, 60)}`);
              feedUserSpeech(text);
              onCmdRef.current(text);
            }
          }).catch(err => {
            console.warn("[Voice] STT fallback chain failed:", err);
          });
        }
        scheduleRecognitionRestart(500);
        return;
      }
      scheduleRecognitionRestart(200);
    };
    
    return rec;
  }, [bargeIn, scheduleRecognitionRestart]);

  const startListeningFresh = useCallback((onCmd: (c: string) => void) => {
    // Stale HMR instance guard
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

  const startListening = useCallback((onCmd: (c: string) => void) => {
    singletonIdRef.current = claimMic("command");
    intentionalStopRef.current = false;
    voiceActiveRef.current = true;
    clearRestartTimer();
    onCmdRef.current = onCmd;
    setListening(false);

    // v30: Start AudioWorklet to collect chunks for STT fallback
    if (!audioWorkletActiveRef.current) {
      audioWorkletActiveRef.current = true;
      try {
        const worklet = getAudioWorkletManager({ sampleRate: 16000, chunkSize: 4096 });
        worklet.initialize().then((ok) => {
          if (!ok) return;
          worklet.onAudioChunk((chunk) => {
            // Keep last ~5s of audio (16000 * 5 / 4096 ≈ 20 chunks)
            audioChunksRef.current.push(chunk);
            if (audioChunksRef.current.length > 20) audioChunksRef.current.shift();
          });
          worklet.start();
        }).catch(() => {});
      } catch {}
    }

    startListeningFresh(onCmd);
  }, [clearRestartTimer, startListeningFresh]);

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    voiceActiveRef.current = false;
    clearRestartTimer();
    onCmdRef.current = null;
    speakingRef.current = false;
    if (keepAliveRef.current) { clearInterval(keepAliveRef.current); keepAliveRef.current = null; }
    if (speechDebounceRef.current) {
      clearTimeout(speechDebounceRef.current);
      speechDebounceRef.current = null;
    }
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

  useEffect(() => () => {
    clearRestartTimer();
    voiceActiveRef.current = false;
    intentionalStopRef.current = true;
    try { recRef.current?.abort?.(); } catch {}
    try { recRef.current?.stop(); } catch {}
    recRef.current = null;
    releaseMic(singletonIdRef.current);
  }, [clearRestartTimer]);

  return { listening, supported, ttsOn, setTtsOn, speak, speakFast, startListening, stop, bargeIn, startThinking, abortControllerRef, speechQueueRef, bargeInCallbackRef, voiceActiveRef };
}
