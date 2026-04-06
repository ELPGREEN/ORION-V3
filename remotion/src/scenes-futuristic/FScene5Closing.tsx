import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const FScene5Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const logoOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [30, 70], [0, 500], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [155, 190], [1, 0], { extrapolateRight: "clamp" });

  // Floating particles
  const particles = Array.from({ length: 15 }, (_, i) => {
    const x = (i * 173) % 1920;
    const baseY = (i * 127) % 1080;
    const y = baseY + Math.sin(frame * 0.025 + i * 2) * 25;
    const op = 0.15 + Math.sin(frame * 0.04 + i) * 0.1;
    return { x, y, size: 2 + (i % 2), op };
  });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(180deg, #0a0a14 0%, #050510 100%)",
      opacity: fadeOut,
    }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(212,175,55,${p.op})`,
          boxShadow: `0 0 ${p.size * 3}px rgba(212,175,55,${p.op * 0.5})`,
        }} />
      ))}

      {/* Radial glow */}
      <div style={{
        position: "absolute", top: "45%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.08}) 0%, transparent 70%)`,
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Metallic title image */}
        <div style={{ opacity: logoOp, transform: `scale(${logoScale})`, textAlign: "center" }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 140,
            filter: `drop-shadow(0 0 60px rgba(212,175,55,${pulse * 0.4}))`,
          }} />
        </div>

        {/* Accent line */}
        <div style={{
          width: lineW, height: 2, marginTop: 25,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
        }} />

        {/* Tagline */}
        <div style={{ opacity: tagOp, marginTop: 25, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 20, fontWeight: 300,
            color: "rgba(212,175,55,0.8)", letterSpacing: 6,
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>

        {/* URL */}
        <div style={{ opacity: urlOp, marginTop: 40, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 16, fontWeight: 400,
            color: "rgba(255,255,255,0.4)", letterSpacing: 3,
          }}>
            iasofthub.com
          </div>
        </div>
      </AbsoluteFill>

      {/* Bottom branding */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0,
        textAlign: "center", opacity: urlOp,
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
