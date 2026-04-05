import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const PipelinePhase: React.FC<{
  title: string; subtitle: string; icon: string; color: string;
  delay: number; active: boolean; completed: boolean;
}> = ({ title, subtitle, icon, color, delay, active, completed }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 }, delay });
  const pulse = active ? Math.sin(frame * 0.1) * 0.15 + 0.85 : 1;

  return (
    <div style={{
      opacity: s,
      transform: `scale(${interpolate(s, [0, 1], [0.8, 1])})`,
      background: active ? `rgba(${color},0.08)` : "rgba(255,255,255,0.02)",
      border: `2px solid rgba(${color},${active ? 0.6 : completed ? 0.3 : 0.1})`,
      borderRadius: 16,
      padding: "28px 24px",
      textAlign: "center",
      flex: 1,
      position: "relative",
      overflow: "hidden",
    }}>
      {active && (
        <div style={{
          position: "absolute", inset: 0,
          border: `2px solid rgba(${color},${pulse * 0.4})`,
          borderRadius: 16,
          boxShadow: `0 0 ${20 * pulse}px rgba(${color},0.2)`,
        }} />
      )}
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{
        fontFamily: orbitron, fontSize: 16, fontWeight: 700,
        color: active ? `rgb(${color})` : completed ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)",
        letterSpacing: 2, marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
        {subtitle}
      </div>
      {completed && (
        <div style={{
          position: "absolute", top: 12, right: 12,
          width: 24, height: 24, borderRadius: "50%",
          background: `rgba(${color},0.2)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, color: `rgb(${color})`,
        }}>
          ✓
        </div>
      )}
    </div>
  );
};

export const TutPipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 }, delay: 0 });

  // Phase activation timeline
  const phase1Active = frame >= 80 && frame < 220;
  const phase1Done = frame >= 220;
  const phase2Active = frame >= 220 && frame < 360;
  const phase2Done = frame >= 360;
  const phase3Active = frame >= 360 && frame < 480;
  const phase3Done = frame >= 480;

  // Progress bar
  const progress = interpolate(frame, [80, 480], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Document preview
  const docS = spring({ frame, fps, config: { damping: 20 }, delay: 480 });

  // Connector arrows
  const arrow1 = interpolate(frame, [180, 220], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const arrow2 = interpolate(frame, [320, 360], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        03 — PIPELINE JURÍDICO
      </div>

      {/* Intake form mockup */}
      <Sequence from={10} durationInFrames={120}>
        <div style={{
          position: "absolute", top: 110, left: 60, width: 500,
          opacity: spring({ frame: useCurrentFrame(), fps, config: { damping: 20 } }),
        }}>
          <div style={{
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 12, padding: 24,
          }}>
            <div style={{ fontFamily: orbitron, fontSize: 14, color: "#D4AF37", letterSpacing: 2, marginBottom: 16 }}>
              FORMULÁRIO INICIAL
            </div>
            {["Tipo: Petição Inicial", "Área: Trabalhista", "Cliente: Maria Silva", "Vara: 3ª Vara do Trabalho"].map((item, i) => (
              <div key={i} style={{
                padding: "8px 0",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.7)",
                opacity: interpolate(useCurrentFrame(), [i * 10, i * 10 + 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
              }}>
                {item}
              </div>
            ))}
          </div>
        </div>
      </Sequence>

      {/* Pipeline phases */}
      <div style={{
        position: "absolute",
        top: 340, left: 60, right: 60,
        display: "flex", gap: 20, alignItems: "stretch",
      }}>
        <PipelinePhase title="ESTRUTURA" subtitle="Análise de requisitos e formatação" icon="🏗️" color="212,175,55" delay={60} active={phase1Active} completed={phase1Done} />

        {/* Arrow 1 */}
        <div style={{ display: "flex", alignItems: "center", opacity: arrow1 }}>
          <div style={{ fontFamily: orbitron, fontSize: 24, color: "rgba(212,175,55,0.5)" }}>→</div>
        </div>

        <PipelinePhase title="RACIOCÍNIO" subtitle="Fundamentação legal e argumentação" icon="🧠" color="0,212,255" delay={200} active={phase2Active} completed={phase2Done} />

        {/* Arrow 2 */}
        <div style={{ display: "flex", alignItems: "center", opacity: arrow2 }}>
          <div style={{ fontFamily: orbitron, fontSize: 24, color: "rgba(0,212,255,0.5)" }}>→</div>
        </div>

        <PipelinePhase title="REVISÃO" subtitle="Verificação e validação final" icon="✅" color="34,197,94" delay={340} active={phase3Active} completed={phase3Done} />
      </div>

      {/* Progress bar */}
      <div style={{
        position: "absolute",
        bottom: 200, left: 60, right: 60,
      }}>
        <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>
          Progresso: {Math.round(progress)}%
        </div>
        <div style={{
          height: 4, borderRadius: 2,
          background: "rgba(255,255,255,0.05)",
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${progress}%`,
            background: "linear-gradient(90deg, #D4AF37, #00D4FF, #22c55e)",
            boxShadow: "0 0 10px rgba(212,175,55,0.3)",
          }} />
        </div>
      </div>

      {/* Final document preview */}
      <div style={{
        position: "absolute",
        bottom: 60, right: 60, width: 350,
        opacity: docS,
        transform: `translateY(${interpolate(docS, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{
          background: "rgba(34,197,94,0.05)",
          border: "1px solid rgba(34,197,94,0.3)",
          borderRadius: 12, padding: 20,
          display: "flex", alignItems: "center", gap: 16,
        }}>
          <div style={{ fontSize: 32 }}>📄</div>
          <div>
            <div style={{ fontFamily: inter, fontSize: 14, fontWeight: 600, color: "#22c55e" }}>
              Documento Gerado com Sucesso
            </div>
            <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
              Petição_Inicial_Maria_Silva.pdf
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
