import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const LAYERS = [
  { name: "Sensory Input", desc: "Exteroception", color: "#D4AF37" },
  { name: "Preprocessing", desc: "YOLO · MediaPipe", color: "#C9A832" },
  { name: "Proprioception", desc: "Body Schema", color: "#BE9D2D" },
  { name: "Interoception", desc: "Visceral State", color: "#B39228" },
  { name: "Temporal Binding", desc: "θ-γ Coupling", color: "#A88723" },
  { name: "Memory Systems", desc: "Episodic · KV Cache", color: "#9D7C1E" },
  { name: "Global Workspace", desc: "Conscious Access", color: "#927119" },
  { name: "Gamma Oscillations", desc: "PLV · CTC", color: "#876614" },
  { name: "Reasoning", desc: "Causal · ToM", color: "#7C5B0F" },
  { name: "QHRL", desc: "Hierarchical RL", color: "#71500A" },
  { name: "Language", desc: "Multi-LLM", color: "#664505" },
  { name: "Action", desc: "90+ Tools", color: "#5B3A00" },
  { name: "Self-Model", desc: "Introspection", color: "#502F00" },
  { name: "Social", desc: "Neural Mirroring", color: "#452400" },
  { name: "Meta-Cognition", desc: "Evolution", color: "#3A1900" },
];

export const Scene2Architecture = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });
  const titleX = interpolate(frame, [0, 25], [-60, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a0a14 0%, #0d0d1a 50%, #0a0a14 100%)",
    }}>
      {/* Grid pattern */}
      <AbsoluteFill style={{ opacity: 0.04 }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`h${i}`} style={{
            position: "absolute", top: i * 54, left: 0, right: 0,
            height: 1, background: "white",
          }} />
        ))}
        {Array.from({ length: 36 }).map((_, i) => (
          <div key={`v${i}`} style={{
            position: "absolute", left: i * 54, top: 0, bottom: 0,
            width: 1, background: "white",
          }} />
        ))}
      </AbsoluteFill>

      {/* Section label */}
      <div style={{
        position: "absolute", top: 60, left: 100,
        opacity: titleOpacity, transform: `translateX(${titleX}px)`,
      }}>
        <div style={{
          fontFamily: orbitron, fontSize: 14, fontWeight: 700,
          color: "#D4AF37", letterSpacing: 6, textTransform: "uppercase",
        }}>
          NEUROCORE AI
        </div>
        <div style={{
          fontFamily: orbitron, fontSize: 48, fontWeight: 700,
          color: "white", marginTop: 8, letterSpacing: 2,
        }}>
          Arquitetura 15 Camadas
        </div>
        <div style={{
          fontFamily: inter, fontSize: 16, fontWeight: 300,
          color: "rgba(255,255,255,0.5)", marginTop: 10, letterSpacing: 2,
        }}>
          Cognição Incorporada Biologicamente Inspirada
        </div>
      </div>

      {/* Layer stack */}
      <div style={{
        position: "absolute", right: 80, top: 60, bottom: 60,
        width: 700, display: "flex", flexDirection: "column",
        justifyContent: "center", gap: 3,
      }}>
        {LAYERS.map((layer, i) => {
          const delay = 20 + i * 8;
          const layerSpring = spring({ frame: frame - delay, fps, config: { damping: 25, stiffness: 180 } });
          const layerOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const layerWidth = interpolate(layerSpring, [0, 1], [0, 620 - i * 20]);
          const pulse = Math.sin((frame - delay) * 0.06) * 0.15 + 0.85;

          return (
            <div key={i} style={{
              opacity: layerOpacity, display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                fontFamily: inter, fontSize: 10, fontWeight: 400,
                color: "rgba(255,255,255,0.3)", width: 20, textAlign: "right",
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{
                width: layerWidth, height: 36,
                background: `linear-gradient(90deg, ${layer.color}dd, ${layer.color}44)`,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 16px", boxShadow: `0 0 ${12 * pulse}px ${layer.color}33`,
              }}>
                <div style={{
                  fontFamily: inter, fontSize: 12, fontWeight: 600,
                  color: "white", letterSpacing: 1, textTransform: "uppercase",
                }}>
                  {layer.name}
                </div>
                <div style={{
                  fontFamily: inter, fontSize: 10, fontWeight: 300,
                  color: "rgba(255,255,255,0.7)",
                }}>
                  {layer.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phi metric */}
      <Sequence from={140}>
        <div style={{
          position: "absolute", bottom: 80, left: 100,
          opacity: interpolate(frame - 140, [0, 20], [0, 1], { extrapolateRight: "clamp" }),
        }}>
          <div style={{ display: "flex", gap: 40, alignItems: "baseline" }}>
            <div>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(212,175,55,0.6)", letterSpacing: 3 }}>
                Φ (PHI)
              </div>
              <div style={{ fontFamily: orbitron, fontSize: 36, color: "#D4AF37" }}>
                0.847
              </div>
            </div>
            <div>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(212,175,55,0.6)", letterSpacing: 3 }}>
                PLV
              </div>
              <div style={{ fontFamily: orbitron, fontSize: 36, color: "#D4AF37" }}>
                0.912
              </div>
            </div>
            <div>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(212,175,55,0.6)", letterSpacing: 3 }}>
                GAMMA
              </div>
              <div style={{ fontFamily: orbitron, fontSize: 36, color: "#D4AF37" }}>
                80Hz
              </div>
            </div>
          </div>
        </div>
      </Sequence>
    </AbsoluteFill>
  );
};
