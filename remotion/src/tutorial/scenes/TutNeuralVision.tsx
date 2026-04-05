import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const TypingText: React.FC<{ text: string; startFrame: number; speed?: number }> = ({ text, startFrame, speed = 1.5 }) => {
  const frame = useCurrentFrame();
  const chars = Math.floor(Math.max(0, (frame - startFrame) * speed));
  return <>{text.slice(0, Math.min(chars, text.length))}</>;
};

export const TutNeuralVision: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 }, delay: 0 });

  // Chat messages appear sequentially
  const userMsgOpacity = interpolate(frame, [30, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const aiTypingStart = 80;
  const aiMsgOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Metrics appear after response
  const metricsS = spring({ frame, fps, config: { damping: 20 }, delay: 250 });

  // Cursor blink
  const cursorBlink = Math.floor(frame / 15) % 2 === 0;

  // Neural network visualization
  const neuralPulse = Math.sin(frame * 0.08) * 0.3 + 0.7;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Grid */}
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Section label */}
      <div style={{
        position: "absolute", top: 40, left: 60,
        fontFamily: orbitron, fontSize: 16, color: "#00D4FF", letterSpacing: 6,
        opacity: titleS,
      }}>
        02 — NEURALVISION IA
      </div>

      {/* Chat interface mockup */}
      <div style={{
        position: "absolute",
        top: 100, left: 60, right: 400, bottom: 60,
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 16,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Chat header */}
        <div style={{
          padding: "16px 24px",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 8px rgba(34,197,94,0.5)",
          }} />
          <span style={{ fontFamily: inter, fontSize: 16, fontWeight: 600, color: "#D4AF37" }}>
            NeuralVision · Assistente Jurídico IA
          </span>
        </div>

        {/* Chat body */}
        <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          {/* User message */}
          <div style={{
            opacity: userMsgOpacity,
            alignSelf: "flex-end",
            maxWidth: "70%",
          }}>
            <div style={{
              background: "rgba(212,175,55,0.15)",
              border: "1px solid rgba(212,175,55,0.3)",
              borderRadius: "16px 16px 4px 16px",
              padding: "14px 20px",
              fontFamily: inter, fontSize: 15, color: "#ffffff",
            }}>
              <TypingText text="Quais são os requisitos para uma petição inicial em ação trabalhista segundo a CLT?" startFrame={30} speed={2} />
              {frame < 70 && frame > 30 && (
                <span style={{ opacity: cursorBlink ? 1 : 0, color: "#D4AF37" }}>|</span>
              )}
            </div>
          </div>

          {/* AI response */}
          <div style={{
            opacity: aiMsgOpacity,
            alignSelf: "flex-start",
            maxWidth: "80%",
          }}>
            <div style={{
              background: "rgba(0,212,255,0.05)",
              border: "1px solid rgba(0,212,255,0.15)",
              borderRadius: "16px 16px 16px 4px",
              padding: "18px 22px",
              fontFamily: inter, fontSize: 15, color: "rgba(255,255,255,0.9)",
              lineHeight: 1.7,
            }}>
              <TypingText
                text="De acordo com o art. 840 da CLT, a petição inicial deve conter: 1) Designação do juízo; 2) Qualificação das partes; 3) Breve exposição dos fatos; 4) Pedido com suas especificações; 5) Data e assinatura do reclamante. A partir da Reforma Trabalhista (Lei 13.467/2017), os pedidos devem ser certos, determinados e com indicação do valor."
                startFrame={aiTypingStart}
                speed={2.5}
              />
              {frame > aiTypingStart && frame < 240 && (
                <span style={{ opacity: cursorBlink ? 1 : 0, color: "#00D4FF" }}>|</span>
              )}
            </div>

            {/* Sources */}
            <Sequence from={200}>
              <div style={{
                marginTop: 10,
                display: "flex", gap: 8,
                opacity: spring({ frame: useCurrentFrame(), fps, config: { damping: 20 } }),
              }}>
                {["CLT Art. 840", "Lei 13.467/2017", "TST Súmula 263"].map((src, i) => (
                  <div key={i} style={{
                    padding: "4px 12px",
                    borderRadius: 20,
                    border: "1px solid rgba(0,212,255,0.3)",
                    fontFamily: inter, fontSize: 11, color: "#00D4FF",
                  }}>
                    📎 {src}
                  </div>
                ))}
              </div>
            </Sequence>
          </div>
        </div>

        {/* Input bar */}
        <div style={{
          padding: "16px 24px",
          borderTop: "1px solid rgba(212,175,55,0.15)",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <div style={{
            flex: 1, padding: "10px 16px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.1)",
            fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.3)",
          }}>
            Digite sua consulta jurídica...
          </div>
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: "linear-gradient(135deg, #D4AF37, #B8960C)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            ➤
          </div>
        </div>
      </div>

      {/* Right panel — Neural metrics */}
      <div style={{
        position: "absolute",
        top: 100, right: 60, width: 300, bottom: 60,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {/* Neural viz */}
        <div style={{
          border: "1px solid rgba(0,212,255,0.2)",
          borderRadius: 16,
          padding: 24,
          flex: 1,
          opacity: metricsS,
          transform: `translateX(${interpolate(metricsS, [0, 1], [40, 0])}px)`,
        }}>
          <div style={{ fontFamily: orbitron, fontSize: 13, color: "#00D4FF", letterSpacing: 3, marginBottom: 20 }}>
            NEURAL METRICS
          </div>

          {/* Phi score */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              Índice Φ (Coerência)
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: orbitron, fontSize: 42, fontWeight: 700, color: "#D4AF37" }}>
                0.94
              </span>
              <span style={{ fontFamily: inter, fontSize: 14, color: "#22c55e" }}>▲ Alto</span>
            </div>
          </div>

          {/* PLV score */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>
              PLV Score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ fontFamily: orbitron, fontSize: 42, fontWeight: 700, color: "#00D4FF" }}>
                8.7
              </span>
              <span style={{ fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.5)" }}>/10</span>
            </div>
          </div>

          {/* Provider */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>Provider</div>
            <div style={{
              padding: "6px 14px", borderRadius: 20,
              background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.3)",
              fontFamily: inter, fontSize: 13, color: "#D4AF37", display: "inline-block",
            }}>
              Claude 3.5 Sonnet
            </div>
          </div>

          {/* Neural nodes decoration */}
          <div style={{ position: "relative", height: 80, marginTop: 10 }}>
            {Array.from({ length: 8 }).map((_, i) => {
              const x = 20 + (i % 4) * 70;
              const y = i < 4 ? 10 : 50;
              return (
                <div key={i} style={{
                  position: "absolute", left: x, top: y,
                  width: 8, height: 8, borderRadius: "50%",
                  background: i % 2 === 0 ? "#D4AF37" : "#00D4FF",
                  opacity: neuralPulse,
                  boxShadow: `0 0 ${6 + Math.sin(frame * 0.1 + i) * 4}px ${i % 2 === 0 ? "rgba(212,175,55,0.5)" : "rgba(0,212,255,0.5)"}`,
                }} />
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
