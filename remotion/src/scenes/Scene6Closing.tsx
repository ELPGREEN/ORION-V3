import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const Scene6Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const urlOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });

  const lineWidth = interpolate(frame, [30, 70], [0, 500], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.06) * 0.3 + 0.7;

  // Fade out at end
  const fadeOut = interpolate(frame, [150, 180], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(180deg, #0a0a14 0%, #050510 100%)",
      opacity: fadeOut,
    }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "45%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: `radial-gradient(circle, rgba(212,175,55,${glowPulse * 0.08}) 0%, transparent 70%)`,
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* ORION */}
        <div style={{
          opacity: logoOpacity, transform: `scale(${logoScale})`,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: orbitron, fontSize: 90, fontWeight: 900,
            color: "white", letterSpacing: 10,
            textShadow: `0 0 40px rgba(212,175,55,${glowPulse * 0.4})`,
          }}>
            ORION
          </div>
        </div>

        {/* Accent line */}
        <div style={{
          width: lineWidth, height: 2, marginTop: 20,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${glowPulse}), transparent)`,
        }} />

        {/* Tagline */}
        <div style={{ opacity: tagOpacity, marginTop: 25, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 20, fontWeight: 300,
            color: "rgba(212,175,55,0.8)", letterSpacing: 6,
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOpacity, marginTop: 40, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 16, fontWeight: 400,
            color: "rgba(255,255,255,0.4)", letterSpacing: 3,
          }}>
            orionelp.lovable.app
          </div>
        </div>
      </AbsoluteFill>

      {/* Bottom branding */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0,
        textAlign: "center", opacity: urlOpacity,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 4,
        }}>
          INPI® REGISTERED · COGNITIVE AI ENGINE · 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
