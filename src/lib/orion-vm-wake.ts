import { supabase } from "@/integrations/supabase/client";

/**
 * Orion GCP VM lifecycle:
 * - wakeOrionVm(): wakes the VM (debounced 60s).
 * - startVmKeepalive(): pings VM every 4min to prevent cold-start while Orion is active.
 * - stopVmKeepalive(): stops the heartbeat (call when Orion is fully deactivated).
 */
let lastWakeAt = 0;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
const KEEPALIVE_INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

export async function wakeOrionVm(): Promise<void> {
  const now = Date.now();
  if (now - lastWakeAt < 60_000) return; // debounce 60s
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
  if (keepaliveTimer) return; // already running
  console.log("[OrionVmWake] 🔥 Keepalive started (4min interval)");
  // Wake immediately, then every 4min
  wakeOrionVm();
  keepaliveTimer = setInterval(() => {
    lastWakeAt = 0; // bypass debounce for scheduled pings
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
