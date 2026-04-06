import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

const STATS = [
  { label: "Uptime", value: "99.97%", unit: "" },
  { label: "Latency", value: "12", unit: "ms" },
  { label: "Encryption", value: "AES", unit: "256" },
  { label: "Endpoints", value: "47", unit: "APIs" },
];

export const FScene3HUD = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.07) * 0.25 + 0.75;
  const hudRotation = interpolate(frame, [0, 200], [0, 45], { extrapolateRight: "clamp" });
  const hudScale = interpolate(frame, [0, 200], [0.9, 1.1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 60% 50%, #0d0d1f 0%, #050510 100%)",
    }}>
      {/* Central HUD element - big, rotating */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) rotate(${hudRotation}deg) scale(${hudScale})`,
        opacity: interpolate(frame, [0, 30], [0, 0.2], { extrapolateRight: "clamp" }),
      }}>
        <Img src={staticFile("images/hud-element.png")} style={{ width: 800 }} />
      </div>

      {/* Second HUD, counter-rotating */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) rotate(${-hudRotation * 0.7}deg) scale(${hudScale * 0.6})`,
        opacity: interpolate(frame, [15, 45], [0, 0.1], { extrapolateRight: "clamp" }),
      }}>
        <Img src={staticFile("images/hud-element.png")} style={{ width: 800 }} />
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0,
        textAlign: "center",
        opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontFamily: inter, fontSize: 12, color: "#D4AF37", letterSpacing: 6 }}>
          SECURITY · INFRASTRUCTURE
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 44, color: "white", marginTop: 8 }}>
          Orion Shield
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        position: "absolute", bottom: 140, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 60,
      }}>
        {STATS.map((stat, i) => {
          const delay = 40 + i * 18;
          const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 150 } });
          const op = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const yOff = interpolate(s, [0, 1], [30, 0]);

          return (
            <div key={i} style={{
              opacity: op, transform: `translateY(${yOff}px)`,
              textAlign: "center",
              border: `1px solid rgba(212,175,55,${0.15 * pulse})`,
              padding: "24px 36px",
              background: `rgba(212,175,55,${0.02 * pulse})`,
            }}>
              <div style={{
                fontFamily: orbitron, fontSize: 36, fontWeight: 900,
                color: "white",
                textShadow: `0 0 20px rgba(212,175,55,${pulse * 0.3})`,
              }}>
                {stat.value}
                {stat.unit && (
                  <span style={{ fontSize: 14, color: "rgba(212,175,55,0.7)", marginLeft: 4 }}>
                    {stat.unit}
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 12, fontWeight: 300,
                color: "rgba(255,255,255,0.4)", letterSpacing: 3, marginTop: 8,
              }}>
                {stat.label.toUpperCase()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Corner brackets */}
      {[
        { top: 50, left: 50 }, { top: 50, right: 50 },
        { bottom: 50, left: 50 }, { bottom: 50, right: 50 },
      ].map((pos, i) => {
        const bOp = interpolate(frame, [10 + i * 5, 30 + i * 5], [0, 0.25], { extrapolateRight: "clamp" });
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div key={i} style={{
            position: "absolute", ...pos, width: 50, height: 50, opacity: bOp,
            borderTop: isBottom ? "none" : "1px solid rgba(212,175,55,0.4)",
            borderBottom: isBottom ? "1px solid rgba(212,175,55,0.4)" : "none",
            borderLeft: isRight ? "none" : "1px solid rgba(212,175,55,0.4)",
            borderRight: isRight ? "1px solid rgba(212,175,55,0.4)" : "none",
          }} />
        );
      })}
    </AbsoluteFill>
  );
};
