/**
 * OrionGlobalListener — Persistent wake word listener (Alexa-style)
 * Stays mounted across non-dashboard routes so "Orion" always works.
 * 
 * Alexa-style flow:
 * 1. Detect "Orion" in interim/final result
 * 2. Keep listening for the rest of the command (up to 3s)
 * 3. On final result or timeout → execute with full command
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";

const ORION_WAKE_REGEX = /([óòôõo][. ]*r[iíìeéè][. ]*[oóòôõ][. ]*[nmn]|oreo[nm]|oria[nm]|orie[nm]|ore[oó][nm]|[oó]rio[nm]|[oó]ria[nm]|oure[oó][nm]|painel)\b/i;

/** Extract the command portion after the wake word */
function extractCommand(transcript: string): string {
  return transcript.replace(ORION_WAKE_REGEX, "").trim();
}

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const RESTART_DELAY = isMobile ? 8000 : 400;
const ERROR_RESTART_DELAY = isMobile ? 5000 : 2000;
const MAX_NOT_ALLOWED_RETRIES = 2;

export function OrionGlobalListener() {
  const { user } = useAuth();
  const { isPremium } = useUserPlan();
  const navigate = useNavigate();
  const location = useLocation();
  const [wakeWordActive, setWakeWordActive] = useState(false);
  const [wakeWordHeard, setWakeWordHeard] = useState(false);
  const wakeRecRef = useRef<any>(null);
  const cooldownRef = useRef(false);
  const enabledRef = useRef(true);
  const visibleRef = useRef(true);
  const notAllowedCountRef = useRef(0);
  const micPermDeniedRef = useRef(false);

  // Alexa-style: track pending command after wake word detection
  const pendingCommandRef = useRef<string>("");
  const commandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeDetectedRef = useRef(false);

  // Disable on pages that have their OWN SpeechRecognition:
  // - /consulta, /rede-neural (NeuralVision wake word)
  // - /dashboard/* (GlobalOrionListener handles it there)
  const isOnDashboard = location.pathname.startsWith("/dashboard");
  const isOnOrionPage = location.pathname === "/consulta" || location.pathname.includes("/rede-neural");
  const shouldDisable = isOnDashboard || isOnOrionPage;

  const executeCommand = useCallback((command: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    setWakeWordHeard(false);

    try { wakeRecRef.current?.stop(); } catch {}
    wakeRecRef.current = null;
    setWakeWordActive(false);
    enabledRef.current = false;

    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }

    // Route based on user status
    if (!user) {
      toast("🔒 Orion: Você precisa se cadastrar para usar este recurso", { duration: 3000 });
      navigate("/cadastro");
    } else if (!isPremium) {
      toast("👑 Orion: Este recurso é exclusivo para assinantes Premium", { duration: 3000 });
      navigate("/dashboard/plano");
    } else {
      const cleanCmd = command.trim();
      toast("🐒 Orion ativado!", { duration: 1500 });
      if (cleanCmd.length > 2) {
        navigate("/consulta", { state: { autoCommand: cleanCmd } });
      } else {
        navigate("/consulta", { state: { autoActivate: true } });
      }
    }

    setTimeout(() => {
      cooldownRef.current = false;
      enabledRef.current = true;
    }, 2000);
  }, [navigate, user, isPremium]);

  const startListener = useCallback(() => {
    if (shouldDisable) return;
    if (micPermDeniedRef.current) return; // permanently denied — never retry
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR || wakeRecRef.current) return;

    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 3;

      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const isFinal = e.results[i].isFinal;

          for (let alt = 0; alt < e.results[i].length; alt++) {
            const transcript = (e.results[i][alt]?.transcript || "").toLowerCase().trim();
            const confidence = e.results[i][alt]?.confidence || 0;

            if (transcript.length > 1) {
              console.log(`[OrionGlobal] heard: "${transcript}" (conf=${(confidence*100).toFixed(0)}%, wake=${ORION_WAKE_REGEX.test(transcript)})`);
            }

            if (!ORION_WAKE_REGEX.test(transcript)) continue;
            if (cooldownRef.current) continue;

            const command = extractCommand(transcript);

            if (!wakeDetectedRef.current) {
              wakeDetectedRef.current = true;
              pendingCommandRef.current = command;
              setWakeWordHeard(true);

              if (commandTimeoutRef.current) clearTimeout(commandTimeoutRef.current);
              commandTimeoutRef.current = setTimeout(() => {
                if (wakeDetectedRef.current) {
                  executeCommand(pendingCommandRef.current);
                }
              }, 3000);
            }

            if (command.length > pendingCommandRef.current.length) {
              pendingCommandRef.current = command;
            }

            if (isFinal && wakeDetectedRef.current) {
              executeCommand(command);
              return;
            }
          }
        }
      };

      rec.onend = () => {
        // If mic denied, never restart
        if (micPermDeniedRef.current) {
          wakeRecRef.current = null;
          setWakeWordActive(false);
          return;
        }

        // If wake word was detected but onend fired before final result, execute now
        if (wakeDetectedRef.current) {
          executeCommand(pendingCommandRef.current);
          return;
        }

        wakeRecRef.current = null;
        const willRestart = enabledRef.current && visibleRef.current && !shouldDisable;
        if (!willRestart) setWakeWordActive(false);
        if (willRestart) {
          setTimeout(() => {
            if (enabledRef.current && visibleRef.current && !wakeRecRef.current && !shouldDisable) {
              startListener();
            } else {
              setWakeWordActive(false);
            }
          }, RESTART_DELAY);
        }
      };

      rec.onerror = (e: any) => {
        wakeRecRef.current = null;
        const errStr = String(e.error || e.message || "").toLowerCase();
        if (errStr.includes("not-allowed") || errStr.includes("service-not-allowed") || errStr.includes("permission")) {
          notAllowedCountRef.current++;
          console.warn(`[OrionGlobal] Mic permission denied (${notAllowedCountRef.current}/${MAX_NOT_ALLOWED_RETRIES}) — stopping permanently`);
          setWakeWordActive(false);
          enabledRef.current = false;
          micPermDeniedRef.current = true;
          return;
        }
        if (errStr === "no-speech") {
          const willRestart = enabledRef.current && visibleRef.current && !shouldDisable;
          if (willRestart) {
            setTimeout(() => {
              if (enabledRef.current && visibleRef.current && !wakeRecRef.current && !shouldDisable) {
                startListener();
              }
            }, RESTART_DELAY);
          } else {
            setWakeWordActive(false);
          }
          return;
        }
        console.warn("[OrionGlobal] onerror:", errStr);
        notAllowedCountRef.current++;
        if (notAllowedCountRef.current >= MAX_NOT_ALLOWED_RETRIES) {
          console.warn("[OrionGlobal] Too many errors — stopping listener");
          setWakeWordActive(false);
          enabledRef.current = false;
          micPermDeniedRef.current = true;
          return;
        }
        const willRestart = enabledRef.current && visibleRef.current && !shouldDisable;
        if (!willRestart) setWakeWordActive(false);
        if (willRestart) {
          setTimeout(() => {
            if (enabledRef.current && visibleRef.current && !wakeRecRef.current && !shouldDisable) {
              startListener();
            } else {
              setWakeWordActive(false);
            }
          }, ERROR_RESTART_DELAY);
        }
      };

      wakeRecRef.current = rec;
      rec.start();
      setWakeWordActive(true);
    } catch (err) {
      console.warn("[OrionGlobal] Failed to start:", err);
    }
  }, [shouldDisable, executeCommand]);

  const stopListener = useCallback(() => {
    enabledRef.current = false;
    wakeDetectedRef.current = false;
    pendingCommandRef.current = "";
    setWakeWordHeard(false);
    if (commandTimeoutRef.current) {
      clearTimeout(commandTimeoutRef.current);
      commandTimeoutRef.current = null;
    }
    try { wakeRecRef.current?.stop(); } catch {}
    wakeRecRef.current = null;
    setWakeWordActive(false);
  }, []);

  // Suspend mic when page hidden; restore when visible again
  useEffect(() => {
    const handleVisibility = () => {
      visibleRef.current = !document.hidden;

      if (document.hidden) {
        if (wakeRecRef.current) stopListener();
        return;
      }

      if (!shouldDisable) {
        enabledRef.current = true;
        window.setTimeout(() => {
          if (visibleRef.current && !wakeRecRef.current && !shouldDisable) {
            startListener();
          }
        }, 250);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      stopListener();
    };
  }, [shouldDisable, startListener, stopListener]);

  // Keep wake word active on normal pages, including the dashboard
  useEffect(() => {
    const pageHidden = typeof document !== "undefined" && document.hidden;
    if (shouldDisable || pageHidden) {
      stopListener();
      return;
    }

    enabledRef.current = true;
    const timer = window.setTimeout(() => {
      if (!wakeRecRef.current && visibleRef.current) {
        startListener();
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [shouldDisable, startListener, stopListener]);

  const handleOrbClick = useCallback(() => {
    if (wakeWordActive) {
      stopListener();
    } else {
      enabledRef.current = true;
      startListener();
      toast("👂 Orion escutando... diga o comando!", { duration: 2000 });
    }
  }, [wakeWordActive, startListener, stopListener]);

  if (shouldDisable) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Badge
        variant="outline"
        className={`text-[10px] h-7 font-mono border-primary/30 bg-background/80 backdrop-blur-sm gap-1.5 px-3 cursor-pointer shadow-lg transition-all ${
          wakeWordHeard
            ? "text-amber-400 border-amber-500/50 animate-none"
            : wakeWordActive
              ? "text-primary animate-pulse"
              : "text-muted-foreground border-muted-foreground/30"
        }`}
        onClick={handleOrbClick}
      >
        <Mic className="h-3 w-3" />
        {wakeWordHeard
          ? "🎯 Ouvindo comando..."
          : wakeWordActive
            ? "👂 Diga 'Orion' ou 'Painel'"
            : "🔇 Voz (toque para ativar)"}
      </Badge>
    </div>
  );
}
