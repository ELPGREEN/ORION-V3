import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400"], subsets: ["latin"] });

const stats = [
  { value: "17+", label: "Ferramentas Integradas" },
  { value: "13", label: "Idiomas Suportados" },
  { value: "99.9%", label: "Disponibilidade" },
  { value: "4", label: "Segmentos de Mercado" },
];

export const Scene3Stats = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{
      backgroundColor: "#06080e",
      justifyContent: "center", alignItems: "center",
    }}>
      {/* Center glow */}
      <div style={{
        position: "absolute", width: 1000, height: 600,
        background: "radial-gradient(ellipse, rgba(0,212,255,0.1) 0%, transparent 60%)",
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      }} />

      {/* Title */}
      <div style={{
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        marginBottom: 60,
      }}>
        <span style={{
          fontFamily: orbitron, fontSize: 42, fontWeight: 700,
          color: "white", letterSpacing: 6,
        }}>
          NÚMEROS QUE IMPORTAM
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 60 }}>
        {stats.map((stat, i) => {
          const delay = 15 + i * 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 100 } });
          const countUp = interpolate(frame, [delay, delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

          return (
            <div key={i} style={{
              textAlign: "center",
              transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`,
              opacity: interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
            }}>
              <div style={{
                fontFamily: orbitron, fontSize: 72, fontWeight: 900,
                color: "#00d4ff",
                textShadow: "0 0 30px rgba(0,212,255,0.4)",
              }}>
                {stat.value}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 16, fontWeight: 400,
                color: "rgba(255,255,255,0.5)", letterSpacing: 3,
                textTransform: "uppercase", marginTop: 12,
              }}>
                {stat.label}
              </div>
              {/* Underline */}
              <div style={{
                width: interpolate(s, [0, 1], [0, 80]),
                height: 2, background: "rgba(0,212,255,0.4)",
                margin: "12px auto 0",
              }} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
