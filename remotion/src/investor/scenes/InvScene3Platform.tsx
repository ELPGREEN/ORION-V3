import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const GOLD = "#c9a84c";
const CYAN = "#00d4ff";
const DARK = "#0a0a0f";

const modules = [
  { name: "Motor Neural", desc: "IA proprietária multicamada", color: GOLD },
  { name: "Visão Computacional", desc: "Análise visual avançada", color: CYAN },
  { name: "Voz Inteligente", desc: "Controle por voz natural", color: GOLD },
  { name: "CRM & Pipeline", desc: "Gestão completa de clientes", color: CYAN },
  { name: "Documentos IA", desc: "100+ tipos automáticos", color: GOLD },
  { name: "Compliance", desc: "LGPD/GDPR/AI Act", color: CYAN },
  { name: "Automação", desc: "Fluxos inteligentes", color: GOLD },
  { name: "Analytics", desc: "Dashboard em tempo real", color: CYAN },
];

export const InvScene3Platform: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  // Central hub
  const hubScale = spring({ frame: frame - 10, fps, config: { damping: 12 } });
  const hubPulse = 1 + Math.sin(frame * 0.05) * 0.03;

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, #0d0d1a 0%, ${DARK} 100%)` }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 60, left: 0, right: 0, textAlign: "center",
        opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
      }}>
        <div style={{ fontFamily: inter, fontSize: 14, color: GOLD, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>
          Ecossistema Completo
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 48, fontWeight: 700, color: "white" }}>
          17+ Módulos Integrados
        </div>
      </div>

      {/* Central hub */}
      <div style={{
        position: "absolute", left: "50%", top: "50%",
        transform: `translate(-50%, -50%) scale(${interpolate(hubScale, [0, 1], [0, 1]) * hubPulse})`,
      }}>
        <div style={{
          width: 140, height: 140, borderRadius: "50%",
          border: `2px solid ${GOLD}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: `radial-gradient(circle, rgba(201,168,76,0.15) 0%, transparent 70%)`,
        }}>
          <div style={{ fontFamily: orbitron, fontSize: 20, fontWeight: 700, color: GOLD, textAlign: "center" }}>
            ORION<br />
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: inter }}>Core AI</span>
          </div>
        </div>
      </div>

      {/* Orbital modules */}
      {modules.map((mod, i) => {
        const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2;
        const radius = 340;
        const cx = 960 + Math.cos(angle + frame * 0.002) * radius;
        const cy = 540 + Math.sin(angle + frame * 0.002) * radius;
        const s = spring({ frame: frame - 25 - i * 6, fps, config: { damping: 14 } });

        return (
          <React.Fragment key={i}>
            {/* Connection line */}
            <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <line x1={960} y1={540} x2={cx} y2={cy}
                stroke={mod.color} strokeWidth={1} opacity={interpolate(s, [0, 1], [0, 0.15])}
                strokeDasharray="4 4"
              />
            </svg>
            {/* Module card */}
            <div style={{
              position: "absolute", left: cx - 100, top: cy - 40,
              width: 200, padding: "16px 12px", textAlign: "center",
              border: `1px solid ${mod.color === GOLD ? "rgba(201,168,76,0.3)" : "rgba(0,212,255,0.3)"}`,
              background: `rgba(${mod.color === GOLD ? "201,168,76" : "0,212,255"},0.05)`,
              opacity: s, transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
            }}>
              <div style={{ fontFamily: inter, fontSize: 14, fontWeight: 600, color: mod.color }}>{mod.name}</div>
              <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{mod.desc}</div>
            </div>
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};
