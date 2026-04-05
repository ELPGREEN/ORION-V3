import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const TutClosing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main title
  const titleS = spring({ frame, fps, config: { damping: 15 }, delay: 10 });

  // Subtitle
  const subS = spring({ frame, fps, config: { damping: 20 }, delay: 40 });

  // Features list
  const featS = spring({ frame, fps, config: { damping: 20 }, delay: 70 });

  // CTA
  const ctaS = spring({ frame, fps, config: { damping: 12 }, delay: 120 });
  const ctaPulse = frame > 120 ? Math.sin((frame - 120) * 0.06) * 0.15 + 0.85 : 0;

  // ELP badge
  const elpS = spring({ frame, fps, config: { damping: 20 }, delay: 180 });

  // Rings
  const ring1 = spring({ frame, fps, config: { damping: 30 }, delay: 20 });
  const ring2 = spring({ frame, fps, config: { damping: 30 }, delay: 35 });

  // Final fade
  const fadeOut = interpolate(frame, [440, 500], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;

  const features = [
    "Painel Inteligente",
    "NeuralVision IA",
    "Pipeline Jurídico",
    "Editor Profissional",
    "CRM Completo",
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", opacity: fadeOut }}>
      <AbsoluteFill style={{
        backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)`,
        backgroundSize: "60px 60px",
      }} />

      {/* Rings */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {[ring1, ring2].map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 500 + i * 150,
            height: 500 + i * 150,
            borderRadius: "50%",
            border: `1px solid rgba(212,175,55,${0.15 - i * 0.05})`,
            transform: `scale(${r}) rotate(${frame * (0.5 + i * 0.3)}deg)`,
            opacity: r * pulse * 0.5,
          }} />
        ))}
      </AbsoluteFill>

      {/* ORION title */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            fontFamily: orbitron,
            fontSize: 90,
            fontWeight: 900,
            color: "#D4AF37",
            letterSpacing: 16,
            textShadow: `0 0 ${30 * pulse}px rgba(212,175,55,0.4)`,
            opacity: titleS,
            transform: `scale(${interpolate(titleS, [0, 1], [0.8, 1])})`,
          }}>
            ORION
          </div>

          {/* Divider */}
          <div style={{
            width: interpolate(subS, [0, 1], [0, 300]),
            height: 1,
            background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
            margin: "20px auto",
          }} />

          <div style={{
            fontFamily: inter,
            fontSize: 22,
            color: "rgba(255,255,255,0.7)",
            letterSpacing: 6,
            opacity: subS,
            transform: `translateY(${interpolate(subS, [0, 1], [20, 0])}px)`,
          }}>
            SUA PLATAFORMA COMPLETA
          </div>

          {/* Features */}
          <div style={{
            display: "flex", gap: 16, justifyContent: "center",
            marginTop: 40,
            opacity: featS,
          }}>
            {features.map((feat, i) => {
              const fS = spring({ frame, fps, config: { damping: 15 }, delay: 80 + i * 12 });
              return (
                <div key={i} style={{
                  padding: "8px 18px",
                  borderRadius: 20,
                  border: "1px solid rgba(212,175,55,0.25)",
                  background: "rgba(212,175,55,0.05)",
                  fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.6)",
                  opacity: fS,
                  transform: `translateY(${interpolate(fS, [0, 1], [15, 0])}px)`,
                }}>
                  {feat}
                </div>
              );
            })}
          </div>

          {/* CTA */}
          <div style={{
            marginTop: 50,
            opacity: ctaS,
            transform: `scale(${interpolate(ctaS, [0, 1], [0.8, 1])})`,
          }}>
            <div style={{
              display: "inline-block",
              padding: "16px 48px",
              borderRadius: 12,
              background: `linear-gradient(135deg, rgba(212,175,55,${0.25 + ctaPulse * 0.15}), rgba(184,150,12,${0.15 + ctaPulse * 0.1}))`,
              border: "1px solid rgba(212,175,55,0.5)",
              boxShadow: `0 0 ${25 * ctaPulse}px rgba(212,175,55,0.25)`,
              fontFamily: orbitron, fontSize: 18, fontWeight: 700,
              color: "#D4AF37", letterSpacing: 4,
            }}>
              COMECE AGORA
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* ELP badge */}
      <div style={{
        position: "absolute",
        bottom: 50, left: 0, right: 0,
        textAlign: "center",
        opacity: elpS,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 13,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: 4,
        }}>
          ELP® Green Technology · Powered by NeuralVision
        </div>
      </div>
    </AbsoluteFill>
  );
};
