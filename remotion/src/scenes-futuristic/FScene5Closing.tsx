import {
  AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, staticFile, Img,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: inter } = loadInter("normal", { weights: ["300", "400"], subsets: ["latin"] });

export const FScene5Closing = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pulse = Math.sin(frame * 0.06) * 0.3 + 0.7;
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 15, stiffness: 100 } });
  const logoOp = interpolate(frame, [5, 25], [0, 1], { extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [30, 70], [0, 500], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [155, 190], [1, 0], { extrapolateRight: "clamp" });
  const rotation = interpolate(frame, [0, 300], [0, 360], { extrapolateRight: "extend" });

  const particles = Array.from({ length: 15 }, (_, i) => {
    const x = (i * 173) % 1920;
    const baseY = (i * 127) % 1080;
    const y = baseY + Math.sin(frame * 0.025 + i * 2) * 25;
    const op = 0.15 + Math.sin(frame * 0.04 + i) * 0.1;
    return { x, y, size: 2 + (i % 2), op };
  });

  const rings = [
    { size: 220, opacity: 0.5, width: 2, delay: 5 },
    { size: 170, opacity: 0.4, width: 1.5, delay: 10 },
    { size: 120, opacity: 0.3, width: 1, delay: 15 },
  ];

  return (
    <AbsoluteFill style={{
      background: "linear-gradient(180deg, #0a0a14 0%, #050510 100%)",
      opacity: fadeOut,
    }}>
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: `rgba(212,175,55,${p.op})`,
          boxShadow: `0 0 ${p.size * 3}px rgba(212,175,55,${p.op * 0.5})`,
        }} />
      ))}

      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 600, height: 600,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.08}) 0%, transparent 70%)`,
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {/* Plasma rings */}
        <div style={{
          position: "relative", width: 240, height: 240,
          opacity: logoOp, transform: `scale(${logoScale})`,
        }}>
          {rings.map((ring, i) => {
            const ringOp = interpolate(frame, [ring.delay, ring.delay + 20], [0, ring.opacity * pulse], { extrapolateRight: "clamp" });
            const tilt = 60 + i * 5;
            const rot = rotation * (i % 2 === 0 ? 1 : -0.7) + i * 45;
            return (
              <div key={i} style={{
                position: "absolute", top: "50%", left: "50%",
                width: ring.size, height: ring.size,
                marginTop: -ring.size / 2, marginLeft: -ring.size / 2,
                border: `${ring.width}px solid rgba(212,175,55,${ringOp})`,
                borderRadius: "50%",
                transform: `perspective(600px) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
                boxShadow: `0 0 ${10 * pulse}px rgba(212,175,55,${ringOp * 0.3})`,
              }} />
            );
          })}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 22, height: 22, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(232,146,10,${pulse}) 0%, rgba(212,175,55,${pulse * 0.5}) 50%, transparent 70%)`,
            boxShadow: `0 0 30px rgba(232,146,10,${pulse * 0.5})`,
          }} />
        </div>

        {/* Big metallic title */}
        <div style={{
          opacity: logoOp, transform: `scale(${logoScale})`,
          textAlign: "center", marginTop: 15,
        }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 200,
            filter: `drop-shadow(0 0 60px rgba(212,175,55,${pulse * 0.4}))`,
          }} />
        </div>

        <div style={{
          width: lineW, height: 2, marginTop: 20,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
        }} />

        <div style={{ opacity: tagOp, marginTop: 22, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 22, fontWeight: 300,
            color: "rgba(212,175,55,0.8)", letterSpacing: 6,
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>

        <div style={{ opacity: urlOp, marginTop: 35, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 16, fontWeight: 400,
            color: "rgba(255,255,255,0.4)", letterSpacing: 3,
          }}>
            iasofthub.com
          </div>
        </div>
      </AbsoluteFill>

      <div style={{
        position: "absolute", bottom: 40, left: 0, right: 0,
        textAlign: "center", opacity: urlOp,
      }}>
        <div style={{
          fontFamily: inter, fontSize: 10, color: "rgba(255,255,255,0.2)", letterSpacing: 4,
        }}>
          INPI® REGISTERED · COGNITIVE AI ENGINE · 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
