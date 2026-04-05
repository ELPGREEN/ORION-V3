import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont as loadOrbitron } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadOrbitron();
const { fontFamily: inter } = loadInter();

const CHAT_MESSAGES = [
  { role: "user", text: "Orion, acende a luz da sala e toca jazz." },
  { role: "ai", text: "Luzes ajustadas para 60%. Tocando Miles Davis — Kind of Blue. 🎵" },
  { role: "user", text: "Redige um contrato de locação." },
  { role: "ai", text: "Contrato gerado com 12 cláusulas. Pipeline ELP® concluído em 3.2s ✓" },
];

const CARDS = [
  { icon: "🏠", label: "Smart Home", detail: "4 dispositivos", color: "#00D4FF" },
  { icon: "📄", label: "Documentos", detail: "847 gerados", color: "#D4AF37" },
  { icon: "🎵", label: "Mídia", detail: "Streaming ativo", color: "#22c55e" },
  { icon: "🛡", label: "Segurança", detail: "Monitorando", color: "#00D4FF" },
];

export const PromoCompanheiro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Background subtle grid */}
      <AbsoluteFill style={{ opacity: 0.04 }}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} style={{
            position: "absolute", top: `${i * 5}%`, left: 0, right: 0, height: 1,
            background: "linear-gradient(90deg, transparent, #00D4FF, transparent)",
          }} />
        ))}
      </AbsoluteFill>

      {/* Chat simulation - left side */}
      <div style={{
        position: "absolute", left: 80, top: 120,
        width: 700,
        opacity: spring({ frame: frame - 10, fps, config: { damping: 20 } }),
        transform: `translateX(${interpolate(spring({ frame: frame - 10, fps, config: { damping: 20 } }), [0, 1], [-40, 0])}px)`,
      }}>
        <div style={{
          background: "rgba(0,212,255,0.03)",
          border: "1px solid rgba(0,212,255,0.15)",
          borderRadius: 16, padding: 30, overflow: "hidden",
        }}>
          <div style={{
            fontFamily: orbitron, fontSize: 14, color: "#00D4FF",
            letterSpacing: 4, marginBottom: 24, display: "flex", alignItems: "center", gap: 10,
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%", backgroundColor: "#22c55e",
              boxShadow: "0 0 8px rgba(34,197,94,0.8)",
            }} />
            ORION ASSISTANT
          </div>

          {CHAT_MESSAGES.map((msg, i) => {
            const msgDelay = 30 + i * 50;
            const s = spring({ frame: frame - msgDelay, fps, config: { damping: 18 } });
            const isAI = msg.role === "ai";
            // Typing effect for AI
            const charCount = isAI
              ? Math.round(interpolate(frame, [msgDelay + 10, msgDelay + 45], [0, msg.text.length], {
                  extrapolateLeft: "clamp", extrapolateRight: "clamp",
                }))
              : msg.text.length;

            return (
              <div key={i} style={{
                marginBottom: 14,
                opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [15, 0])}px)`,
                display: "flex",
                justifyContent: isAI ? "flex-start" : "flex-end",
              }}>
                <div style={{
                  maxWidth: "85%",
                  padding: "12px 18px",
                  borderRadius: isAI ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                  background: isAI
                    ? "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(0,212,255,0.08))"
                    : "rgba(255,255,255,0.06)",
                  border: `1px solid ${isAI ? "rgba(212,175,55,0.25)" : "rgba(255,255,255,0.1)"}`,
                }}>
                  <span style={{
                    fontFamily: inter, fontSize: 15,
                    color: isAI ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.7)",
                    lineHeight: 1.5,
                  }}>
                    {msg.text.substring(0, charCount)}
                    {isAI && charCount < msg.text.length && (
                      <span style={{ opacity: Math.sin(frame * 0.3) > 0 ? 1 : 0, color: "#D4AF37" }}>▊</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Activity cards - right side */}
      <div style={{
        position: "absolute", right: 80, top: 120,
        display: "flex", flexDirection: "column", gap: 20,
      }}>
        {CARDS.map((card, i) => {
          const delay = 60 + i * 25;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15 } });
          const pulse = Math.sin(frame * 0.06 + i * 1.5) * 3;

          return (
            <div key={i} style={{
              width: 320, padding: "20px 24px",
              background: `rgba(${card.color === "#D4AF37" ? "212,175,55" : card.color === "#22c55e" ? "34,197,94" : "0,212,255"},0.05)`,
              border: `1px solid ${card.color}33`,
              borderRadius: 12,
              display: "flex", alignItems: "center", gap: 16,
              opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [40, 0]) + pulse}px)`,
            }}>
              <span style={{ fontSize: 32 }}>{card.icon}</span>
              <div>
                <div style={{ fontFamily: orbitron, fontSize: 14, color: card.color, letterSpacing: 2 }}>
                  {card.label}
                </div>
                <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
                  {card.detail}
                </div>
              </div>
              <div style={{
                marginLeft: "auto", width: 8, height: 8, borderRadius: "50%",
                backgroundColor: "#22c55e",
                boxShadow: "0 0 8px rgba(34,197,94,0.6)",
              }} />
            </div>
          );
        })}
      </div>

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 60 }}>
        <div style={{
          fontFamily: orbitron, fontSize: 38, fontWeight: 700,
          color: "#D4AF37", letterSpacing: 6,
          opacity: spring({ frame: frame - 180, fps, config: { damping: 20 } }),
          textShadow: "0 0 30px rgba(212,175,55,0.4)",
        }}>SEU COMPANHEIRO INTELIGENTE</div>
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
