import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const Scene5Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glowIntensity = interpolate(frame, [0, 60, 120, 155], [0, 0.2, 0.15, 0], { extrapolateRight: "clamp" });

  // Logo
  const logoS = spring({ frame: frame - 5, fps, config: { damping: 12, stiffness: 100 } });

  // Text
  const textOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textY = interpolate(frame, [30, 50], [30, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // URL
  const urlOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Final fade
  const finalFade = interpolate(frame, [130, 155], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulse = Math.sin(frame * 0.06) * 0.2 + 0.6;

  return (
    <AbsoluteFill style={{
      backgroundColor: "#06080e",
      justifyContent: "center", alignItems: "center",
      opacity: finalFade,
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", width: 900, height: 900, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,212,255,${glowIntensity}) 0%, transparent 60%)`,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
      }} />

      {/* Logo box */}
      <div style={{
        width: 100, height: 100,
        border: `2px solid rgba(0,212,255,${pulse})`,
        transform: `scale(${interpolate(logoS, [0, 1], [0.3, 1])}) rotate(${interpolate(logoS, [0, 1], [90, 0])}deg)`,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, width: 10, height: 10, borderTop: "3px solid #00d4ff", borderLeft: "3px solid #00d4ff" }} />
        <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderBottom: "3px solid #00d4ff", borderRight: "3px solid #00d4ff" }} />
        <span style={{ fontFamily: orbitron, fontSize: 24, color: "#00d4ff", letterSpacing: 4 }}>⬡</span>
      </div>

      {/* ORION */}
      <div style={{
        marginTop: 32, opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>
        <span style={{
          fontFamily: orbitron, fontSize: 72, fontWeight: 900,
          color: "white", letterSpacing: 18,
          textShadow: "0 0 50px rgba(0,212,255,0.3)",
        }}>
          ORION
        </span>
      </div>

      <div style={{
        marginTop: 12, opacity: textOpacity,
        transform: `translateY(${textY}px)`,
      }}>
        <span style={{
          fontFamily: inter, fontSize: 18, fontWeight: 300,
          color: "rgba(255,255,255,0.5)", letterSpacing: 8,
          textTransform: "uppercase",
        }}>
          O futuro da gestão inteligente
        </span>
      </div>

      {/* URL */}
      <div style={{ marginTop: 48, opacity: urlOpacity }}>
        <div style={{
          padding: "12px 40px",
          border: "1px solid rgba(0,212,255,0.3)",
          background: "rgba(0,212,255,0.05)",
        }}>
          <span style={{
            fontFamily: inter, fontSize: 16, fontWeight: 400,
            color: "#00d4ff", letterSpacing: 4,
          }}>
            iasofthub.com
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
