import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Shield, Scale, BookOpen, AlertTriangle, RefreshCw, Loader2, Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

export interface SHAPExplanation {
  [headName: string]: {
    contribution: number;
    explanation: string;
  };
}

export interface DocumentAnalysisResult {
  documentType: string;
  area: string;
  sections: Array<{ name: string; content: string }>;
  arguments: Array<{
    text: string;
    strength: number;
    weakness: string | null;
    relatedLaw: string | null;
  }>;
  citedLegislation: string[];
  citedJurisprudence: string[];
  entities: {
    parties: string[];
    values: string[];
    dates: string[];
    processNumbers: string[];
  };
  counterArguments: Array<{
    targetArgument: string;
    suggestion: string;
    source: string;
  }>;
  strategicBriefing: string;
  neuralCorrelations: Array<{
    title: string;
    relevance: number;
    type: "jurisprudencia" | "sumula" | "doutrina";
  }>;
  processingLayers: string[];
  timings: Record<string, number>;
  shapExplanation?: SHAPExplanation;
}

interface DocumentAnalysisPanelProps {
  analysis: DocumentAnalysisResult | null;
  loading: boolean;
  fileName: string;
  onReanalyze?: () => void;
}

const typeLabels: Record<string, string> = {
  peticao_inicial: "Petição Inicial",
  contestacao: "Contestação",
  sentenca: "Sentença",
  acordao: "Acórdão",
  recurso: "Recurso",
  denuncia: "Denúncia",
  documento_generico: "Documento",
};

const areaLabels: Record<string, string> = {
  penal: "Penal",
  civil: "Civil",
  trabalhista: "Trabalhista",
  consumidor: "Consumidor",
  familia: "Família",
  tributario: "Tributário",
  geral: "Geral",
};

function strengthColor(s: number): string {
  if (s >= 0.8) return "bg-destructive";
  if (s >= 0.6) return "bg-orange-500";
  if (s >= 0.4) return "bg-yellow-500";
  return "bg-muted-foreground/40";
}

function strengthLabel(s: number): string {
  if (s >= 0.8) return "Forte";
  if (s >= 0.6) return "Médio";
  if (s >= 0.4) return "Moderado";
  return "Fraco";
}

export function DocumentAnalysisPanel({ analysis, loading, fileName, onReanalyze }: DocumentAnalysisPanelProps) {
  const [expandedArgs, setExpandedArgs] = useState<Set<number>>(new Set());
  const [showBriefing, setShowBriefing] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showSHAP, setShowSHAP] = useState(false);

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5 mt-2">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium text-primary">Deep Learning: Analisando documento...</span>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const toggleArg = (i: number) => {
    setExpandedArgs(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  return (
    <Card className="border-primary/20 bg-card mt-2">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-xs font-medium">Análise Profunda (Deep Learning)</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4">
              {typeLabels[analysis.documentType] || analysis.documentType}
            </Badge>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">
              {areaLabels[analysis.area] || analysis.area}
            </Badge>
            {analysis.timings.total_ms && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="h-2.5 w-2.5" />
                {(analysis.timings.total_ms / 1000).toFixed(1)}s
              </span>
            )}
            {onReanalyze && (
              <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={onReanalyze}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-3">
        {/* Arguments */}
        {analysis.arguments.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
              <Scale className="h-3 w-3" />
              Argumentos ({analysis.arguments.length})
            </span>
            {analysis.arguments.map((arg, i) => (
              <div key={i} className="space-y-1">
                <button
                  onClick={() => toggleArg(i)}
                  className="w-full text-left flex items-center gap-2 hover:bg-muted/30 rounded p-1 -m-1 transition-colors"
                >
                  <div className="w-14 shrink-0">
                    <Progress value={arg.strength * 100} className={`h-1.5 [&>div]:${strengthColor(arg.strength)}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-8 shrink-0">
                    {(arg.strength * 100).toFixed(0)}%
                  </span>
                  <span className="text-[11px] text-foreground truncate flex-1">{arg.text}</span>
                  {arg.weakness && <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />}
                  {expandedArgs.has(i) ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
                </button>
                {expandedArgs.has(i) && (
                  <div className="ml-6 pl-3 border-l border-border space-y-1 text-[10px]">
                    {arg.relatedLaw && (
                      <div className="text-muted-foreground">
                        <BookOpen className="h-2.5 w-2.5 inline mr-1" />
                        {arg.relatedLaw}
                      </div>
                    )}
                    {arg.weakness && (
                      <div className="text-destructive bg-destructive/5 px-2 py-1 rounded">
                        <AlertTriangle className="h-2.5 w-2.5 inline mr-1" />
                        Ponto fraco: {arg.weakness}
                      </div>
                    )}
                    <div className="text-muted-foreground">
                      Força: {strengthLabel(arg.strength)} ({(arg.strength * 100).toFixed(0)}%)
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Cited Legislation */}
        {analysis.citedLegislation.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Legislação Citada
            </span>
            <div className="flex flex-wrap gap-1">
              {analysis.citedLegislation.map((leg, i) => (
                <Badge key={i} variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal">
                  {leg}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Counter-arguments */}
        {analysis.counterArguments.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium flex items-center gap-1">
              <Shield className="h-3 w-3" />
              Contra-Argumentos da Rede Neural ({analysis.counterArguments.length})
            </span>
            {analysis.counterArguments.slice(0, 5).map((ca, i) => (
              <div key={i} className="text-[10px] bg-muted/30 border border-border rounded p-2">
                <div className="text-muted-foreground mb-0.5">→ "{ca.targetArgument}"</div>
                <div className="text-foreground">{ca.suggestion}</div>
                <span className="text-[9px] text-primary">{ca.source}</span>
              </div>
            ))}
          </div>
        )}

        {/* Strategic Briefing */}
        {analysis.strategicBriefing && (
          <Collapsible open={showBriefing} onOpenChange={setShowBriefing}>
            <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Brain className="h-3 w-3" />
              Briefing Estratégico
              {showBriefing ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 text-[10px] text-muted-foreground bg-muted/20 border border-border rounded p-2 whitespace-pre-wrap">
                {analysis.strategicBriefing}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* SHAP Interpretability (v17 iDanae) */}
        {analysis.shapExplanation && Object.keys(analysis.shapExplanation).length > 0 && (
          <Collapsible open={showSHAP} onOpenChange={setShowSHAP}>
            <CollapsibleTrigger className="flex items-center gap-1 text-[10px] text-primary hover:underline">
              <Scale className="h-3 w-3" />
              Por que este resultado? (SHAP)
              {showSHAP ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-1 space-y-1">
                {Object.entries(analysis.shapExplanation)
                  .sort(([, a], [, b]) => b.contribution - a.contribution)
                  .map(([headName, data]) => (
                    <div key={headName} className="flex items-center gap-2 text-[10px]">
                      <span className="w-20 text-muted-foreground truncate capitalize">{headName}</span>
                      <div className="flex-1 h-2 bg-muted/30 rounded overflow-hidden">
                        <div
                          className={`h-full rounded ${data.contribution > 0 ? "bg-primary" : "bg-destructive"}`}
                          style={{ width: `${Math.min(Math.abs(data.contribution) * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`w-10 text-right ${data.contribution > 0.1 ? "text-primary" : "text-muted-foreground"}`}>
                        {data.contribution > 0 ? "+" : ""}{(data.contribution * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Processing Layers */}
        <Collapsible open={showLayers} onOpenChange={setShowLayers}>
          <CollapsibleTrigger className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground">
            <Layers className="h-2.5 w-2.5" />
            Camadas processadas ({analysis.processingLayers.length})
            {showLayers ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-0.5">
              {analysis.processingLayers.map((l, i) => (
                <div key={i} className="text-[9px] text-muted-foreground font-mono">{l}</div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
