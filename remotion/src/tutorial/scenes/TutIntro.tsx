import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "500"], subsets: ["latin"] });

export const TutIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Animated rings
  const ring1 = spring({ frame, fps, config: { damping: 30, stiffness: 80 }, delay: 10 });
  const ring2 = spring({ frame, fps, config: { damping: 30, stiffness: 80 }, delay: 25 });
  const ring3 = spring({ frame, fps, config: { damping: 30, stiffness: 80 }, delay: 40 });

  // Logo reveal
  const logoScale = spring({ frame, fps, config: { damping: 15, stiffness: 100 }, delay: 5 });
  const logoOpacity = interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Title text
  const titleY = interpolate(
    spring({ frame, fps, config: { damping: 20 }, delay: 40 }),
    [0, 1], [60, 0]
  );
  const titleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Subtitle
  const subY = interpolate(
    spring({ frame, fps, config: { damping: 20 }, delay: 70 }),
    [0, 1], [40, 0]
  );
  const subOpacity = interpolate(frame, [70, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Pulsing glow
  const pulse = Math.sin(frame * 0.05) * 0.3 + 0.7;

  // Exit fade
  const exitOpacity = interpolate(frame, [260, 300], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f", opacity: exitOpacity }}>
      {/* Grid background */}
      <AbsoluteFill style={{
        backgroundImage: `
          linear-gradient(rgba(0,212,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        opacity: interpolate(frame, [0, 30], [0, 0.6], { extrapolateRight: "clamp" }),
      }} />

      {/* Animated rings */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {[ring1, ring2, ring3].map((r, i) => (
          <div key={i} style={{
            position: "absolute",
            width: 300 + i * 120,
            height: 300 + i * 120,
            borderRadius: "50%",
            border: `${2 - i * 0.5}px solid rgba(212, 175, 55, ${0.4 - i * 0.1})`,
            transform: `scale(${r}) rotate(${frame * (1.5 - i * 0.5)}deg)`,
            opacity: r * pulse,
          }} />
        ))}
      </AbsoluteFill>

      {/* ORION Logo text */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          transform: `scale(${logoScale})`,
          opacity: logoOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: orbitron,
            fontSize: 120,
            fontWeight: 900,
            color: "#D4AF37",
            letterSpacing: 20,
            textShadow: `0 0 ${30 * pulse}px rgba(212,175,55,0.5), 0 0 60px rgba(212,175,55,0.2)`,
          }}>
            ORION
          </div>
        </div>
      </AbsoluteFill>

      {/* Title */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          transform: `translateY(${100 + titleY}px)`,
          opacity: titleOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: orbitron,
            fontSize: 48,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: 8,
          }}>
            COMO USAR O ORION
          </div>
        </div>
      </AbsoluteFill>

      {/* Subtitle */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          transform: `translateY(${170 + subY}px)`,
          opacity: subOpacity,
          textAlign: "center",
        }}>
          <div style={{
            fontFamily: inter,
            fontSize: 24,
            fontWeight: 400,
            color: "#00D4FF",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}>
            Tutorial Completo da Plataforma
          </div>
        </div>
      </AbsoluteFill>

      {/* Bottom line */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <div style={{
          width: interpolate(frame, [100, 150], [0, 400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          height: 1,
          background: "linear-gradient(90deg, transparent, #D4AF37, transparent)",
        }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
