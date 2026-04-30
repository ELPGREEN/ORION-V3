// VoiceStateIndicator — template literals OK (cache-bust v2)
import { useState, useEffect } from "react";
import { OrbState } from "@/lib/neural/orb-state";

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

const COLORS: Record<VoiceState, { dot: string; text: string; border: string; glow: string }> = {
  speaking:  { dot: "bg-blue-500",   text: "rgba(59,130,246,0.9)",  border: "rgba(59,130,246,0.4)", glow: "rgba(59,130,246,0.6)" },
  listening: { dot: "bg-green-500",  text: "rgba(34,197,94,0.9)",   border: "rgba(34,197,94,0.4)",  glow: "rgba(34,197,94,0.6)" },
  thinking:  { dot: "bg-amber-500",  text: "rgba(212,175,55,0.9)",  border: "rgba(212,175,55,0.4)", glow: "rgba(212,175,55,0.6)" },
  idle:      { dot: "bg-gray-500/50", text: "rgba(100,100,100,0.4)", border: "rgba(100,100,100,0.2)", glow: "none" },
};

export const VoiceStateIndicator = ({ noSpeechDetected }: { noSpeechDetected?: boolean }) => {
  const [vs, setVs] = useState<VoiceState>(OrbState.voiceState);

  const labels: Record<VoiceState, string> = {
    speaking: "SPEAKING",
    listening: noSpeechDetected ? "SEM SOM" : "LISTENING",
    thinking: "PROCESSING",
    idle: "ONLINE",
  };

  useEffect(() => {
    const id = setInterval(() => {
      if (OrbState.voiceState !== vs) setVs(OrbState.voiceState);
    }, 100);
    return () => clearInterval(id);
  });

  const c = COLORS[vs];

  return (
    <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
      <div className="flex flex-col items-center" style={{ marginTop: "35%" }}>
        <div className="flex items-center gap-2 rounded px-3 py-1" style={{
          backgroundColor: "rgba(0,0,0,0.6)",
          border: `1px solid ${c.border}`,
          backdropFilter: "blur(4px)",
        }}>
          <div
            className={`h-2 w-2 rounded-full ${c.dot} ${vs !== "idle" ? "animate-pulse" : ""}`}
            style={{ boxShadow: vs !== "idle" ? `0 0 8px ${c.glow}` : "none" }}
          />
          <span
            className="text-[10px] font-mono tracking-[0.2em] uppercase"
            style={{
              color: noSpeechDetected && vs === "listening" ? "rgba(251,191,36,0.9)" : c.text,
              textShadow: vs !== "idle" ? `0 0 10px ${c.border}` : "none",
            }}
          >
            {labels[vs]}
          </span>
        </div>
      </div>
    </div>
  );
};
