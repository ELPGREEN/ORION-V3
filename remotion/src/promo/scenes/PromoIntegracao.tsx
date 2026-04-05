import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadOrbitron();
const { fontFamily: inter } = loadInter();

const TECHS = [
  { label: "IoT", icon: "⚡", angle: 0 },
  { label: "MQTT", icon: "📡", angle: 45 },
  { label: "Bluetooth", icon: "🔗", angle: 90 },
  { label: "Smart Home", icon: "🏠", angle: 135 },
  { label: "Robótica", icon: "🤖", angle: 180 },
  { label: "Voz", icon: "🎤", angle: 225 },
  { label: "Visão", icon: "👁", angle: 270 },
  { label: "IA", icon: "🧠", angle: 315 },
];

export const PromoIntegracao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerX = 960;
  const centerY = 480;
  const radius = 320;

  // Hex grid background
  const hexOpacity = interpolate(frame, [0, 30], [0, 0.08], { extrapolateRight: "clamp" });

  // Connection lines pulse
  const linePulse = Math.sin(frame * 0.1) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Hex grid */}
      <AbsoluteFill style={{ opacity: hexOpacity }}>
        {Array.from({ length: 12 }, (_, row) =>
          Array.from({ length: 16 }, (_, col) => {
            const x = col * 130 + (row % 2) * 65 - 50;
            const y = row * 110 - 50;
            return (
              <div key={`${row}-${col}`} style={{
                position: "absolute", left: x, top: y,
                width: 80, height: 92,
                border: "1px solid rgba(0,212,255,0.15)",
                clipPath: "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)",
              }} />
            );
          })
        )}
      </AbsoluteFill>

      {/* Connection lines from center to each tech */}
      <svg style={{ position: "absolute", width: 1920, height: 1080 }}>
        {TECHS.map((tech, i) => {
          const delay = i * 15;
          const progress = interpolate(frame, [delay + 20, delay + 60], [0, 1], {
            extrapolateLeft: "clamp", extrapolateRight: "clamp",
          });
          const angle = (tech.angle * Math.PI) / 180;
          const tx = centerX + Math.cos(angle) * radius * progress;
          const ty = centerY + Math.sin(angle) * radius * progress;
          const dashOffset = interpolate(frame, [0, 300], [200, 0]);

          return (
            <line key={i}
              x1={centerX} y1={centerY} x2={tx} y2={ty}
              stroke={i % 2 === 0 ? "#D4AF37" : "#00D4FF"}
              strokeWidth={2}
              strokeDasharray="8 4"
              strokeDashoffset={dashOffset}
              opacity={progress * linePulse}
            />
          );
        })}
      </svg>

      {/* Center orb */}
      <div style={{
        position: "absolute", left: centerX - 50, top: centerY - 50,
        width: 100, height: 100, borderRadius: "50%",
        background: "radial-gradient(circle, #D4AF37 0%, #D4AF3700 70%)",
        boxShadow: "0 0 60px rgba(212,175,55,0.5)",
        display: "flex", justifyContent: "center", alignItems: "center",
      }}>
        <span style={{ fontFamily: orbitron, fontSize: 28, fontWeight: 900, color: "#D4AF37" }}>O</span>
      </div>

      {/* Tech nodes */}
      {TECHS.map((tech, i) => {
        const delay = i * 15;
        const s = spring({ frame: frame - delay - 30, fps, config: { damping: 15 } });
        const angle = (tech.angle * Math.PI) / 180;
        const tx = centerX + Math.cos(angle) * radius;
        const ty = centerY + Math.sin(angle) * radius;
        const pulse = Math.sin(frame * 0.08 + i) * 4;

        return (
          <div key={i} style={{
            position: "absolute",
            left: tx - 55, top: ty - 55,
            width: 110, height: 110,
            borderRadius: "50%",
            border: `2px solid ${i % 2 === 0 ? "rgba(212,175,55,0.6)" : "rgba(0,212,255,0.6)"}`,
            background: `radial-gradient(circle, ${i % 2 === 0 ? "rgba(212,175,55,0.1)" : "rgba(0,212,255,0.1)"} 0%, transparent 70%)`,
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center",
            transform: `scale(${s + pulse * 0.01})`,
            opacity: s,
            boxShadow: `0 0 ${20 + pulse}px ${i % 2 === 0 ? "rgba(212,175,55,0.3)" : "rgba(0,212,255,0.3)"}`,
          }}>
            <span style={{ fontSize: 28 }}>{tech.icon}</span>
            <span style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 4, letterSpacing: 1 }}>
              {tech.label}
            </span>
          </div>
        );
      })}

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <div style={{
          fontFamily: orbitron, fontSize: 36, fontWeight: 700,
          color: "#00D4FF", letterSpacing: 6,
          opacity: spring({ frame: frame - 120, fps, config: { damping: 20 } }),
          textShadow: "0 0 30px rgba(0,212,255,0.5)",
        }}>INTEGRADO EM TODAS AS TECNOLOGIAS</div>
      </AbsoluteFill>

      {/* Scanlines */}
      <AbsoluteFill style={{ opacity: 0.02, pointerEvents: "none" }}>
        <div style={{
          width: "100%", height: "100%",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
