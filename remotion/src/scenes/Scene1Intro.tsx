import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadFont.call(null) ? { fontFamily: "Inter" } : loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const Scene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgGlow = interpolate(frame, [0, 60, 120], [0, 0.15, 0.08], { extrapolateRight: "clamp" });

  // Logo box
  const boxScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 120 } });
  const boxRotate = interpolate(frame, [10, 50], [45, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ORION text
  const orionX = spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 180 } });
  const orionOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle
  const subOpacity = interpolate(frame, [55, 75], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(frame, [55, 75], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Tagline
  const tagOpacity = interpolate(frame, [85, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulse on box border
  const pulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: "#06080e", justifyContent: "center", alignItems: "center" }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", width: 800, height: 800,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,212,255,${bgGlow}) 0%, transparent 70%)`,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      }} />

      {/* Logo box */}
      <div style={{
        width: 120, height: 120,
        border: `2px solid rgba(0,212,255,${pulse})`,
        transform: `scale(${boxScale}) rotate(${boxRotate}deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 12, height: 12, borderTop: "3px solid #00d4ff", borderLeft: "3px solid #00d4ff" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderBottom: "3px solid #00d4ff", borderRight: "3px solid #00d4ff" }} />
        <span style={{ fontFamily: orbitron, fontSize: 28, color: "#00d4ff", letterSpacing: 6 }}>⬡</span>
      </div>

      {/* ORION */}
      <div style={{
        marginTop: 40,
        opacity: orionOpacity,
        transform: `translateX(${interpolate(orionX, [0, 1], [-80, 0])}px)`,
      }}>
        <span style={{
          fontFamily: orbitron, fontSize: 96, fontWeight: 900,
          color: "white", letterSpacing: 24,
          textShadow: "0 0 40px rgba(0,212,255,0.3)",
        }}>
          ORION
        </span>
      </div>

      {/* Subtitle */}
      <div style={{
        marginTop: 16, opacity: subOpacity,
        transform: `translateY(${subY}px)`,
      }}>
        <span style={{
          fontFamily: inter, fontSize: 22, fontWeight: 300,
          color: "rgba(255,255,255,0.6)", letterSpacing: 12,
          textTransform: "uppercase",
        }}>
          Inteligência Artificial Empresarial
        </span>
      </div>

      {/* Tagline */}
      <div style={{ marginTop: 40, opacity: tagOpacity }}>
        <div style={{
          padding: "10px 32px",
          border: "1px solid rgba(0,212,255,0.3)",
          background: "rgba(0,212,255,0.05)",
        }}>
          <span style={{
            fontFamily: inter, fontSize: 14, fontWeight: 400,
            color: "#00d4ff", letterSpacing: 6,
            textTransform: "uppercase",
          }}>
            by ELP® Green Technology
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
