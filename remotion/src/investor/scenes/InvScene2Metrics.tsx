import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600", "700"], subsets: ["latin"] });

const GOLD = "#c9a84c";
const CYAN = "#00d4ff";
const DARK = "#0a0a0f";

const metrics = [
  { value: "17+", label: "Ferramentas\nIntegradas", color: GOLD },
  { value: "80%+", label: "Margem\nSaaS", color: CYAN },
  { value: "70%", label: "Redução de\nCustos", color: GOLD },
  { value: "5", label: "Idiomas\nNativos", color: CYAN },
  { value: "24/7", label: "Assistente\nIA", color: GOLD },
  { value: "100+", label: "Tipos de\nDocumentos", color: CYAN },
];

export const InvScene2Metrics: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${DARK} 0%, #0d0d1a 100%)` }}>
      {/* Scan line */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: 2,
        top: `${((frame * 1.5) % 1200) - 60}px`,
        background: `linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)`,
      }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: 80, left: 0, right: 0, textAlign: "center",
        opacity: titleSpring,
        transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
      }}>
        <div style={{ fontFamily: inter, fontSize: 14, color: CYAN, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 12 }}>
          Performance Operacional
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 52, fontWeight: 700, color: "white" }}>
          Métricas de Impacto
        </div>
        <div style={{ width: 120, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`, margin: "16px auto" }} />
      </div>

      {/* Metrics Grid */}
      <div style={{
        position: "absolute", top: 300, left: 120, right: 120,
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40,
      }}>
        {metrics.map((m, i) => {
          const s = spring({ frame: frame - 20 - i * 8, fps, config: { damping: 15, stiffness: 120 } });
          const countUp = interpolate(s, [0, 1], [0, 1]);

          return (
            <div key={i} style={{
              textAlign: "center", padding: "40px 20px",
              border: `1px solid ${m.color === GOLD ? "rgba(201,168,76,0.2)" : "rgba(0,212,255,0.2)"}`,
              background: `rgba(${m.color === GOLD ? "201,168,76" : "0,212,255"},0.03)`,
              opacity: s,
              transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})`,
            }}>
              <div style={{
                fontFamily: orbitron, fontSize: 64, fontWeight: 700,
                color: m.color, lineHeight: 1,
              }}>
                {m.value}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 15, color: "rgba(255,255,255,0.5)",
                marginTop: 12, lineHeight: 1.4, whiteSpace: "pre-line",
              }}>
                {m.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
