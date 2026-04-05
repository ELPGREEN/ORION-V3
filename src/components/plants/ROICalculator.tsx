import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, DollarSign, Clock, Leaf, Zap, Save } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from "recharts";
import { useToast } from "@/hooks/use-toast";

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

interface ROICalculatorProps {
  plantType: string;
}

export function ROICalculator({ plantType }: ROICalculatorProps) {
  const [config, setConfig] = useState<PlantConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [capacity, setCapacity] = useState(100);
  const [energyCostFactor, setEnergyCostFactor] = useState(1.0);
  const [laborCostFactor, setLaborCostFactor] = useState(1.0);
  const [projectionYears, setProjectionYears] = useState(5);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("plant_configurations")
        .select("*")
        .eq("plant_type", plantType)
        .eq("is_active", true)
        .maybeSingle();

      if (data) {
        const cfg = {
          ...data,
          base_investment: Number(data.base_investment),
          operating_cost_per_ton: Number(data.operating_cost_per_ton),
          revenue_per_ton: Number(data.revenue_per_ton),
          co2_offset_per_ton: Number(data.co2_offset_per_ton || 0),
          energy_recovery_kwh: Number(data.energy_recovery_kwh || 0),
          payback_months: data.payback_months ? Number(data.payback_months) : null,
          roi_annual_pct: data.roi_annual_pct ? Number(data.roi_annual_pct) : null,
          certifications: Array.isArray(data.certifications) ? data.certifications as string[] : [],
          markets: data.markets || [],
        };
        setConfig(cfg);
        setCapacity(cfg.default_capacity);
      }
      setLoading(false);
    }
    load();
  }, [plantType]);

  const calculations = useMemo(() => {
    if (!config) return null;

    const monthlyTons = capacity;
    const annualTons = monthlyTons * 12;
    const adjustedOpCost = config.operating_cost_per_ton * energyCostFactor * laborCostFactor;
    const monthlyRevenue = monthlyTons * config.revenue_per_ton;
    const monthlyOpCost = monthlyTons * adjustedOpCost;
    const monthlyProfit = monthlyRevenue - monthlyOpCost;
    const annualRevenue = monthlyRevenue * 12;
    const annualOpCost = monthlyOpCost * 12;
    const annualProfit = monthlyProfit * 12;
    const investment = config.base_investment * (capacity / config.default_capacity);

    const roi = annualProfit > 0 ? (annualProfit / investment) * 100 : 0;
    const paybackMonths = monthlyProfit > 0 ? Math.ceil(investment / monthlyProfit) : Infinity;

    // NPV with 10% discount rate
    const discountRate = 0.10;
    let npv = -investment;
    for (let y = 1; y <= projectionYears; y++) {
      npv += annualProfit / Math.pow(1 + discountRate, y);
    }

    // IRR approximation (Newton's method)
    let irr = 0.15;
    for (let i = 0; i < 50; i++) {
      let npvCalc = -investment;
      let dNpv = 0;
      for (let y = 1; y <= projectionYears; y++) {
        const factor = Math.pow(1 + irr, y);
        npvCalc += annualProfit / factor;
        dNpv -= y * annualProfit / (factor * (1 + irr));
      }
      if (Math.abs(dNpv) < 0.001) break;
      irr = irr - npvCalc / dNpv;
      if (Math.abs(npvCalc) < 100) break;
    }

    const co2Annual = annualTons * config.co2_offset_per_ton;
    const energyAnnual = annualTons * config.energy_recovery_kwh;

    // Projection data
    const projection = [];
    let cumulativeCost = investment;
    let cumulativeRevenue = 0;
    for (let m = 1; m <= projectionYears * 12; m++) {
      cumulativeCost += monthlyOpCost;
      cumulativeRevenue += monthlyRevenue;
      if (m % 3 === 0) {
        projection.push({
          month: m,
          label: `M${m}`,
          revenue: Math.round(cumulativeRevenue),
          cost: Math.round(cumulativeCost),
          profit: Math.round(cumulativeRevenue - cumulativeCost),
        });
      }
    }

    return {
      investment, monthlyRevenue, monthlyOpCost, monthlyProfit,
      annualRevenue, annualOpCost, annualProfit,
      roi, paybackMonths, npv, irr: irr * 100,
      co2Annual, energyAnnual, projection,
    };
  }, [config, capacity, energyCostFactor, laborCostFactor, projectionYears]);

  const handleSave = async () => {
    if (!calculations || !config) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Login required", description: "Please sign in to save studies.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("feasibility_studies").insert({
        created_by: user.id,
        study_name: `${config.name} - ${capacity}t/month`,
        plant_type: plantType,
        daily_capacity_tons: capacity / 30,
        total_investment: calculations.investment,
        annual_revenue: calculations.annualRevenue,
        annual_opex: calculations.annualOpCost,
        annual_ebitda: calculations.annualProfit,
        payback_months: calculations.paybackMonths === Infinity ? null : calculations.paybackMonths,
        roi_percentage: calculations.roi,
        npv_10_years: calculations.npv,
        irr_percentage: calculations.irr,
        status: "draft",
      });

      if (error) throw error;
      toast({ title: "Study saved!", description: "Your feasibility study has been saved." });
    } catch (err) {
      console.error("Save error:", err);
      toast({ title: "Error", description: "Could not save study.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!config || !calculations) {
    return (
      <div className="p-6 bg-card border border-border rounded-lg text-center">
        <p className="text-muted-foreground">Configuration not available for this plant type.</p>
      </div>
    );
  }

  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-2xl font-bold text-foreground">ROI Calculator</h3>
        <p className="text-muted-foreground mt-1">{config.name}</p>
        <div className="flex gap-2 justify-center mt-3 flex-wrap">
          {config.certifications.map((c) => (
            <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
          ))}
        </div>
      </div>

      {/* Controls */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="flex justify-between">
              <span>Monthly Capacity</span>
              <span className="font-bold text-primary">{capacity} tons/month</span>
            </Label>
            <Slider
              value={[capacity]}
              onValueChange={([v]) => setCapacity(v)}
              min={Math.round(config.default_capacity * 0.2)}
              max={config.max_capacity}
              step={10}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex justify-between">
                <span>Energy Cost Factor</span>
                <span className="font-medium">{energyCostFactor.toFixed(1)}×</span>
              </Label>
              <Slider
                value={[energyCostFactor * 10]}
                onValueChange={([v]) => setEnergyCostFactor(v / 10)}
                min={5}
                max={20}
                step={1}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex justify-between">
                <span>Labor Cost Factor</span>
                <span className="font-medium">{laborCostFactor.toFixed(1)}×</span>
              </Label>
              <Slider
                value={[laborCostFactor * 10]}
                onValueChange={([v]) => setLaborCostFactor(v / 10)}
                min={5}
                max={20}
                step={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Projection Period: {projectionYears} years</Label>
            <Slider
              value={[projectionYears]}
              onValueChange={([v]) => setProjectionYears(v)}
              min={3}
              max={10}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-green-500" />
            <p className="text-xs text-muted-foreground">Annual ROI</p>
            <p className="text-xl font-bold text-green-500">{calculations.roi.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-blue-500" />
            <p className="text-xs text-muted-foreground">Payback</p>
            <p className="text-xl font-bold text-blue-500">
              {calculations.paybackMonths === Infinity ? "N/A" : `${calculations.paybackMonths}m`}
            </p>
          </CardContent>
        </Card>
        <Card className="border-purple-500/30 bg-purple-500/5">
          <CardContent className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto mb-2 text-purple-500" />
            <p className="text-xs text-muted-foreground">NPV ({projectionYears}y)</p>
            <p className="text-xl font-bold text-purple-500">{fmt(calculations.npv)}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto mb-2 text-amber-500" />
            <p className="text-xs text-muted-foreground">IRR</p>
            <p className="text-xl font-bold text-amber-500">{calculations.irr.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Investment</p>
            <p className="text-lg font-bold">{fmt(calculations.investment)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
            <p className="text-lg font-bold text-green-500">{fmt(calculations.monthlyRevenue)}</p>
            <p className="text-xs text-muted-foreground">Cost: {fmt(calculations.monthlyOpCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Monthly Profit</p>
            <p className={`text-lg font-bold ${calculations.monthlyProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {fmt(calculations.monthlyProfit)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Environmental Impact */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-emerald-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Leaf className="h-8 w-8 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">CO₂ Offset (Annual)</p>
              <p className="text-lg font-bold text-emerald-500">{calculations.co2Annual.toLocaleString()} tons</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20">
          <CardContent className="p-4 flex items-center gap-3">
            <Zap className="h-8 w-8 text-yellow-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Energy Recovery (Annual)</p>
              <p className="text-lg font-bold text-yellow-500">{(calculations.energyAnnual / 1000).toFixed(0)} MWh</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projection Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Financial Projection ({projectionYears} Years)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={calculations.projection}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `€${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => fmt(value)}
                  labelFormatter={(label) => `Month ${label.replace("M", "")}`}
                />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.1} name="Cumulative Revenue" />
                <Area type="monotone" dataKey="cost" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Cumulative Cost" />
                <Line type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2} dot={false} name="Net Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-center">
        <Button onClick={handleSave} disabled={saving} size="lg" className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Feasibility Study
        </Button>
      </div>
    </div>
  );
}