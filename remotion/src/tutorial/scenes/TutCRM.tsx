import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const ModuleCard: React.FC<{
  icon: string; title: string; desc: string; metric: string; metricLabel: string;
  color: string; delay: number; index: number;
}> = ({ icon, title, desc, metric, metricLabel, color, delay, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15, stiffness: 120 }, delay });
  const hover = frame > delay + 60 && frame < delay + 90;
  const hoverScale = hover ? 1.03 : 1;
  const pulse = Math.sin(frame * 0.06 + index) * 0.1 + 0.9;

  return (
    <div style={{
      opacity: s,
      transform: `scale(${interpolate(s, [0, 1], [0.7, hoverScale])}) translateY(${interpolate(s, [0, 1], [40, 0])}px)`,
      background: "rgba(255,255,255,0.02)",
      border: `1px solid ${color}33`,
      borderRadius: 16,
      padding: "28px 24px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Glow top */}
      <div style={{
        position: "absolute", top: 0, left: "20%", right: "20%", height: 2,
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        opacity: pulse,
      }} />

      <div style={{ fontSize: 36 }}>{icon}</div>
      <div style={{ fontFamily: orbitron, fontSize: 16, fontWeight: 700, color, letterSpacing: 2 }}>
        {title}
      </div>
      <div style={{ fontFamily: inter, fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.5 }}>
        {desc}
      </div>
      <div style={{ marginTop: "auto", paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ fontFamily: orbitron, fontSize: 28, fontWeight: 700, color }}>
          {metric}
        </div>
        <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
          {metricLabel}
        </div>
      </div>
    </div>
  );
};

export const TutCRM: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 }, delay: 0 });

  const modules = [
    { icon: "👥", title: "CLIENTES", desc: "Gestão completa de perfis e documentos", metric: "89", metricLabel: "clientes ativos", color: "#D4AF37" },
    { icon: "⚖️", title: "PROCESSOS", desc: "Acompanhamento de andamentos e prazos", metric: "34", metricLabel: "processos em curso", color: "#00D4FF" },
    { icon: "📋", title: "TAREFAS", desc: "Organização com prazos e prioridades", metric: "156", metricLabel: "tarefas concluídas", color: "#22c55e" },
    { icon: "💳", title: "ASSINATURAS", desc: "Planos e pagamentos recorrentes", metric: "3", metricLabel: "planos disponíveis", color: "#a855f7" },
    { icon: "🏪", title: "MARKETPLACE", desc: "Modelos de documentos e extensões", metric: "40+", metricLabel: "templates jurídicos", color: "#f59e0b" },
    { icon: "📊", title: "RELATÓRIOS", desc: "Analytics e métricas de produtividade", metric: "12", metricLabel: "dashboards customizados", color: "#ef4444" },
  ];

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
        05 — CRM & GESTÃO
      </div>

      {/* Module grid */}
      <div style={{
        position: "absolute",
        top: 120, left: 60, right: 60, bottom: 60,
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 24,
      }}>
        {modules.map((mod, i) => (
          <ModuleCard key={i} {...mod} delay={20 + i * 20} index={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
