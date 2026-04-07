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
      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-background/75" />

      {/* Volumetric light beams */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 20% 10%, hsl(var(--secondary) / 0.04) 0%, transparent 60%),
            radial-gradient(ellipse 50% 50% at 80% 90%, hsl(var(--primary) / 0.03) 0%, transparent 50%)
          `,
        }}
      />

      {/* Corner vignette for cinematic depth */}
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at center, transparent 40%, hsl(var(--background) / 0.6) 100%)",
        }}
      />

      {/* Subtle scanline overlay for HD tech feel */}
      <div
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--secondary) / 0.008) 2px, hsl(var(--secondary) / 0.008) 3px)",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
