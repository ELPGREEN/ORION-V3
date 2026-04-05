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

export const Scene1Hero = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleScale = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 120 } });
  const titleOpacity = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [40, 65], [30, 0], { extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [55, 90], [0, 400], { extrapolateRight: "clamp" });
  const tagOpacity = interpolate(frame, [75, 95], [0, 1], { extrapolateRight: "clamp" });

  const bgZoom = interpolate(frame, [0, 180], [1.0, 1.15], { extrapolateRight: "clamp" });

  const glowPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill>
      {/* AI Video Background */}
      <AbsoluteFill style={{ transform: `scale(${bgZoom})` }}>
        <Video src={staticFile("videos/hero.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(5,5,15,0.6) 0%, rgba(5,5,15,0.85) 100%)",
      }} />

      {/* Glowing accent line top */}
      <div style={{
        position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
        width: lineWidth, height: 2,
        background: `linear-gradient(90deg, transparent, rgba(212,175,55,${glowPulse}), transparent)`,
        boxShadow: `0 0 20px rgba(212,175,55,${glowPulse * 0.5})`,
      }} />

      {/* Main title */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          transform: `scale(${titleScale})`, opacity: titleOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: orbitron, fontSize: 120, fontWeight: 900,
            color: "white", letterSpacing: 12,
            textShadow: `0 0 60px rgba(212,175,55,${glowPulse * 0.6}), 0 0 120px rgba(212,175,55,${glowPulse * 0.3})`,
          }}>
            ORION
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          opacity: subtitleOpacity,
          transform: `translateY(${subtitleY}px)`,
          textAlign: "center", marginTop: 15,
        }}>
          <div style={{
            fontFamily: inter, fontSize: 28, fontWeight: 300,
            color: "rgba(212,175,55,0.9)", letterSpacing: 8,
            textTransform: "uppercase",
          }}>
            Cognitive AI Engine
          </div>
        </div>

        {/* Tag line */}
        <div style={{
          opacity: tagOpacity, marginTop: 50, textAlign: "center",
        }}>
          <div style={{
            fontFamily: inter, fontSize: 18, fontWeight: 300,
            color: "rgba(255,255,255,0.6)", letterSpacing: 3,
          }}>
            15 CAMADAS DE COGNIÇÃO INCORPORADA
          </div>
        </div>
      </AbsoluteFill>

      {/* Bottom accent line */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: "translateX(-50%)",
        width: lineWidth * 0.6, height: 1,
        background: `linear-gradient(90deg, transparent, rgba(212,175,55,${glowPulse * 0.5}), transparent)`,
      }} />
    </AbsoluteFill>
  );
};
