import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// Local types (previously from neural modules)
interface ReviewIssue {
  id: string;
  type: "error" | "warning" | "suggestion";
  title: string;
  description: string;
  fix?: string;
  location?: string;
  excerpt: string;
  category?: string;
  confidence?: number;
}
interface NeuralMetrics {
  coherence: number;
  completeness: number;
  legalAccuracy: number;
}

import {
  AlertTriangle, AlertCircle, Lightbulb, CheckCircle2, Loader2,
  ChevronDown, ChevronUp, Brain, Scale, RefreshCw, Activity, XCircle, Clock,
  Zap,
} from "lucide-react";
// [REMOVED] import type { ReviewIssue, NeuralMetrics } from "@/hooks/useAIRealtimeReview";

// ─── Review Issues Panel ───

interface AIReviewPanelProps {
  issues: ReviewIssue[];
  loading: boolean;
  neuralMetrics?: NeuralMetrics;
  onRefresh: () => void | Promise<void>;
  onApplyFix?: (issue: ReviewIssue) => void;
  onApplyAllSafe?: () => void;
}

const ISSUE_ICONS: Record<string, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  suggestion: Lightbulb,
};

const ISSUE_COLORS: Record<string, string> = {
  error: "text-destructive border-destructive/20 bg-destructive/5",
  warning: "text-warning border-warning/20 bg-warning/5",
  suggestion: "text-accent-foreground border-accent/20 bg-accent/5",
};

const CATEGORY_LABELS: Record<string, string> = {
  grammar: "Gramática",
  legal: "Jurídico",
  structure: "Estrutura",
  consistency: "Consistência",
  style: "Estilo",
};

const HEAD_SOURCE_LABELS: Record<string, string> = {
  "grammar-agent": "Revisor",
  "legal-agent": "Pesquisador",
  "structure-agent": "Formatador",
  "llm-judge": "Avaliador IA",
  revisor: "Revisor",
  pesquisador: "Pesquisador",
  formatador: "Formatador",
};

const COOLDOWN_MS = 10_000;

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  return `${Math.floor(minutes / 60)}h atrás`;
}

export function AIReviewPanel({ issues, loading, neuralMetrics, onRefresh, onApplyFix, onApplyAllSafe }: AIReviewPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showMetrics, setShowMetrics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const retryCountRef = useRef(0);

  const errors = issues.filter(i => i.type === "error");
  const warnings = issues.filter(i => i.type === "warning");
  const suggestions = issues.filter(i => i.type === "suggestion");
  const safeCount = issues.filter(i => i.excerpt && Boolean((i.replacementText || i.fix)?.trim())).length;

  const handleRefresh = async () => {
    if (cooldown || loading) return;
    setError(null);
    try {
      await onRefresh();
      setLastAnalyzedAt(new Date());
      retryCountRef.current = 0;
    } catch (err: any) {
      retryCountRef.current++;
      const msg = retryCountRef.current >= 3
        ? "Falha persistente. Verifique sua conexão e tente novamente em instantes."
        : `Falha ao reanalisar. Tentativa ${retryCountRef.current}/3.`;
      setError(msg);
    } finally {
      setCooldown(true);
      setTimeout(() => setCooldown(false), COOLDOWN_MS);
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <Brain className="h-3 w-3 text-primary/60" />
          <span className="font-medium">Revisão IA em Tempo Real</span>
          {loading && <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />}
        </div>
        <div className="flex items-center gap-1">
          {errors.length > 0 && (
            <Badge variant="destructive" className="text-[7px] h-3.5 px-1">{errors.length}</Badge>
          )}
          {warnings.length > 0 && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-warning/30 text-warning">{warnings.length}</Badge>
          )}
          {suggestions.length > 0 && (
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-accent/30 text-accent-foreground">{suggestions.length}</Badge>
          )}
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-b border-border/30">
          {/* Error state */}
          {error && (
            <div className="px-3 py-2 flex items-center gap-1.5 bg-destructive/5 border-b border-destructive/10">
              <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-[10px] text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[8px] px-1.5 text-destructive"
                onClick={handleRefresh}
                disabled={cooldown || loading}
              >
                {cooldown ? "Aguarde..." : "Tentar de novo"}
              </Button>
            </div>
          )}

          {issues.length === 0 && !loading && !error && (
            <div className="px-3 py-4 flex flex-col items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <p className="text-[10px] text-muted-foreground">Nenhum problema detectado</p>
            </div>
          )}

          {issues.length === 0 && loading && (
            <div className="px-3 py-4 flex flex-col items-center gap-1.5">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Analisando documento...</p>
            </div>
          )}

          {/* Apply All Safe button */}
          {safeCount > 1 && onApplyAllSafe && (
            <div className="px-2 py-1.5 border-b border-border/20">
              <Button
                variant="outline"
                size="sm"
                className="w-full h-6 text-[9px] gap-1"
                onClick={onApplyAllSafe}
              >
                <Zap className="h-3 w-3" />
                Aplicar {safeCount} correções seguras
              </Button>
            </div>
          )}

          {issues.length > 0 && (
            <ScrollArea className="max-h-[350px]">
              <div className="p-2 space-y-1.5">
                {issues.map((issue) => {
                  const Icon = ISSUE_ICONS[issue.type] || Lightbulb;
                  const color = ISSUE_COLORS[issue.type] || ISSUE_COLORS.suggestion;
                  const hasReplacement = Boolean((issue.replacementText || issue.fix)?.trim());
                  const canApply = issue.autoApplicable && issue.excerpt && hasReplacement;
                  return (
                    <div key={issue.id} className={`p-2 rounded border ${color}`}>
                      <div className="flex items-start gap-1.5">
                        <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1 mb-0.5">
                            <Badge variant="outline" className="text-[7px] h-3 px-1 border-current/20">
                              {CATEGORY_LABELS[issue.category] || issue.category}
                            </Badge>
                            {issue.confidence !== undefined && (
                              <span className="text-[7px] opacity-50 ml-auto">
                                {Math.round(issue.confidence * 100)}%
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] font-medium leading-tight">{issue.message}</p>
                          {issue.excerpt && (
                            <p className="text-[9px] opacity-60 mt-0.5 italic truncate">"{issue.excerpt}"</p>
                          )}
                          {hasReplacement && (
                            <div className="flex items-center gap-1 mt-1">
                              <p className="text-[9px] opacity-70 flex-1 truncate">
                                💡 {issue.replacementText || issue.fix}
                              </p>
                              {onApplyFix && hasReplacement && issue.excerpt && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 text-[8px] px-1 shrink-0"
                                  onClick={() => onApplyFix(issue)}
                                  title={canApply ? "Aplicar automaticamente" : "Tentar aplicar (pode precisar ajuste manual)"}
                                >
                                  {canApply ? "Aplicar" : "Tentar"}
                                </Button>
                              )}
                              {!hasReplacement && (
                                <span className="text-[7px] text-muted-foreground/60 shrink-0">
                                  Ajuste manual
                                </span>
                              )}
                            </div>
                          )}
                          {issue.headSource && (
                            <span className="text-[7px] opacity-40 mt-0.5 block">
                              via {HEAD_SOURCE_LABELS[issue.headSource] || issue.headSource}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          {/* Painel de Métricas de Qualidade */}
          {neuralMetrics && neuralMetrics.overallScore !== undefined && (
            <div className="px-2 py-1.5 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-5 text-[8px] text-muted-foreground gap-1 mb-1"
                onClick={() => setShowMetrics(!showMetrics)}
              >
                <Activity className="h-2.5 w-2.5" />
                {showMetrics ? "Ocultar Métricas de Qualidade" : "Métricas de Qualidade"}
                {showMetrics ? <ChevronUp className="h-2.5 w-2.5 ml-auto" /> : <ChevronDown className="h-2.5 w-2.5 ml-auto" />}
              </Button>
              {showMetrics && (
                <div className="space-y-1.5 px-1 pb-1">
                  {[
                    { label: "Gramática", value: neuralMetrics.grammarScore, color: "bg-primary" },
                    { label: "Jurídico", value: neuralMetrics.legalScore, color: "bg-secondary" },
                    { label: "Estrutura", value: neuralMetrics.structureScore, color: "bg-warning" },
                    { label: "Consistência", value: neuralMetrics.consistencyScore, color: "bg-accent" },
                    { label: "Estilo", value: neuralMetrics.styleScore, color: "bg-muted-foreground" },
                  ].map(({ label, value, color }) => value !== undefined && (
                    <div key={label} className="space-y-0.5">
                      <div className="flex justify-between text-[8px] text-muted-foreground">
                        <span>{label}</span>
                        <span className="font-mono">{value}/100</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Coerência de Longo Alcance */}
                  {neuralMetrics.mambaCoherence !== undefined && (
                    <div className="pt-1 mt-1 border-t border-border/20">
                      <p className="text-[8px] text-muted-foreground font-medium mb-1">🐍 Coerência de Longo Alcance</p>
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-[8px] text-muted-foreground">
                          <span>Coerência</span>
                          <span className="font-mono">{Math.round((neuralMetrics.mambaCoherence || 0) * 100)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${(neuralMetrics.mambaCoherence || 0) * 100}%` }}
                          />
                        </div>
                      </div>
                      {neuralMetrics.longRangeDeps !== undefined && (
                        <div className="space-y-0.5 mt-1">
                          <div className="flex justify-between text-[8px] text-muted-foreground">
                            <span>Dependências de Longo Alcance</span>
                            <span className="font-mono">{Math.round((neuralMetrics.longRangeDeps || 0) * 100)}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-secondary transition-all duration-500"
                              style={{ width: `${(neuralMetrics.longRangeDeps || 0) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {neuralMetrics.documentComplexity && (
                        <div className="flex justify-between text-[8px] mt-0.5">
                          <span className="text-muted-foreground">Complexidade</span>
                          <Badge variant="outline" className="text-[7px] h-3 px-1">
                            {neuralMetrics.documentComplexity}
                          </Badge>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Avaliação de Qualidade Jurídica */}
                  {neuralMetrics.judgeGrade && (
                    <div className="pt-1 mt-1 border-t border-border/20">
                      <p className="text-[8px] text-muted-foreground font-medium mb-1">⚖️ Avaliação de Qualidade Jurídica</p>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1">
                          <Scale className="h-3 w-3 text-primary/60" />
                          <span className="text-[9px] font-bold">Nota: {neuralMetrics.judgeGrade}</span>
                        </div>
                        <span className={`text-[9px] font-mono ${
                          (neuralMetrics.judgeScore || 0) >= 75 ? "text-primary" :
                          (neuralMetrics.judgeScore || 0) >= 50 ? "text-warning" :
                          "text-destructive"
                        }`}>{neuralMetrics.judgeScore}/100</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[7px] h-3.5 px-1">
                          📜 {neuralMetrics.citationCount || 0} citações
                        </Badge>
                        {(neuralMetrics.biasWarningCount || 0) > 0 && (
                          <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-warning/30 text-warning">
                            ⚠️ {neuralMetrics.biasWarningCount} viés
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[7px] h-3.5 px-1 ${
                          neuralMetrics.lgpdCompliant ? "border-primary/30 text-primary" : "border-destructive/30 text-destructive"
                        }`}>
                          {neuralMetrics.lgpdCompliant ? "✓ LGPD" : "✗ LGPD"}
                        </Badge>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between text-[9px] font-medium pt-1 border-t border-border/20">
                    <span>Score Geral</span>
                    <span className={
                      (neuralMetrics.overallScore || 0) >= 80 ? "text-primary" :
                      (neuralMetrics.overallScore || 0) >= 50 ? "text-warning" :
                      "text-destructive"
                    }>
                      {neuralMetrics.overallScore}/100
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer: Reanalisar + timestamp */}
          <div className="px-2 py-1.5 border-t border-border/20 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-6 text-[9px] text-muted-foreground hover:text-foreground gap-1"
              onClick={handleRefresh}
              disabled={loading || cooldown}
            >
              <RefreshCw className={`h-2.5 w-2.5 ${loading ? "animate-spin" : ""}`} />
              {cooldown ? "Aguarde..." : "Reanalisar"}
            </Button>
            {lastAnalyzedAt && (
              <span className="text-[8px] text-muted-foreground/60 flex items-center gap-0.5 shrink-0">
                <Clock className="h-2 w-2" />
                {timeAgo(lastAnalyzedAt)}
              </span>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
