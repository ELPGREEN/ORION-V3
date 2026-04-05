import bgCarbonDashboard from "@/assets/bg-carbon-dashboard.jpg";

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
    </div>
  );
}
