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
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const INNOVATIONS = [
  { title: "Consciência Computacional", desc: "Global Workspace Theory + IIT (Phi)", metric: "Φ = 0.847" },
  { title: "Marcadores Somáticos", desc: "Hipótese de Damásio em IA", metric: "REAL-TIME" },
  { title: "QHRL", desc: "Hierarchical Reinforcement Learning", metric: "UCB1" },
  { title: "Edge-First AI", desc: "80%+ processamento on-device", metric: "PRIVACY" },
];

export const Scene4Innovation = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgZoom = interpolate(frame, [0, 200], [1, 1.12], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${bgZoom})` }}>
        <Video src={staticFile("videos/innovation.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(5,5,15,0.85) 0%, rgba(10,10,20,0.9) 100%)",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, right: 100, textAlign: "right",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontFamily: inter, fontSize: 12, color: "#D4AF37", letterSpacing: 6 }}>
          INOVAÇÃO
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 44, color: "white", marginTop: 6, letterSpacing: 1 }}>
          Além da IA Convencional
        </div>
      </div>

      {/* Innovation cards - vertical stack on left */}
      <div style={{
        position: "absolute", top: 220, left: 100, display: "flex",
        flexDirection: "column", gap: 20,
      }}>
        {INNOVATIONS.map((inn, i) => {
          const delay = 20 + i * 20;
          const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 160 } });
          const opacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const x = interpolate(s, [0, 1], [-80, 0]);

          return (
            <div key={i} style={{
              opacity, transform: `translateX(${x}px)`,
              display: "flex", gap: 24, alignItems: "center",
            }}>
              {/* Number */}
              <div style={{
                fontFamily: orbitron, fontSize: 48, fontWeight: 700,
                color: "rgba(212,175,55,0.15)", width: 70, textAlign: "right",
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              {/* Content */}
              <div style={{
                background: "rgba(212,175,55,0.05)",
                border: "1px solid rgba(212,175,55,0.12)",
                padding: "20px 28px", width: 520,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{
                    fontFamily: inter, fontSize: 18, fontWeight: 600,
                    color: "white",
                  }}>
                    {inn.title}
                  </div>
                  <div style={{
                    fontFamily: orbitron, fontSize: 11, color: "#D4AF37",
                    letterSpacing: 2,
                  }}>
                    {inn.metric}
                  </div>
                </div>
                <div style={{
                  fontFamily: inter, fontSize: 13, fontWeight: 300,
                  color: "rgba(255,255,255,0.5)", marginTop: 4,
                }}>
                  {inn.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Right side - protocols */}
      <div style={{
        position: "absolute", right: 100, bottom: 100,
        opacity: interpolate(frame, [120, 145], [0, 1], { extrapolateRight: "clamp" }),
        textAlign: "right",
      }}>
        <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(212,175,55,0.5)", letterSpacing: 4 }}>
          PROTOCOLOS
        </div>
        <div style={{
          fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.4)",
          marginTop: 10, lineHeight: 2.2,
        }}>
          MQTT · BLE · Matter · ROS2<br />
          VDA5050 · OPC-UA · WebRTC<br />
          GDPR · EU AI Act · LGPD
        </div>
      </div>
    </AbsoluteFill>
  );
};
