import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

const PlasmaOrb: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const orbScale = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 80 } });
  const rotation = interpolate(frame, [0, 300], [0, 360], { extrapolateRight: "extend" });

  const rings = [
    { size: 280, opacity: 0.6, width: 2, delay: 0 },
    { size: 220, opacity: 0.5, width: 1.5, delay: 5 },
    { size: 160, opacity: 0.4, width: 1.5, delay: 10 },
    { size: 100, opacity: 0.3, width: 1, delay: 15 },
  ];

  return (
    <div style={{
      position: "relative", width: 300, height: 300,
      transform: `scale(${orbScale})`,
    }}>
      {/* Rings */}
      {rings.map((ring, i) => {
        const ringOp = interpolate(frame, [ring.delay, ring.delay + 20], [0, ring.opacity * pulse], { extrapolateRight: "clamp" });
        const tilt = 60 + i * 5;
        const rot = rotation * (i % 2 === 0 ? 1 : -0.7) + i * 45;
        return (
          <div key={i} style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: ring.size, height: ring.size,
            marginTop: -ring.size / 2, marginLeft: -ring.size / 2,
            border: `${ring.width}px solid rgba(212,175,55,${ringOp})`,
            borderRadius: "50%",
            transform: `perspective(600px) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
            boxShadow: `0 0 ${12 * pulse}px rgba(212,175,55,${ringOp * 0.4}), inset 0 0 ${8 * pulse}px rgba(212,175,55,${ringOp * 0.2})`,
          }} />
        );
      })}

      {/* Core glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 30, height: 30, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(232,146,10,${pulse}) 0%, rgba(212,175,55,${pulse * 0.6}) 40%, transparent 70%)`,
        boxShadow: `0 0 40px rgba(232,146,10,${pulse * 0.6}), 0 0 80px rgba(212,175,55,${pulse * 0.3})`,
      }} />

      {/* Outer glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320, height: 320, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.06}) 0%, transparent 70%)`,
      }} />
    </div>
  );
};

export const FScene1Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const titleScale = spring({ frame: frame - 30, fps, config: { damping: 15, stiffness: 100 } });
  const titleOpacity = interpolate(frame, [25, 45], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [50, 90], [0, 700], { extrapolateRight: "clamp" });
  const subtitleOp = interpolate(frame, [70, 95], [0, 1], { extrapolateRight: "clamp" });
  const subtitleY = interpolate(frame, [70, 95], [40, 0], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [100, 125], [0, 1], { extrapolateRight: "clamp" });

  const bgScale = interpolate(frame, [0, 200], [1.0, 1.2], { extrapolateRight: "clamp" });
  const bgRotate = interpolate(frame, [0, 200], [0, 3], { extrapolateRight: "clamp" });

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
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 40%, #0f0f1f 0%, #050510 70%, #000008 100%)",
      }} />

      <Img src={staticFile("images/neural-bg.png")} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: 0.12, mixBlendMode: "screen",
        transform: `scale(${bgScale}) rotate(${bgRotate}deg)`,
      }} />

      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(212,175,55,${p.op})`,
          boxShadow: `0 0 ${p.size * 4}px rgba(212,175,55,${p.op * 0.5})`,
        }} />
      ))}

      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.06}) 0%, transparent 65%)`,
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {/* Plasma Orb */}
        <PlasmaOrb frame={frame} fps={fps} />

        {/* Metallic ORION title - BIG */}
        <div style={{
          opacity: titleOpacity, transform: `scale(${titleScale})`,
          textAlign: "center", marginTop: 20,
        }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 260,
            filter: `drop-shadow(0 0 60px rgba(212,175,55,${pulse * 0.5}))`,
          }} />
        </div>

        {/* Gold accent line */}
        <div style={{
          width: lineW, height: 2, marginTop: 20,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
          boxShadow: `0 0 20px rgba(212,175,55,${pulse * 0.4})`,
        }} />

        {/* Subtitle */}
        <div style={{
          opacity: subtitleOp, marginTop: 20,
          transform: `translateY(${subtitleY}px)`,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: inter, fontSize: 26, fontWeight: 300,
            color: "rgba(212,175,55,0.85)", letterSpacing: 10,
          }}>
            INTELIGÊNCIA ARTIFICIAL EMPRESARIAL
          </div>
        </div>

        {/* Tag */}
        <div style={{ opacity: tagOp, marginTop: 35, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 16, fontWeight: 300,
            color: "rgba(255,255,255,0.4)", letterSpacing: 4,
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>
      </AbsoluteFill>

      {/* Corner brackets */}
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
