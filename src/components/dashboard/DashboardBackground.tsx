import bgCarbonDashboard from "@/assets/bg-carbon-dashboard.jpg";

function HudRings() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Central concentric rings — subtle, bottom-right offset */}
      <div
        className="absolute"
        style={{
          right: "-10%",
          bottom: "-15%",
          width: 700,
          height: 700,
        }}
      >
        {[280, 220, 160, 100].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              border: `1px solid ${i % 2 === 0 ? "rgba(0,188,212,0.06)" : "rgba(212,175,55,0.04)"}`,
              animation: `hud-spin-${i % 2 === 0 ? "cw" : "ccw"} ${80 + i * 20}s linear infinite`,
            }}
          >
            {/* Tick marks */}
            {Array.from({ length: 8 + i * 4 }).map((_, t) => {
              const angle = (t / (8 + i * 4)) * 360;
              return (
                <div
                  key={t}
                  className="absolute"
                  style={{
                    width: 1,
                    height: t % 4 === 0 ? 8 : 4,
                    background: i % 2 === 0 ? "rgba(0,188,212,0.12)" : "rgba(212,175,55,0.08)",
                    top: 0,
                    left: "50%",
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
            width: 40,
            height: 40,
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            background: "radial-gradient(circle, rgba(0,188,212,0.08) 0%, transparent 70%)",
            boxShadow: "0 0 40px rgba(0,188,212,0.05)",
          }}
        />
      </div>

      {/* Top-left small ring cluster */}
      <div
        className="absolute"
        style={{ left: "5%", top: "8%" }}
      >
        {[50, 35].map((size, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              border: `1px solid rgba(212,175,55,${0.06 - i * 0.02})`,
              animation: `hud-spin-cw ${40 + i * 15}s linear infinite`,
            }}
          />
        ))}
      </div>

      {/* Horizontal circuit lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        {/* Top bar */}
        <line x1="0" y1="56" x2="100%" y2="56" stroke="hsl(195 90% 50%)" strokeWidth="1" strokeDasharray="6 12" />
        {/* Bottom accent */}
        <line x1="60%" y1="100%" x2="100%" y2="100%" stroke="hsl(42 70% 50%)" strokeWidth="1" />
        {/* Vertical accent right */}
        <line x1="98%" y1="0" x2="98%" y2="30%" stroke="hsl(195 90% 50%)" strokeWidth="1" strokeDasharray="2 8" />
      </svg>

      {/* Corner brackets */}
      {[
        { top: 12, right: 12 },
        { bottom: 12, right: 12 },
      ].map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            ...pos,
            width: 24,
            height: 24,
            borderTop: "top" in pos ? "1px solid rgba(0,188,212,0.1)" : "none",
            borderBottom: "bottom" in pos ? "1px solid rgba(0,188,212,0.1)" : "none",
            borderRight: "1px solid rgba(0,188,212,0.1)",
          }}
        />
      ))}

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
      <HudRings />

      {/* CSS animations for HUD rings */}
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
