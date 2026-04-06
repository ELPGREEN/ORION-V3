import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600", "700"], subsets: ["latin"] });

const GOLD = "#c9a84c";
const CYAN = "#00d4ff";
const DARK = "#0a0a0f";

const timeline = [
  { date: "Dez 2024", event: "Concepção & Arquitetura", y: 250 },
  { date: "Jan 2025", event: "Início do Desenvolvimento", y: 400 },
  { date: "Fev 2025", event: "Primeiro Protótipo", y: 550 },
  { date: "Jan 2026", event: "IA Avançada Operacional", y: 700 },
  { date: "Abr 2026", event: "Plataforma Completa — 17+ Módulos", y: 850 },
];

export const InvScene4Timeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame, fps, config: { damping: 20 } });

  // Line drawing progress
  const lineProgress = interpolate(frame, [30, 180], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, ${DARK} 0%, #0d0d18 100%)` }}>
      {/* Title */}
      <div style={{
        position: "absolute", top: 60, left: 0, right: 0, textAlign: "center",
        opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [20, 0])}px)`,
      }}>
        <div style={{ fontFamily: inter, fontSize: 14, color: CYAN, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 10 }}>
          Evolução Acelerada
        </div>
        <div style={{ fontFamily: orbitron, fontSize: 48, fontWeight: 700, color: "white" }}>
          De Conceito a Plataforma Global
        </div>
      </div>

      {/* Timeline line */}
      <div style={{
        position: "absolute", left: 400, top: 200, width: 4, height: 700 * lineProgress,
        background: `linear-gradient(180deg, ${GOLD}, ${CYAN})`,
      }} />

      {/* Timeline items */}
      {timeline.map((item, i) => {
        const itemProgress = interpolate(frame, [40 + i * 30, 70 + i * 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const s = spring({ frame: frame - 40 - i * 30, fps, config: { damping: 15 } });

        return (
          <div key={i} style={{
            position: "absolute", left: 420, top: item.y - 20,
            display: "flex", alignItems: "center", gap: 20,
            opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
          }}>
            {/* Dot */}
            <div style={{
              position: "absolute", left: -30, width: 16, height: 16, borderRadius: "50%",
              background: i % 2 === 0 ? GOLD : CYAN,
              boxShadow: `0 0 20px ${i % 2 === 0 ? "rgba(201,168,76,0.5)" : "rgba(0,212,255,0.5)"}`,
            }} />
            <div>
              <div style={{ fontFamily: orbitron, fontSize: 16, fontWeight: 700, color: i % 2 === 0 ? GOLD : CYAN }}>{item.date}</div>
              <div style={{ fontFamily: inter, fontSize: 20, fontWeight: 400, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{item.event}</div>
            </div>
          </div>
        );
      })}

      {/* Right side — growth arrow */}
      <svg style={{ position: "absolute", right: 200, top: 250, width: 300, height: 600 }}>
        <path
          d={`M 150 550 Q 150 300, 50 100`}
          stroke={GOLD} strokeWidth={2} fill="none" opacity={0.2}
          strokeDasharray="600"
          strokeDashoffset={interpolate(frame, [30, 200], [600, 0], { extrapolateRight: "clamp" })}
        />
        <polygon points="45,100 55,100 50,80" fill={GOLD} opacity={interpolate(frame, [180, 210], [0, 0.6], { extrapolateRight: "clamp" })} />
      </svg>
    </AbsoluteFill>
  );
};
