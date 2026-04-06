import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { toast } from "sonner";
import { X, Minimize2, Mic, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { OrionAccessGate } from "@/components/OrionAccessGate";
import { getOrionVoice, initVoicePicker, ORION_VOICE_PARAMS } from "@/lib/voice/voicePicker";

/** Speak text using the unified Orion voice */
function orionSpeak(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = ORION_VOICE_PARAMS.rate;
    u.pitch = ORION_VOICE_PARAMS.pitch;
    u.volume = ORION_VOICE_PARAMS.volume;
    const voice = getOrionVoice();
    if (voice) u.voice = voice;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    window.speechSynthesis.speak(u);
  });
}
// ═══════════════════════════════════════════════════════════
// ⚡ Audição Relâmpago — Lightning Hearing Engine
// Global Orion Listener — Alexa-style wake word + command capture
// Detects "Orion" wake word, waits for the full command, then opens overlay
// ═══════════════════════════════════════════════════════════

// Expanded regex: catches "orion", "órion", "oreon", "oriom", "o rion", "orían", "orian", etc.
const ORION_WAKE_REGEX = /([óòôõoö][\s.]*r[iíìeéè][\s.]*[oóòôõaã][\s.]*[nmn]|orion|[oó]rion|ore[oó][nm]|oria[nm]|orie[nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|o\s+rion|ori\s*on|painel)\b/i;

const PERMISSIONS_KEY = "orion_permissions_granted";

/** Extract command portion after the wake word */
function extractCommand(transcript: string): string {
  return transcript.replace(ORION_WAKE_REGEX, "").trim();
}

const NeuralVision = lazy(() =>
  import("./neural/NeuralVision").then((m) => ({ default: m.NeuralVision }))
);

export function GlobalOrionListener() {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium, loading: planLoading } = useUserPlan();
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [orionOpen, setOrionOpen] = useState(false);
  const [booting, setBooting] = useState(false);
  const [initialCommand, setInitialCommand] = useState<string>("");
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
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

  const isOnNeuralPage = location.pathname.includes("rede-neural") || location.pathname === "/consulta";
  const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const getRestartDelay = useCallback((reason?: string) => {
    if (typeof document !== "undefined" && document.hidden) return 5000;
    const attempts = restartAttemptsRef.current;
    // Exponential backoff: 500ms, 1s, 2s, 4s, 5s cap
    const backoff = Math.min(500 * Math.pow(2, attempts), 5000);
    if (reason === "aborted") return Math.max(backoff, 1500);
    if (reason === "audio-capture" || reason === "network") return Math.max(backoff, 2000);
    if (reason === "no-speech" || reason === "end") return Math.max(backoff, isMobile ? 800 : 500);
    return Math.max(backoff, 1000);
  }, [isMobile]);

  useEffect(() => {
    if (permissionsGranted) return;
    const timer = setTimeout(() => setShowPermissionPrompt(true), 1500);
    return () => clearTimeout(timer);
  }, [permissionsGranted]);

  const stopWakeWordListener = useCallback(() => {
    wakeWordEnabledRef.current = false;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    clearRestartTimer();
    restartAttemptsRef.current = 0;
    startInFlightRef.current = false;
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    setWakeWordActive(false);
  }, [clearRestartTimer]);

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

    const cleanCmd = command.trim();

    try { wakeRecRef.current?.abort?.(); } catch {}
    try { wakeRecRef.current?.stop?.(); } catch {}
    wakeRecRef.current = null;
    startInFlightRef.current = false;
    wakeWordEnabledRef.current = false;
    setWakeWordActive(false);
    setInitialCommand(cleanCmd);

    // ── Boot sequence: show plasma loading + speak "Iniciando sistema" ──
    setBooting(true);
    initVoicePicker();
    await orionSpeak("Iniciando sistema");

    // Wait for plasma animation (2.5s total boot time)
    await new Promise(r => setTimeout(r, 2500));

    // ── System ready: open panel + speak welcome ──
    setBooting(false);
    setOrionOpen(true);
    orionSpeak("Sistema ativado. Seja bem-vindo.");

    setTimeout(() => { cooldownRef.current = false; }, 1200);
  }, [clearRestartTimer]);

  const startWakeWordListener = useCallback(() => {
    const hidden = typeof document !== "undefined" && document.hidden;
    console.log("[GlobalOrion] startWakeWordListener called", { isOnNeuralPage, orionOpen, permissionsGranted, hidden, hasRef: !!wakeRecRef.current });
    if (hidden || isOnNeuralPage || orionOpen || !permissionsGranted || wakeRecRef.current || startInFlightRef.current) return;

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      console.warn("[GlobalOrion] SpeechRecognition API not available");
      return;
    }

    wakeWordEnabledRef.current = true;
    clearRestartTimer();
    startInFlightRef.current = true;

    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => {
        startInFlightRef.current = false;
        restartAttemptsRef.current = 0;
        setWakeWordActive(true);
      };

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const isFinal = e.results[i].isFinal;

          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            const confidence = e.results[i][alt]?.confidence || 0;

            if (transcript.length > 1) {
              console.log(`[GlobalOrion] heard: "${transcript}" (conf=${(confidence * 100).toFixed(0)}%, final=${isFinal}, wake=${ORION_WAKE_REGEX.test(transcript)})`);
            }

            if (!ORION_WAKE_REGEX.test(transcript)) continue;
            if (cooldownRef.current) continue;

            const command = extractCommand(transcript);

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
        console.log("[GlobalOrion] onend", { wakeDetected: wakeDetectedRef.current, enabled: wakeWordEnabledRef.current });
        wakeRecRef.current = null;
        startInFlightRef.current = false;

        if (wakeDetectedRef.current) {
          activateWithCommand(pendingCommandRef.current);
          return;
        }

        const willRestart = wakeWordEnabledRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !cooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!willRestart) {
          setWakeWordActive(false);
          return;
        }

        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, 6);
        setWakeWordActive(true);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, getRestartDelay("end") + restartAttemptsRef.current * 80);
      };

      rec.onerror = (e: any) => {
        console.warn("[GlobalOrion] onerror:", e.error);
        wakeRecRef.current = null;
        startInFlightRef.current = false;

        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setWakeWordActive(false);
          setShowPermissionPrompt(true);
          return;
        }

        const willRestart = wakeWordEnabledRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !cooldownRef.current && !(typeof document !== "undefined" && document.hidden);
        if (!willRestart) {
          setWakeWordActive(false);
          return;
        }

        restartAttemptsRef.current = Math.min(restartAttemptsRef.current + 1, 6);
        setWakeWordActive(true);
        clearRestartTimer();
        restartTimerRef.current = setTimeout(() => {
          if (wakeWordEnabledRef.current && !wakeRecRef.current && !startInFlightRef.current && !orionOpen && !isOnNeuralPage && permissionsGranted && !(typeof document !== "undefined" && document.hidden)) {
            startWakeWordListener();
          } else {
            setWakeWordActive(false);
          }
        }, getRestartDelay(e.error) + restartAttemptsRef.current * 80);
      };

      wakeRecRef.current = rec;
      rec.start();
      setWakeWordActive(true);
      console.log("[GlobalOrion] ✅ Wake word listener started successfully");
    } catch (err) {
      startInFlightRef.current = false;
      setWakeWordActive(false);
      console.warn("[GlobalOrion] Failed to start:", err);
    }
  }, [clearRestartTimer, getRestartDelay, isOnNeuralPage, orionOpen, permissionsGranted, activateWithCommand]);

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
  }, []);

  useEffect(() => {
    if (isOnNeuralPage || orionOpen || !permissionsGranted) {
      stopWakeWordListener();
      return;
    }

    wakeWordEnabledRef.current = true;
    const timer = setTimeout(() => startWakeWordListener(), isMobile ? 800 : 400);
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
      {/* ═══ Boot Screen — Plasma loading with "Iniciando sistema" ═══ */}
      {booting && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-background/95 backdrop-blur-xl animate-fade-in">
          <div className="relative w-32 h-32 mb-6">
            <PlasmaCore className="w-full h-full" />
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
                filter: "blur(20px)",
                transform: "scale(2)",
                animation: "orbBreath 1.5s ease-in-out infinite",
              }}
            />
          </div>
          <p className="text-sm font-mono tracking-[0.3em] text-primary/80 uppercase animate-pulse">
            Iniciando Sistema
          </p>
          <div className="mt-4 w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ animation: "bootProgress 2.5s ease-out forwards" }}
            />
          </div>
          <style>{`
            @keyframes bootProgress {
              0% { width: 0%; }
              30% { width: 40%; }
              60% { width: 70%; }
              90% { width: 95%; }
              100% { width: 100%; }
            }
          `}</style>
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
                   <p className="text-xs text-muted-foreground">Diga "Orion" para ativar de qualquer tela</p>
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
          onClick={() => { setOrionOpen(true); setInitialCommand(""); stopWakeWordListener(); }}
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
              wakeWordActive
                ? "text-primary border-primary/40 bg-primary/10 animate-pulse"
                : "text-muted-foreground/60 border-border/30 bg-card/50"
            )}>
              {wakeWordActive ? '⚡ Diga "Orion"' : "Orion"}
            </span>
          </div>

          {/* Hover tooltip */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <div className="bg-card/95 backdrop-blur-sm text-[10px] font-mono text-foreground/70 px-2 py-1 rounded border border-border/30 whitespace-nowrap shadow-lg">
              {wakeWordActive ? '⚡ Relâmpago Vivo — Diga "Orion"' : "Abrir Orion"}
            </div>
          </div>
        </div>
      )}

      {/* ═══ Expanded Orion overlay ═══ */}
      {orionOpen && (
        !user ? (
          <OrionAccessGate mode="not_logged" onClose={() => setOrionOpen(false)} />
        ) : !isPremium && !planLoading ? (
          <OrionAccessGate mode="not_premium" onClose={() => setOrionOpen(false)} />
        ) : (
          <OrionFloatingOverlay
            onMinimize={() => setOrionOpen(false)}
            onClose={() => setOrionOpen(false)}
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
