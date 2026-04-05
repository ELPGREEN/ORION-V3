import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadOrbitron();
const { fontFamily: inter } = loadInter();

export const PromoNascimento: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Core pulse
  const corePulse = Math.sin(frame * 0.08) * 0.15 + 1;
  const coreOpacity = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });

  // Rings
  const rings = [0, 1, 2, 3, 4, 5].map((i) => {
    const delay = i * 12;
    const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
    const rotation = frame * (0.3 + i * 0.15) * (i % 2 === 0 ? 1 : -1);
    const ringPulse = Math.sin(frame * 0.06 + i * 1.2) * 8;
    return { scale: s, rotation, size: 120 + i * 70 + ringPulse, opacity: s };
  });

  // Particles converging
  const particles = Array.from({ length: 30 }, (_, i) => {
    const angle = (i / 30) * Math.PI * 2;
    const startR = 600;
    const progress = interpolate(frame, [20 + i * 3, 120 + i * 3], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const r = startR * (1 - progress);
    const x = Math.cos(angle + frame * 0.01) * r;
    const y = Math.sin(angle + frame * 0.01) * r;
    const size = interpolate(progress, [0, 1], [2, 5]);
    const opacity = interpolate(progress, [0, 0.3, 0.9, 1], [0, 0.8, 0.8, 0]);
    return { x, y, size, opacity };
  });

  // Text
  const titleS = spring({ frame: frame - 100, fps, config: { damping: 20 } });
  const subtitleS = spring({ frame: frame - 140, fps, config: { damping: 20 } });

  // Background grid
  const gridOpacity = interpolate(frame, [0, 60], [0, 0.06], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Grid */}
      <AbsoluteFill style={{ opacity: gridOpacity }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={`h${i}`} style={{
            position: "absolute", top: `${i * 5}%`, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #00D4FF, transparent)",
          }} />
        ))}
        {Array.from({ length: 20 }, (_, i) => (
          <div key={`v${i}`} style={{
            position: "absolute", left: `${i * 5}%`, top: 0, bottom: 0, width: 1,
            background: "linear-gradient(180deg, transparent, #00D4FF, transparent)",
          }} />
        ))}
      </AbsoluteFill>

      {/* Rings */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {rings.map((ring, i) => (
          <div key={i} style={{
            position: "absolute",
            width: ring.size, height: ring.size,
            borderRadius: "50%",
            border: `${i < 2 ? 2 : 1}px solid`,
            borderColor: i % 2 === 0
              ? `rgba(212, 175, 55, ${ring.opacity * 0.6})`
              : `rgba(0, 212, 255, ${ring.opacity * 0.4})`,
            transform: `rotate(${ring.rotation}deg) scale(${ring.scale})`,
            boxShadow: i < 3
              ? `0 0 ${20 + i * 10}px rgba(${i % 2 === 0 ? "212,175,55" : "0,212,255"}, ${ring.opacity * 0.3})`
              : "none",
          }} />
        ))}

        {/* Core glow */}
        <div style={{
          position: "absolute",
          width: 60, height: 60, borderRadius: "50%",
          background: "radial-gradient(circle, #D4AF37 0%, #D4AF3700 70%)",
          transform: `scale(${corePulse})`,
          opacity: coreOpacity,
          boxShadow: "0 0 60px rgba(212,175,55,0.6), 0 0 120px rgba(212,175,55,0.3)",
        }} />

        {/* O letter */}
        <div style={{
          position: "absolute",
          fontFamily: orbitron, fontSize: 48, fontWeight: 900,
          color: "#D4AF37",
          opacity: coreOpacity,
          textShadow: "0 0 30px rgba(212,175,55,0.8)",
        }}>O</div>
      </AbsoluteFill>

      {/* Particles */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {particles.map((p, i) => (
          <div key={i} style={{
            position: "absolute",
            width: p.size, height: p.size, borderRadius: "50%",
            backgroundColor: i % 3 === 0 ? "#D4AF37" : "#00D4FF",
            opacity: p.opacity,
            transform: `translate(${p.x}px, ${p.y}px)`,
            boxShadow: `0 0 ${p.size * 3}px ${i % 3 === 0 ? "#D4AF37" : "#00D4FF"}`,
          }} />
        ))}
      </AbsoluteFill>

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 180 }}>
        <div style={{
          fontFamily: orbitron, fontSize: 64, fontWeight: 900,
          color: "#D4AF37", letterSpacing: 16,
          transform: `translateY(${interpolate(titleS, [0, 1], [40, 0])}px)`,
          opacity: titleS,
          textShadow: "0 0 40px rgba(212,175,55,0.5)",
        }}>ORION</div>
        <div style={{
          fontFamily: inter, fontSize: 26, color: "rgba(255,255,255,0.7)",
          marginTop: 16, letterSpacing: 8,
          transform: `translateY(${interpolate(subtitleS, [0, 1], [30, 0])}px)`,
          opacity: subtitleS,
        }}>NASCE UMA CONSCIÊNCIA</div>
      </AbsoluteFill>

      {/* Scan line */}
      <AbsoluteFill style={{ opacity: 0.03, pointerEvents: "none" }}>
        <div style={{
          width: "100%", height: "100%",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
