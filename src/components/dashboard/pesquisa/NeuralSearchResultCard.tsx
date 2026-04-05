import { useState } from "react";
import { ExternalLink, Copy, Brain, Zap, BookOpen, Calendar, Shield, Clock, Scale, Atom, FlipHorizontal, ThumbsUp, ThumbsDown, Loader2, HelpCircle, ChevronDown, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SourceBadge } from "./SourceBadge";
import { useToast } from "@/hooks/use-toast";
import { submitSearchFeedback, type NeuralSearchResult } from "@/lib/api";

function addPesquisaContext(item: { title: string; source: string; sourceLabel: string; description: string; url?: string }) {
  const raw = sessionStorage.getItem("pesquisa_contexts");
  const arr = raw ? JSON.parse(raw) : [];
  arr.push(item);
  sessionStorage.setItem("pesquisa_contexts", JSON.stringify(arr));
  return arr.length;
}

interface Props {
  result: NeuralSearchResult;
  searchQuery?: string;
}

function ScoreBar({ label, score, icon: Icon }: { label: string; score: number; icon: React.ElementType }) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 text-[10px]">
      <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
      <span className="text-muted-foreground w-16 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-foreground font-medium w-8 text-right">{pct}%</span>
    </div>
  );
}

// Fase 9.2: Explainability bar for attention heads
function AttentionHeadBar({ name, value }: { name: string; value: number }) {
  const pct = Math.round(value * 100);
  const labels: Record<string, string> = {
    semantic: "Semântico",
    keyword: "Keyword",
    authority: "Autoridade",
    recency: "Recência",
    jurisdiction: "Jurisdição",
    depth: "Profundidade",
  };
  const colors: Record<string, string> = {
    semantic: "bg-blue-500",
    keyword: "bg-green-500",
    authority: "bg-amber-500",
    recency: "bg-cyan-500",
    jurisdiction: "bg-violet-500",
    depth: "bg-pink-500",
  };
  return (
    <div className="flex items-center gap-1.5 text-[9px]">
      <span className="text-muted-foreground w-20 flex-shrink-0">{labels[name] || name}</span>
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${colors[name] || "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-foreground font-mono w-8 text-right">{pct}%</span>
    </div>
  );
}

export function NeuralSearchResultCard({ result, searchQuery }: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [feedbackState, setFeedbackState] = useState<"none" | "positive" | "negative" | "loading">("none");

  const handleCopy = () => {
    const text = `${result.title}\n${result.content}\nFonte: ${result.source_label}${result.url ? `\nURL: ${result.url}` : ""}`;
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado", description: "Resultado copiado para a área de transferência." });
  };

  const handleFeedback = async (type: "positive" | "negative") => {
    if (feedbackState === "positive" || feedbackState === "negative") return;
    setFeedbackState("loading");
    try {
      await submitSearchFeedback({
        result_id: result.id || crypto.randomUUID(),
        query: searchQuery || "",
        quantum_category: result.quantum_category || "civil",
        feedback: type,
        attention_heads: result.attention_heads,
      });
      setFeedbackState(type);
      toast({
        title: type === "positive" ? "👍 Feedback positivo" : "👎 Feedback negativo",
        description: "Os pesos quânticos serão ajustados automaticamente.",
      });
    } catch {
      setFeedbackState("none");
      toast({ title: "Erro ao enviar feedback", variant: "destructive" });
    }
  };

  const hasScores = result.semantic_score || result.keyword_score || result.combined_score || result.similarity;
  const hasAttentionHeads = result.attention_heads && Object.keys(result.attention_heads).length > 0;

  return (
    <div className="bg-card border border-border p-4 hover:border-primary/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <SourceBadge source={result.source as any} />
          <span className="text-[9px] px-1.5 py-0.5 border border-primary/30 bg-primary/10 text-primary tracking-wider font-medium">
            {result.rerank_position ? `#${result.rerank_position} NEURAL v11` : "NEURAL v11"}
          </span>
          {result.quantum_category && (
            <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/10 border border-violet-500/30 text-violet-500 flex items-center gap-0.5">
              <Atom className="h-2.5 w-2.5" />
              {result.quantum_category}
              {result.quantum_compatibility != null && ` ${Math.round(result.quantum_compatibility * 100)}%`}
            </span>
          )}
          {result.signal_flip_applied && (
            <span className="text-[9px] px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center gap-0.5">
              <FlipHorizontal className="h-2.5 w-2.5" /> SF
            </span>
          )}
          {(() => {
            const VERIFIED_SOURCES = new Set([
              "lexml", "lexml_catalogo", "camara", "camara_proposicoes", "dados_gov",
              "stf", "stf_bigquery", "cnj",
              "planalto_codigo_civil", "planalto_cpc", "planalto_codigo_penal", "planalto_clt",
              "catalogo_leis", "neural_catalogo_leis",
              "datajud_stj", "datajud_tst", "datajud_tse", "datajud_stm",
            ]);
            const isVerified = VERIFIED_SOURCES.has(result.source) || result.source?.startsWith("datajud_");
            const isGoogleFallback = result.url?.includes("google.com/search");
            if (isVerified && !isGoogleFallback) {
              return (
                <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-600 flex items-center gap-0.5" title="Fonte oficial verificada">
                  ✅ Verificada
                </span>
              );
            }
            if (result.authority_score != null && result.authority_score >= 0.85) {
              return (
                <span className="text-[9px] px-1.5 py-0.5 bg-green-500/10 border border-green-500/30 text-green-600 flex items-center gap-0.5">
                  <Shield className="h-2.5 w-2.5" /> OFICIAL
                </span>
              );
            }
            return null;
          })()}
          {result.content_type && (
            <span className="text-[9px] px-1.5 py-0.5 border border-border text-muted-foreground">
              {result.content_type}
            </span>
          )}
          {result.published_date && (
            <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Calendar className="h-2.5 w-2.5" />
              {result.published_date}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="text-sm font-medium text-foreground mb-1.5 leading-snug">
        {result.title}
      </h3>

      {/* Content */}
      {result.content && (
        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-3">
          {result.content}
        </p>
      )}

      {/* Similarity Scores */}
      {hasScores && (
        <div className="space-y-1.5 mb-3 p-2.5 bg-muted/30 border border-border/50">
          {result.combined_score != null && result.combined_score > 0 && (
            <ScoreBar label="Combinado" score={result.combined_score} icon={Brain} />
          )}
          {result.semantic_score != null && result.semantic_score > 0 && (
            <ScoreBar label="Semântico" score={result.semantic_score} icon={Zap} />
          )}
          {result.keyword_score != null && result.keyword_score > 0 && (
            <ScoreBar label="Keyword" score={result.keyword_score} icon={BookOpen} />
          )}
          {result.authority_score != null && result.authority_score > 0 && (
            <ScoreBar label="Autoridade" score={result.authority_score} icon={Shield} />
          )}
          {result.recency_score != null && result.recency_score > 0 && (
            <ScoreBar label="Recência" score={result.recency_score} icon={Clock} />
          )}
          {result.similarity != null && result.similarity > 0 && !result.combined_score && (
            <ScoreBar label="Similar." score={result.similarity} icon={Brain} />
          )}
        </div>
      )}

      {/* Fase 9.2: Explainability Accordion */}
      {hasAttentionHeads && (
        <Accordion type="single" collapsible className="mb-3">
          <AccordionItem value="explain" className="border-border/50">
            <AccordionTrigger className="py-2 text-[10px] text-muted-foreground hover:text-foreground hover:no-underline">
              <span className="flex items-center gap-1">
                <HelpCircle className="h-3 w-3" />
                Por que este resultado?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 p-2 bg-muted/20 rounded border border-border/30">
                {/* v17 SHAP Explanation */}
                {result.shap_explanation && Object.keys(result.shap_explanation).length > 0 && (
                  <div>
                    <p className="text-[9px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      SHAP — Contribuição Marginal por Head
                    </p>
                    <div className="space-y-1">
                      {Object.entries(result.shap_explanation).sort(([,a], [,b]) => Math.abs((b as any).contribution) - Math.abs((a as any).contribution)).map(([name, val]) => {
                        const v = val as { contribution: number; explanation: string };
                        const pct = Math.round(Math.abs(v.contribution) * 100);
                        const isPositive = v.contribution >= 0;
                        return (
                          <div key={name} className="flex items-center gap-1.5 text-[9px]">
                            <span className="text-muted-foreground w-20 flex-shrink-0 capitalize">{name.replace(/_/g, ' ')}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                              <div
                                className={`h-full rounded-full transition-all ${isPositive ? "bg-emerald-500" : "bg-rose-500"}`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                            <span className={`font-mono w-10 text-right ${isPositive ? "text-emerald-600" : "text-rose-600"}`}>
                              {isPositive ? "+" : ""}{(v.contribution * 100).toFixed(0)}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Attention Head Contributions (fallback if no SHAP) */}
                {(!result.shap_explanation || Object.keys(result.shap_explanation).length === 0) && (
                  <div>
                    <p className="text-[9px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      Contribuição por Cabeça de Atenção (MHA)
                    </p>
                    <div className="space-y-1">
                      {Object.entries(result.attention_heads!).map(([name, value]) => (
                        <AttentionHeadBar key={name} name={name} value={value as number} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Privacy Score */}
                {result.privacy_score != null && result.privacy_score < 1.0 && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <Shield className="h-3 w-3 text-amber-500" />
                    <span className="text-muted-foreground">Privacidade:</span>
                    <span className={`font-medium ${result.privacy_score >= 0.8 ? "text-emerald-500" : "text-amber-500"}`}>
                      {Math.round(result.privacy_score * 100)}%
                    </span>
                    <span className="text-muted-foreground">— dados pessoais sanitizados</span>
                  </div>
                )}

                {/* Quantum Category */}
                {result.quantum_category && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <Atom className="h-3 w-3 text-violet-500" />
                    <span className="text-muted-foreground">Categoria Quântica:</span>
                    <span className="font-medium text-violet-500">{result.quantum_category}</span>
                    {result.quantum_compatibility != null && (
                      <span className="text-muted-foreground">
                        (compatibilidade: {Math.round(result.quantum_compatibility * 100)}%)
                      </span>
                    )}
                  </div>
                )}

                {/* Signal Flip */}
                {result.signal_flip_applied && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <FlipHorizontal className="h-3 w-3 text-amber-500" />
                    <span className="text-amber-500 font-medium">Signal Flip aplicado</span>
                    <span className="text-muted-foreground">— negação jurídica detectada na query</span>
                  </div>
                )}

                {/* Rerank Position */}
                {result.rerank_position && (
                  <div className="flex items-center gap-2 text-[9px]">
                    <Brain className="h-3 w-3 text-primary" />
                    <span className="text-muted-foreground">Cross-Encoder Rerank:</span>
                    <span className="font-medium">Posição #{result.rerank_position}</span>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50">
        {/* Feedback buttons */}
        <div className="flex items-center gap-1 mr-1">
          {feedbackState === "loading" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${feedbackState === "positive" ? "bg-green-500/20 text-green-500" : "text-muted-foreground hover:text-green-500 hover:bg-green-500/10"}`}
                onClick={() => handleFeedback("positive")}
                disabled={feedbackState !== "none"}
                title="Resultado relevante"
              >
                <ThumbsUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={`h-7 w-7 p-0 ${feedbackState === "negative" ? "bg-red-500/20 text-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"}`}
                onClick={() => handleFeedback("negative")}
                disabled={feedbackState !== "none"}
                title="Resultado irrelevante"
              >
                <ThumbsDown className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </div>

        {result.url && (
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] h-7 text-primary hover:text-primary/80 hover:bg-primary/10"
            onClick={() => window.open(result.url, "_blank")}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Abrir fonte
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-[10px] h-7 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
        >
          <Copy className="h-3 w-3 mr-1" />
          Copiar
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-7 text-primary/70 hover:text-primary hover:bg-primary/5"
                onClick={() => {
                  const count = addPesquisaContext({
                    title: result.title,
                    source: result.source,
                    sourceLabel: result.source_label,
                    description: (result.content || "").substring(0, 500),
                    url: result.url || undefined,
                  });
                  toast({
                    title: `Fundamentação adicionada (${count})`,
                    description: "Adicione mais resultados ou vá ao gerador de documentos.",
                    action: (
                      <Button size="sm" variant="outline" className="text-[10px] h-7" onClick={() => navigate("/dashboard/gerar-documento")}>
                        Ir ao gerador
                      </Button>
                    ),
                  });
                }}
              >
                <Scale className="h-3 w-3 mr-1" />
                Fundamentar documento
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">Envia este resultado como fundamentação para o gerador de documentos jurídicos</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {result.url && (
          <span className="text-[8px] text-muted-foreground/50 ml-auto truncate max-w-[200px]" title={result.url}>
            {result.url}
          </span>
        )}
      </div>
    </div>
  );
}
