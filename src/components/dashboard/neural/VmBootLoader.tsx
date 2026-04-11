import { useState, useEffect } from "react";
import { Loader2, Server, CheckCircle2, AlertTriangle } from "lucide-react";
import { onBootStatusChange, getBootStatus, type VmBootStatus } from "@/lib/neural/orion-hub-client";

/**
 * Floating overlay that shows VM boot progress when Orion's VM is starting up.
 * Automatically appears/disappears based on boot status events.
 */
export function VmBootLoader() {
  const [status, setStatus] = useState<VmBootStatus>(getBootStatus());
  const [dots, setDots] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const unsub = onBootStatusChange(setStatus);
    return unsub;
  }, []);

  // Animate dots
  useEffect(() => {
    if (status !== "starting") return;
    const interval = setInterval(() => setDots(d => (d + 1) % 4), 500);
    return () => clearInterval(interval);
  }, [status]);

  // Elapsed timer
  useEffect(() => {
    if (status !== "starting") { setElapsed(0); return; }
    const start = Date.now();
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [status]);

  // Auto-hide after online/error
  useEffect(() => {
    if (status === "online" || status === "error") {
      const timer = setTimeout(() => setStatus("idle"), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  if (status === "idle") return null;

  const dotStr = ".".repeat(dots);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div
        className="flex items-center gap-3 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md"
        style={{
          background: status === "online"
            ? "rgba(16,185,129,0.15)"
            : status === "error"
              ? "rgba(239,68,68,0.15)"
              : "rgba(10,10,20,0.85)",
          border: `1px solid ${
            status === "online"
              ? "rgba(16,185,129,0.4)"
              : status === "error"
                ? "rgba(239,68,68,0.4)"
                : "rgba(212,175,55,0.3)"
          }`,
          boxShadow: status === "starting"
            ? "0 0 30px rgba(212,175,55,0.15)"
            : status === "online"
              ? "0 0 20px rgba(16,185,129,0.2)"
              : "none",
        }}
      >
        {status === "starting" && (
          <>
            <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Orion VM iniciando{dotStr}
              </p>
              <p className="text-[11px] text-amber-400/60">
                {elapsed < 30
                  ? "Preparando infraestrutura neural..."
                  : elapsed < 60
                    ? "Carregando modelos de IA..."
                    : "Quase pronto — finalizando inicialização..."}
                {" "}({elapsed}s)
              </p>
            </div>
          </>
        )}

        {status === "online" && (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-300">Orion VM online ⚡</p>
              <p className="text-[11px] text-emerald-400/60">Sistema neural pronto</p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <div>
              <p className="text-sm font-medium text-red-300">VM não respondeu</p>
              <p className="text-[11px] text-red-400/60">Usando fallback — funcionalidade parcial</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
