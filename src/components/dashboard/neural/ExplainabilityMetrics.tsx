import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface FeatureImpact {
  name: string;
  value: number;
  impact: number; // SHAP value
}

interface ExplainabilityMetricsProps {
  prediction: number;
  baseline: number;
  features: FeatureImpact[];
  modelName: string;
}

export function ExplainabilityMetrics({ prediction, baseline, features, modelName }: ExplainabilityMetricsProps) {
  const sortedFeatures = useMemo(() =>
    [...features].sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)),
  [features]);

  const totalImpact = features.reduce((sum, f) => sum + Math.abs(f.impact), 0);

  return (
    <Card className="bg-black/40 border-primary/20 backdrop-blur-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-mono flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            NEURAL EXPLAINABILITY: {modelName}
          </CardTitle>
          <Badge variant="outline" className="font-mono text-xs">BOLT V2.0</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Prediction Summary */}
        <div className="grid grid-cols-2 gap-4 border-b border-primary/10 pb-4">
          <div>
            <p className="text-xs text-muted-foreground uppercase font-semibold">Base Value</p>
            <p className="text-xl font-mono">{(baseline * 100).toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase font-semibold">Prediction</p>
            <p className="text-xl font-mono text-primary">{(prediction * 100).toFixed(1)}%</p>
          </div>
        </div>

        {/* Feature Impact (Waterfall-like) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
            <span>FEATURE CONTRIBUTION</span>
            <span>IMPACT (Δ)</span>
          </div>

          <div className="space-y-3">
            {sortedFeatures.map((f, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Feature value: {f.value.toFixed(2)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-sm font-medium">{f.name}</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono text-xs">
                    {f.impact > 0 ? (
                      <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3 text-rose-500" />
                    )}
                    <span className={f.impact > 0 ? "text-emerald-500" : "text-rose-500"}>
                      {Math.abs(f.impact * 100).toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="relative h-2 w-full bg-primary/5 rounded-full overflow-hidden">
                  <div
                    className={`absolute h-full transition-all duration-1000 ${f.impact > 0 ? "bg-emerald-500/50" : "bg-rose-500/50"}`}
                    style={{
                      width: `${(Math.abs(f.impact) / totalImpact) * 100}%`,
                      left: '0'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 text-[10px] text-muted-foreground italic font-mono text-center">
          * Calculated via Integrated Gradients (Simulated SHAP Kernel)
        </div>
      </CardContent>
    </Card>
  );
}

export default ExplainabilityMetrics;
