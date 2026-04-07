import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

const features = [
  { icon: "🧠", label: "IA Neural Proprietária" },
  { icon: "👁", label: "Visão Computacional" },
  { icon: "🎙", label: "Voz Inteligente — 13 Idiomas" },
  { icon: "📄", label: "Geração de Documentos" },
  { icon: "🔒", label: "LGPD & Compliance" },
  { icon: "⚡", label: "Automação Industrial" },
];

export const Scene2Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 25], [-60, 0], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [10, 40], [0, 200], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#06080e", padding: "80px 120px" }}>
      {/* Left glow */}
      <div style={{
        position: "absolute", left: -200, top: "30%", width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,212,255,0.08) 0%, transparent 70%)",
      }} />

      {/* Title */}
      <div style={{ opacity: titleOpacity, transform: `translateX(${titleX}px)` }}>
        <span style={{
          fontFamily: orbitron, fontSize: 48, fontWeight: 700,
          color: "white", letterSpacing: 4,
        }}>
          O que o Orion faz
        </span>
        <div style={{
          width: lineWidth, height: 3,
          background: "linear-gradient(90deg, #00d4ff, transparent)",
          marginTop: 16,
        }} />
      </div>

      {/* Feature grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
        gap: 28, marginTop: 60,
      }}>
        {features.map((f, i) => {
          const delay = 25 + i * 12;
          const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 160 } });
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const borderPulse = Math.sin((frame - delay) * 0.06) * 0.2 + 0.3;

          return (
            <div key={i} style={{
              opacity,
              transform: `scale(${interpolate(s, [0, 1], [0.8, 1])}) translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
              border: `1px solid rgba(0,212,255,${borderPulse})`,
              background: "rgba(0,212,255,0.03)",
              padding: "28px 24px",
              display: "flex", alignItems: "center", gap: 20,
            }}>
              <span style={{ fontSize: 36 }}>{f.icon}</span>
              <span style={{
                fontFamily: inter, fontSize: 20, fontWeight: 600,
                color: "rgba(255,255,255,0.85)", letterSpacing: 1,
              }}>
                {f.label}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
