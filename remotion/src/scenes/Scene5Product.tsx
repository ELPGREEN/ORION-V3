import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const MODULES = [
  "Documentos", "Processos", "CRM", "Tarefas",
  "Assinatura", "Chat IA", "Pesquisa", "Consultas",
  "Smart Home", "IoT", "Robótica", "Marketplace",
  "Laboratório IA", "Reformulação", "Rede Neural",
];

export const Scene5Product = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(135deg, #0a0a14 0%, #0f0f1f 100%)",
    }}>
      {/* Subtle radial glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 800,
        background: "radial-gradient(circle, rgba(212,175,55,0.05) 0%, transparent 70%)",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0,
        textAlign: "center", opacity: titleOpacity,
      }}>
        <div style={{ fontFamily: inter, fontSize: 12, color: "#D4AF37", letterSpacing: 6 }}>
          PARA ADVOGADOS E ESCRITÓRIOS
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 42, color: "white", marginTop: 8 }}>
          Painel Inteligente
        </div>
      </div>

      {/* Module grid - centered */}
      <div style={{
        position: "absolute", top: 230, left: 0, right: 0,
        display: "flex", justifyContent: "center",
      }}>
        <div style={{
          display: "flex", flexWrap: "wrap", gap: 14,
          maxWidth: 1100, justifyContent: "center",
        }}>
          {MODULES.map((mod, i) => {
            const delay = 15 + i * 6;
            const s = spring({ frame: frame - delay, fps, config: { damping: 25, stiffness: 200 } });
            const opacity = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateRight: "clamp" });
            const scale = interpolate(s, [0, 1], [0.8, 1]);
            const pulse = Math.sin((frame - delay) * 0.04 + i * 0.5) * 0.1 + 0.9;

            return (
              <div key={i} style={{
                opacity, transform: `scale(${scale})`,
                background: "rgba(212,175,55,0.04)",
                border: `1px solid rgba(212,175,55,${0.1 * pulse})`,
                padding: "16px 28px",
                boxShadow: `0 0 ${8 * pulse}px rgba(212,175,55,${0.05 * pulse})`,
              }}>
                <div style={{
                  fontFamily: inter, fontSize: 14, fontWeight: 400,
                  color: "rgba(255,255,255,0.8)", letterSpacing: 1,
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
        opacity: interpolate(frame, [110, 135], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        <div style={{
          fontFamily: inter, fontSize: 20, fontWeight: 300,
          color: "rgba(255,255,255,0.5)", letterSpacing: 1,
        }}>
          15 áreas • Linguagem natural • Acesso por voz e texto
        </div>
      </div>
    </AbsoluteFill>
  );
};
