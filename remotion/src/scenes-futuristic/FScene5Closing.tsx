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
  const lineW = interpolate(frame, [30, 70], [0, 600], { extrapolateRight: "clamp" });
  const tagOp = interpolate(frame, [35, 55], [0, 1], { extrapolateRight: "clamp" });
  const urlOp = interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [155, 190], [1, 0], { extrapolateRight: "clamp" });
  const rotation = interpolate(frame, [0, 300], [0, 360], { extrapolateRight: "extend" });

  const particles = Array.from({ length: 18 }, (_, i) => {
    const x = (i * 173) % 1920;
    const baseY = (i * 127) % 1080;
    const y = baseY + Math.sin(frame * 0.025 + i * 2) * 25;
    const op = 0.15 + Math.sin(frame * 0.04 + i) * 0.1;
    return { x, y, size: 2 + (i % 3), op };
  });

  const rings = [
    { ratio: 0.9, opacity: 0.6, width: 2.5, delay: 3 },
    { ratio: 0.7, opacity: 0.5, width: 2, delay: 8 },
    { ratio: 0.5, opacity: 0.4, width: 1.5, delay: 13 },
    { ratio: 0.32, opacity: 0.3, width: 1, delay: 18 },
  ];

  const orbSize = 400;

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
        position: "absolute", top: "35%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 700, height: 700,
        background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.1}) 0%, transparent 65%)`,
      }} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        {/* Big plasma orb */}
        <div style={{
          position: "relative", width: orbSize, height: orbSize,
          opacity: logoOp, transform: `scale(${logoScale})`,
          marginTop: -60,
        }}>
          {/* Ambient glow */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: orbSize * 1.2, height: orbSize * 1.2, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(212,175,55,${pulse * 0.1}) 0%, transparent 70%)`,
          }} />

          {rings.map((ring, i) => {
            const ringSize = orbSize * ring.ratio;
            const ringOp = interpolate(frame, [ring.delay, ring.delay + 20], [0, ring.opacity * pulse], { extrapolateRight: "clamp" });
            const tilt = 65 + i * 3;
            const rot = rotation * (i % 2 === 0 ? 1 : -0.6) + i * 40;
            return (
              <div key={i} style={{
                position: "absolute", top: "50%", left: "50%",
                width: ringSize, height: ringSize,
                marginTop: -ringSize / 2, marginLeft: -ringSize / 2,
                border: `${ring.width}px solid rgba(212,175,55,${ringOp})`,
                borderRadius: "50%",
                transform: `perspective(800px) rotateX(${tilt}deg) rotateZ(${rot}deg)`,
                boxShadow: `0 0 ${16 * pulse}px rgba(212,175,55,${ringOp * 0.4})`,
              }} />
            );
          })}
          {/* Core */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 30, height: 30, borderRadius: "50%",
            background: `radial-gradient(circle, rgba(255,200,50,${pulse}) 0%, rgba(232,146,10,${pulse * 0.7}) 50%, transparent 100%)`,
            boxShadow: `0 0 50px rgba(232,146,10,${pulse * 0.6}), 0 0 100px rgba(212,175,55,${pulse * 0.3})`,
          }} />
        </div>

        {/* Big metallic title */}
        <div style={{
          opacity: logoOp, transform: `scale(${logoScale})`,
          textAlign: "center", marginTop: 5,
        }}>
          <Img src={staticFile("images/orion-title-metallic.png")} style={{
            height: 260,
            filter: `drop-shadow(0 0 80px rgba(212,175,55,${pulse * 0.5})) drop-shadow(0 0 150px rgba(212,175,55,${pulse * 0.25}))`,
          }} />
        </div>

        <div style={{
          width: lineW, height: 3, marginTop: 15,
          background: `linear-gradient(90deg, transparent, rgba(212,175,55,${pulse}), transparent)`,
          boxShadow: `0 0 25px rgba(212,175,55,${pulse * 0.4})`,
        }} />

        <div style={{ opacity: tagOp, marginTop: 20, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 24, fontWeight: 300,
            color: "rgba(212,175,55,0.8)", letterSpacing: 6,
            textShadow: "0 0 20px rgba(212,175,55,0.3)",
          }}>
            ELP® GREEN TECHNOLOGY
          </div>
        </div>

        <div style={{ opacity: urlOp, marginTop: 30, textAlign: "center" }}>
          <div style={{
            fontFamily: inter, fontSize: 18, fontWeight: 400,
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
          fontFamily: inter, fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: 4,
        }}>
          INPI® REGISTERED · COGNITIVE AI ENGINE · 2026
        </div>
      </div>
    </AbsoluteFill>
  );
};
