import bgCarbonDashboard from "@/assets/bg-carbon-dashboard.jpg";

/** Hexagonal circuit pattern SVG — inspired by circuit board references */
function HexCircuitPattern() {
  // Create a subtle hex grid with circuit traces
  const hexSize = 30;
  const rows = 6;
  const cols = 12;

  const hexPoints = (cx: number, cy: number, r: number) => {
    return Array.from({ length: 6 }, (_, i) => {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
    }).join(" ");
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.025 }}
      preserveAspectRatio="xMidYMid slice"
    >
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: cols }, (_, col) => {
          const x = col * hexSize * 1.75 + (row % 2 ? hexSize * 0.875 : 0);
          const y = row * hexSize * 1.5 + 20;
          const show = (row + col) % 3 !== 0; // skip some for organic feel
          if (!show) return null;
          return (
            <polygon
              key={`${row}-${col}`}
              points={hexPoints(x, y, hexSize * 0.45)}
              fill="none"
              stroke="hsl(195 90% 50%)"
              strokeWidth={0.5}
            />
          );
        })
      )}
      {/* Circuit trace connections between hexes */}
      {Array.from({ length: 8 }, (_, i) => {
        const x1 = 40 + i * 80;
        const y1 = 30 + (i % 3) * 50;
        const x2 = x1 + 60 + (i % 2) * 40;
        const y2 = y1 + (i % 2 ? 30 : -20);
        return (
          <g key={`trace-${i}`}>
            <line
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i % 2 === 0 ? "hsl(195 90% 50%)" : "hsl(42 70% 50%)"}
              strokeWidth={0.5}
              strokeDasharray="3 6"
            />
            <circle cx={x1} cy={y1} r={2} fill={i % 2 === 0 ? "hsl(195 90% 50%)" : "hsl(42 70% 50%)"} opacity={0.5} />
          </g>
        );
      })}
    </svg>
  );
}

function HudRings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Central concentric rings — subtle, bottom-right offset */}
      <div
        className="absolute"
        style={{ right: "-10%", bottom: "-15%", width: 700, height: 700 }}
      >
        {[280, 220, 160, 100].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size,
              left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              border: `1px solid ${i % 2 === 0 ? "rgba(0,188,212,0.06)" : "rgba(212,175,55,0.04)"}`,
              animation: `hud-spin-${i % 2 === 0 ? "cw" : "ccw"} ${80 + i * 20}s linear infinite`,
            }}
          >
            {Array.from({ length: 8 + i * 4 }).map((_, t) => {
              const angle = (t / (8 + i * 4)) * 360;
              return (
                <div
                  key={t}
                  className="absolute"
                  style={{
                    width: 1, height: t % 4 === 0 ? 8 : 4,
                    background: i % 2 === 0 ? "rgba(0,188,212,0.12)" : "rgba(212,175,55,0.08)",
                    top: 0, left: "50%",
                    transformOrigin: `0 ${size / 2}px`,
                    transform: `rotate(${angle}deg)`,
                  }}
                />
              );
            })}
          </div>
        ))}
        {/* Core glow */}
        <div
          className="absolute rounded-full"
          style={{
            width: 40, height: 40, left: "50%", top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(0,188,212,0.08) 0%, transparent 70%)",
            boxShadow: "0 0 40px rgba(0,188,212,0.05)",
          }}
        />
      </div>

      {/* Top-left small ring cluster */}
      <div className="absolute" style={{ left: "5%", top: "8%" }}>
        {[50, 35].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size, height: size, left: "50%", top: "50%",
              transform: "translate(-50%, -50%)",
              border: `1px solid rgba(212,175,55,${0.06 - i * 0.02})`,
              animation: `hud-spin-cw ${40 + i * 15}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Circuit lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <line x1="0" y1="56" x2="100%" y2="56" stroke="hsl(195 90% 50%)" strokeWidth="1" strokeDasharray="6 12" />
        <line x1="60%" y1="100%" x2="100%" y2="100%" stroke="hsl(42 70% 50%)" strokeWidth="1" />
        <line x1="98%" y1="0" x2="98%" y2="30%" stroke="hsl(195 90% 50%)" strokeWidth="1" strokeDasharray="2 8" />
        {/* Additional diagonal trace */}
        <line x1="0" y1="70%" x2="25%" y2="50%" stroke="hsl(195 90% 50%)" strokeWidth="0.5" strokeDasharray="4 8" opacity="0.5" />
      </svg>

      {/* Corner brackets */}
      {[
        { top: 12, right: 12 },
        { bottom: 12, right: 12 },
        { top: 12, left: 12 },
        { bottom: 12, left: 12 },
      ].map((pos, i) => {
        const isRight = "right" in pos;
        const isBottom = "bottom" in pos;
        return (
          <div
            key={i}
            className="absolute"
            style={{
              ...pos,
              width: 20, height: 20,
              borderTop: isBottom ? "none" : "1px solid rgba(0,188,212,0.08)",
              borderBottom: isBottom ? "1px solid rgba(0,188,212,0.08)" : "none",
              borderLeft: isRight ? "none" : "1px solid rgba(0,188,212,0.08)",
              borderRight: isRight ? "1px solid rgba(0,188,212,0.08)" : "none",
            }}
          />
        );
      })}

      {/* Scanline overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,188,212,0.008) 3px, rgba(0,188,212,0.008) 4px)",
        }}
      />
    </div>
  );
}

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
      <img
        src={bgCarbonDashboard}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        width={1920}
        height={1080}
      />
      <div className="absolute inset-0 bg-background/70" />

      {/* Hex circuit pattern — positioned behind content area */}
      <div className="absolute" style={{ left: "18rem", top: 0, right: 0, bottom: 0 }}>
        <HexCircuitPattern />
      </div>

      <HudRings />

      {/* Ambient energy glow spots */}
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-secondary/[0.02] blur-[120px]" />
      <div className="absolute bottom-1/3 left-1/3 w-[200px] h-[200px] rounded-full bg-primary/[0.015] blur-[100px]" />

      <style>{`
        @keyframes hud-spin-cw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes hud-spin-ccw {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(-360deg); }
        }
      `}</style>
    </div>
  );
}
