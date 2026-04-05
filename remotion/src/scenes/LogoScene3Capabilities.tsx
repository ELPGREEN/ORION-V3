import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Video,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

const capabilities = [
  { icon: "🗣️", title: "VOZ", desc: "Wake Word + TTS" },
  { icon: "👁️", title: "VISÃO", desc: "Face + Object AI" },
  { icon: "📄", title: "DOCS", desc: "100+ Templates" },
  { icon: "💼", title: "CRM", desc: "Pipeline Total" },
  { icon: "🤖", title: "IoT", desc: "ROS2 + VDA5050" },
  { icon: "⚖️", title: "LEGAL", desc: "LGPD + GDPR" },
];

const CapCard = ({ item, index }: { item: typeof capabilities[0]; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const delay = 15 + index * 12;
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160 } });
  const glowPulse = Math.sin((frame + index * 10) * 0.05) * 0.3 + 0.7;

  return (
    <div style={{
      width: 260, padding: "36px 24px",
      background: `linear-gradient(180deg, rgba(10,10,20,0.9) 0%, rgba(5,5,15,0.95) 100%)`,
      border: `1px solid rgba(0,212,255,${glowPulse * 0.25})`,
      textAlign: "center",
      transform: `scale(${s}) translateY(${(1 - s) * 30}px)`,
      opacity: interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      boxShadow: `0 0 ${20 * glowPulse}px rgba(0,212,255,${glowPulse * 0.08})`,
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{item.icon}</div>
      <div style={{
        fontFamily: orbitron, fontSize: 20, fontWeight: 700,
        color: "#D4AF37", letterSpacing: 4, marginBottom: 8,
      }}>{item.title}</div>
      <div style={{
        fontFamily: inter, fontSize: 13, fontWeight: 300,
        color: "rgba(255,255,255,0.5)", letterSpacing: 2,
      }}>{item.desc}</div>
    </div>
  );
};

export const LogoScene3Capabilities = () => {
  const frame = useCurrentFrame();
  const bgZoom = interpolate(frame, [0, 180], [1.0, 1.1], { extrapolateRight: "clamp" });
  const headerOpacity = interpolate(frame, [5, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Background video */}
      <AbsoluteFill style={{ transform: `scale(${bgZoom})`, opacity: 0.2 }}>
        <Video src={staticFile("videos/features.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "rgba(5,5,15,0.8)" }} />

      {/* Section header */}
      <div style={{
        position: "absolute", top: 160, left: 0, right: 0,
        textAlign: "center", opacity: headerOpacity,
      }}>
        <div style={{
          fontFamily: orbitron, fontSize: 42, fontWeight: 700,
          color: "white", letterSpacing: 8,
        }}>CAPACIDADES</div>
        <div style={{
          width: 200, height: 2, margin: "16px auto 0",
          background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
        }} />
      </div>

      {/* Cards grid */}
      <div style={{
        position: "absolute", top: 340, left: 0, right: 0,
        display: "flex", justifyContent: "center", flexWrap: "wrap",
        gap: 24, padding: "0 100px",
      }}>
        {capabilities.map((cap, i) => (
          <CapCard key={cap.title} item={cap} index={i} />
        ))}
      </div>

      {/* Scanlines */}
      <AbsoluteFill style={{
        background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.01) 2px, rgba(0,212,255,0.01) 4px)",
      }} />
    </AbsoluteFill>
  );
};
