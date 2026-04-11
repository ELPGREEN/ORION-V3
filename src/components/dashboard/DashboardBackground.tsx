import bgHdDashboard from "@/assets/bg-hd-dashboard.jpg";

export function DashboardBackground() {
  return (
    <div className="fixed inset-0 z-0" style={{ pointerEvents: "none" }}>
      {/* HD photorealistic background */}
      <img
        src={bgHdDashboard}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        width={1920}
        height={1080}
      />
      {/* Deep dark overlay — premium depth */}
      <div className="absolute inset-0 bg-background/80" />

      {/* Multi-layer ambient light */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 15% 20%, hsl(var(--secondary) / 0.06) 0%, transparent 60%),
            radial-gradient(ellipse 60% 60% at 85% 80%, hsl(var(--primary) / 0.04) 0%, transparent 50%),
            radial-gradient(ellipse 40% 30% at 50% 50%, hsl(var(--primary) / 0.02) 0%, transparent 40%)
          `,
        }}
      />

      {/* Premium vignette — cinematic depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 30%, hsl(var(--background) / 0.7) 100%)",
        }}
      />

      {/* Glass noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)'/%3E%3C/svg%3E")`,
          mixBlendMode: "overlay",
        }}
      />

      {/* Subtle horizontal light ray */}
      <div
        className="absolute top-[30%] left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 5%, hsl(var(--primary) / 0.06) 30%, hsl(var(--primary) / 0.12) 50%, hsl(var(--primary) / 0.06) 70%, transparent 95%)",
          boxShadow: "0 0 30px 2px hsl(var(--primary) / 0.04)",
        }}
      />
    </div>
  );
}
