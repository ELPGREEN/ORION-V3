import { supabase } from "@/integrations/supabase/client";

/**
 * Orion GCP VM lifecycle — DESLIGADA por padrão.
 *
 * Decisão (usuário): Zilliz/RAG é a fonte primária de velocidade.
 * A VM ficou lenta (cold-start + keepalive desperdiçava recursos),
 * então cancelamos wake/keepalive. Para reativar manualmente
 * (ex.: testes de TTS/STT/Vision na VM), defina:
 *   localStorage.setItem("orion_vm_enabled", "true")
 *
 * orion-hub-client e useOrionCore continuam funcionais como fallback,
 * mas sem warm-up automático = sem latência de boot ao abrir Orion.
 */
const VM_FLAG = "orion_vm_enabled";

function vmEnabled(): boolean {
  try {
    return localStorage.getItem(VM_FLAG) === "true";
  } catch {
    return false;
  }
}

let lastWakeAt = 0;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000;

export async function wakeOrionVm(): Promise<void> {
  if (!vmEnabled()) return; // ⛔ VM desligada — Zilliz/RAG cuida de tudo
  const now = Date.now();
  if (now - lastWakeAt < 60_000) return;
  lastWakeAt = now;

  try {
    const { data, error } = await supabase.functions.invoke("orion-vm-control", {
      body: { command: "start" },
    });
    if (error) {
      console.warn("[OrionVmWake] Failed:", error);
    } else {
      console.log("[OrionVmWake] VM status:", data?.status);
    }
  } catch {
    // silent
  }
}

export function startVmKeepalive(): void {
  if (!vmEnabled()) return; // ⛔ keepalive desativado
  if (keepaliveTimer) return;
  console.log("[OrionVmWake] 🔥 Keepalive started (4min interval)");
  wakeOrionVm();
  keepaliveTimer = setInterval(() => {
    lastWakeAt = 0;
    wakeOrionVm();
  }, KEEPALIVE_INTERVAL_MS);
}

export function stopVmKeepalive(): void {
  if (keepaliveTimer) {
    clearInterval(keepaliveTimer);
    keepaliveTimer = null;
    console.log("[OrionVmWake] ❄️ Keepalive stopped");
  }
}
