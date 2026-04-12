import { useOrionVmWakeUp } from "@/hooks/useOrionVmWakeUp";

/** Invisible component that wakes the GCP VM on first app load */
export function OrionVmWakeUp() {
  useOrionVmWakeUp();
  return null;
}
