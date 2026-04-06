import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600"], subsets: ["latin"] });

const GOLD = "#c9a84c";
const CYAN = "#00d4ff";
const DARK = "#0a0a0f";

export const InvScene5CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 5, fps, config: { damping: 15, stiffness: 100 } });
  const subtitleS = spring({ frame: frame - 20, fps, config: { damping: 20 } });
  const ctaS = spring({ frame: frame - 40, fps, config: { damping: 12 } });
  const badgeS = spring({ frame: frame - 55, fps, config: { damping: 18 } });

  // Breathing glow
  const glowIntensity = 0.08 + Math.sin(frame * 0.04) * 0.04;

  // Particles flowing upward
  const particles = Array.from({ length: 30 }, (_, i) => {
    const x = ((i * 67) % 1920);
    const baseY = 1080 - ((frame * 1.5 + i * 40) % 1200);
    const opacity = interpolate(baseY, [0, 200, 900, 1080], [0, 0.15, 0.15, 0]);
    return { x, y: baseY, opacity, size: 2 + (i % 3) };
  });

  return (
    <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, #12121f 0%, ${DARK} 100%)` }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", left: "50%", top: "40%",
        transform: "translate(-50%, -50%)", width: 800, height: 800,
        borderRadius: "50%",
        background: `radial-gradient(circle, rgba(201,168,76,${glowIntensity}) 0%, transparent 60%)`,
      }} />

      {/* Rising particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: i % 3 === 0 ? GOLD : CYAN, opacity: p.opacity,
        }} />
      ))}

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Main title */}
        <div style={{
          fontFamily: orbitron, fontWeight: 900, fontSize: 80,
          color: "white", textAlign: "center", lineHeight: 1.1,
          opacity: titleS, transform: `translateY(${interpolate(titleS, [0, 1], [50, 0])}px)`,
        }}>
          Invista no<br />
          <span style={{ color: GOLD }}>Futuro da IA</span>
        </div>

        {/* Gold line */}
        <div style={{
          width: interpolate(subtitleS, [0, 1], [0, 160]),
          height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          margin: "24px 0",
        }} />

        {/* Subtitle */}
        <div style={{
          fontFamily: inter, fontWeight: 300, fontSize: 24,
          color: "rgba(255,255,255,0.55)", textAlign: "center",
          maxWidth: 700, lineHeight: 1.6,
          opacity: subtitleS, transform: `translateY(${interpolate(subtitleS, [0, 1], [20, 0])}px)`,
        }}>
          Plataforma proprietária com receita recorrente,<br />
          margem alta e expansão global
        </div>

        {/* CTA box */}
        <div style={{
          marginTop: 50, padding: "20px 60px",
          border: `2px solid ${GOLD}`,
          background: `rgba(201,168,76,0.08)`,
          opacity: ctaS, transform: `scale(${interpolate(ctaS, [0, 1], [0.8, 1])})`,
        }}>
          <div style={{
            fontFamily: orbitron, fontSize: 22, fontWeight: 700,
            color: GOLD, letterSpacing: "0.15em",
          }}>
            RODADA ABERTA
          </div>
        </div>

        {/* Website */}
        <div style={{
          marginTop: 30, fontFamily: inter, fontSize: 16,
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.2em",
          opacity: badgeS,
        }}>
          www.iasofthub.com
        </div>
      </div>

      {/* Bottom branding */}
      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 30,
        opacity: badgeS,
      }}>
        <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          ELP® Green Technology
        </div>
        <div style={{ width: 1, height: 12, background: "rgba(255,255,255,0.1)" }} />
        <div style={{ fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.3em", textTransform: "uppercase" }}>
          ORION · IA Empresarial
        </div>
      </div>
    </AbsoluteFill>
  );
};
