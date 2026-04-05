import { useMemo, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  ListTree,
  AlertTriangle,
  Lightbulb,
  CheckCircle,
  XCircle,
  Info,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  ClipboardCheck,
  Bot,
  Loader2,
  Sparkles,
  Plus,
  Brain,
} from "lucide-react";
import {
  calculateRisk, type RiskFactor,
  detectAggressiveTerms, getCategoryLabel, type AggressiveTerm,
  checkMissingClauses, type ClauseCheckResult,
  extractObligations, groupObligationsByParty, type Obligation,
  mineArguments, type ArgumentAnalysis,
  analyzeContractBenchmarks, type BenchmarkResult,
  checkDocumentConsistency, type ConsistencyIssue,
} from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import { agenteLeitura } from "@/lib/api";
import { toast } from "sonner";

// ─── Seções sugeridas por tipo de documento ───
const SUGGESTED_SECTIONS: Record<string, string[]> = {
  peticao_inicial: ["QUALIFICAÇÃO DAS PARTES", "DOS FATOS", "DO DIREITO", "DOS PEDIDOS", "DO VALOR DA CAUSA"],
  contestacao: ["PRELIMINARES", "DOS FATOS", "DO MÉRITO", "DOS PEDIDOS"],
  recurso: ["TEMPESTIVIDADE", "DOS FATOS", "DAS RAZÕES DO RECURSO", "DO PEDIDO DE REFORMA"],
  apelacao: ["TEMPESTIVIDADE", "DOS FATOS", "DAS RAZÕES DO RECURSO", "DO PEDIDO DE REFORMA"],
  contrato: ["CLÁUSULA 1ª – DO OBJETO", "DAS OBRIGAÇÕES", "DO PRAZO", "DO VALOR", "DAS PENALIDADES", "DO FORO"],
  parecer: ["CONSULTA", "DOS FATOS", "ANÁLISE JURÍDICA", "CONCLUSÃO"],
  agravo: ["DA TEMPESTIVIDADE", "DAS RAZÕES", "DO PEDIDO"],
  tutela: ["DOS FATOS", "DO FUMUS BONI IURIS", "DO PERICULUM IN MORA", "DOS PEDIDOS"],
  "habeas-corpus": ["DOS FATOS", "DA ILEGALIDADE", "DO PEDIDO LIMINAR", "DOS PEDIDOS"],
};
const DEFAULT_SECTIONS = ["INTRODUÇÃO", "DESENVOLVIMENTO", "CONCLUSÃO"];

function normalize(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function sectionFound(headings: string[], expected: string): boolean {
  const norm = normalize(expected);
  return headings.some(h => {
    const nh = normalize(h);
    return nh.includes(norm) || norm.includes(nh);
  });
}

interface AIDetectionResult {
  score: number;
  confidence: "alta" | "media" | "baixa";
  patterns: Array<{ name: string; severity: string; score: number; examples?: string[] }>;
  explanation: string;
  suggestions: string[];
}

interface AnalysisProps {
  editorHtml: string;
  documentType?: string;
  documentCategory?: string;
  editor?: any;
  onInsertText?: (text: string) => void;
}

interface DetectedSection {
  tag: string;
  text: string;
  pos: number;
}

interface Problem {
  id: string;
  severity: "alta" | "media" | "baixa";
  message: string;
  detail?: string;
}

interface Suggestion {
  id: string;
  message: string;
}

export function DocumentContextAnalysisPanel({ editorHtml, documentType, documentCategory, editor, onInsertText }: AnalysisProps) {
  const [aiDetection, setAiDetection] = useState<AIDetectionResult | null>(null);
  const [aiDetectionLoading, setAiDetectionLoading] = useState(false);
  const [aiDeepAnalysis, setAiDeepAnalysis] = useState<string | null>(null);
  const [aiDeepLoading, setAiDeepLoading] = useState(false);

  const runAIDetection = useCallback(async () => {
    const text = editorHtml.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 50) { toast.error("Documento muito curto para análise (mínimo 50 caracteres)"); return; }
    setAiDetectionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("detect-ai-content", { body: { text } });
      if (error) throw error;
      setAiDetection(data as AIDetectionResult);
    } catch (err) { toast.error("Erro ao analisar conteúdo IA"); console.error(err); }
    finally { setAiDetectionLoading(false); }
  }, [editorHtml]);

  // AI Deep Analysis via agente-leitura
  const runDeepAnalysis = useCallback(async () => {
    const text = editorHtml.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
    if (text.length < 50) { toast.error("Documento muito curto para análise profunda"); return; }
    setAiDeepLoading(true);
    try {
      const result = await agenteLeitura.readFile(
        text.substring(0, 5000),
        `${documentType || "documento"}.html`,
        "Analise este documento jurídico de forma profunda. Forneça: 1) Resumo executivo (2 linhas), 2) Pontos fortes da argumentação, 3) Lacunas e fragilidades críticas, 4) Recomendações estratégicas específicas, 5) Qualidade da fundamentação legal (nota 1-10)."
      );
      if (result.success && result.analysis) {
        setAiDeepAnalysis(result.analysis);
        toast.success("Análise profunda concluída!");
      } else {
        toast.error(result.error || "Erro na análise profunda");
      }
    } catch (err) { toast.error("Erro ao executar análise profunda"); console.error(err); }
    finally { setAiDeepLoading(false); }
  }, [editorHtml, documentType]);
  const plainText = useMemo(() => editorHtml.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(), [editorHtml]);
  const wordCount = useMemo(() => plainText.split(/\s+/).filter(Boolean).length, [plainText]);

  const sections = useMemo<DetectedSection[]>(() => {
    if (!editor) return [];
    const items: DetectedSection[] = [];
    editor.state.doc.descendants((node: any, pos: number) => {
      if (node.type.name === "heading") {
        items.push({ tag: `H${node.attrs.level}`, text: node.textContent, pos });
      }
    });
    return items;
  }, [editor, editorHtml]);

  const problems = useMemo<Problem[]>(() => {
    const p: Problem[] = [];
    if (wordCount < 100) {
      p.push({ id: "short", severity: "media", message: "Documento muito curto", detail: `Apenas ${wordCount} palavras. Documentos jurídicos geralmente possuem mais de 300 palavras.` });
    }
    if (sections.length === 0 && wordCount > 200) {
      p.push({ id: "no-headings", severity: "media", message: "Sem estrutura de seções", detail: "Utilize títulos (H1, H2, H3) para organizar o documento." });
    }
    const hasLegalRef = /art\.?\s*\d+|lei\s+n?[º°]?\s*\d|código\s+(civil|penal|processo|trabalho)|constituição\s+federal|súmula/i.test(plainText);
    if (!hasLegalRef && wordCount > 150 && documentCategory === "Judicial") {
      p.push({ id: "no-legal", severity: "alta", message: "Sem fundamentação legal detectada", detail: "Nenhuma referência a artigos de lei, códigos ou súmulas encontrada." });
    }
    const hasConclusion = /ante\s+o\s+exposto|diante\s+d[oa]\s+exposto|requer|pede\s+deferimento|termos\s+em\s+que/i.test(plainText);
    if (!hasConclusion && wordCount > 300 && documentCategory === "Judicial") {
      p.push({ id: "no-conclusion", severity: "media", message: "Sem conclusão/pedido detectado", detail: "Expressões como 'Ante o exposto', 'Requer' ou 'Pede deferimento' não foram encontradas." });
    }
    const bareArticles = plainText.match(/art\.?\s*\d+[^a-záàâãéèêíïóôõöúüç,\d]/gi) || [];
    const qualifiedArticles = plainText.match(/art\.?\s*\d+.*?(lei|código|cf|constituição|cpc|cpp|clt|cdc|cc|cp|eca|ldb)/gi) || [];
    if (bareArticles.length > qualifiedArticles.length + 2) {
      p.push({ id: "bare-articles", severity: "baixa", message: "Citações de artigos sem referência à lei", detail: `Foram encontradas ${bareArticles.length - qualifiedArticles.length} citações de artigos sem especificar a legislação correspondente.` });
    }
    return p;
  }, [plainText, wordCount, sections, documentCategory]);

  // Suggested sections analysis
  const suggestedSections = useMemo(() => {
    const expected = SUGGESTED_SECTIONS[documentType || ""] || DEFAULT_SECTIONS;
    const headingTexts = sections.map(s => s.text);
    return expected.map(name => ({
      name,
      found: sectionFound(headingTexts, name),
    }));
  }, [sections, documentType]);

  const missingSections = useMemo(() => suggestedSections.filter(s => !s.found), [suggestedSections]);

  const suggestions = useMemo<Suggestion[]>(() => {
    const s: Suggestion[] = [];
    if (documentCategory === "Judicial") {
      if (!/(jurisprudência|precedente|julgad|acórdão|resp\s|re\s\d|hc\s\d)/i.test(plainText) && wordCount > 300) {
        s.push({ id: "add-jurisp", message: "Considere adicionar jurisprudência relevante para fortalecer a argumentação." });
      }
      if (!/(doutr|autor|segundo\s+\w+\s+(ensina|leciona|afirma|destaca))/i.test(plainText) && wordCount > 500) {
        s.push({ id: "add-doutrina", message: "Adicionar citações doutrinárias pode enriquecer a fundamentação." });
      }
    }
    if (wordCount > 100 && sections.length > 0 && sections.every((s) => s.tag === "H1")) {
      s.push({ id: "use-h2", message: "Utilize subtítulos (H2, H3) para melhorar a hierarquia do documento." });
    }
    if (wordCount > 2000 && sections.length < 3) {
      s.push({ id: "more-sections", message: "Documento extenso com poucas seções. Considere dividir em mais tópicos." });
    }
    // Contextual suggestion for missing sections
    if (missingSections.length > 0) {
      const typeLabel = documentType || "genérico";
      s.push({
        id: "missing-sections",
        message: `Seu documento do tipo "${typeLabel}" deveria conter as seções: ${missingSections.map(m => m.name).join(", ")}.`,
      });
    }
    return s;
  }, [plainText, wordCount, sections, documentCategory, missingSections, documentType]);

  // Risk analysis
  const riskResult = useMemo(() => calculateRisk(editorHtml, documentCategory), [editorHtml, documentCategory]);

  // Aggressive terms detection
  const aggressiveTerms = useMemo(() => detectAggressiveTerms(editorHtml), [editorHtml]);

  // Missing clauses check
  const clauseCheck = useMemo<ClauseCheckResult>(() => checkMissingClauses(editorHtml, documentType), [editorHtml, documentType]);

  // New analysis modules
  const obligations = useMemo(() => extractObligations(plainText), [plainText]);
  const obligationGroups = useMemo(() => groupObligationsByParty(obligations), [obligations]);
  const argumentAnalysis = useMemo(() => mineArguments(plainText), [plainText]);
  const benchmarkResults = useMemo(() => analyzeContractBenchmarks(plainText), [plainText]);
  const consistencyIssues = useMemo(() => checkDocumentConsistency(editorHtml), [editorHtml]);

  const severityIcon = (s: string) => {
    if (s === "alta") return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
    if (s === "media") return <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />;
    return <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
  };

  const scrollTo = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();
    let domAtPos: any;
    try { domAtPos = editor.view.domAtPos(pos); } catch { return; }
    if (domAtPos?.node) {
      const el = domAtPos.node instanceof HTMLElement ? domAtPos.node : domAtPos.node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="resumo" className="flex-1 flex flex-col min-h-0">
        <div className="px-2 border-b border-border shrink-0">
          <TabsList className="h-auto bg-transparent gap-0 p-0 flex flex-wrap">
            <TabsTrigger value="resumo" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <FileText className="h-3 w-3 mr-1" />Resumo
            </TabsTrigger>
            <TabsTrigger value="estrutura" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <ListTree className="h-3 w-3 mr-1" />Estrutura
            </TabsTrigger>
            <TabsTrigger value="problemas" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <AlertTriangle className="h-3 w-3 mr-1" />Problemas
              {problems.length > 0 && <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{problems.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sugestoes" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <Lightbulb className="h-3 w-3 mr-1" />Dicas
            </TabsTrigger>
            <TabsTrigger value="risco" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <Shield className="h-3 w-3 mr-1" />Risco
            </TabsTrigger>
            <TabsTrigger value="termos" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <ShieldAlert className="h-3 w-3 mr-1" />Riscos
              {aggressiveTerms.length > 0 && <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{aggressiveTerms.length}</Badge>}
            </TabsTrigger>
            {clauseCheck.checks.length > 0 && (
              <TabsTrigger value="clausulas" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
                <ClipboardCheck className="h-3 w-3 mr-1" />Cláusulas
                {clauseCheck.missingRequired > 0 && <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{clauseCheck.missingRequired}</Badge>}
              </TabsTrigger>
            )}
            <TabsTrigger value="ia-detect" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
              <Bot className="h-3 w-3 mr-1" />IA?
              {aiDetection && <Badge variant="outline" className="text-[8px] h-3.5 ml-1 px-1">{aiDetection.score}%</Badge>}
            </TabsTrigger>
            {obligations.length > 0 && (
              <TabsTrigger value="obrigacoes" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
                Obrigações
                <Badge variant="outline" className="text-[8px] h-3.5 ml-1 px-1">{obligations.length}</Badge>
              </TabsTrigger>
            )}
            {argumentAnalysis.segments.length > 0 && (
              <TabsTrigger value="argumentos" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
                Argumentos
                {argumentAnalysis.gaps.length > 0 && <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{argumentAnalysis.gaps.length}</Badge>}
              </TabsTrigger>
            )}
            {benchmarkResults.length > 0 && (
              <TabsTrigger value="benchmarks" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
                Benchmarks
                {benchmarkResults.filter(b => b.level === "red").length > 0 && <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{benchmarkResults.filter(b => b.level === "red").length}</Badge>}
              </TabsTrigger>
            )}
            {consistencyIssues.length > 0 && (
              <TabsTrigger value="consistencia" className="text-[10px] h-7 px-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent shrink-0">
                Consistência
                <Badge variant="destructive" className="text-[8px] h-3.5 ml-1 px-1">{consistencyIssues.length}</Badge>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* ─── Resumo ─── */}
        <TabsContent value="resumo" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Palavras" value={wordCount.toLocaleString("pt-BR")} />
                <StatCard label="Páginas (est.)" value={String(Math.max(1, Math.ceil(wordCount / 300)))} />
                <StatCard label="Seções" value={String(sections.length)} />
                <StatCard label="Tipo" value={documentType || "—"} />
              </div>
              {documentCategory && (
                <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1.5">
                  <span className="font-medium text-foreground">Categoria:</span> {documentCategory}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">
                {problems.filter((p) => p.severity === "alta").length > 0 ? (
                  <span className="text-destructive font-medium">⚠ {problems.filter((p) => p.severity === "alta").length} problema(s) grave(s) detectado(s)</span>
                ) : problems.length > 0 ? (
                  <span className="text-yellow-600 font-medium">⚡ {problems.length} aviso(s) encontrado(s)</span>
                ) : wordCount > 50 ? (
                  <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Nenhum problema detectado</span>
                ) : null}
              </div>
              {/* Quick stats for aggressive terms & clauses */}
              {aggressiveTerms.length > 0 && (
                <div className="text-[10px] text-destructive font-medium flex items-center gap-1">
                  <ShieldAlert className="h-3 w-3" /> {aggressiveTerms.length} termo(s) agressivo(s) detectado(s)
                </div>
              )}
              {clauseCheck.missingRequired > 0 && (
                <div className="text-[10px] text-yellow-600 font-medium flex items-center gap-1">
                  <ClipboardCheck className="h-3 w-3" /> {clauseCheck.missingRequired} cláusula(s) obrigatória(s) faltante(s)
                </div>
              )}

              {/* AI Deep Analysis */}
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-[10px] gap-1.5 mt-2"
                onClick={runDeepAnalysis}
                disabled={aiDeepLoading || wordCount < 30}
              >
                {aiDeepLoading ? (
                  <><Loader2 className="h-3 w-3 animate-spin" />Analisando com agente-leitura...</>
                ) : (
                  <><Brain className="h-3 w-3 text-primary" />Análise Profunda IA</>
                )}
              </Button>

              {aiDeepAnalysis && (
                <div className="mt-2 p-2.5 rounded-lg border border-primary/20 bg-primary/5 space-y-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Análise Profunda (Agente Leitor)
                  </p>
                  <div className="text-[10px] text-foreground whitespace-pre-line leading-relaxed">
                    {aiDeepAnalysis}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Estrutura ─── */}
        <TabsContent value="estrutura" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {sections.length > 0 && (
                <div className="space-y-0.5">
                  {sections.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => scrollTo(s.pos)}
                      className="w-full text-left text-[10px] py-1.5 px-2 hover:bg-accent/50 rounded transition-colors truncate flex items-center gap-1.5"
                      style={{ paddingLeft: `${(parseInt(s.tag[1]) - 1) * 12 + 8}px` }}
                    >
                      <Badge variant="outline" className="text-[8px] h-3.5 px-1 shrink-0">{s.tag}</Badge>
                      <span className="truncate text-foreground">{s.text}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Seções Recomendadas */}
              {suggestedSections.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-medium text-foreground flex items-center gap-1">
                    <ListTree className="h-3 w-3 text-primary" />
                    Seções Recomendadas
                    <Badge variant="outline" className="text-[7px] h-3.5 px-1 ml-auto">
                      {documentType || "genérico"}
                    </Badge>
                  </p>
                  <div className="space-y-0.5">
                    {suggestedSections.map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-[10px] py-1 px-2 rounded border border-border bg-card">
                        {s.found ? (
                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        ) : (
                          <XCircle className="h-3 w-3 text-destructive/60 shrink-0" />
                        )}
                        <span className={`flex-1 truncate ${s.found ? "text-muted-foreground" : "text-foreground"}`}>
                          {s.name}
                        </span>
                        {!s.found && onInsertText && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 px-1.5 text-[8px] text-primary hover:text-primary"
                            onClick={() => onInsertText(`\n## ${s.name}\n\n`)}
                          >
                            <Plus className="h-2.5 w-2.5 mr-0.5" />Inserir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {missingSections.length > 0 && onInsertText && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-6 text-[9px]"
                      onClick={() => {
                        const allHeadings = missingSections.map(s => `\n## ${s.name}\n\n`).join("");
                        onInsertText(allHeadings);
                      }}
                    >
                      <Plus className="h-3 w-3 mr-1" />Inserir Todas ({missingSections.length})
                    </Button>
                  )}
                </div>
              )}

              {sections.length === 0 && suggestedSections.length === 0 && (
                <p className="text-[10px] text-muted-foreground text-center py-6">Nenhum título (H1-H3) encontrado no documento.</p>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Problemas ─── */}
        <TabsContent value="problemas" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {problems.length === 0 ? (
                <div className="text-center py-6">
                  <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">Nenhum problema detectado.</p>
                </div>
              ) : (
                problems.map((p) => (
                  <div key={p.id} className="flex gap-2 p-2 rounded border border-border bg-card">
                    {severityIcon(p.severity)}
                    <div className="min-w-0">
                      <p className="text-[11px] font-medium text-foreground">{p.message}</p>
                      {p.detail && <p className="text-[10px] text-muted-foreground mt-0.5">{p.detail}</p>}
                      <Badge variant="outline" className="text-[8px] h-3.5 mt-1">
                        {p.severity === "alta" ? "Alta" : p.severity === "media" ? "Média" : "Baixa"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Dicas ─── */}
        <TabsContent value="sugestoes" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {suggestions.length === 0 ? (
                <div className="text-center py-6">
                  <Lightbulb className="h-5 w-5 text-primary mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">Nenhuma sugestão no momento.</p>
                </div>
              ) : (
                suggestions.map((s) => (
                  <div key={s.id} className="flex gap-2 p-2 rounded border border-primary/20 bg-primary/5">
                    <Lightbulb className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-foreground">{s.message}</p>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Risk Tab ─── */}
        <TabsContent value="risco" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4">
              {riskResult.wordCount < 30 ? (
                <div className="text-center py-6">
                  <Shield className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">Documento muito curto para análise de risco.</p>
                </div>
              ) : (
                <>
                  <div className="text-center space-y-2">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="text-3xl font-bold text-foreground">{riskResult.score}%</div>
                    </div>
                    <div>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 ${
                          riskResult.level === "baixo" ? "bg-green-500/15 text-green-600 border-green-500/30"
                            : riskResult.level === "medio" ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                            : "bg-red-500/15 text-red-600 border-red-500/30"
                        }`}
                        variant="outline"
                      >
                        Risco {riskResult.level === "baixo" ? "Baixo" : riskResult.level === "medio" ? "Médio" : "Alto"}
                      </Badge>
                    </div>
                    <p className="text-[9px] text-muted-foreground">Probabilidade estimada de êxito baseada na qualidade do documento</p>
                  </div>
                  <div className="space-y-1">
                    <Progress
                      value={riskResult.score}
                      className={`h-2 ${
                        riskResult.level === "baixo" ? "[&>div]:bg-green-500"
                          : riskResult.level === "medio" ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"
                      }`}
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground">
                      <span>Alto Risco</span><span>Baixo Risco</span>
                    </div>
                  </div>
                  {riskResult.themes.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Áreas Detectadas</p>
                      <div className="flex flex-wrap gap-1">
                        {riskResult.themes.map((t) => (
                          <Badge key={t} variant="secondary" className="text-[8px] h-4 px-1.5">{t}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Fatores de Análise</p>
                    <div className="space-y-1">
                      {riskResult.factors.map((f) => (
                        <RiskFactorRow key={f.id} factor={f} />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Aggressive Terms Tab ─── */}
        <TabsContent value="termos" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {aggressiveTerms.length === 0 ? (
                <div className="text-center py-6">
                  <ShieldAlert className="h-5 w-5 text-green-500 mx-auto mb-2" />
                  <p className="text-[10px] text-muted-foreground">Nenhum termo agressivo detectado.</p>
                  <p className="text-[9px] text-muted-foreground/60 mt-1">O scanner verifica penalidades excessivas, renúncias amplas, assimetrias e mais.</p>
                </div>
              ) : (
                <>
                  <div className="text-[10px] text-muted-foreground mb-2">
                    <span className="font-medium text-foreground">{aggressiveTerms.length}</span> termo(s) potencialmente agressivo(s)
                  </div>
                  {aggressiveTerms.map((term) => (
                    <AggressiveTermCard key={term.id} term={term} />
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Missing Clauses Tab ─── */}
        {clauseCheck.checks.length > 0 && (
          <TabsContent value="clausulas" className="mt-0 flex-1">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-foreground">Completude</span>
                    <span className="text-[10px] text-muted-foreground">{clauseCheck.completeness}%</span>
                  </div>
                  <Progress value={clauseCheck.completeness} className="h-2" />
                </div>
                <div className="text-[9px] text-muted-foreground">
                  Tipo: <strong className="text-foreground">{clauseCheck.documentType}</strong> • {clauseCheck.presentCount}/{clauseCheck.checks.length} cláusulas
                </div>

                {/* Group by category */}
                {(() => {
                  const categories = [...new Set(clauseCheck.checks.map((c) => c.category))];
                  return categories.map((cat) => {
                    const items = clauseCheck.checks.filter((c) => c.category === cat);
                    return (
                      <div key={cat} className="space-y-1">
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{cat}</p>
                        {items.map((check) => (
                          <div
                            key={check.id}
                            className={`flex items-start gap-2 p-2 rounded border ${
                              check.present ? "border-green-500/20 bg-green-500/5" : check.required ? "border-destructive/20 bg-destructive/5" : "border-border bg-card"
                            }`}
                          >
                            <Checkbox checked={check.present} disabled className="mt-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className={`text-[10px] font-medium ${check.present ? "text-green-600" : "text-foreground"}`}>
                                {check.label}
                                {check.required && !check.present && <span className="text-destructive ml-1">*</span>}
                              </p>
                              {!check.present && check.suggestion && onInsertText && (
                                <button
                                  onClick={() => onInsertText(check.suggestion!)}
                                  className="text-[9px] text-primary hover:underline mt-0.5"
                                >
                                  + Inserir modelo
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  });
                })()}
              </div>
            </ScrollArea>
          </TabsContent>
        )}

        {/* ─── AI Detection Tab ─── */}
        <TabsContent value="ia-detect" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {!aiDetection && !aiDetectionLoading && (
                <div className="text-center py-6 space-y-3">
                  <Bot className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <div>
                    <p className="text-xs text-muted-foreground">Verificar Conteúdo IA</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      Analisa o documento para detectar padrões de texto gerado por inteligência artificial.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={runAIDetection}
                    className="text-[11px] h-8"
                  >
                    <Sparkles className="h-3 w-3 mr-1.5" />
                    Analisar Documento
                  </Button>
                </div>
              )}

              {aiDetectionLoading && (
                <div className="text-center py-8 space-y-3">
                  <Loader2 className="h-6 w-6 text-primary animate-spin mx-auto" />
                  <p className="text-[10px] text-muted-foreground">Analisando padrões de IA...</p>
                </div>
              )}

              {aiDetection && !aiDetectionLoading && (
                <>
                  {/* Score gauge */}
                  <div className="text-center space-y-2">
                    <div className="text-3xl font-bold text-foreground">{aiDetection.score}%</div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0.5 ${
                        aiDetection.score >= 70
                          ? "bg-red-500/15 text-red-600 border-red-500/30"
                          : aiDetection.score >= 40
                          ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30"
                          : "bg-green-500/15 text-green-600 border-green-500/30"
                      }`}
                    >
                      {aiDetection.score >= 70 ? "Provavelmente IA" : aiDetection.score >= 40 ? "Parcialmente IA" : "Provavelmente Humano"}
                    </Badge>
                    <div>
                      <Badge variant="secondary" className="text-[8px] h-4 px-1.5">
                        Confiança: {aiDetection.confidence}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <Progress
                      value={aiDetection.score}
                      className={`h-2 ${
                        aiDetection.score >= 70 ? "[&>div]:bg-red-500"
                          : aiDetection.score >= 40 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-green-500"
                      }`}
                    />
                    <div className="flex justify-between text-[8px] text-muted-foreground">
                      <span>Humano</span><span>IA</span>
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="p-2 rounded border border-border bg-muted/30">
                    <p className="text-[10px] text-foreground">{aiDetection.explanation}</p>
                  </div>

                  {/* Patterns */}
                  {aiDetection.patterns.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Padrões Detectados</p>
                      {aiDetection.patterns.map((p, i) => (
                        <div
                          key={i}
                          className={`p-2 rounded border ${
                            p.severity === "alto" ? "border-red-500/20 bg-red-500/5"
                              : p.severity === "medio" ? "border-yellow-500/20 bg-yellow-500/5"
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-foreground">{p.name}</span>
                            <Badge variant="outline" className={`text-[8px] h-3.5 px-1 ${
                              p.severity === "alto" ? "border-red-500/50 text-red-500"
                                : p.severity === "medio" ? "border-yellow-500/50 text-yellow-500" : ""
                            }`}>
                              {p.score}/10
                            </Badge>
                          </div>
                          {p.examples && p.examples.length > 0 && (
                            <p className="text-[9px] text-muted-foreground mt-1 italic">"{p.examples[0]}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {aiDetection.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Sugestões de Humanização</p>
                      {aiDetection.suggestions.map((s, i) => (
                        <div key={i} className="flex gap-1.5 p-2 rounded border border-primary/20 bg-primary/5">
                          <Lightbulb className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                          <p className="text-[9px] text-foreground">{s}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Re-analyze button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={runAIDetection}
                    className="w-full text-[10px] h-7"
                  >
                    <Sparkles className="h-3 w-3 mr-1" /> Analisar Novamente
                  </Button>
                </>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Obrigações Tab ─── */}
        <TabsContent value="obrigacoes" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              {Object.entries(obligationGroups).map(([party, obs]) => (
                <div key={party} className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-foreground">{party}</p>
                  {(obs as Obligation[]).map((ob, i) => (
                    <div key={i} className="p-2 rounded border border-border bg-card">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className={`text-[8px] h-3.5 px-1 ${
                          ob.type === "pagar" ? "border-amber-500/50 text-amber-500"
                          : ob.type === "nao_fazer" ? "border-red-500/50 text-red-500"
                          : ob.type === "entregar" ? "border-blue-500/50 text-blue-500"
                          : "border-green-500/50 text-green-500"
                        }`}>
                          {ob.type === "pagar" ? "Pagar" : ob.type === "nao_fazer" ? "Não fazer" : ob.type === "entregar" ? "Entregar" : "Fazer"}
                        </Badge>
                        {ob.clauseRef && <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{ob.clauseRef}</Badge>}
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-3">{ob.obligation}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Argumentos Tab ─── */}
        <TabsContent value="argumentos" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-3">
              <div className="grid grid-cols-4 gap-1.5">
                <div className="rounded border border-border bg-muted/30 p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">Pedidos</p>
                  <p className="text-sm font-bold text-foreground">{argumentAnalysis.summary.claims}</p>
                </div>
                <div className="rounded border border-border bg-muted/30 p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">Premissas</p>
                  <p className="text-sm font-bold text-foreground">{argumentAnalysis.summary.premises}</p>
                </div>
                <div className="rounded border border-border bg-muted/30 p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">Provas</p>
                  <p className="text-sm font-bold text-foreground">{argumentAnalysis.summary.evidence}</p>
                </div>
                <div className="rounded border border-border bg-muted/30 p-1.5 text-center">
                  <p className="text-[8px] text-muted-foreground">Conclusões</p>
                  <p className="text-sm font-bold text-foreground">{argumentAnalysis.summary.conclusions}</p>
                </div>
              </div>
              {argumentAnalysis.gaps.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-destructive">Lacunas</p>
                  {argumentAnalysis.gaps.map((g, i) => (
                    <div key={i} className="flex gap-1.5 p-2 rounded border border-destructive/20 bg-destructive/5">
                      <AlertTriangle className="h-3 w-3 text-destructive shrink-0 mt-0.5" />
                      <p className="text-[9px] text-foreground">{g.message}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1">
                {argumentAnalysis.segments.slice(0, 20).map((seg, i) => {
                  const roleColors: Record<string, string> = {
                    claim: "border-blue-500/30 bg-blue-500/5",
                    premise: "border-amber-500/30 bg-amber-500/5",
                    evidence: "border-green-500/30 bg-green-500/5",
                    conclusion: "border-purple-500/30 bg-purple-500/5",
                  };
                  const roleLabels: Record<string, string> = { claim: "Pedido", premise: "Premissa", evidence: "Prova", conclusion: "Conclusão" };
                  return (
                    <div key={i} className={`p-2 rounded border ${roleColors[seg.role] || "border-border"}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Badge variant="outline" className="text-[8px] h-3.5 px-1">{roleLabels[seg.role]}</Badge>
                        <span className="text-[8px] text-muted-foreground">{Math.round(seg.confidence * 100)}%</span>
                      </div>
                      <p className="text-[9px] text-muted-foreground line-clamp-2">{seg.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Benchmarks Tab ─── */}
        <TabsContent value="benchmarks" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {benchmarkResults.map((b, i) => (
                <div key={i} className={`p-2 rounded border ${
                  b.level === "green" ? "border-green-500/30 bg-green-500/5"
                  : b.level === "yellow" ? "border-yellow-500/30 bg-yellow-500/5"
                  : "border-red-500/30 bg-red-500/5"
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-medium text-foreground">{b.provision}</p>
                    <Badge variant="outline" className={`text-[8px] h-3.5 px-1 ${
                      b.level === "green" ? "border-green-500/50 text-green-600"
                      : b.level === "yellow" ? "border-yellow-500/50 text-yellow-600"
                      : "border-red-500/50 text-red-600"
                    }`}>
                      {b.level === "green" ? "✓ OK" : b.level === "yellow" ? "⚠ Atenção" : "✗ Fora do padrão"}
                    </Badge>
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Encontrado: <strong className="text-foreground">{b.extractedValue}</strong> • Padrão: {b.standard}
                  </p>
                  <Badge variant="secondary" className="text-[7px] h-3 px-1 mt-1">
                    Negociabilidade: {b.negotiability}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* ─── Consistência Tab ─── */}
        <TabsContent value="consistencia" className="mt-0 flex-1">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2">
              {consistencyIssues.map((issue, i) => (
                <div key={i} className={`flex gap-2 p-2 rounded border ${
                  issue.severity === "error" ? "border-destructive/20 bg-destructive/5"
                  : issue.severity === "warning" ? "border-yellow-500/20 bg-yellow-500/5"
                  : "border-border bg-card"
                }`}>
                  {issue.severity === "error" ? <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                   : issue.severity === "warning" ? <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                   : <Info className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-foreground">{issue.message}</p>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{issue.location}</p>
                    <Badge variant="outline" className="text-[7px] h-3 px-1 mt-1">{issue.type.replace(/_/g, " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

      </Tabs>
    </div>
  );
}

function AggressiveTermCard({ term }: { term: AggressiveTerm }) {
  const severityColor = term.severity === "alto"
    ? "border-red-500/30 bg-red-500/10"
    : term.severity === "medio"
    ? "border-yellow-500/30 bg-yellow-500/10"
    : "border-border bg-card";

  return (
    <div className={`p-2.5 rounded-lg border ${severityColor}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Badge variant="outline" className={`text-[8px] h-3.5 px-1 ${
          term.severity === "alto" ? "border-red-500/50 text-red-500" : term.severity === "medio" ? "border-yellow-500/50 text-yellow-500" : ""
        }`}>
          {term.severity === "alto" ? "Alto" : term.severity === "medio" ? "Médio" : "Baixo"}
        </Badge>
        <Badge variant="secondary" className="text-[8px] h-3.5 px-1">{getCategoryLabel(term.category)}</Badge>
      </div>
      <p className="text-[10px] text-foreground font-medium mt-1">"{term.matchedText}"</p>
      <p className="text-[9px] text-muted-foreground mt-1">{term.explanation}</p>
      <p className="text-[9px] text-primary mt-1">💡 {term.suggestion}</p>
    </div>
  );
}

function RiskFactorRow({ factor }: { factor: RiskFactor }) {
  const Icon = factor.status === "positive" ? TrendingUp : factor.status === "negative" ? TrendingDown : Minus;
  const colorClass = factor.status === "positive" ? "text-green-500" : factor.status === "negative" ? "text-red-500" : "text-muted-foreground";

  return (
    <div className="flex items-start gap-1.5 p-1.5 rounded border border-border bg-card">
      <Icon className={`h-3 w-3 shrink-0 mt-0.5 ${colorClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium text-foreground">{factor.label}</p>
        {factor.detail && <p className="text-[9px] text-muted-foreground">{factor.detail}</p>}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 px-2.5 py-1.5">
      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
