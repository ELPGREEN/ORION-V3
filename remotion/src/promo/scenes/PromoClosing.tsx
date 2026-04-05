import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadOrbitron();
const { fontFamily: inter } = loadInter();

export const PromoClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Fade out at end
  const fadeOut = interpolate(frame, [300, 360], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Logo rings
  const rings = [0, 1, 2, 3, 4].map((i) => {
    const s = spring({ frame: frame - i * 8, fps, config: { damping: 20 } });
    const rotation = frame * (0.4 + i * 0.2) * (i % 2 === 0 ? 1 : -1);
    const pulse = Math.sin(frame * 0.05 + i) * 6;
    return { scale: s, rotation, size: 100 + i * 60 + pulse, opacity: s * 0.6 };
  });

  const titleS = spring({ frame: frame - 60, fps, config: { damping: 18 } });
  const taglineS = spring({ frame: frame - 100, fps, config: { damping: 20 } });
  const elpS = spring({ frame: frame - 160, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", opacity: fadeOut }}>
      {/* Radial glow background */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08) 0%, transparent 60%)",
      }} />

      {/* Rings */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {rings.map((ring, i) => (
          <div key={i} style={{
            position: "absolute",
            width: ring.size, height: ring.size, borderRadius: "50%",
            border: `${i === 0 ? 3 : 1}px solid`,
            borderColor: i % 2 === 0
              ? `rgba(212,175,55,${ring.opacity})`
              : `rgba(0,212,255,${ring.opacity * 0.6})`,
            transform: `rotate(${ring.rotation}deg) scale(${ring.scale})`,
            boxShadow: i < 2 ? `0 0 40px rgba(212,175,55,${ring.opacity * 0.4})` : "none",
          }} />
        ))}

        {/* Core */}
        <div style={{
          position: "absolute",
          width: 80, height: 80, borderRadius: "50%",
          background: "radial-gradient(circle, #D4AF37 0%, #D4AF3700 70%)",
          boxShadow: "0 0 80px rgba(212,175,55,0.6), 0 0 160px rgba(212,175,55,0.2)",
          transform: `scale(${1 + Math.sin(frame * 0.06) * 0.1})`,
          display: "flex", justifyContent: "center", alignItems: "center",
        }}>
          <span style={{ fontFamily: orbitron, fontSize: 36, fontWeight: 900, color: "#D4AF37" }}>O</span>
        </div>
      </AbsoluteFill>

      {/* Title block */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 200 }}>
        <div style={{
          fontFamily: orbitron, fontSize: 56, fontWeight: 900,
          color: "#D4AF37", letterSpacing: 12,
          opacity: titleS,
          transform: `translateY(${interpolate(titleS, [0, 1], [30, 0])}px) scale(${interpolate(titleS, [0, 1], [0.9, 1])})`,
          textShadow: "0 0 50px rgba(212,175,55,0.5)",
        }}>ORION</div>

        <div style={{
          fontFamily: inter, fontSize: 24, color: "rgba(255,255,255,0.8)",
          marginTop: 12, letterSpacing: 8,
          opacity: taglineS,
          transform: `translateY(${interpolate(taglineS, [0, 1], [20, 0])}px)`,
        }}>O MELHOR AMIGO DO HOMEM</div>

        {/* Separator line */}
        <div style={{
          width: interpolate(taglineS, [0, 1], [0, 300]),
          height: 1, marginTop: 30,
          background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
        }} />

        <div style={{
          fontFamily: orbitron, fontSize: 14, color: "rgba(0,212,255,0.7)",
          marginTop: 24, letterSpacing: 6,
          opacity: elpS,
          transform: `translateY(${interpolate(elpS, [0, 1], [15, 0])}px)`,
        }}>ELP® GREEN TECHNOLOGY</div>
      </AbsoluteFill>

      {/* Scanlines */}
      <AbsoluteFill style={{ opacity: 0.02, pointerEvents: "none" }}>
        <div style={{
          width: "100%", height: "100%",
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)",
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
