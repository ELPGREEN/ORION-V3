import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronUp, Lightbulb, AlertTriangle, BookOpen, ExternalLink, RefreshCw, Scale, Handshake, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import type { LegalGuidance, LiveResource, GuidanceState } from "@/lib/legalGuidanceEngine";
import { analyzeContractBenchmarks } from "@/lib/analysis";
import { agentePesquisa } from "@/lib/api";

interface SmartLegalGuidancePanelProps {
  guidanceState: GuidanceState;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  justUpdated?: boolean;
  editorHtml?: string;
  onInsertText?: (text: string) => void;
}

// ─── Negotiation Points ───
interface NegotiationPoint {
  id: string;
  title: string;
  description: string;
  suggestion: string;
}

function detectNegotiationPoints(html: string): NegotiationPoint[] {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  if (!/contrato|acordo|aditivo|termo\s+de\s+compromisso/i.test(text)) return [];

  const points: NegotiationPoint[] = [];
  const benchmarks = analyzeContractBenchmarks(text);
  for (const b of benchmarks) {
    if (b.level !== "green") {
      points.push({
        id: `bench-${b.provision}`,
        title: b.provision,
        description: `Valor encontrado: ${b.extractedValue} (padrão de mercado: ${b.standard}). Negociabilidade: ${b.negotiability}.`,
        suggestion: `Considere renegociar "${b.provision}" para adequar ao padrão de mercado (${b.standard}).`,
      });
    }
  }

  if (!/limita[çc][aã]o\s+(?:de\s+)?responsabilidade|responsabilidade\s+limita/i.test(text)) {
    points.push({ id: "neg-resp", title: "Limitação de Responsabilidade", description: "Considere incluir um cap de responsabilidade para limitar exposição financeira.", suggestion: "CLÁUSULA [N] – DA LIMITAÇÃO DE RESPONSABILIDADE\nA responsabilidade total de qualquer das partes, por todos os danos decorrentes deste contrato, fica limitada ao valor total pago ou a pagar nos últimos 12 (doze) meses anteriores ao evento danoso." });
  }
  if (!/arbitragem|c[âa]mara\s+de\s+media[çc][aã]o|media[çc][aã]o\s+e\s+arbitragem/i.test(text)) {
    points.push({ id: "neg-dispute", title: "Resolução de Disputas", description: "Cláusula de arbitragem ou mediação pode agilizar a resolução de conflitos.", suggestion: "CLÁUSULA [N] – DA RESOLUÇÃO DE DISPUTAS\nAs partes se comprometem a buscar resolver amigavelmente quaisquer controvérsias. Não sendo possível, as partes poderão optar pela mediação ou arbitragem, nos termos da Lei nº 9.307/96, antes de recorrer ao Poder Judiciário." });
  }
  if (/renova[çc][aã]o\s+autom[aá]tica/i.test(text) && !/n[aã]o[- ]renova[çc][aã]o|aviso\s+pr[eé]vio\s+(?:de\s+)?\d+/i.test(text)) {
    points.push({ id: "neg-renewal", title: "Aviso Prévio de Não-Renovação", description: "Contrato com renovação automática deve prever aviso prévio para não-renovação.", suggestion: "Parágrafo único: Qualquer das partes poderá comunicar a não-renovação mediante aviso prévio escrito de no mínimo 60 (sessenta) dias antes do término da vigência." });
  }
  if (!/confidencial|sigilo|nda|n[aã]o[- ]divulga[çc][aã]o/i.test(text)) {
    points.push({ id: "neg-conf", title: "Confidencialidade", description: "Recomenda-se cláusula de confidencialidade para proteger informações sensíveis.", suggestion: "CLÁUSULA [N] – DA CONFIDENCIALIDADE\nAs partes se comprometem a manter sigilo sobre todas as informações confidenciais trocadas em razão deste contrato, pelo prazo de [prazo] anos após o término da relação contratual." });
  }

  return points;
}

const CATEGORY_CONFIG: Record<string, { icon: typeof Lightbulb; color: string; label: string }> = {
  orientacao: { icon: Scale, color: "text-blue-400 border-blue-500/30 bg-blue-500/10", label: "Orientação" },
  alerta: { icon: AlertTriangle, color: "text-amber-400 border-amber-500/30 bg-amber-500/10", label: "Alerta" },
  dica: { icon: Lightbulb, color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10", label: "Dica" },
};

const RESOURCE_ICONS: Record<string, string> = {
  legislacao: "📜",
  tribunal: "⚖️",
  doutrina: "📚",
  ferramenta: "🔧",
};

// ─── AI Guidance item ───
interface AIGuidanceItem {
  title: string;
  content: string;
  source: string;
}

export function SmartLegalGuidancePanel({ guidanceState, onRefresh, isRefreshing, justUpdated, editorHtml, onInsertText }: SmartLegalGuidancePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showNegotiation, setShowNegotiation] = useState(false);
  const [aiGuidances, setAiGuidances] = useState<AIGuidanceItem[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const { guidances, resources, detectedArea } = guidanceState;
  const negotiationPoints = useMemo(() => editorHtml ? detectNegotiationPoints(editorHtml) : [], [editorHtml]);

  // AI-powered guidance refresh via agente-pesquisa
  const handleAIRefresh = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const query = detectedArea
        ? `orientações jurídicas práticas para ${detectedArea}`
        : "orientações jurídicas para documentos legais";
      
      const result = await agentePesquisa.knowledgeSearch(query, "legal");
      
      if (result.success && result.analysis) {
        const lines = result.analysis.split("\n").filter((l: string) => l.trim().length > 15);
        const items: AIGuidanceItem[] = lines.slice(0, 5).map((line: string, i: number) => ({
          title: line.replace(/^\d+[\.\)]\s*/, "").substring(0, 60),
          content: line.replace(/^\d+[\.\)]\s*/, ""),
          source: "Base de Conhecimento",
        }));
        setAiGuidances(items);
      }
      
      // Also call regular refresh
      onRefresh?.();
    } catch (err) {
      onRefresh?.();
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading, detectedArea, onRefresh]);

  if (guidances.length === 0 && resources.length === 0 && negotiationPoints.length === 0 && aiGuidances.length === 0) return null;

  return (
    <div className="space-y-0">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <Scale className="h-3 w-3 text-primary/60" />
            <span className="font-medium">Orientação Jurídica</span>
            {detectedArea && (
              <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-primary/20 text-primary/70">{detectedArea}</Badge>
            )}
            {justUpdated && (
              <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-emerald-500/30 text-emerald-400 animate-pulse">Atualizado</Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-muted-foreground/20 text-muted-foreground">{guidances.length + aiGuidances.length}</Badge>
            {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 py-2 space-y-2 border-b border-border/30 bg-muted/10 max-h-[280px] overflow-y-auto">
            <TooltipProvider>
              {guidances.map((g) => {
                const config = CATEGORY_CONFIG[g.category] || CATEGORY_CONFIG.orientacao;
                const Icon = config.icon;
                return (
                  <Tooltip key={g.id}>
                    <TooltipTrigger asChild>
                      <div className={`flex items-start gap-1.5 p-1.5 rounded border ${config.color} cursor-help`}>
                        <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-medium leading-tight">{g.title}</p>
                          <p className="text-[8px] opacity-70 leading-tight mt-0.5 line-clamp-2">{g.content}</p>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="max-w-[250px] text-[10px]">
                      <p className="font-medium mb-1">{g.title}</p>
                      <p>{g.content}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {/* AI-powered guidances */}
              {aiGuidances.map((g, i) => (
                <Tooltip key={`ai-${i}`}>
                  <TooltipTrigger asChild>
                    <div className="flex items-start gap-1.5 p-1.5 rounded border border-primary/20 bg-primary/5 cursor-help">
                      <Sparkles className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="text-[9px] font-medium leading-tight">{g.title}</p>
                        <p className="text-[8px] opacity-70 leading-tight mt-0.5 line-clamp-2">{g.content}</p>
                        <Badge variant="outline" className="text-[6px] h-3 px-0.5 mt-0.5 border-primary/20 text-primary/60">IA</Badge>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-[250px] text-[10px]">
                    <p className="font-medium mb-1">{g.title}</p>
                    <p>{g.content}</p>
                    <p className="text-muted-foreground mt-1 text-[9px]">Fonte: {g.source}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>

            {resources.length > 0 && (
              <div className="pt-1.5 border-t border-border/20">
                <p className="text-[8px] text-muted-foreground/60 uppercase tracking-wide mb-1 flex items-center gap-1">
                  <BookOpen className="h-2.5 w-2.5" /> Recursos Vivos
                </p>
                <div className="flex flex-wrap gap-1">
                  {resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded border border-border/30 text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors">
                      <span>{RESOURCE_ICONS[r.type] || "🔗"}</span>
                      <span className="truncate max-w-[120px]">{r.label}</span>
                      <ExternalLink className="h-2 w-2 shrink-0 opacity-50" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-6 text-[9px] text-muted-foreground hover:text-foreground gap-1"
              onClick={handleAIRefresh}
              disabled={aiLoading || isRefreshing}
            >
              {aiLoading ? (
                <><Loader2 className="h-2.5 w-2.5 animate-spin" />Consultando base de conhecimento...</>
              ) : (
                <><Sparkles className="h-2.5 w-2.5 text-primary" />Atualizar com IA</>
              )}
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ─── Negotiation Points ─── */}
      {negotiationPoints.length > 0 && (
        <Collapsible open={showNegotiation} onOpenChange={setShowNegotiation}>
          <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-b border-border/30">
            <div className="flex items-center gap-1.5">
              <Handshake className="h-3 w-3 text-amber-500/60" />
              <span className="font-medium">Pontos de Negociação</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="outline" className="text-[7px] h-3.5 px-1 border-amber-500/20 text-amber-500">{negotiationPoints.length}</Badge>
              {showNegotiation ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-3 py-2 space-y-2 border-b border-border/30 bg-amber-500/5 max-h-[250px] overflow-y-auto">
              {negotiationPoints.map((point) => (
                <div key={point.id} className="p-2 rounded border border-amber-500/20 bg-card">
                  <p className="text-[10px] font-medium text-foreground">{point.title}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">{point.description}</p>
                  {onInsertText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[9px] text-primary hover:text-primary mt-1 px-1"
                      onClick={() => onInsertText(point.suggestion)}
                    >
                      + Inserir sugestão
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
