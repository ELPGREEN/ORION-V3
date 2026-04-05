import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Scale, Brain, Target, Globe, ChevronDown, Sparkles, Clock, Cpu, FileCheck } from "lucide-react";

interface NeuralContextPanelProps {
  metadata: Record<string, unknown> | null;
}

export default function NeuralContextPanel({ metadata }: NeuralContextPanelProps) {
  const [open, setOpen] = useState(false);

  if (!metadata) return null;

  const inner = (metadata.metadata as Record<string, unknown>) || {};
  const jurisprudenceCount = (inner.jurisprudenceCount as number) ?? 0;
  const knowledgeCount = (inner.knowledgeCount as number) ?? 0;
  const specializationsCount = (inner.specializationsCount as number) ?? 0;
  const externalResultsCount = (inner.externalResultsCount as number) ?? 0;
  const duration = (inner.duration as number) ?? 0;
  const promptVersionLabel = (inner.promptVersionLabel as string) || "—";
  const specializedPromptUsed = !!inner.specializedPromptUsed;
  const tripleChainUsed = !!inner.tripleChainUsed;
  const abntScore = ((inner.abntValidation as Record<string, unknown>)?.score as number) ?? null;
  const provider = (metadata.provider as string) || "—";
  const neuralEnhanced = !!metadata.neuralEnhanced;

  const hasData = jurisprudenceCount > 0 || knowledgeCount > 0 || specializationsCount > 0 || externalResultsCount > 0;
  if (!hasData && !neuralEnhanced) return null;

  const metrics = [
    { label: "Jurisprudência", value: jurisprudenceCount, icon: Scale, color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
    { label: "Base Neural", value: knowledgeCount, icon: Brain, color: "bg-purple-500/15 text-purple-400 border-purple-500/30" },
    { label: "Especializações", value: specializationsCount, icon: Target, color: "bg-primary/15 text-primary border-primary/30" },
    { label: "Fontes Externas", value: externalResultsCount, icon: Globe, color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  ];

  const durationSec = duration > 0 ? (duration / 1000).toFixed(1) : null;

  return (
    <Card className="animate-fade-in mb-4">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-400" />
            Contexto Neural Utilizado
          </CardTitle>
          {neuralEnhanced && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/40 text-[10px] gap-1">
              <Sparkles className="h-3 w-3" /> Neural Enhanced
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="grid grid-cols-2 gap-2 mb-2">
          {metrics.map((m) => (
            <div key={m.label} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${m.color}`}>
              <m.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{m.label}</span>
              <span className="ml-auto font-bold">{m.value}</span>
            </div>
          ))}
        </div>

        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full justify-center py-1">
            Detalhes técnicos
            <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground mt-2 border-t border-border pt-2">
              <div className="flex items-center gap-1.5">
                <Cpu className="h-3 w-3" /> Modelo: <span className="text-foreground font-medium">{provider}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-3 w-3" /> Prompt: <span className="text-foreground font-medium">{promptVersionLabel}</span>
              </div>
              {durationSec && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Duração: <span className="text-foreground font-medium">{durationSec}s</span>
                </div>
              )}
              {abntScore !== null && (
                <div className="flex items-center gap-1.5">
                  <FileCheck className="h-3 w-3" /> ABNT: <span className="text-foreground font-medium">{(abntScore * 100).toFixed(0)}%</span>
                </div>
              )}
              {tripleChainUsed && (
                <div className="col-span-2">
                  <Badge variant="outline" className="text-[10px]">Pipeline Triplo</Badge>
                </div>
              )}
              {specializedPromptUsed && (
                <div className="col-span-2">
                  <Badge variant="outline" className="text-[10px]">Prompt Especializado</Badge>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
