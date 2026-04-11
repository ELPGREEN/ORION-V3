import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { toast } from "sonner";
import { X, Minimize2, Mic, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNeuralConfig } from "@/hooks/useNeuralConfig";
import { OrionAccessGate } from "@/components/OrionAccessGate";
import { initVoicePicker } from "@/lib/voice/voicePicker";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
// ═══ FIX: Integrate with Mic Arbiter to prevent SpeechRecognition conflicts ═══
import { claimMic, isMicOwner, registerMicRec, getMicMode, releaseMic } from "@/lib/voice/micArbiter";
import { wakeOrionVm } from "@/lib/orion-vm-wake";

/** Speak text using Gemini TTS — NO robotic fallback (silent fail is better than robotic voice) */
async function orionSpeak(text: string): Promise<void> {
  try {
    const result = await speakWithGeminiTTS(text, "Algieba");
    if (result.played) return;
  } catch {}
  // No SpeechSynthesis fallback — robotic voice is worse than silence
  console.log("[GlobalOrion] Gemini TTS unavailable — skipping speech (no robotic fallback)");
}
// ═══════════════════════════════════════════════════════════
// ⚡ Audição Relâmpago — Lightning Hearing Engine
// Global Orion Listener — Alexa-style wake word + command capture
// Detects "Orion" wake word, waits for the full command, then opens overlay
// ═══════════════════════════════════════════════════════════

// Expanded regex: catches "orion", "órion", "oreon", "oriom", "o rion", "orían", "orian", etc.
const ORION_WAKE_REGEX = /([óòôõoö][\s.]*r[iíìeéè][\s.]*[oóòôõaã][\s.]*[nmn]|orion|[oó]rion|ore[oó][nm]|oria[nm]|orie[nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|o\s+rion|ori\s*on|painel)\b/i;

const PERMISSIONS_KEY = "orion_permissions_granted";
const PERMISSIONS_DISMISSED_KEY = "orion_permissions_dismissed";

/** Extract command portion after the wake word */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeWakeWord(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function createCustomWakeRegex(wakeWord?: string | null): RegExp | null {
  const normalized = normalizeWakeWord(wakeWord || "").replace(/\s+/g, "");
  if (!normalized || normalized === "orion" || normalized === "painel") return null;

  const loosePattern = normalized
    .split("")
    .map((char) => escapeRegex(char))
    .join("[\\s.]*");

  return new RegExp(`\\b${loosePattern}\\b`, "i");
}

function createCustomWakeExtractRegex(wakeWord?: string | null): RegExp | null {
  const raw = wakeWord?.trim();
  if (!raw) return null;

  const normalized = normalizeWakeWord(raw);
  if (!normalized || normalized === "orion" || normalized === "painel") return null;

  const loosePattern = raw
    .split("")
    .filter((char) => char.trim().length > 0)
    .map((char) => escapeRegex(char))
    .join("[\\s.]*");

  return loosePattern ? new RegExp(`\\b${loosePattern}\\b`, "i") : null;
}

function extractCommand(transcript: string, wakeRegexes: RegExp[]): string {
  return wakeRegexes.reduce((command, regex) => command.replace(regex, "").trim(), transcript);
}

const NeuralVision = lazy(() =>
  import("./neural/NeuralVision").then((m) => ({ default: m.NeuralVision }))
);

export function GlobalOrionListener() {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium, loading: planLoading } = useUserPlan();
  const { config } = useNeuralConfig();
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [orionOpen, setOrionOpen] = useState(false);
  
  const [initialCommand, setInitialCommand] = useState<string>("");
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [conversationalStatus, setConversationalStatus] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
    return localStorage.getItem(PERMISSIONS_KEY) === "true";
  });
  const wakeRecRef = useRef<any>(null);
  const wakeWordEnabledRef = useRef(true);
  const cooldownRef = useRef(false);
  const wakeDetectedRef = useRef(false);
  const pendingCommandRef = useRef("");
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartAttemptsRef = useRef(0);
  const startInFlightRef = useRef(false);
  /** Mic arbiter ownership ID for this component */
  const micOwnerIdRef = useRef(0);
  /** Command capture recognition (separate from wake word) */
  const cmdRecRef = useRef<any>(null);
  const cmdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOnNeuralPage = location.pathname.includes("rede-neural") || location.pathname === "/consulta";
  const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
  const configuredWakeWord = (config?.wake_word || "Orion").trim() || "Orion";
  const customWakeRegex = useMemo(() => createCustomWakeRegex(configuredWakeWord), [configuredWakeWord]);
  const customWakeExtractRegex = useMemo(() => createCustomWakeExtractRegex(configuredWakeWord), [configuredWakeWord]);
  const wakeWordRegexes = useMemo(() => {
    return [ORION_WAKE_REGEX, customWakeExtractRegex].filter(Boolean) as RegExp[];
  }, [customWakeExtractRegex]);
  const wakeWordHint = useMemo(() => {
    return normalizeWakeWord(configuredWakeWord) === "orion" ? "Orion" : `${configuredWakeWord} ou Orion`;
  }, [configuredWakeWord]);

  const matchesWakeWord = useCallback((transcript: string) => {
    if (ORION_WAKE_REGEX.test(transcript)) return true;
    if (!customWakeRegex) return false;
    return customWakeRegex.test(normalizeWakeWord(transcript));
  }, [customWakeRegex]);

  const primeMicrophone = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      // Reduced priming delay — just enough for hardware init
      await new Promise((resolve) => setTimeout(resolve, isMobile ? 80 : 30));
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      console.warn("[GlobalOrion] Microphone priming failed:", error);
    }
  }, [isMobile]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  // On mobile, use much longer delays to prevent rapid mic on/off loop
  // which causes OS-level activation sounds on every restart
  const MAX_RESTART_ATTEMPTS = isMobile ? 5 : 10;

  const getRestartDelay = useCallback((reason?: string) => {
    if (typeof document !== "undefined" && document.hidden) return 10000;
    const attempts = restartAttemptsRef.current;
    if (isMobile) {
      const backoff = Math.min(1500 * Math.pow(1.5, attempts), 15000);
      if (reason === "no-speech" || reason === "end") return Math.max(backoff, 1500);
      if (reason === "aborted") return Math.max(backoff, 2000);
      return Math.max(backoff, 1500);
    }
    const backoff = Math.min(300 * Math.pow(1.5, attempts), 5000);
    if (reason === "aborted") return Math.max(backoff, 1000);
    if (reason === "audio-capture" || reason === "network") return Math.max(backoff, 1500);
    if (reason === "no-speech" || reason === "end") return Math.max(backoff, 100);
    if (reason === "normal-end") return 80;
    return Math.max(backoff, 500);
  }, [isMobile]);

  /** ═══ Conversational Command Capture ═══
   * After wake word detected:
   * 1. Start new recognition for 4 seconds
   * 2. If no speech → Orion says "Estou ouvindo" and opens overlay
   * 3. If speech → open overlay with command
   */
  const stopCommandCapture = useCallback(() => {
    if (cmdTimeoutRef.current) { clearTimeout(cmdTimeoutRef.current); cmdTimeoutRef.current = null; }
    try { cmdRecRef.current?.abort?.(); } catch {}
    try { cmdRecRef.current?.stop?.(); } catch {}
    cmdRecRef.current = null;
    releaseMic(micOwnerIdRef.current);
  }, []);

  const openOrionOverlay = useCallback((command: string) => {
    stopCommandCapture();
    setConversationalStatus("idle");
    setInitialCommand(command);
    setOrionOpen(true);
    initVoicePicker();
    // Wake VM when Orion is activated
    wakeOrionVm();
    // TTS feedback is fire-and-forget — never blocks overlay opening
    setTimeout(() => { cooldownRef.current = false; }, 400);
  }, [stopCommandCapture]);

  const startCommandCapture = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) { openOrionOverlay(""); return; }

    stopCommandCapture();
    // ═══ FIX: Claim mic AFTER stopping previous capture ═══
    micOwnerIdRef.current = claimMic("command");

    setConversationalStatus("listening");
    toast.success("🎯 Orion ativado!", { duration: 2000 });

    let captured = "";
    let gotFinal = false;

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      if (!isMicOwner(micOwnerIdRef.current)) return;
      const last = e.results[e.results.length - 1];
      const transcript = (last?.[0]?.transcript || "").trim();
      const cleaned = extractCommand(transcript, wakeWordRegexes);
      if (cleaned.length > captured.length) captured = cleaned;

      if (last?.isFinal && cleaned.length > 2) {
        gotFinal = true;
        if (cmdTimeoutRef.current) { clearTimeout(cmdTimeoutRef.current); cmdTimeoutRef.current = null; }
        console.log(`[GlobalOrion] ✅ Command captured: "${cleaned}"`);
        openOrionOverlay(cleaned);
      }
    };

    rec.onend = () => {
      cmdRecRef.current = null;
      if (!isMicOwner(micOwnerIdRef.current)) return;
      if (!gotFinal && captured.length > 2) {
        gotFinal = true;
        if (cmdTimeoutRef.current) { clearTimeout(cmdTimeoutRef.current); cmdTimeoutRef.current = null; }
        openOrionOverlay(captured);
      }
    };

    rec.onerror = (e: any) => {
      console.warn("[GlobalOrion] Command capture error:", e.error);
      cmdRecRef.current = null;
    };

    cmdRecRef.current = rec;
    registerMicRec(rec, "command");
    try { rec.start(); } catch { openOrionOverlay(""); return; }

    // 4-second timeout
    cmdTimeoutRef.current = setTimeout(() => {
      cmdTimeoutRef.current = null;
      if (gotFinal) return;
      console.log("[GlobalOrion] ⏱️ 4s timeout — no command, opening with prompt");
      try { cmdRecRef.current?.stop?.(); } catch {}
      cmdRecRef.current = null;
      // Open overlay immediately — no blocking TTS
      openOrionOverlay("");
    }, 4000);
  }, [openOrionOverlay, stopCommandCapture, wakeWordRegexes]);

  const activateWithCommand = useCallback(async (command: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    clearRestartTimer();

    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }

    // Stop wake word listener
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    startInFlightRef.current = false;
    wakeWordEnabledRef.current = false;
    setWakeWordActive(false);

    const cleanCmd = command.trim();

    if (cleanCmd.length > 2) {
      // Already have a command from wake word phase — open directly
      openOrionOverlay(cleanCmd);
    } else {
      // Wake word only (e.g. "Orion") — start 4s command capture
      startCommandCapture();
    }
  }, [clearRestartTimer, openOrionOverlay, startCommandCapture]);

  const stopWakeWordListener = useCallback(() => {
    wakeWordEnabledRef.current = false;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    clearRestartTimer();
    restartAttemptsRef.current = 0;
    startInFlightRef.current = false;
    stopCommandCapture();
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    setWakeWordActive(false);
  }, [clearRestartTimer, stopCommandCapture]);

  const startWakeWordListener = useCallback(() => {
    const hidden = typeof document !== "undefined" && document.hidden;
    console.log("[GlobalOrion] startWakeWordListener called", { isOnNeuralPage, orionOpen, permissionsGranted, hidden, hasRef: !!wakeRecRef.current });
    if (hidden || isOnNeuralPage || orionOpen || !permissionsGranted || wakeRecRef.current || startInFlightRef.current) return;

    // ═══ FIX: Don't start if another component (useNeuralVoice) owns the mic in command mode ═══
    const currentMode = getMicMode();
    if (currentMode === "command") {
      console.log("[GlobalOrion] Mic in command mode — skipping wake word start");
      return;
    }

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      console.warn("[GlobalOrion] SpeechRecognition API not available");
      return;
    }

    // ═══ FIX: Claim mic via arbiter — prevents conflicts with useNeuralVoice/useWakeWord ═══
    micOwnerIdRef.current = claimMic("wake");
    wakeWordEnabledRef.current = true;
    clearRestartTimer();
    startInFlightRef.current = true;

    const bootRecognition = async () => {
      if (restartAttemptsRef.current > 0 || isMobile) {
        await primeMicrophone();
      }

      const hiddenNow = typeof document !== "undefined" && document.hidden;
      if (hiddenNow || isOnNeuralPage || orionOpen || !permissionsGranted || wakeRecRef.current) {
        startInFlightRef.current = false;
        return;
      }

      try {
      const rec = new SR();
      rec.lang = "pt-BR";
      // ═══ FIX: Use non-continuous mode to prevent Chrome iframe "aborted" loops ═══
      // continuous=true gets killed after ~1s in iframes/preview contexts
      // Instead we use short sessions and restart on onend for the same effect
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      const sessionStartRef = { time: 0, gotResult: false };

      rec.onstart = () => {
        startInFlightRef.current = false;
        sessionStartRef.time = Date.now();
        sessionStartRef.gotResult = false;
        // Only reset restart counter if session lasted >3s (stable session)
        if (restartAttemptsRef.current > 0) {
          // Don't reset — let onresult reset it when we actually get audio
        }
        setWakeWordActive(true);
        console.log("[GlobalOrion] 🎙️ Recognition session started");
      };

      rec.onresult = (e: any) => {
        sessionStartRef.gotResult = true;
        restartAttemptsRef.current = 0; // Got audio — connection is healthy
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const isFinal = e.results[i].isFinal;

          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            const confidence = e.results[i][alt]?.confidence || 0;
            const wakeMatched = matchesWakeWord(transcript);

            if (transcript.length > 1) {
              console.log(`[GlobalOrion] heard: "${transcript}" (conf=${(confidence * 100).toFixed(0)}%, final=${isFinal}, wake=${wakeMatched})`);
            }

            if (!wakeMatched) continue;
            if (cooldownRef.current) continue;

            const command = extractCommand(transcript, wakeWordRegexes);

            if (!wakeDetectedRef.current) {
              wakeDetectedRef.current = true;
              pendingCommandRef.current = command;

              if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
              commandTimeoutRef.current = setTimeout(() => {
                if (wakeDetectedRef.current) {
                  activateWithCommand(pendingCommandRef.current);
                }
              }, 3000);
            }

            if (command.length > pendingCommandRef.current.length) {
              pendingCommandRef.current = command;
            }

            if (isFinal && wakeDetectedRef.current) {
              activateWithCommand(command);
              return;
            }
          }
        }
      };

      rec.onend = () => {
        const sessionDuration = Date.now() - sessionStartRef.time;
        console.log("[GlobalOrion] onend", { wakeDetected: wakeDetectedRef.current, enabled: wakeWordEnabledRef.current, sessionMs: sessionDuration, gotResult: sessionStartRef.gotResult });
        wakeRecRef.current = null;
        startInFlightRef.current = false;

        // ═══ FIX: If another component claimed the mic, don't restart ═══
        if (!isMicOwner(micOwnerIdRef.current)) {
          console.log("[GlobalOrion] Mic ownership lost — not restarting");
          setWakeWordActive(false);
          return;
        }

        if (wakeDetectedRef.current) {
          activateWithCommand(pendingCommandRef.current);
          return;
        }

        const willRestart = wakeWordEnabledRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !cooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!willRestart) {
          setWakeWordActive(false);
          return;
        }

        // In non-continuous mode, sessions end naturally after speech/silence
        // Only count as unstable if it crashed instantly (<400ms with no result)
        // Normal "no speech" sessions last 3-8s and are perfectly healthy
        const isUnstableSession = sessionDuration < 400 && !sessionStartRef.gotResult;
        if (isUnstableSession) {
          restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, MAX_RESTART_ATTEMPTS);
        } else {
          // Healthy session — aggressively reset attempts to keep listener alive
          restartAttemptsRef.current = 0;
        }
        
        if (restartAttemptsRef.current >= MAX_RESTART_ATTEMPTS) {
          console.log("[GlobalOrion] Max restart attempts reached, pausing for 30s then retry");
          setWakeWordActive(false);
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            restartAttemptsRef.current = 0;
            if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
              startWakeWordListener();
            }
          }, 30000);
          return;
        }
        
        // Normal end in non-continuous mode — restart quickly
        const delay = isUnstableSession ? getRestartDelay("end") : getRestartDelay("normal-end");
        console.log(`[GlobalOrion] Will restart in ${delay}ms (attempt ${restartAttemptsRef.current})`);
        setWakeWordActive(true);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, delay);
      };

      rec.onerror = (e: any) => {
        const sessionDuration = Date.now() - sessionStartRef.time;
        console.warn("[GlobalOrion] onerror:", e.error, `(session lasted ${sessionDuration}ms)`);
        wakeRecRef.current = null;
        startInFlightRef.current = false;

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setWakeWordActive(false);
          setShowPermissionPrompt(true);
          return;
        }

        // "aborted" and "no-speech" are normal in non-continuous mode — never count them
        const isHarmless = e.error === "no-speech" || e.error === "aborted";

        const willRestart = wakeWordEnabledRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !cooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!willRestart) {
          setWakeWordActive(false);
          return;
        }

        // Only count genuine errors (network, audio-capture) toward restart limit
        if (!isHarmless) {
          restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, MAX_RESTART_ATTEMPTS);
        }
        
        if (restartAttemptsRef.current >= MAX_RESTART_ATTEMPTS) {
          console.log("[GlobalOrion] Max restart attempts from errors, pausing 30s");
          setWakeWordActive(false);
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            restartAttemptsRef.current = 0;
            if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
              startWakeWordListener();
            }
          }, 30000);
          return;
        }
        
        const delay = getRestartDelay(e.error);
        console.log(`[GlobalOrion] Will restart after error "${e.error}" in ${delay}ms (attempt ${restartAttemptsRef.current})`);
        setWakeWordActive(true);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, delay);
      };

      wakeRecRef.current = rec;
      // ═══ FIX: Register with mic arbiter ═══
      registerMicRec(rec, "wake");
      rec.start();
      setWakeWordActive(true);
      console.log("[GlobalOrion] ✅ Wake word listener started (mic arbiter registered)");
      } catch (err) {
        startInFlightRef.current = false;
        setWakeWordActive(false);
        console.warn("[GlobalOrion] Failed to start:", err);
      }
    };

    void bootRecognition();
  }, [clearRestartTimer, getRestartDelay, isMobile, isOnNeuralPage, matchesWakeWord, orionOpen, permissionsGranted, primeMicrophone, activateWithCommand, wakeWordRegexes]);

  const handleGrantPermissions = useCallback(async () => {
    let micGranted = false;
    let camGranted = false;

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStream.getTracks().forEach(t => t.stop());
      micGranted = true;
    } catch {
      toast.error("Microfone negado — Orion não poderá ouvir comandos de voz");
    }

    try {
      const camStream = await navigator.mediaDevices.getUserMedia({ video: true });
      camStream.getTracks().forEach(t => t.stop());
      camGranted = true;
    } catch {
      toast.error("Câmera negada — Visão Neural ficará limitada");
    }

    if (micGranted) {
      localStorage.setItem(PERMISSIONS_KEY, "true");
      setPermissionsGranted(true);
      toast.success(
      camGranted
          ? "⚡ Audição Relâmpago ativada! Microfone e câmera autorizados"
          : "⚡ Audição Relâmpago ativada — Orion pode ouvir você"
      );
      setShowPermissionPrompt(false);
      setTimeout(() => startWakeWordListener(), 300);
      return;
    }

    setShowPermissionPrompt(false);
  }, [startWakeWordListener]);

  const handleDismissPermissions = useCallback(() => {
    setShowPermissionPrompt(false);
    localStorage.setItem(PERMISSIONS_DISMISSED_KEY, "true");
  }, []);

  // ═══ Show permission prompt proactively on first visit ═══
  useEffect(() => {
    if (!permissionsGranted && !showPermissionPrompt) {
      const dismissed = localStorage.getItem(PERMISSIONS_DISMISSED_KEY) === "true";
      if (!dismissed) {
        // Show after a short delay so the dashboard loads first
        const timer = setTimeout(() => setShowPermissionPrompt(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [permissionsGranted, showPermissionPrompt]);

  useEffect(() => {
    if (isOnNeuralPage || orionOpen || !permissionsGranted) {
      stopWakeWordListener();
      return;
    }

    wakeWordEnabledRef.current = true;
    const timer = setTimeout(() => startWakeWordListener(), isMobile ? 2000 : 400);
    return () => {
      clearTimeout(timer);
      stopWakeWordListener();
    };
  }, [isMobile, isOnNeuralPage, orionOpen, permissionsGranted, startWakeWordListener, stopWakeWordListener]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearRestartTimer();
        try { wakeRecRef.current?.stop?.(); } catch {}
        wakeRecRef.current = null;
        startInFlightRef.current = false;
        setWakeWordActive(false);
        return;
      }

      if (wakeWordEnabledRef.current && permissionsGranted && !orionOpen && !isOnNeuralPage && !wakeRecRef.current && !startInFlightRef.current) {
        startWakeWordListener();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [clearRestartTimer, isOnNeuralPage, orionOpen, permissionsGranted, startWakeWordListener]);

  useEffect(() => {
    return () => {
      clearRestartTimer();
      try { wakeRecRef.current?.stop?.(); } catch {}
      wakeRecRef.current = null;
      startInFlightRef.current = false;
    };
  }, [clearRestartTimer]);

  if (isOnNeuralPage) return null;

  return (
    <>
      {/* ═══ Command Capture Status — shows "Ouvindo…" when capturing command after wake word ═══ */}
      {conversationalStatus === "listening" && !orionOpen && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] animate-fade-in">
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-xl border border-primary/30 rounded-full px-4 py-2 shadow-lg">
            <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-mono text-primary">Ouvindo…</span>
          </div>
        </div>
      )}

      {/* ═══ Permission Prompt ═══ */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-[90vw] p-6 space-y-5">
            {/* Plasma header */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-16 h-16">
                <PlasmaCore className="w-full h-full" />
              </div>
              <h3 className="text-lg font-serif text-foreground tracking-wide">
                Orion precisa de acesso
              </h3>
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                Para ouvir seus comandos de voz e usar a visão neural, o Orion precisa de acesso ao
                <strong className="text-foreground"> microfone</strong> e à
                <strong className="text-foreground"> câmera</strong>.
              </p>
            </div>

            {/* Permission items */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Mic className="h-4 w-4 text-primary" />
                </div>
                 <div>
                   <p className="text-sm font-medium text-foreground">⚡ Audição Relâmpago</p>
                    <p className="text-xs text-muted-foreground">Reconhecimento de voz sempre ativo</p>
                 </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Câmera</p>
                  <p className="text-xs text-muted-foreground">Visão neural, reconhecimento e análise visual</p>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDismissPermissions}
              >
                Depois
              </Button>
              <Button
                className="flex-1 btn-gold shimmer"
                onClick={handleGrantPermissions}
              >
                Autorizar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Você pode alterar isso nas configurações do navegador a qualquer momento
            </p>
          </div>
        </div>
      )}

      {/* ═══ Floating Plasma Orb — always visible when Orion overlay is closed ═══ */}
      {!orionOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6 group cursor-pointer"
          onClick={() => { setOrionOpen(true); setInitialCommand(""); stopWakeWordListener(); wakeOrionVm(); }}
          title="Clique para abrir o Orion"
        >
          {/* Plasma orb container — larger and more visible */}
          <div className="relative w-16 h-16 lg:w-20 lg:h-20">
            {/* Ambient breathing glow — stronger when listening */}
            <div
              className="absolute inset-0 rounded-full transition-all duration-700"
              style={{
                background: wakeWordActive
                  ? "radial-gradient(circle, hsl(var(--primary) / 0.7) 0%, hsl(var(--primary) / 0.2) 50%, transparent 70%)"
                  : "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
                filter: wakeWordActive ? "blur(16px)" : "blur(12px)",
                transform: wakeWordActive ? "scale(2)" : "scale(1.6)",
                animation: "orbBreath 3s ease-in-out infinite",
              }}
            />

            {/* The PlasmaCore */}
            <PlasmaCore className="w-full h-full" />

            {/* Wake word listening pulse ring */}
            {wakeWordActive && (
              <>
                <div
                  className="absolute inset-0 rounded-full border-2 border-primary/50"
                  style={{ animation: "orbListenPulse 2s ease-out infinite" }}
                />
                <div
                  className="absolute inset-0 rounded-full border border-primary/30"
                  style={{ animation: "orbListenPulse 2s ease-out infinite 0.5s" }}
                />
              </>
            )}
          </div>

          {/* Always-visible status label below orb */}
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className={cn(
              "text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm",
              conversationalStatus === "listening"
                ? "text-emerald-400 border-emerald-400/40 bg-emerald-400/10 animate-pulse"
                : wakeWordActive
                  ? "text-primary border-primary/40 bg-primary/10 animate-pulse"
                  : "text-muted-foreground/60 border-border/30 bg-card/50"
            )}>
              {conversationalStatus === "listening"
                ? "🎙️ Ouvindo…"
                : wakeWordActive ? "⚡ Ativo" : "Orion"}
            </span>
          </div>

          {/* Hover tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-card/95 backdrop-blur-sm text-[10px] font-mono text-foreground/70 px-2 py-1 rounded border border-border/30 whitespace-nowrap shadow-lg">
              {wakeWordActive ? "⚡ Escutando…" : "Abrir Orion"}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Expanded Orion overlay ═══ */}
      {orionOpen && (
        !user ? (
          <OrionAccessGate mode="not_logged" onClose={() => { releaseMic(micOwnerIdRef.current); setOrionOpen(false); }} />
        ) : !isPremium && !planLoading ? (
          <OrionAccessGate mode="not_premium" onClose={() => { releaseMic(micOwnerIdRef.current); setOrionOpen(false); }} />
        ) : (
          <OrionFloatingOverlay
            onMinimize={() => { releaseMic(micOwnerIdRef.current); setOrionOpen(false); }}
            onClose={() => { releaseMic(micOwnerIdRef.current); setOrionOpen(false); }}
            initialCommand={initialCommand}
          />
        )
      )}

      {/* Keyframes */}
      <style>{`
        @keyframes orbBreath {
          0%, 100% { opacity: 0.5; transform: scale(1.5); }
          50% { opacity: 0.9; transform: scale(1.8); }
        }
        @keyframes orbListenPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </>
  );
}

// ═══ Expanded Orion Overlay ═══

function OrionFloatingOverlay({
  onMinimize,
  onClose,
  initialCommand,
}: {
  onMinimize: () => void;
  onClose: () => void;
  initialCommand?: string;
}) {
  return (
    <div
      className={cn(
        "fixed z-50 transition-all duration-300 animate-scale-in",
        "bottom-20 right-4 w-[95vw] max-w-[520px] h-[80vh] max-h-[700px]",
        "lg:bottom-4 lg:right-4 lg:w-[480px]",
        "shadow-2xl rounded-xl overflow-hidden",
        "border border-primary/20 bg-[#030508]/95 backdrop-blur-xl"
      )}
    >
      {/* Header — minimal with plasma accent */}
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-primary/10">
        <div className="flex items-center gap-2.5">
          {/* Mini plasma indicator */}
          <div className="relative w-6 h-6">
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.9) 0%, hsl(var(--primary) / 0.3) 60%, transparent 100%)",
                animation: "plasmaPulse 3s ease-in-out infinite",
                boxShadow: "0 0 12px hsl(var(--primary) / 0.5), 0 0 24px hsl(var(--primary) / 0.2)",
              }}
            />
            <div
              className="absolute inset-[3px] rounded-full"
              style={{
                border: "1px solid hsl(var(--primary) / 0.6)",
                animation: "plasmaRingSpin 4s linear infinite",
              }}
            />
          </div>
          <span className="text-[11px] font-mono tracking-[0.2em] text-primary/70 uppercase">
            Orion
          </span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-foreground/50 hover:text-primary"
            onClick={onMinimize}
            title="Minimizar (volta pro orbe)"
          >
            <Minimize2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-foreground/50 hover:text-red-400"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* NeuralVision content */}
      <div className="h-[calc(100%-40px)] overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full">
              <div className="relative w-20 h-20">
                <PlasmaCore className="w-full h-full" />
              </div>
            </div>
          }
        >
          <NeuralVision skipWakeWord initialCommand={initialCommand} />
        </Suspense>
      </div>

      {/* Keyframes for header plasma */}
      <style>{`
        @keyframes plasmaPulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.15); }
        }
        @keyframes plasmaRingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
