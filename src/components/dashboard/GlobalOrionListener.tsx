import { useState, useRef, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import { toast } from "sonner";
import { X, Minimize2, Mic, Camera, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useNeuralConfig } from "@/hooks/useNeuralConfig";
import { OrionAccessGate } from "@/components/OrionAccessGate";
import { initVoicePicker } from "@/lib/voice/voicePicker";
import { ensurePersistentMic, getPersistentMicStream, requestPersistentMic } from "@/lib/voice/persistentMic";
import { killMicRec } from "@/lib/voice/micArbiter";
import { useWakeWord } from "./neural/useWakeWord";
import { wakeOrionVm } from "@/lib/orion-vm-wake";

// ═══════════════════════════════════════════════════════════
// GlobalOrionListener — UI shell only (orb, permissions, overlay)
// Wake word detection is handled EXCLUSIVELY by useWakeWord
// via the "orion:wake-word-detected" custom event.
// NO SpeechRecognition instances are created here.
// ═══════════════════════════════════════════════════════════

const PERMISSIONS_KEY = "orion_permissions_granted";
const PERMISSIONS_DISMISSED_KEY = "orion_permissions_dismissed";

const NeuralVision = lazy(() =>
  import("./neural/NeuralVision").then((m) => ({ default: m.NeuralVision }))
);

export function GlobalOrionListener() {
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium, loading: planLoading } = useUserPlan();
  const { config } = useNeuralConfig();
  const [orionOpen, setOrionOpen] = useState(false);
  const [initialCommand, setInitialCommand] = useState<string>("");
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionsGranted, setPermissionsGranted] = useState(() => {
    return localStorage.getItem(PERMISSIONS_KEY) === "true";
  });

  const isOnNeuralPage = location.pathname.includes("rede-neural") || location.pathname === "/consulta";
  const isMobile = typeof navigator !== "undefined" && /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);

  // Track whether mic has been primed this session
  const micPrimedRef = useRef(false);

  const primeMicrophone = useCallback(async () => {
    const persistentStream = getPersistentMicStream();
    if (persistentStream?.active) {
      micPrimedRef.current = true;
      return;
    }
    if (micPrimedRef.current) return;
    try {
      const ready = await ensurePersistentMic();
      if (ready || getPersistentMicStream()?.active) {
        micPrimedRef.current = true;
      }
    } catch (error) {
      console.warn("[GlobalOrion] Microphone priming failed:", error);
    }
  }, []);

  // ═══ Open overlay with optional command ═══
  const openOrionOverlay = useCallback((command: string) => {
    window.dispatchEvent(new CustomEvent("orion-music-prime"));
    setInitialCommand(command);
    setOrionOpen(true);
    initVoicePicker();
    wakeOrionVm();
  }, []);

  // ═══ Wake word activation callback ═══
  const handleWakeActivate = useCallback(() => {
    // The event-based open is already handled inside useWakeWord via the custom event
    // But we also handle it directly here as the primary path
  }, []);

  // ═══ useWakeWord — THE ONLY wake word listener, runs here at top level ═══
  // When overlay is open or on neural page, we pass speechOk=false to disable it
  const speechOkForWake = permissionsGranted && !isOnNeuralPage && !orionOpen;
  const { wakeWordActive, stopWakeWordListener } = useWakeWord(
    false, // listening — GlobalOrionListener never does STT listening itself
    speechOkForWake,
    handleWakeActivate,
  );

  // ═══ Hard-stop wake word the moment the overlay opens — frees mic for NeuralVision ═══
  useEffect(() => {
    if (orionOpen) {
      try { stopWakeWordListener(); } catch {}
    }
  }, [orionOpen, stopWakeWordListener]);

  // ═══ Listen for wake word events from useWakeWord ═══
  useEffect(() => {
    if (isOnNeuralPage || orionOpen || !permissionsGranted) return;

    const handleWakeWord = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const command = detail?.command || "";
      console.log("[GlobalOrion] Wake word event received, command:", command);
      openOrionOverlay(command);
    };

    window.addEventListener("orion:wake-word-detected", handleWakeWord);
    return () => window.removeEventListener("orion:wake-word-detected", handleWakeWord);
  }, [isOnNeuralPage, orionOpen, permissionsGranted, openOrionOverlay]);

  // ═══ Permission handling ═══
  const handleGrantPermissions = useCallback(async () => {
    let micGranted = false;
    let camGranted = false;

    try {
      micGranted = await requestPersistentMic();
      if (micGranted) micPrimedRef.current = true;
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
      return;
    }

    setShowPermissionPrompt(false);
  }, []);

  const handleDismissPermissions = useCallback(() => {
    setShowPermissionPrompt(false);
    localStorage.setItem(PERMISSIONS_DISMISSED_KEY, "true");
  }, []);

  // ═══ Show permission prompt proactively on first visit ═══
  useEffect(() => {
    if (!permissionsGranted && !showPermissionPrompt) {
      const dismissed = localStorage.getItem(PERMISSIONS_DISMISSED_KEY) === "true";
      if (!dismissed) {
        const timer = setTimeout(() => setShowPermissionPrompt(true), 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [permissionsGranted, showPermissionPrompt]);

  // ═══ Prime mic once permissions granted ═══
  useEffect(() => {
    if (permissionsGranted && !micPrimedRef.current) {
      primeMicrophone();
    }
  }, [permissionsGranted, primeMicrophone]);

  // ═══ Visibility change — notify wake word system ═══
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Wake word system (useWakeWord) handles its own visibility logic
    };

    const handleMediaCommand = () => {
      // Music/video commands should NOT close the overlay — user wants to keep chatting
      // Only auto-minimize for embedded video that takes focus
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("orion-music-command", handleMediaCommand);
    window.addEventListener("orion-embedded-video", handleMediaCommand);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("orion-music-command", handleMediaCommand);
      window.removeEventListener("orion-embedded-video", handleMediaCommand);
    };
  }, [orionOpen]);

  // Auto-minimize on navigation to neural page only (avoid closing during normal use)
  useEffect(() => {
    if (orionOpen && isOnNeuralPage) {
      console.log("[GlobalOrion] Auto-minimizing — navigated to neural page");
      killMicRec();
      setOrionOpen(false);
    }
  }, [location.pathname]);

  if (isOnNeuralPage) return null;

  return (
    <>
      {/* ═══ Permission Prompt ═══ */}
      {showPermissionPrompt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-[90vw] p-6 space-y-5">
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

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleDismissPermissions}>
                Depois
              </Button>
              <Button className="flex-1 btn-gold shimmer" onClick={handleGrantPermissions}>
                Autorizar
              </Button>
            </div>

            <p className="text-[10px] text-muted-foreground/60 text-center">
              Você pode alterar isso nas configurações do navegador a qualquer momento
            </p>
          </div>
        </div>
      )}

      {/* ═══ Floating Plasma Orb — always visible when overlay is closed ═══ */}
      {!orionOpen && (
        <div
          className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6 group cursor-pointer"
          onClick={() => {
            window.dispatchEvent(new CustomEvent("orion-music-prime"));
            // Pre-warm AudioContext IN gesture context — critical for mobile STT
            try {
              const existing = (window as any).__orion_shared_audio_ctx__;
              if (!existing || existing.state === 'closed') {
                (window as any).__orion_shared_audio_ctx__ = new AudioContext({ sampleRate: 48000 });
              } else if (existing.state === 'suspended') {
                existing.resume();
              }
            } catch {}
            setOrionOpen(true); setInitialCommand(""); wakeOrionVm();
          }}
          title="Clique para abrir o Orion"
        >
          <div className="relative w-16 h-16 lg:w-20 lg:h-20">
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
            <PlasmaCore className="w-full h-full" />
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

          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className={cn(
              "text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm",
              wakeWordActive
                ? "text-primary border-primary/40 bg-primary/10 animate-pulse"
                : "text-muted-foreground/60 border-border/30 bg-card/50"
            )}>
              {wakeWordActive ? "⚡ Ativo" : "Orion"}
            </span>
          </div>

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
          <OrionAccessGate mode="not_logged" onClose={() => { killMicRec(); setOrionOpen(false); }} />
        ) : !isPremium && !planLoading ? (
          <OrionAccessGate mode="not_premium" onClose={() => { killMicRec(); setOrionOpen(false); }} />
        ) : (
          <OrionFloatingOverlay
            onMinimize={() => { killMicRec(); setOrionOpen(false); }}
            onClose={() => { killMicRec(); setOrionOpen(false); }}
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
      <div className="flex items-center justify-between px-3 py-2 bg-black/60 border-b border-primary/10">
        <div className="flex items-center gap-2.5">
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
