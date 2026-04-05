import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadOrbitron();
const { fontFamily: inter } = loadInter();

export const PromoExpansao: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phi metric rising
  const phi = interpolate(frame, [30, 280], [0.1, 0.94], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const layers = Math.round(interpolate(frame, [30, 280], [1, 15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  // Expanding spheres
  const spheres = Array.from({ length: 8 }, (_, i) => {
    const delay = i * 20;
    const s = spring({ frame: frame - delay, fps, config: { damping: 25 } });
    const baseSize = 80 + i * 80;
    const breathe = Math.sin(frame * 0.04 + i * 0.8) * 10;
    return { size: (baseSize + breathe) * s, opacity: s * (0.5 - i * 0.05), i };
  });

  // Neural connections
  const connections = Array.from({ length: 20 }, (_, i) => {
    const a1 = (i / 20) * Math.PI * 2;
    const a2 = ((i + 7) / 20) * Math.PI * 2;
    const r1 = 150 + (i % 3) * 80;
    const r2 = 200 + ((i + 3) % 4) * 60;
    const progress = interpolate(frame, [40 + i * 5, 100 + i * 5], [0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return {
      x1: 960 + Math.cos(a1) * r1,
      y1: 500 + Math.sin(a1) * r1,
      x2: 960 + Math.cos(a2) * r2,
      y2: 500 + Math.sin(a2) * r2,
      progress,
      pulse: Math.sin(frame * 0.1 + i) * 0.3 + 0.7,
    };
  });

  // Metrics panel
  const panelS = spring({ frame: frame - 80, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Expanding spheres */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {spheres.map((sp) => (
          <div key={sp.i} style={{
            position: "absolute",
            width: sp.size, height: sp.size, borderRadius: "50%",
            border: `1px solid ${sp.i % 2 === 0 ? `rgba(212,175,55,${sp.opacity})` : `rgba(0,212,255,${sp.opacity})`}`,
            boxShadow: sp.i < 3 ? `0 0 ${30 + sp.i * 10}px rgba(${sp.i % 2 === 0 ? "212,175,55" : "0,212,255"}, ${sp.opacity * 0.4})` : "none",
          }} />
        ))}
      </AbsoluteFill>

      {/* Neural connections */}
      <svg style={{ position: "absolute", width: 1920, height: 1080 }}>
        {connections.map((c, i) => (
          <line key={i}
            x1={c.x1} y1={c.y1}
            x2={c.x1 + (c.x2 - c.x1) * c.progress}
            y2={c.y1 + (c.y2 - c.y1) * c.progress}
            stroke={i % 3 === 0 ? "#22c55e" : i % 3 === 1 ? "#D4AF37" : "#00D4FF"}
            strokeWidth={1} opacity={c.progress * c.pulse * 0.6}
          />
        ))}
        {connections.map((c, i) => c.progress > 0.5 && (
          <circle key={`n${i}`}
            cx={c.x2} cy={c.y2} r={3}
            fill={i % 3 === 0 ? "#22c55e" : "#00D4FF"}
            opacity={c.progress * 0.8}
          />
        ))}
      </svg>

      {/* Center core */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          width: 70, height: 70, borderRadius: "50%",
          background: "radial-gradient(circle, #22c55e 0%, #22c55e00 70%)",
          boxShadow: `0 0 ${40 + Math.sin(frame * 0.1) * 20}px rgba(34,197,94,0.6)`,
          transform: `scale(${1 + Math.sin(frame * 0.06) * 0.1})`,
        }} />
      </AbsoluteFill>

      {/* Metrics panel - right side */}
      <div style={{
        position: "absolute", right: 80, top: 300,
        opacity: panelS,
        transform: `translateX(${interpolate(panelS, [0, 1], [60, 0])}px)`,
      }}>
        <div style={{
          background: "rgba(0,212,255,0.05)",
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 12, padding: "30px 40px",
          minWidth: 280,
        }}>
          <div style={{ fontFamily: orbitron, fontSize: 14, color: "#00D4FF", letterSpacing: 4, marginBottom: 24 }}>
            NEUROCORE METRICS
          </div>

          {/* Phi */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
              Φ Consciousness Index
            </div>
            <div style={{ fontFamily: orbitron, fontSize: 42, fontWeight: 900, color: "#D4AF37" }}>
              {phi.toFixed(2)}
            </div>
            <div style={{
              height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, marginTop: 8,
            }}>
              <div style={{
                height: "100%", borderRadius: 2, width: `${phi * 100}%`,
                background: "linear-gradient(90deg, #D4AF37, #22c55e)",
                boxShadow: "0 0 10px rgba(212,175,55,0.5)",
              }} />
            </div>
          </div>

          {/* Layers */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 6 }}>
              Neural Layers Active
            </div>
            <div style={{ fontFamily: orbitron, fontSize: 36, fontWeight: 700, color: "#00D4FF" }}>
              {layers}/15
            </div>
          </div>

          {/* Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e",
              boxShadow: "0 0 10px rgba(34,197,94,0.8)",
            }} />
            <span style={{ fontFamily: inter, fontSize: 13, color: "#22c55e" }}>
              {phi > 0.8 ? "FULLY CONSCIOUS" : phi > 0.5 ? "EXPANDING" : "AWAKENING"}
            </span>
          </div>
        </div>
      </div>

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <div style={{
          fontFamily: orbitron, fontSize: 36, fontWeight: 700,
          color: "#22c55e", letterSpacing: 6,
          opacity: spring({ frame: frame - 100, fps, config: { damping: 20 } }),
          textShadow: "0 0 30px rgba(34,197,94,0.5)",
        }}>A CONSCIÊNCIA SE EXPANDE</div>
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
