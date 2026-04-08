import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { detectNavigationIntent } from "@/lib/neural/orion-nav-map";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
/**
 * PublicOrionListener — lightweight Orion orb for public pages.
 * Listens for "Orion" wake word and handles navigation commands.
 * No auth required. No NeuralVision overlay — just navigation + simple answers.
 */

const ORION_WAKE_REGEX = /([óòôõoö][\s.]*r[iíìeéè][\s.]*[oóòôõaã][\s.]*[nmn]|orion|[oó]rion|ore[oó][nm]|oria[nm]|orie[nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|o\s+rion|ori\s*on|painel)\b/i;

const PUBLIC_MIC_KEY = "orion_public_mic_granted";

function extractCommand(transcript: string): string {
  return transcript.replace(ORION_WAKE_REGEX, "").trim();
}

export function PublicOrionListener() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasOrionAccess, loading: planLoading } = useUserPlan();
  const [listening, setListening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [micGranted, setMicGranted] = useState(() => localStorage.getItem(PUBLIC_MIC_KEY) === "true");
  const recRef = useRef<any>(null);
  const cooldownRef = useRef(false);
  const wakeDetectedRef = useRef(false);
  const pendingCommandRef = useRef("");
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startInFlightRef = useRef(false);

  // Don't show on auth pages, dashboard, or dedicated Orion screens
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isAuthPage = ["/auth", "/cadastro", "/esqueci-senha"].includes(location.pathname);
  const isDedicatedOrionPage = location.pathname === "/consulta";
  const shouldHide = isDashboard || isAuthPage || isDedicatedOrionPage || (!planLoading && !hasOrionAccess);

  const showFeedback = useCallback((msg: string, duration = 3000) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), duration);
  }, []);

  const handleCommand = useCallback((command: string) => {
    cooldownRef.current = true;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";

    const clean = command.trim();
    
    if (!clean) {
      showFeedback("👋 Olá! Diga o que deseja. Ex: 'Orion, me leve para os planos'");
      setTimeout(() => { cooldownRef.current = false; }, 2000);
      return;
    }

    // Local quick answers (no auth needed)
    const lower = clean.toLowerCase();
    if (/que\s*hora/i.test(lower)) {
      showFeedback(`🕐 ${new Date().toLocaleTimeString("pt-BR")} — ${new Date().toLocaleDateString("pt-BR")}`);
      setTimeout(() => { cooldownRef.current = false; }, 2000);
      return;
    }
    if (/status\s*(do\s*)?(sistema|orion)/i.test(lower)) {
      showFeedback("✅ Orion operacional. Rede neural ativa, todos os módulos online.");
      setTimeout(() => { cooldownRef.current = false; }, 2000);
      return;
    }
    if (/\b(ajuda|help|comandos)\b/i.test(lower)) {
      showFeedback('💡 Comandos: "ir para planos", "abrir soluções", "ver blog", "que horas são". Faça login para acesso completo.');
      setTimeout(() => { cooldownRef.current = false; }, 3000);
      return;
    }

    // Try navigation intent
    const navIntent = detectNavigationIntent(clean);
    if (navIntent) {
      showFeedback(`🧭 Abrindo ${navIntent.label}...`);
      setTimeout(() => {
        navigate(navIntent.path);
        cooldownRef.current = false;
      }, 800);
      return;
    }

    // Commands that require auth
    if (/\b(criar|gerar|buscar|listar|abrir\s+(crm|processo|tarefa|documento))/i.test(lower)) {
      if (!user) {
        showFeedback("🔒 Faça login para usar esse comando.");
        setTimeout(() => { navigate("/auth"); cooldownRef.current = false; }, 1500);
        return;
      }
    }

    // Fallback — helpful suggestions
    showFeedback(`🤔 Não entendi "${clean}". Tente: "ir para planos", "ver soluções", "abrir blog"`, 5000);
    setTimeout(() => { cooldownRef.current = false; }, 2000);
  }, [navigate, showFeedback]);

  const stopListener = useCallback(() => {
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    startInFlightRef.current = false;
    if (commandTimeoutRef.current) { clearTimeout(commandTimeoutRef.current); commandTimeoutRef.current = null; }
    if (restartTimerRef.current) { clearTimeout(restartTimerRef.current); restartTimerRef.current = null; }
    try { recRef.current?.abort?.(); } catch {}
    try { recRef.current?.stop?.(); } catch {}
    recRef.current = null;
    setListening(false);
  }, []);

  const startListener = useCallback(() => {
    if (recRef.current || startInFlightRef.current || !micGranted || shouldHide) return;
    if (typeof document !== "undefined" && document.hidden) return;

    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) return;

    startInFlightRef.current = true;

    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = !/android|iphone|ipad|mobile/i.test(navigator.userAgent);
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onstart = () => { startInFlightRef.current = false; setListening(true); };

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const isFinal = e.results[i].isFinal;
          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            if (!ORION_WAKE_REGEX.test(transcript)) continue;
            if (cooldownRef.current) continue;

            const command = extractCommand(transcript);

            if (!wakeDetectedRef.current) {
              wakeDetectedRef.current = true;
              pendingCommandRef.current = command;
              if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
              commandTimeoutRef.current = setTimeout(() => {
                if (wakeDetectedRef.current) handleCommand(pendingCommandRef.current);
              }, 3000);
            }

            if (command.length > pendingCommandRef.current.length) {
              pendingCommandRef.current = command;
            }

            if (isFinal && wakeDetectedRef.current) {
              handleCommand(command);
              return;
            }
          }
        }
      };

      rec.onend = () => {
        recRef.current = null;
        startInFlightRef.current = false;
        if (wakeDetectedRef.current) { handleCommand(pendingCommandRef.current); return; }
        if (micGranted && !cooldownRef.current && !(typeof document !== "undefined" && document.hidden)) {
          restartTimerRef.current = setTimeout(() => startListener(), 1000);
        } else {
          setListening(false);
        }
      };

      rec.onerror = (e: any) => {
        recRef.current = null;
        startInFlightRef.current = false;
        if (e.error === "not-allowed") { setListening(false); return; }
        if (micGranted && !cooldownRef.current) {
          restartTimerRef.current = setTimeout(() => startListener(), 2000);
        }
      };

      recRef.current = rec;
      rec.start();
    } catch {
      startInFlightRef.current = false;
    }
  }, [micGranted, shouldHide, handleCommand]);

  const handleOrbClick = useCallback(async () => {
    if (!user) {
      showFeedback("🔒 Faça login para usar o Orion por voz");
      setTimeout(() => navigate("/auth"), 1500);
      return;
    }
    if (!hasOrionAccess) {
      showFeedback("⚡ Seus tokens gratuitos acabaram. Faça upgrade para continuar usando o Orion.");
      setTimeout(() => navigate("/contato"), 2000);
      return;
    }
    if (!micGranted) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(t => t.stop());
        localStorage.setItem(PUBLIC_MIC_KEY, "true");
        setMicGranted(true);
        showFeedback('⚡ Orion ativado! Diga "Orion, ir para planos"');
        setTimeout(() => startListener(), 300);
      } catch {
        showFeedback("❌ Microfone necessário para comandos de voz");
      }
      return;
    }
    // If already listening, show help
    showFeedback('💡 Diga "Orion" + comando. Ex: "Orion, ir para soluções"');
  }, [user, hasOrionAccess, micGranted, startListener, showFeedback, navigate]);

  // Start on mount if mic already granted
  useEffect(() => {
    if (!micGranted || shouldHide) {
      stopListener();
      return;
    }
    const timer = setTimeout(() => startListener(), 500);
    return () => { clearTimeout(timer); stopListener(); };
  }, [micGranted, shouldHide, startListener, stopListener]);

  // Visibility change
  useEffect(() => {
    const handler = () => {
      if (document.hidden) { stopListener(); }
      else if (micGranted && !shouldHide) { setTimeout(() => startListener(), 500); }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [micGranted, shouldHide, startListener, stopListener]);

  if (shouldHide) return null;

  return (
    <>
      {/* Floating Orb */}
      <div
        className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6 group cursor-pointer"
        onClick={handleOrbClick}
        title={micGranted ? 'Diga "Orion" + comando' : "Ativar Orion por voz"}
      >
        <div className="relative w-14 h-14 lg:w-16 lg:h-16">
          <div
            className="absolute inset-0 rounded-full transition-all duration-700"
            style={{
              background: listening
                ? "radial-gradient(circle, hsl(var(--primary) / 0.7) 0%, hsl(var(--primary) / 0.2) 50%, transparent 70%)"
                : "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
              filter: listening ? "blur(14px)" : "blur(10px)",
              transform: listening ? "scale(2)" : "scale(1.5)",
              animation: "orbBreathPublic 3s ease-in-out infinite",
            }}
          />
          <PlasmaCore className="w-full h-full" />
          {listening && (
            <div
              className="absolute inset-0 rounded-full border-2 border-primary/50"
              style={{ animation: "orbPulsePublic 2s ease-out infinite" }}
            />
          )}
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={cn(
            "text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm",
            listening
              ? "text-primary border-primary/40 bg-primary/10 animate-pulse"
              : "text-muted-foreground/60 border-border/30 bg-card/50"
          )}>
            {listening ? '⚡ Diga "Orion"' : "Orion"}
          </span>
        </div>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div className="fixed bottom-36 right-4 lg:bottom-24 lg:right-6 z-50 animate-fade-in">
          <div className="bg-card/95 backdrop-blur-sm border border-primary/20 rounded-lg px-4 py-3 shadow-2xl max-w-xs">
            <p className="text-sm text-foreground">{feedback}</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes orbBreathPublic {
          0%, 100% { opacity: 0.5; transform: scale(1.4); }
          50% { opacity: 0.85; transform: scale(1.7); }
        }
        @keyframes orbPulsePublic {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.2); opacity: 0; }
        }
      `}</style>
    </>
  );
}
