import { shouldQuarantine } from "./jules-immune-system";
import { getSubsystemFailureStatus, type SubsystemKey } from "./jules-auto-triggers";
import { isModuleAvailable } from "./system-health";

/**
 * Checks if a specific subsystem is healthy.
 * Aggregates signals from Immune System (quarantine),
 * Auto-Triggers (recent failures), and System Health (degradation).
 */
export function isSubsystemHealthy(subsystem: SubsystemKey): boolean {
  // 1. Check if quarantined
  if (shouldQuarantine(subsystem)) return false;

  // 2. Check failure count
  const fails = getSubsystemFailureStatus();
  const entry = fails[subsystem];
  if (entry && entry.count >= 3) return false;

  // 3. Optional: check system-health mapping
  // Map SubsystemKey to system-health Module IDs if possible
  const healthMapping: Record<string, string> = {
    core_api: "nlp_core",
    core_state: "memory_system",
    vision_gemini: "vision",
    stt_gcp: "voice_io",
    tts_gemini: "voice_io",
  };

  const healthId = healthMapping[subsystem];
  if (healthId && !isModuleAvailable(healthId)) return false;

  return true;
}
