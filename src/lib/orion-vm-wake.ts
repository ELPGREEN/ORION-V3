import { supabase } from "@/integrations/supabase/client";

/**
 * Wake the Orion GCP VM on demand.
 * Debounced: won't send duplicate requests within 60 seconds.
 */
let lastWakeAt = 0;

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
