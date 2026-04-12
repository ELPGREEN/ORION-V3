/**
 * Neural Profile Initialization
 * Silently initializes a per-user neural network on registration.
 * Each user's neural data is strictly isolated — only the internal
 * neural engine and the mother network have access for evolution.
 */

import { supabase } from "@/integrations/supabase/client";

export async function initializeNeuralProfile(
  userId: string,
  role: "cliente" | "advogado" = "cliente"
): Promise<void> {
  try {
    await supabase.functions.invoke("neural-ops", {
      body: { user_id: userId, role },
    });
    console.log("[NEURAL] Profile initialized silently");
  } catch (_) {
    // Never block user flow — neural init is background-only
  }
}
