import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const LAYERS = [
  "Natural Language Processing",
  "Computer Vision",
  "Document Intelligence",
  "Predictive Analytics",
  "Neural Embeddings",
];

export const FScene2Neural = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const bgDrift = interpolate(frame, [0, 190], [0, -40], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, #080818 0%, #0a0a1a 50%, #050510 100%)",
    }}>
      {/* Neural bg drifting */}
      <Img src={staticFile("images/neural-bg.png")} style={{
        position: "absolute", inset: 0, width: "110%", height: "110%",
        objectFit: "cover", opacity: 0.15, mixBlendMode: "screen",
        transform: `translate(${bgDrift}px, ${bgDrift * 0.5}px)`,
      }} />

      {/* Big radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "30%",
        transform: "translate(-50%, -50%)",
        width: 900, height: 900,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.05}) 0%, transparent 60%)`,
      }} />

      {/* Title area */}
      <div style={{
        position: "absolute", top: 100, left: 120, opacity: titleOp,
      }}>
        <div style={{ fontFamily: inter, fontSize: 13, color: "#D4AF37", letterSpacing: 6 }}>
          NEURAL ARCHITECTURE
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 48, color: "white", marginTop: 8 }}>
          15 Cognitive Layers
        </div>
      </div>

      {/* Layer cards - staggered left */}
      <div style={{ position: "absolute", top: 240, left: 120 }}>
        {LAYERS.map((layer, i) => {
          const delay = 20 + i * 15;
          const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 180 } });
          const xOff = interpolate(s, [0, 1], [-80, 0]);
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const barW = interpolate(s, [0, 1], [0, 200 + i * 40]);

          return (
            <div key={i} style={{
              opacity: op, transform: `translateX(${xOff}px)`,
              display: "flex", alignItems: "center", gap: 20,
              marginBottom: 28,
            }}>
              {/* Index */}
              <div style={{
                fontFamily: orbitron, fontSize: 14, color: "rgba(212,175,55,0.6)",
                width: 30,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* Bar */}
              <div style={{
                width: barW, height: 3,
                background: `linear-gradient(90deg, rgba(212,175,55,0.8), rgba(212,175,55,0.1))`,
                boxShadow: `0 0 10px rgba(212,175,55,${pulse * 0.3})`,
              }} />
              {/* Label */}
              <div style={{
                fontFamily: inter, fontSize: 18, fontWeight: 300,
                color: "rgba(255,255,255,0.75)", letterSpacing: 1,
              }}>
                {layer}
              </div>
            </div>
          );
        })}
      </div>

      {/* Right side: HUD element */}
      <div style={{
        position: "absolute", right: 80, top: "50%",
        transform: `translateY(-50%) rotate(${frame * 0.15}deg)`,
        opacity: interpolate(frame, [30, 60], [0, 0.12], { extrapolateRight: "clamp" }),
      }}>
        <Img src={staticFile("images/hud-element.png")} style={{ width: 500 }} />
      </div>

      {/* Scanning line */}
      <div style={{
        position: "absolute", left: 0, right: 0,
        top: interpolate(frame, [0, 190], [200, 900], { extrapolateRight: "clamp" }),
        height: 1, opacity: 0.15,
        background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.8), transparent)",
        boxShadow: "0 0 20px rgba(212,175,55,0.2)",
      }} />
    </AbsoluteFill>
  );
};
