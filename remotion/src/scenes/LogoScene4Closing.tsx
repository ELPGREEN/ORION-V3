import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300"], subsets: ["latin"] });

export const LogoScene4Closing = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.08) * 0.4 + 0.6;

  // Pulsing rings
  const ringExpand = (delay: number) => {
    const f = (frame - delay) % 90;
    const scale = interpolate(f, [0, 90], [0.8, 1.6], { extrapolateRight: "clamp" });
    const opacity = interpolate(f, [0, 60, 90], [0.6, 0.3, 0], { extrapolateRight: "clamp" });
    return { scale, opacity };
  };

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", opacity: fadeOut }}>
      {/* Radial glow */}
      <AbsoluteFill style={{
        background: `radial-gradient(circle at 50% 45%, rgba(212,175,55,${glowPulse * 0.08}) 0%, transparent 60%)`,
      }} />

      {/* Pulsing rings */}
      {[0, 30, 60].map((delay) => {
        const r = ringExpand(delay);
        return (
          <div key={delay} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 300, height: 300, borderRadius: "50%",
            border: `1px solid rgba(212,175,55,${r.opacity})`,
            transform: `translate(-50%, -55%) scale(${r.scale})`,
            boxShadow: `0 0 20px rgba(212,175,55,${r.opacity * 0.3})`,
          }} />
        );
      })}

      {/* Logo */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ marginTop: -80 }}>
          <div style={{
            width: 160, height: 160, borderRadius: "50%", overflow: "hidden",
            transform: `scale(${logoScale})`, opacity: logoOpacity,
            boxShadow: `0 0 ${50 * glowPulse}px rgba(212,175,55,${glowPulse * 0.4})`,
            border: `2px solid rgba(212,175,55,${glowPulse * 0.5})`,
            margin: "0 auto",
          }}>
            <Img src={staticFile("images/orion-logo.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>

          {/* Title */}
          <div style={{
            textAlign: "center", marginTop: 40, opacity: titleOpacity,
          }}>
            <div style={{
              fontFamily: orbitron, fontSize: 64, fontWeight: 900,
              color: "white", letterSpacing: 10,
              textShadow: `0 0 40px rgba(212,175,55,${glowPulse * 0.5})`,
            }}>
              ORION
            </div>
            <div style={{
              fontFamily: inter, fontSize: 24, fontWeight: 300,
              color: "#D4AF37", letterSpacing: 8, marginTop: 8,
            }}>
              A IA DO FUTURO
            </div>
          </div>

          {/* Company */}
          <div style={{
            textAlign: "center", marginTop: 50, opacity: subtitleOpacity,
          }}>
            <div style={{
              fontFamily: inter, fontSize: 14, fontWeight: 300,
              color: "rgba(255,255,255,0.4)", letterSpacing: 5,
            }}>
              ELP® GREEN TECHNOLOGY S.R.L.
            </div>
            <div style={{
              fontFamily: inter, fontSize: 11, fontWeight: 300,
              color: "rgba(0,212,255,0.35)", letterSpacing: 3, marginTop: 8,
            }}>
              INPI BR 51 2024 003401 8 · IT02712340062
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Scanlines */}
      <AbsoluteFill style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.012) 2px, rgba(0,212,255,0.012) 4px)",
      }} />
    </AbsoluteFill>
  );
};
