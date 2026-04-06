import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const MODULES = [
  "Documents", "Processes", "CRM", "Tasks",
  "E-Signature", "AI Chat", "Research", "Consultations",
  "Smart Home", "IoT", "Robotics", "Marketplace",
  "AI Lab", "Neural Network", "Reformulation",
];

export const FScene4Modules = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.05) * 0.2 + 0.8;
  const titleOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const bgDrift = Math.sin(frame * 0.02) * 20;

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a0a14 0%, #0f0f1f 100%)",
    }}>
      {/* Neural bg subtle */}
      <Img src={staticFile("images/neural-bg.png")} style={{
        position: "absolute", inset: 0, width: "100%", height: "100%",
        objectFit: "cover", opacity: 0.06, mixBlendMode: "screen",
        transform: `translateX(${bgDrift}px)`,
      }} />

      {/* Glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 800,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.04}) 0%, transparent 70%)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 75, left: 0, right: 0,
        textAlign: "center", opacity: titleOp,
      }}>
        <div style={{ fontFamily: inter, fontSize: 12, color: "#D4AF37", letterSpacing: 6 }}>
          ENTERPRISE MODULES
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 42, color: "white", marginTop: 8 }}>
          Intelligent Dashboard
        </div>
      </div>

      {/* Module grid */}
      <div style={{
        position: "absolute", top: 220, left: 0, right: 0,
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 14,
          maxWidth: 1100, justifyContent: "center",
        }}>
          {MODULES.map((mod, i) => {
            const delay = 15 + i * 5;
            const s = spring({ frame: frame - delay, fps, config: { damping: 25, stiffness: 200 } });
            const op = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
            const scale = interpolate(s, [0, 1], [0.8, 1]);
            const modPulse = Math.sin((frame - delay) * 0.04 + i * 0.5) * 0.12 + 0.88;

            return (
              <div key={i} style={{
                opacity: op, transform: `scale(${scale})`,
                background: `rgba(212,175,55,${0.04 * modPulse})`,
                border: `1px solid rgba(212,175,55,${0.12 * modPulse})`,
                padding: "16px 28px",
                boxShadow: `0 0 ${8 * modPulse}px rgba(212,175,55,${0.04 * modPulse})`,
              }}>
                <div style={{
                  fontFamily: inter, fontSize: 14, fontWeight: 400,
                  color: `rgba(255,255,255,${0.7 * modPulse + 0.1})`, letterSpacing: 1,
                }}>
                  {mod}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom message */}
      <div style={{
        position: "absolute", bottom: 80, left: 0, right: 0,
        textAlign: "center",
        opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontFamily: inter, fontSize: 18, fontWeight: 300,
          color: "rgba(255,255,255,0.45)", letterSpacing: 2,
        }}>
          15 areas • Natural language • Voice & text access
        </div>
      </div>
    </AbsoluteFill>
  );
};
