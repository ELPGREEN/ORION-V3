import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] });

const SidebarItem: React.FC<{ label: string; icon: string; active?: boolean; delay: number }> = ({ label, icon, active, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20 }, delay });
  const x = interpolate(s, [0, 1], [-200, 0]);

  return (
    <div style={{
      transform: `translateX(${x}px)`,
      opacity: s,
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 20px",
      borderRadius: 8,
      backgroundColor: active ? "rgba(212,175,55,0.15)" : "transparent",
      borderLeft: active ? "3px solid #D4AF37" : "3px solid transparent",
      fontFamily: inter,
      fontSize: 16,
      fontWeight: active ? 600 : 400,
      color: active ? "#D4AF37" : "rgba(255,255,255,0.6)",
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      {label}
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; color: string; delay: number }> = ({ title, value, color, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 15 }, delay });
  const scale = interpolate(s, [0, 1], [0.8, 1]);

  return (
    <div style={{
      transform: `scale(${scale})`,
      opacity: s,
      background: "rgba(255,255,255,0.03)",
      border: `1px solid ${color}33`,
      borderRadius: 12,
      padding: "24px 30px",
      minWidth: 200,
    }}>
      <div style={{ fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 8 }}>{title}</div>
      <div style={{ fontFamily: orbitron, fontSize: 36, fontWeight: 700, color }}>{value}</div>
    </div>
  );
};

export const TutDashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section title
  const titleS = spring({ frame, fps, config: { damping: 20 }, delay: 0 });

  // Cursor animation
  const cursorX = interpolate(frame, [120, 160, 200, 240], [300, 500, 700, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorY = interpolate(frame, [120, 160, 200, 240], [300, 250, 400, 350], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cursorOpacity = interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Highlight effect on sidebar
  const highlightOpacity = interpolate(frame, [280, 310, 340, 370], [0, 0.6, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
      }}>
        01 — PAINEL PRINCIPAL
      </div>

      {/* Dashboard mockup */}
      <div style={{
        position: "absolute",
        top: 100, left: 60, right: 60, bottom: 60,
        border: "1px solid rgba(212,175,55,0.2)",
        borderRadius: 16,
        overflow: "hidden",
        display: "flex",
      }}>
        {/* Sidebar */}
        <div style={{
          width: 260,
          borderRight: "1px solid rgba(212,175,55,0.15)",
          padding: "30px 0",
          position: "relative",
        }}>
          {/* Logo in sidebar */}
          <div style={{
            padding: "0 20px 30px",
            fontFamily: orbitron, fontSize: 22, fontWeight: 700, color: "#D4AF37",
            letterSpacing: 4,
          }}>
            ORION
          </div>

          <SidebarItem icon="📊" label="Dashboard" active delay={10} />
          <SidebarItem icon="📄" label="Documentos" delay={15} />
          <SidebarItem icon="🤖" label="NeuralVision" delay={20} />
          <SidebarItem icon="⚖️" label="Pipeline" delay={25} />
          <SidebarItem icon="👥" label="Clientes" delay={30} />
          <SidebarItem icon="📋" label="Processos" delay={35} />
          <SidebarItem icon="💳" label="Assinaturas" delay={40} />

          {/* Highlight overlay */}
          <div style={{
            position: "absolute",
            top: 120, left: 0, right: 0, height: 48,
            background: "rgba(0,212,255,0.1)",
            borderLeft: "3px solid #00D4FF",
            opacity: highlightOpacity,
          }} />
        </div>

        {/* Main content */}
        <div style={{ flex: 1, padding: 40 }}>
          {/* Welcome */}
          <Sequence from={20}>
            <div style={{
              fontFamily: inter, fontSize: 28, fontWeight: 600, color: "#ffffff",
              marginBottom: 8,
              opacity: spring({ frame: useCurrentFrame(), fps, config: { damping: 20 } }),
            }}>
              Bem-vindo ao ORION
            </div>
            <div style={{
              fontFamily: inter, fontSize: 16, color: "rgba(255,255,255,0.5)",
              marginBottom: 40,
            }}>
              Painel inteligente para gestão jurídica
            </div>
          </Sequence>

          {/* Metric cards */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <MetricCard title="Documentos" value="247" color="#D4AF37" delay={50} />
            <MetricCard title="Clientes Ativos" value="89" color="#00D4FF" delay={60} />
            <MetricCard title="Processos" value="34" color="#22c55e" delay={70} />
            <MetricCard title="Consultas IA" value="1.2K" color="#a855f7" delay={80} />
          </div>

          {/* Activity chart mockup */}
          <Sequence from={90}>
            <div style={{
              marginTop: 40,
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(212,175,55,0.1)",
              borderRadius: 12,
              padding: 24,
              height: 200,
              opacity: spring({ frame: useCurrentFrame(), fps, config: { damping: 20 } }),
            }}>
              <div style={{ fontFamily: inter, fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>
                Atividade Recente
              </div>
              {/* Animated bars */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120 }}>
                {Array.from({ length: 20 }).map((_, i) => {
                  const barH = 30 + Math.sin(i * 0.8) * 40 + Math.cos(i * 1.2) * 20;
                  const barS = spring({ frame: useCurrentFrame(), fps, config: { damping: 15 }, delay: i * 3 });
                  return (
                    <div key={i} style={{
                      flex: 1,
                      height: barH * barS,
                      background: `linear-gradient(180deg, #D4AF37, rgba(212,175,55,0.3))`,
                      borderRadius: 3,
                    }} />
                  );
                })}
              </div>
            </div>
          </Sequence>
        </div>
      </div>

      {/* Animated cursor */}
      <div style={{
        position: "absolute",
        left: cursorX,
        top: cursorY,
        width: 20, height: 20,
        opacity: cursorOpacity,
        filter: "drop-shadow(0 0 8px rgba(0,212,255,0.6))",
      }}>
        <svg width="20" height="20" viewBox="0 0 20 20">
          <path d="M2 2L18 10L10 12L8 18L2 2Z" fill="#00D4FF" stroke="#fff" strokeWidth="1" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
