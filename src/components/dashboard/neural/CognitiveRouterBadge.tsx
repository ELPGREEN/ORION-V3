import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Brain } from "lucide-react";
import type { CognitiveRouting } from "@/lib/neural/cognitive-fast-reasoner";

const TIER_COLORS: Record<string, string> = {
  cached: "bg-muted text-muted-foreground",
  edge: "bg-green-500/20 text-[hsl(var(--tron-neon))] border-green-500/30",
  slim: "bg-blue-500/20 text-[hsl(var(--tron-info))] border-blue-500/30",
  full: "bg-purple-500/20 text-[hsl(var(--tron-neon-soft))] border-purple-500/30",
  deep: "bg-orange-500/20 text-orange-400 border-orange-500/30",
};

const TIER_LABELS: Record<string, string> = {
  cached: "Cache", edge: "Edge", slim: "Slim", full: "Full", deep: "Deep",
};

export function CognitiveRouterBadge() {
  const [routing, setRouting] = useState<CognitiveRouting | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CognitiveRouting;
      if (detail) setRouting(detail);
    };
    window.addEventListener("cognitive-routing", handler);
    return () => window.removeEventListener("cognitive-routing", handler);
  }, []);

  if (!routing) return null;

  const tierClass = TIER_COLORS[routing.tier] || TIER_COLORS.full;
  const ModeIcon = routing.mode === "fast" ? Zap : Brain;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 text-xs cursor-default ${tierClass}`}>
            <ModeIcon className="h-3 w-3" />
            {TIER_LABELS[routing.tier]} · {routing.mode === "fast" ? "Rápido" : "Analítico"}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
          <p className="font-semibold">Roteamento Cognitivo</p>
          <p>Tier: <span className="font-mono">{routing.tier}</span> | Modo: {routing.mode === "fast" ? "Sistema 1 (Rápido)" : "Sistema 2 (Analítico)"}</p>
          <p>Tokens máx: {routing.maxTokens.toLocaleString()} | Budget: {routing.latencyBudgetMs}ms</p>
          {routing.cachedPattern && <p className="text-[hsl(var(--tron-neon))]">✓ Padrão de raciocínio em cache</p>}
          <p className="text-muted-foreground">Classificado em {routing.timestamp.toFixed(1)}ms</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
