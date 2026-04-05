import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

export const TutEditor: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 }, delay: 0 });

  // Toolbar buttons appear
  const toolbarS = spring({ frame, fps, config: { damping: 15 }, delay: 20 });

  // Text typing in editor
  const typingProgress = interpolate(frame, [60, 300], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Signature animation
  const sigS = spring({ frame, fps, config: { damping: 15 }, delay: 350 });

  // Export button glow
  const exportS = spring({ frame, fps, config: { damping: 15 }, delay: 420 });
  const exportPulse = frame > 420 ? Math.sin((frame - 420) * 0.08) * 0.3 + 0.7 : 0;

  const toolbarItems = ["B", "I", "U", "H1", "H2", "📝", "🔗", "📷", "📊", "↩️"];

  const documentText = [
    "EXCELENTÍSSIMO SENHOR JUIZ DA 3ª VARA DO TRABALHO",
    "",
    "MARIA SILVA, brasileira, solteira, auxiliar administrativo,",
    "portadora do CPF nº XXX.XXX.XXX-XX, residente e domiciliada",
    "na Rua das Flores, nº 123, Centro, São Paulo/SP,",
    "vem respeitosamente à presença de Vossa Excelência,",
    "por intermédio de seu advogado que esta subscreve,",
    "propor a presente",
    "",
    "RECLAMAÇÃO TRABALHISTA",
    "",
    "em face de EMPRESA XYZ LTDA, pessoa jurídica de",
    "direito privado, inscrita no CNPJ sob nº XX.XXX.XXX/0001-XX,",
  ];

  const visibleLines = Math.floor(typingProgress * documentText.length);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
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
        04 — EDITOR DE DOCUMENTOS
      </div>

      {/* Editor mockup */}
      <div style={{
        position: "absolute",
        top: 100, left: 100, right: 100, bottom: 80,
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}>
        {/* Toolbar */}
        <div style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(212,175,55,0.15)",
          display: "flex", alignItems: "center", gap: 4,
          opacity: toolbarS,
        }}>
          {toolbarItems.map((item, i) => {
            const itemS = spring({ frame, fps, config: { damping: 15 }, delay: 20 + i * 3 });
            return (
              <div key={i} style={{
                width: 36, height: 36, borderRadius: 6,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: inter, fontSize: 13, fontWeight: 600,
                color: "rgba(255,255,255,0.6)",
                opacity: itemS,
                transform: `scale(${interpolate(itemS, [0, 1], [0.5, 1])})`,
              }}>
                {item}
              </div>
            );
          })}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Export button */}
          <div style={{
            opacity: exportS,
            padding: "8px 20px",
            borderRadius: 8,
            background: `linear-gradient(135deg, rgba(212,175,55,${0.3 + exportPulse * 0.3}), rgba(184,150,12,${0.2 + exportPulse * 0.2}))`,
            border: "1px solid rgba(212,175,55,0.5)",
            fontFamily: inter, fontSize: 13, fontWeight: 600, color: "#D4AF37",
            display: "flex", alignItems: "center", gap: 8,
            boxShadow: frame > 420 ? `0 0 ${15 * exportPulse}px rgba(212,175,55,0.3)` : "none",
          }}>
            📤 Exportar PDF
          </div>
        </div>

        {/* Ruler */}
        <div style={{
          height: 24, borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(255,255,255,0.01)",
          display: "flex", alignItems: "flex-end",
          padding: "0 60px",
        }}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={{
              flex: 1,
              height: i % 5 === 0 ? 12 : 6,
              borderLeft: "1px solid rgba(255,255,255,0.1)",
            }} />
          ))}
        </div>

        {/* Document content */}
        <div style={{
          flex: 1, padding: "40px 80px",
          overflowY: "hidden",
        }}>
          {documentText.slice(0, visibleLines).map((line, i) => {
            const isTitle = line === "RECLAMAÇÃO TRABALHISTA";
            const isHeader = i === 0;
            return (
              <div key={i} style={{
                fontFamily: inter,
                fontSize: isHeader ? 14 : isTitle ? 18 : 15,
                fontWeight: isTitle || isHeader ? 700 : 400,
                color: isTitle ? "#D4AF37" : isHeader ? "#00D4FF" : "rgba(255,255,255,0.8)",
                lineHeight: 1.8,
                textAlign: isHeader || isTitle ? "center" : "justify",
                letterSpacing: isTitle ? 4 : 0,
                minHeight: line === "" ? 20 : undefined,
              }}>
                {line}
              </div>
            );
          })}

          {/* Cursor */}
          {frame < 300 && (
            <span style={{
              display: "inline-block",
              width: 2, height: 18,
              background: "#D4AF37",
              opacity: Math.floor(frame / 15) % 2 === 0 ? 1 : 0,
              marginLeft: 2,
            }} />
          )}
        </div>

        {/* Signature area */}
        <Sequence from={340}>
          <div style={{
            position: "absolute",
            bottom: 40, right: 80,
            opacity: sigS,
            transform: `translateY(${interpolate(sigS, [0, 1], [20, 0])}px)`,
          }}>
            <div style={{
              border: "1px dashed rgba(212,175,55,0.3)",
              borderRadius: 8, padding: "16px 32px",
              textAlign: "center",
            }}>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
                ASSINATURA DIGITAL
              </div>
              <div style={{
                fontFamily: inter, fontSize: 14, fontWeight: 600,
                color: "#D4AF37",
                fontStyle: "italic",
              }}>
                Dr. João Advocacia
              </div>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                OAB/SP 123.456
              </div>
              <div style={{
                marginTop: 8,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
                <span style={{ fontFamily: inter, fontSize: 11, color: "#22c55e" }}>Assinado digitalmente</span>
              </div>
            </div>
          </div>
        </Sequence>
      </div>
    </AbsoluteFill>
  );
};
