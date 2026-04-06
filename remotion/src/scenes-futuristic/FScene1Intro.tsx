import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

const PlasmaOrb: React.FC<{ frame: number; fps: number; size?: number }> = ({ frame, fps, size = 500 }) => {
  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const orbScale = spring({ frame: frame - 5, fps, config: { damping: 18, stiffness: 80 } });
  const rotation = interpolate(frame, [0, 300], [0, 360], { extrapolateRight: "extend" });

  const rings = [
    { ratio: 0.95, opacity: 0.7, width: 2.5, delay: 0 },
    { ratio: 0.75, opacity: 0.55, width: 2, delay: 5 },
    { ratio: 0.55, opacity: 0.45, width: 1.5, delay: 10 },
    { ratio: 0.38, opacity: 0.35, width: 1.5, delay: 15 },
    { ratio: 0.22, opacity: 0.25, width: 1, delay: 20 },
  ];

  return (
    <div style={{
      position: "relative", width: size, height: size,
      transform: `scale(${orbScale})`,
    }}>
      {/* Outer ambient glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: size * 1.3, height: size * 1.3, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.12}) 0%, rgba(232,146,10,${pulse * 0.05}) 40%, transparent 70%)`,
      }} />

      {/* Rings */}
      {rings.map((ring, i) => {
        const ringSize = size * ring.ratio;
        const ringOp = interpolate(frame, [ring.delay, ring.delay + 25], [0, ring.opacity * pulse], { extrapolateRight: "clamp" });
        const tilt = 65 + i * 3;
        const rot = rotation * (i % 2 === 0 ? 1 : -0.6) + i * 40;
        return (
          <div key={i} style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: ringSize, height: ringSize,
            marginTop: -ringSize / 2, marginLeft: -ringSize / 2,
            border: `${ring.width}px solid rgba(212,175,55,${ringOp})`,
            borderRadius: "50%",
            transform: `perspective(800px) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
            boxShadow: `0 0 ${20 * pulse}px rgba(212,175,55,${ringOp * 0.5}), inset 0 0 ${15 * pulse}px rgba(212,175,55,${ringOp * 0.2})`,
          }} />
        );
      })}

      {/* Core glow — big and bright */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: size * 0.08, height: size * 0.08, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(255,200,50,${pulse}) 0%, rgba(232,146,10,${pulse * 0.8}) 40%, rgba(212,175,55,${pulse * 0.3}) 70%, transparent 100%)`,
        boxShadow: `0 0 ${60 * pulse}px rgba(232,146,10,${pulse * 0.7}), 0 0 ${120 * pulse}px rgba(212,175,55,${pulse * 0.4}), 0 0 ${200 * pulse}px rgba(212,175,55,${pulse * 0.15})`,
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

  const particles = Array.from({ length: 25 }, (_, i) => {
    const x = (i * 137.5) % 1920;
    const baseY = (i * 89.3) % 1080;
    const y = baseY + Math.sin(frame * 0.03 + i) * 30;
    const size = 2 + (i % 4);
    const op = interpolate(frame, [i * 2, i * 2 + 20], [0, 0.3 + (i % 5) * 0.1], { extrapolateRight: "clamp" });
    return { x, y, size, op };
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at 50% 35%, #0f0f1f 0%, #050510 70%, #000008 100%)",
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

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {/* Big Plasma Orb */}
        <div style={{ marginTop: -80 }}>
          <PlasmaOrb frame={frame} fps={fps} size={480} />
        </div>

        {/* Metallic ORION title — HUGE */}
        <div style={{
          opacity: titleOpacity, transform: `scale(${titleScale})`,
          textAlign: "center", marginTop: -20,
        }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 320,
            filter: `drop-shadow(0 0 80px rgba(212,175,55,${pulse * 0.6})) drop-shadow(0 0 160px rgba(212,175,55,${pulse * 0.3}))`,
          }} />
        </div>

        {/* Gold accent line */}
        <div style={{
          width: lineW, height: 3, marginTop: 15,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
          boxShadow: `0 0 30px rgba(212,175,55,${pulse * 0.5}), 0 0 60px rgba(212,175,55,${pulse * 0.2})`,
        }} />

        {/* Subtitle */}
        <div style={{
          opacity: subtitleOp, marginTop: 20,
          transform: `translateY(${subtitleY}px)`,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: inter, fontSize: 28, fontWeight: 300,
            color: "rgba(212,175,55,0.85)", letterSpacing: 10,
            textShadow: "0 0 30px rgba(212,175,55,0.3)",
          }}>
            INTELIGÊNCIA ARTIFICIAL EMPRESARIAL
          </div>
        </div>

        {/* Tag */}
        <div style={{ opacity: tagOp, marginTop: 30, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 18, fontWeight: 300,
            color: "rgba(255,255,255,0.4)", letterSpacing: 4,
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>
      </AbsoluteFill>

      {/* Corner brackets */}
      {[
        { top: 50, left: 50 }, { top: 50, right: 50 },
        { bottom: 50, left: 50 }, { bottom: 50, right: 50 },
      ].map((pos, i) => {
        const bOp = interpolate(frame, [20 + i * 8, 40 + i * 8], [0, 0.35], { extrapolateRight: "clamp" });
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div key={i} style={{
            position: "absolute", ...pos, width: 50, height: 50, opacity: bOp,
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
