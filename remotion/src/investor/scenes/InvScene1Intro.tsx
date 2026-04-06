import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
const { fontFamily: orbitron } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400", "600", "700"], subsets: ["latin"] });

const GOLD = "#c9a84c";
const CYAN = "#00d4ff";
const DARK = "#0a0a0f";
const DARK2 = "#0f0f18";

export const InvScene1Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const subtitleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateRight: "clamp" });
  const lineScale = spring({ frame: frame - 15, fps, config: { damping: 25 } });
  const pillsOpacity = interpolate(frame, [40, 65], [0, 1], { extrapolateRight: "clamp" });
  
  // Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => {
    const x = (Math.sin(i * 2.1 + frame * 0.01) * 0.5 + 0.5) * 1920;
    const y = (Math.cos(i * 3.7 + frame * 0.008) * 0.5 + 0.5) * 1080;
    const opacity = 0.1 + Math.sin(frame * 0.03 + i) * 0.1;
    const size = 2 + Math.sin(i * 1.3) * 2;
    return { x, y, opacity, size };
  });

  // Grid animation
  const gridOpacity = interpolate(frame, [0, 30], [0, 0.08], { extrapolateRight: "clamp" });

  // Plasma glow
  const pulseScale = 1 + Math.sin(frame * 0.04) * 0.05;

  return (
    <AbsoluteFill style={{ background: `linear-gradient(135deg, ${DARK} 0%, ${DARK2} 50%, ${DARK} 100%)` }}>
      {/* Grid overlay */}
      <div style={{
        position: "absolute", inset: 0, opacity: gridOpacity,
        backgroundImage: `linear-gradient(rgba(201,168,76,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.15) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }} />

      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y, width: p.size, height: p.size,
          borderRadius: "50%", background: i % 2 === 0 ? GOLD : CYAN, opacity: p.opacity,
        }} />
      ))}

      {/* Central plasma glow */}
      <div style={{
        position: "absolute", left: "50%", top: "45%", transform: `translate(-50%, -50%) scale(${pulseScale})`,
        width: 500, height: 500, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)`,
      }} />

      {/* Content */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        {/* Badge */}
        <div style={{
          opacity: pillsOpacity, marginBottom: 30,
          padding: "8px 24px", border: `1px solid rgba(201,168,76,0.4)`,
          color: GOLD, fontSize: 13, fontFamily: inter, fontWeight: 600,
          letterSpacing: "0.25em", textTransform: "uppercase",
          background: "rgba(201,168,76,0.06)",
        }}>
          Investimento Estratégico
        </div>

        {/* Title */}
        <div style={{
          fontFamily: orbitron, fontWeight: 900, fontSize: 120,
          color: "white", letterSpacing: "0.15em",
          transform: `translateY(${interpolate(titleSpring, [0, 1], [60, 0])}px)`,
          opacity: titleSpring,
        }}>
          ORION
        </div>

        {/* Gold line */}
        <div style={{
          width: interpolate(lineScale, [0, 1], [0, 200]),
          height: 3, background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          marginTop: 10, marginBottom: 20,
        }} />

        {/* Subtitle */}
        <div style={{
          fontFamily: inter, fontWeight: 300, fontSize: 28,
          color: "rgba(255,255,255,0.6)", letterSpacing: "0.2em",
          textTransform: "uppercase", opacity: subtitleOpacity,
        }}>
          Inteligência Artificial Empresarial
        </div>

        {/* Pills */}
        <div style={{
          display: "flex", gap: 16, marginTop: 40, opacity: pillsOpacity,
        }}>
          {["IA Avançada", "17+ Módulos", "Margem SaaS 80%+", "Expansão Global"].map((label, i) => (
            <div key={i} style={{
              padding: "8px 20px", border: `1px solid rgba(0,212,255,0.3)`,
              color: "rgba(255,255,255,0.6)", fontSize: 13, fontFamily: inter, fontWeight: 400,
              background: "rgba(0,212,255,0.04)",
              transform: `translateY(${interpolate(spring({ frame: frame - 45 - i * 5, fps, config: { damping: 15 } }), [0, 1], [20, 0])}px)`,
            }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Corner accents */}
      <div style={{ position: "absolute", top: 40, left: 40, width: 40, height: 40, borderTop: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: pillsOpacity }} />
      <div style={{ position: "absolute", top: 40, right: 40, width: 40, height: 40, borderTop: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: pillsOpacity }} />
      <div style={{ position: "absolute", bottom: 40, left: 40, width: 40, height: 40, borderBottom: `2px solid ${GOLD}`, borderLeft: `2px solid ${GOLD}`, opacity: pillsOpacity }} />
      <div style={{ position: "absolute", bottom: 40, right: 40, width: 40, height: 40, borderBottom: `2px solid ${GOLD}`, borderRight: `2px solid ${GOLD}`, opacity: pillsOpacity }} />

      {/* Bottom credit */}
      <div style={{
        position: "absolute", bottom: 50, left: 0, right: 0, textAlign: "center",
        fontFamily: inter, fontSize: 12, color: "rgba(255,255,255,0.2)",
        letterSpacing: "0.3em", textTransform: "uppercase", opacity: pillsOpacity,
      }}>
        ELP® Green Technology
      </div>
    </AbsoluteFill>
  );
};
