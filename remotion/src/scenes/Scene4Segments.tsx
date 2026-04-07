import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Orbitron";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: orbitron } = loadFont("normal", { weights: ["700"], subsets: ["latin"] });
const { fontFamily: inter } = loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] });

const segments = [
  { icon: "⚖️", title: "Advogados", desc: "IA jurídica, petições, gestão processual" },
  { icon: "🛒", title: "Produtores Digitais", desc: "Loja, checkout, páginas de venda" },
  { icon: "🤝", title: "Afiliados", desc: "Links rastreáveis, comissões automáticas" },
  { icon: "🏭", title: "Indústria", desc: "Robótica, automação, Indústria 4.0" },
];

export const Scene4Segments = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#06080e", padding: "80px 100px" }}>
      {/* Title */}
      <div style={{ opacity: titleOpacity, textAlign: "center", marginBottom: 50 }}>
        <span style={{
          fontFamily: orbitron, fontSize: 42, fontWeight: 700,
          color: "white", letterSpacing: 4,
        }}>
          4 Soluções. 1 Plataforma.
        </span>
      </div>

      {/* Segment cards */}
      <div style={{ display: "flex", gap: 32, justifyContent: "center" }}>
        {segments.map((seg, i) => {
          const delay = 20 + i * 18;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15, stiffness: 140 } });
          const yOffset = interpolate(s, [0, 1], [80, 0]);
          const cardOpacity = interpolate(s, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
          const borderGlow = Math.sin((frame - delay) * 0.05) * 0.15 + 0.25;

          return (
            <div key={i} style={{
              flex: 1, maxWidth: 380,
              opacity: cardOpacity,
              transform: `translateY(${yOffset}px)`,
              border: `1px solid rgba(0,212,255,${borderGlow})`,
              background: "rgba(6,8,14,0.9)",
              padding: "48px 32px",
              textAlign: "center",
              position: "relative",
            }}>
              {/* Corner accents */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 16, height: 16, borderTop: "2px solid #00d4ff", borderLeft: "2px solid #00d4ff" }} />
              <div style={{ position: "absolute", bottom: 0, right: 0, width: 16, height: 16, borderBottom: "2px solid #00d4ff", borderRight: "2px solid #00d4ff" }} />

              <span style={{ fontSize: 52 }}>{seg.icon}</span>
              <div style={{
                fontFamily: orbitron, fontSize: 22, fontWeight: 700,
                color: "white", letterSpacing: 2, marginTop: 20,
              }}>
                {seg.title}
              </div>
              <div style={{
                fontFamily: inter, fontSize: 15, fontWeight: 400,
                color: "rgba(255,255,255,0.5)", marginTop: 12,
                lineHeight: 1.6,
              }}>
                {seg.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
