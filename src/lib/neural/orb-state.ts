/**
 * Global shared VFX state for the Energy Orb
 */
export const OrbState = {
  aiResponding: false,
  active: false,
  awareness: 50, // starts at 50, converges to real IIT Phi (~70-85%) within seconds
  regions: [] as any[],
  motion: { intensity: 0 } as { intensity: number },
  // Voice state for SPEAKING/LISTENING indicator
  voiceState: "idle" as "idle" | "listening" | "thinking" | "speaking",
};
