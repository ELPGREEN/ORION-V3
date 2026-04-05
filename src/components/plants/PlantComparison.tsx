import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Trophy } from "lucide-react";
import { Link } from "react-router-dom";

interface PlantConfig {
  id: string;
  plant_type: string;
  name: string;
  base_investment: number;
  operating_cost_per_ton: number;
  revenue_per_ton: number;
  default_capacity: number;
  max_capacity: number;
  payback_months: number | null;
  roi_annual_pct: number | null;
  co2_offset_per_ton: number;
  energy_recovery_kwh: number;
  certifications: string[];
  markets: string[];
}

const plantRoutes: Record<string, string> = {
  pyrolysis: "/plants/pyrolysis",
  otr: "/plants/otr",
  "tire-recycling": "/plants/tire-recycling",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function PlantComparison() {
  const [plants, setPlants] = useState<PlantConfig[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("plant_configurations")
        .select("*")
        .eq("is_active", true)
        .order("base_investment", { ascending: true });

      if (data) {
        setPlants(
          data.map((d) => ({
            ...d,
            base_investment: Number(d.base_investment),
            operating_cost_per_ton: Number(d.operating_cost_per_ton),
            revenue_per_ton: Number(d.revenue_per_ton),
            co2_offset_per_ton: Number(d.co2_offset_per_ton || 0),
            energy_recovery_kwh: Number(d.energy_recovery_kwh || 0),
            payback_months: d.payback_months ? Number(d.payback_months) : null,
            roi_annual_pct: d.roi_annual_pct ? Number(d.roi_annual_pct) : null,
            certifications: Array.isArray(d.certifications) ? (d.certifications as string[]) : [],
            markets: d.markets || [],
          }))
        );
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (plants.length === 0) {
    return (
      <div className="p-8 bg-card border border-border rounded-lg text-center">
        <p className="text-muted-foreground">No plant configurations available.</p>
      </div>
    );
  }

  // Find best per metric
  const bestROI = plants.reduce((a, b) => ((a.roi_annual_pct ?? 0) > (b.roi_annual_pct ?? 0) ? a : b)).id;
  const bestPayback = plants.reduce((a, b) => ((a.payback_months ?? 999) < (b.payback_months ?? 999) ? a : b)).id;
  const bestCO2 = plants.reduce((a, b) => (a.co2_offset_per_ton > b.co2_offset_per_ton ? a : b)).id;
  const bestInvestment = plants.reduce((a, b) => (a.base_investment < b.base_investment ? a : b)).id;

  const rows: { label: string; getValue: (p: PlantConfig) => string; getBest: string }[] = [
    { label: "Investment", getValue: (p) => fmt(p.base_investment), getBest: bestInvestment },
    { label: "Operating Cost", getValue: (p) => `${fmt(p.operating_cost_per_ton)}/ton`, getBest: "" },
    { label: "Revenue", getValue: (p) => `${fmt(p.revenue_per_ton)}/ton`, getBest: "" },
    { label: "Capacity", getValue: (p) => `${p.default_capacity}-${p.max_capacity} t/mo`, getBest: "" },
    { label: "Annual ROI", getValue: (p) => `${p.roi_annual_pct ?? "N/A"}%`, getBest: bestROI },
    { label: "Payback", getValue: (p) => p.payback_months ? `${p.payback_months} months` : "N/A", getBest: bestPayback },
    { label: "CO₂ Offset", getValue: (p) => `${p.co2_offset_per_ton} t/ton`, getBest: bestCO2 },
    { label: "Energy Recovery", getValue: (p) => `${p.energy_recovery_kwh} kWh/ton`, getBest: "" },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-2xl">Plant Comparison</CardTitle>
        <p className="text-muted-foreground text-sm">Side-by-side comparison of ELP recycling technologies</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left p-4 font-medium text-muted-foreground w-40">Metric</th>
                {plants.map((p) => (
                  <th key={p.id} className="p-4 text-center font-semibold">
                    <div className="space-y-2">
                      <div className="text-base">{p.name.replace("ELP ", "")}</div>
                      <div className="flex gap-1 justify-center flex-wrap">
                        {p.markets.slice(0, 3).map((m) => (
                          <Badge key={m} variant="outline" className="text-[10px] px-1.5 py-0">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.label} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="p-4 font-medium text-muted-foreground">{row.label}</td>
                  {plants.map((p) => (
                    <td key={p.id} className="p-4 text-center">
                      <span className={`font-medium ${row.getBest === p.id ? "text-primary font-bold" : ""}`}>
                        {row.getValue(p)}
                      </span>
                      {row.getBest === p.id && (
                        <Trophy className="h-3.5 w-3.5 inline ml-1.5 text-primary" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-border">
                <td className="p-4 font-medium text-muted-foreground">Certifications</td>
                {plants.map((p) => (
                  <td key={p.id} className="p-4 text-center">
                    <div className="flex gap-1 justify-center flex-wrap">
                      {p.certifications.map((c) => (
                        <Badge key={c} variant="secondary" className="text-[10px]">{c}</Badge>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 border-t border-border">
          {plants.map((p) => (
            <Button key={p.id} variant="outline" className="gap-2" asChild>
              <Link to={plantRoutes[p.plant_type] || "#"}>
                {p.name.replace("ELP ", "")}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}