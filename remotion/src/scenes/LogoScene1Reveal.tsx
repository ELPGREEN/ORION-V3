import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Img,
  staticFile,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["300"], subsets: ["latin"] });

const Ring = ({ radius, strokeWidth, delay, direction, color }: {
  radius: number; strokeWidth: number; delay: number; direction: 1 | -1; color: string;
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drawProgress = interpolate(frame, [delay, delay + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotation = (frame - delay) * direction * 0.4;
  const circumference = 2 * Math.PI * radius;
  const glowPulse = Math.sin((frame - delay) * 0.06) * 0.3 + 0.7;

  return (
    <svg
      width={radius * 2 + 20}
      height={radius * 2 + 20}
      style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        opacity: drawProgress,
        filter: `drop-shadow(0 0 ${12 * glowPulse}px ${color})`,
      }}
    >
      <circle
        cx={radius + 10} cy={radius + 10} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * 0.3} ${circumference * 0.2}`}
        strokeDashoffset={circumference * (1 - drawProgress)}
        strokeLinecap="round"
        opacity={0.8}
      />
    </svg>
  );
};

export const LogoScene1Reveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 25, fps, config: { damping: 14, stiffness: 100 } });
  const logoOpacity = interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" });
  const titleOpacity = interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" });
  const titleY = interpolate(frame, [50, 75], [40, 0], { extrapolateRight: "clamp" });
  const subtitleOpacity = interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" });
  const glowPulse = Math.sin(frame * 0.07) * 0.4 + 0.6;

  // Grid perspective
  const gridOpacity = interpolate(frame, [0, 30], [0, 0.15], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Tron grid floor */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "50%",
        background: `
          linear-gradient(180deg, transparent 0%, rgba(0,212,255,${gridOpacity * 0.05}) 100%)
        `,
        transform: "perspective(600px) rotateX(60deg)",
        transformOrigin: "bottom center",
      }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={`h${i}`} style={{
            position: "absolute", left: 0, right: 0,
            top: `${i * 5}%`, height: 1,
            background: `rgba(0,212,255,${gridOpacity * 0.4})`,
          }} />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={`v${i}`} style={{
            position: "absolute", top: 0, bottom: 0,
            left: `${(i / 29) * 100}%`, width: 1,
            background: `rgba(0,212,255,${gridOpacity * 0.3})`,
          }} />
        ))}
      </div>

      {/* Concentric rings */}
      <Ring radius={180} strokeWidth={2} delay={5} direction={1} color="#D4AF37" />
      <Ring radius={230} strokeWidth={1.5} delay={10} direction={-1} color="#00D4FF" />
      <Ring radius={280} strokeWidth={1} delay={15} direction={1} color="rgba(212,175,55,0.5)" />
      <Ring radius={330} strokeWidth={0.8} delay={20} direction={-1} color="rgba(0,212,255,0.4)" />
      <Ring radius={140} strokeWidth={2.5} delay={8} direction={-1} color="#C87533" />

      {/* Logo center */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          width: 220, height: 220, borderRadius: "50%",
          overflow: "hidden",
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          boxShadow: `0 0 ${60 * glowPulse}px rgba(212,175,55,${glowPulse * 0.5}), 0 0 ${120 * glowPulse}px rgba(212,175,55,${glowPulse * 0.2})`,
          border: `2px solid rgba(212,175,55,${glowPulse * 0.6})`,
        }}>
          <Img src={staticFile("images/orion-logo.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </AbsoluteFill>

      {/* Title below logo */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ marginTop: 320, textAlign: "center", opacity: titleOpacity, transform: `translateY(${titleY}px)` }}>
          <div style={{
            fontFamily: orbitron, fontSize: 72, fontWeight: 900,
            color: "white", letterSpacing: 14,
            textShadow: `0 0 40px rgba(212,175,55,${glowPulse * 0.6})`,
          }}>
            ORION
          </div>
          <div style={{
            fontFamily: inter, fontSize: 22, fontWeight: 300,
            color: "rgba(0,212,255,0.8)", letterSpacing: 10,
            marginTop: 10, opacity: subtitleOpacity,
          }}>
            INTELIGÊNCIA ARTIFICIAL EMPRESARIAL
          </div>
        </div>
      </AbsoluteFill>

      {/* Scan line effect */}
      <AbsoluteFill style={{
        background: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.015) 2px, rgba(0,212,255,0.015) 4px)`,
        pointerEvents: "none",
      }} />
    </AbsoluteFill>
  );
};
