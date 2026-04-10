import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Silently wakes up the GCP VM when the app loads.
 * Sends a "start" command — if already running, it's a no-op.
 * Runs once per session (uses sessionStorage flag).
 */
export function useOrionVmWakeUp() {
  useEffect(() => {
    const KEY = "orion-vm-wake-sent";
    if (sessionStorage.getItem(KEY)) return;
    sessionStorage.setItem(KEY, "1");

    supabase.functions
      .invoke("orion-vm-control", {
        body: { command: "start" },
      })
      .then(({ data, error }) => {
        if (error) {
          console.warn("[OrionVmWake] Failed:", error);
        } else {
          console.log("[OrionVmWake] VM status:", data?.status);
        }
      })
      .catch(() => {});
  }, []);
}
