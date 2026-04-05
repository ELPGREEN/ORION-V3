import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Video,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

const AnimatedMetric = ({ label, value, delay }: { label: string; value: string; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 140 } });
  const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      textAlign: "center", opacity,
      transform: `scale(${s}) translateY(${(1 - s) * 20}px)`,
    }}>
      <div style={{
        fontFamily: orbitron, fontSize: 48, fontWeight: 900,
        color: "#D4AF37",
        textShadow: "0 0 30px rgba(212,175,55,0.4)",
      }}>{value}</div>
      <div style={{
        fontFamily: inter, fontSize: 14, fontWeight: 300,
        color: "rgba(0,212,255,0.7)", letterSpacing: 4,
        marginTop: 8, textTransform: "uppercase",
      }}>{label}</div>
    </div>
  );
};

export const LogoScene2Neural = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgZoom = interpolate(frame, [0, 180], [1.0, 1.12], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [10, 35], [-60, 0], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Neural background video */}
      <AbsoluteFill style={{ transform: `scale(${bgZoom})`, opacity: 0.4 }}>
        <Video src={staticFile("videos/aquamonkey-neural.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, rgba(5,5,15,0.75) 0%, rgba(10,10,20,0.85) 100%)",
      }} />

      {/* Horizontal neon lines */}
      {[200, 880].map((y) => (
        <div key={y} style={{
          position: "absolute", top: y, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent 10%, rgba(0,212,255,${glowPulse * 0.3}) 50%, transparent 90%)`,
        }} />
      ))}

      {/* Title */}
      <div style={{
        position: "absolute", top: 240, left: 120,
        opacity: titleOpacity,
        transform: `translateX(${titleX}px)`,
      }}>
        <div style={{
          fontFamily: orbitron, fontSize: 52, fontWeight: 700,
          color: "white", letterSpacing: 6,
        }}>
          AquaMonkey · Lumen7
        </div>
        <div style={{
          fontFamily: inter, fontSize: 18, fontWeight: 300,
          color: "rgba(0,212,255,0.6)", letterSpacing: 5, marginTop: 12,
        }}>
          NEUROCORE ENGINE — ARQUITETURA COGNITIVA
        </div>
      </div>

      {/* Metrics row */}
      <div style={{
        position: "absolute", top: 480, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 120,
      }}>
        <AnimatedMetric label="Phi Index" value="Φ 0.847" delay={30} />
        <AnimatedMetric label="Camadas" value="15" delay={45} />
        <AnimatedMetric label="Tools" value="90+" delay={60} />
        <AnimatedMetric label="PLV Score" value="0.912" delay={75} />
      </div>

      {/* Bottom bar */}
      <div style={{
        position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 40, opacity: interpolate(frame, [90, 110], [0, 0.5], { extrapolateRight: "clamp" }),
      }}>
        {["DOPAMINA", "SEROTONINA", "NOREPINEFRINA", "GABA"].map((mod) => (
          <div key={mod} style={{
            fontFamily: inter, fontSize: 11, fontWeight: 400,
            color: "rgba(212,175,55,0.5)", letterSpacing: 3,
            padding: "6px 16px",
            border: "1px solid rgba(212,175,55,0.15)",
          }}>{mod}</div>
        ))}
      </div>

      {/* Scanlines */}
      <AbsoluteFill style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.01) 2px, rgba(0,212,255,0.01) 4px)",
      }} />
    </AbsoluteFill>
  );
};
