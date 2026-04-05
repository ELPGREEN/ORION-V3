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

const FEATURES = [
  { icon: "📄", title: "Geração de Documentos", desc: "Petições, contratos, procurações com IA" },
  { icon: "🔍", title: "Pesquisa Jurídica", desc: "Jurisprudência e legislação unificada" },
  { icon: "👥", title: "CRM Inteligente", desc: "Gestão completa de clientes e processos" },
  { icon: "✍️", title: "Assinatura Digital", desc: "Envelopes com validade jurídica" },
  { icon: "🎙️", title: "Comando por Voz", desc: "90+ ferramentas via linguagem natural" },
  { icon: "👁️", title: "Visão Computacional", desc: "YOLO · MediaPipe · Face Recognition" },
];

export const Scene3Features = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgZoom = interpolate(frame, [0, 200], [1, 1.1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      {/* Video background */}
      <AbsoluteFill style={{ transform: `scale(${bgZoom})` }}>
        <Video src={staticFile("videos/features.mp4")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{
        background: "linear-gradient(135deg, rgba(5,5,15,0.88) 0%, rgba(5,5,15,0.92) 100%)",
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 70, left: 100,
        opacity: titleOpacity,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 12, fontWeight: 300,
          color: "#D4AF37", letterSpacing: 6,
        }}>
          FUNCIONALIDADES
        </div>
        <div style={{
          fontFamily: orbitron, fontSize: 44, fontWeight: 700,
          color: "white", marginTop: 6, letterSpacing: 1,
        }}>
          Painel Inteligente
        </div>
      </div>

      {/* Feature cards - 2x3 grid */}
      <div style={{
        position: "absolute", top: 220, left: 100, right: 100,
        display: "flex", flexWrap: "wrap", gap: 24,
      }}>
        {FEATURES.map((feat, i) => {
          const delay = 25 + i * 15;
          const cardSpring = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 150 } });
          const cardOpacity = interpolate(frame, [delay, delay + 15], [0, 1], { extrapolateRight: "clamp" });
          const cardY = interpolate(cardSpring, [0, 1], [40, 0]);

          return (
            <div key={i} style={{
              width: 530, opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(212,175,55,0.15)",
              padding: "28px 32px", display: "flex", gap: 20, alignItems: "flex-start",
            }}>
              <div style={{ fontSize: 32, lineHeight: 1 }}>{feat.icon}</div>
              <div>
                <div style={{
                  fontFamily: inter, fontSize: 18, fontWeight: 600,
                  color: "white", letterSpacing: 0.5,
                }}>
                  {feat.title}
                </div>
                <div style={{
                  fontFamily: inter, fontSize: 13, fontWeight: 300,
                  color: "rgba(255,255,255,0.5)", marginTop: 4,
                }}>
                  {feat.desc}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom stat bar */}
      <div style={{
        position: "absolute", bottom: 60, left: 100, right: 100,
        display: "flex", gap: 60,
        opacity: interpolate(frame, [130, 150], [0, 1], { extrapolateRight: "clamp" }),
      }}>
        {[
          { val: "90+", label: "FERRAMENTAS" },
          { val: "5", label: "IDIOMAS" },
          { val: "22+", label: "MOTORES IA" },
          { val: "< 3s", label: "LATÊNCIA" },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontFamily: orbitron, fontSize: 30, color: "#D4AF37" }}>{s.val}</div>
            <div style={{ fontFamily: inter, fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
