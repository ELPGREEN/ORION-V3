/**
 * VisionDebugPanel
 *
 * Floating, opt-in panel that shows real-time events from the vision/voice
 * pipeline: STT captures, lock blocks, guard regexes applied, camera toggles.
 *
 * - Enable via the toggle button (persists in localStorage).
 * - Zero runtime cost when closed beyond a single window listener.
 * - Max 80 events kept in memory.
 */
import { useEffect, useState, useCallback } from "react";
import { VISION_DEBUG_EVENT, type VisionDebugEvent } from "@/lib/voice/visionDebugBus";
import { Bug, X, Trash2 } from "lucide-react";

const STORAGE_KEY = "vision-debug-panel-open";
const MAX_EVENTS = 80;

const KIND_LABELS: Record<VisionDebugEvent["kind"], { label: string; color: string }> = {
  "stt-capture":               { label: "STT",           color: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  "vision-keyword":            { label: "KEYWORD",       color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" },
  "command-dispatch":          { label: "DISPATCH",      color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  "lock-pass":                 { label: "LOCK ✓",        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  "lock-block":                { label: "LOCK ✗",        color: "bg-red-500/20 text-red-300 border-red-500/40" },
  "guard-echo-block":          { label: "GUARD echo",    color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "guard-lowconf-block":       { label: "GUARD low-conf",color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "guard-auto-response-block": { label: "GUARD auto-resp",color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  "camera-start":              { label: "CAM ▶",         color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  "camera-stop":               { label: "CAM ■",         color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" },
  "tts-speak":                 { label: "TTS",           color: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40" },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}.${d.getMilliseconds().toString().padStart(3, "0")}`;
}

export function VisionDebugPanel() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const [events, setEvents] = useState<VisionDebugEvent[]>([]);

  useEffect(() => {
    const onEv = (e: Event) => {
      const detail = (e as CustomEvent<VisionDebugEvent>).detail;
      if (!detail) return;
      setEvents((prev) => {
        const next = [detail, ...prev];
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next;
      });
    };
    window.addEventListener(VISION_DEBUG_EVENT, onEv);
    return () => window.removeEventListener(VISION_DEBUG_EVENT, onEv);
  }, []);

  const toggle = useCallback(() => {
    setOpen((v) => {
      const nv = !v;
      try { window.localStorage.setItem(STORAGE_KEY, nv ? "1" : "0"); } catch {}
      return nv;
    });
  }, []);

  const clear = useCallback(() => setEvents([]), []);

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-4 left-4 z-[9999] flex items-center gap-2 rounded-full border border-primary/40 bg-background/80 px-3 py-2 text-xs font-mono text-primary shadow-lg backdrop-blur hover:bg-background"
        title="Abrir painel de debug da visão"
      >
        <Bug className="h-3.5 w-3.5" />
        VISION DEBUG
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-[9999] flex max-h-[70vh] w-[420px] flex-col overflow-hidden rounded-lg border border-primary/40 bg-background/95 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/40 px-3 py-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Bug className="h-3.5 w-3.5 text-primary" />
          <span>VISION DEBUG</span>
          <span className="rounded bg-primary/20 px-1.5 py-0.5 text-[10px] text-primary">{events.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clear}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Limpar"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Fechar"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px]">
        {events.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            Aguardando eventos…<br />
            Diga <span className="text-primary">&ldquo;ativar visão&rdquo;</span> para testar.
          </div>
        ) : (
          <ul className="space-y-1">
            {events.map((ev, i) => {
              const meta = KIND_LABELS[ev.kind] ?? { label: ev.kind, color: "bg-zinc-500/20 text-zinc-300 border-zinc-500/40" };
              return (
                <li key={`${ev.ts}-${i}`} className="rounded border border-border/40 bg-muted/30 p-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatTime(ev.ts ?? Date.now())}</span>
                  </div>
                  {ev.action && (
                    <div className="mt-1 text-[10px]">
                      <span className="text-muted-foreground">action: </span>
                      <span className="text-foreground">{ev.action}</span>
                    </div>
                  )}
                  {ev.matchedRegex && (
                    <div className="mt-0.5 text-[10px]">
                      <span className="text-muted-foreground">regex: </span>
                      <span className="text-amber-300">{ev.matchedRegex}</span>
                    </div>
                  )}
                  {ev.text && (
                    <div className="mt-0.5 break-words text-[10px] text-foreground/90">
                      <span className="text-muted-foreground">text: </span>
                      <span>&ldquo;{ev.text.slice(0, 160)}{ev.text.length > 160 ? "…" : ""}&rdquo;</span>
                    </div>
                  )}
                  {ev.note && (
                    <div className="mt-0.5 text-[10px] text-muted-foreground">{ev.note}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default VisionDebugPanel;
