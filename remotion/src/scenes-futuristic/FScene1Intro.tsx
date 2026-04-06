import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const FScene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const titleScale = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [40, 80], [0, 600], { extrapolateRight: "clamp" });
  const subtitleOp = interpolate(frame, [60, 85], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [60, 85], [40, 0], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [90, 115], [0, 1], { extrapolateRight: "clamp" });

  // Neural bg slow zoom
  const bgScale = interpolate(frame, [0, 200], [1.0, 1.2], { extrapolateRight: "clamp" });
  const bgRotate = interpolate(frame, [0, 200], [0, 3], { extrapolateRight: "clamp" });

  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const x = (i * 137.5) % 1920;
    const baseY = (i * 89.3) % 1080;
    const y = baseY + Math.sin(frame * 0.03 + i) * 30;
    const size = 2 + (i % 3);
    const op = interpolate(frame, [i * 3, i * 3 + 20], [0, 0.4 + (i % 5) * 0.1], { extrapolateRight: "clamp" });
    return { x, y, size, op };
  });

  return (
    <AbsoluteFill>
      {/* Deep gradient bg */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 40%, #0f0f1f 0%, #050510 70%, #000008 100%)",
      }} />

      {/* Neural network image as bg */}
      <Img src={staticFile("images/neural-bg.png")} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: 0.12, mixBlendMode: "screen",
        transform: `scale(${bgScale}) rotate(${bgRotate}deg)`,
      }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(212,175,55,${p.op})`,
          boxShadow: `0 0 ${p.size * 4}px rgba(212,175,55,${p.op * 0.5})`,
        }} />
      ))}

      {/* Radial glow center */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.06}) 0%, transparent 65%)`,
      }} />

      {/* Metallic ORION title image */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: titleOpacity, transform: `scale(${titleScale})`, textAlign: "center" }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 160,
            filter: `drop-shadow(0 0 50px rgba(212,175,55,${pulse * 0.5}))`,
          }} />
        </div>

        {/* Gold accent line */}
        <div style={{
          width: lineW, height: 2, marginTop: 30,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
          boxShadow: `0 0 20px rgba(212,175,55,${pulse * 0.4})`,
        }} />

        {/* Subtitle */}
        <div style={{
          opacity: subtitleOp, marginTop: 25,
          transform: `translateY(${subtitleY}px)`,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: inter, fontSize: 24, fontWeight: 300,
            color: "rgba(212,175,55,0.85)", letterSpacing: 8,
          }}>
            COGNITIVE AI ENGINE
          </div>
        </div>

        {/* Tag */}
        <div style={{ opacity: tagOp, marginTop: 40, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 16, fontWeight: 300,
            color: "rgba(255,255,255,0.4)", letterSpacing: 4,
          }}>
            ENTERPRISE INTELLIGENCE PLATFORM
          </div>
        </div>
      </AbsoluteFill>

      {/* Corner brackets HUD */}
      {[
        { top: 60, left: 60 }, { top: 60, right: 60 },
        { bottom: 60, left: 60 }, { bottom: 60, right: 60 },
      ].map((pos, i) => {
        const bOp = interpolate(frame, [30 + i * 10, 50 + i * 10], [0, 0.3], { extrapolateRight: "clamp" });
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div key={i} style={{
            position: "absolute", ...pos, width: 40, height: 40, opacity: bOp,
            borderTop: isBottom ? "none" : "1px solid rgba(212,175,55,0.5)",
            borderBottom: isBottom ? "1px solid rgba(212,175,55,0.5)" : "none",
            borderLeft: isRight ? "none" : "1px solid rgba(212,175,55,0.5)",
            borderRight: isRight ? "1px solid rgba(212,175,55,0.5)" : "none",
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
