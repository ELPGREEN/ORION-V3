import { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Progress } from "@/components/ui/progress";
import {
  AlertCircle, Loader2, ChevronDown, ChevronUp,
  Shield, FileSearch, Sparkles, PlusCircle, RefreshCw, XCircle,
  Type, AlignLeft, BookOpen, Scale, Pen, CalendarDays, List, Hash, FileText,
  CheckCircle2, Clock,
} from "lucide-react";
// [REMOVED] import type { StructuralAnalysis, DocumentElement } from "@/hooks/useAIRealtimeReview";

// ─── Element type config ───

const ELEMENT_CONFIG: Record<string, { label: string; icon: typeof Type; className: string }> = {
  title:         { label: "Títulos",        icon: Type,         className: "text-primary border-primary/20" },
  subtitle:      { label: "Subtítulos",     icon: Type,         className: "text-accent-foreground border-accent/20" },
  paragraph:     { label: "Parágrafos",     icon: AlignLeft,    className: "text-muted-foreground border-border" },
  citation:      { label: "Citações Legais",icon: BookOpen,     className: "text-primary border-primary/20" },
  jurisprudence: { label: "Jurisprudência", icon: Scale,        className: "text-accent-foreground border-accent/20" },
  article:       { label: "Artigos de Lei", icon: Hash,         className: "text-primary border-primary/20" },
  signature:     { label: "Assinaturas",    icon: Pen,          className: "text-muted-foreground border-border" },
  date:          { label: "Datas",          icon: CalendarDays, className: "text-muted-foreground border-border" },
  list:          { label: "Listas",         icon: List,         className: "text-muted-foreground border-border" },
  header:        { label: "Cabeçalhos",     icon: FileText,     className: "text-primary border-primary/20" },
  clause:        { label: "Cláusulas",      icon: FileText,     className: "text-accent-foreground border-accent/20" },
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min atrás`;
  return `${Math.floor(minutes / 60)}h atrás`;
}

// ─── Structural Analysis Panel ───

interface AIStructuralPanelProps {
  analysis: StructuralAnalysis | null;
  loading: boolean;
  onRefresh: () => void | Promise<void>;
  onInsertSection?: (text: string, sectionName: string) => void;
}

const COOLDOWN_MS = 10_000;

export function AIStructuralPanel({ analysis, loading, onRefresh, onInsertSection }: AIStructuralPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showElements, setShowElements] = useState(true);
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<Date | null>(null);
  const [cooldown, setCooldown] = useState(false);
  const retryCountRef = useRef(0);

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
        : `Falha ao analisar estrutura. Tentativa ${retryCountRef.current}/3.`;
      setError(msg);
    } finally {
      // Cooldown to prevent spamming
      setCooldown(true);
      setTimeout(() => setCooldown(false), COOLDOWN_MS);
    }
  };

  const totalSections = analysis
    ? analysis.presentSections.length + analysis.missingSections.length
    : 0;
  const completeness = totalSections > 0
    ? Math.round((analysis!.presentSections.length / totalSections) * 100)
    : 0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors border-b border-border/30">
        <div className="flex items-center gap-1.5">
          <FileSearch className="h-3 w-3 text-primary/60" />
          <span className="font-medium">Análise Estrutural IA</span>
          {loading && <Loader2 className="h-2.5 w-2.5 animate-spin text-primary" />}
        </div>
        <div className="flex items-center gap-1">
          {analysis && (
            <Badge
              variant="outline"
              className={`text-[8px] h-4 px-1.5 font-bold ${
                analysis.score >= 80 ? "border-primary/30 text-primary" :
                analysis.score >= 50 ? "border-warning/30 text-warning" :
                "border-destructive/30 text-destructive"
              }`}
            >
              {analysis.score}%
            </Badge>
          )}
          {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="border-b border-border/30 overflow-hidden">
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

          {!analysis && !loading && !error && (
            <div className="p-3 flex flex-col items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground text-center">
                Analise a completude estrutural do documento com IA
              </p>
              <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={handleRefresh} disabled={cooldown}>
                <Sparkles className="h-3 w-3" /> Analisar Estrutura
              </Button>
            </div>
          )}

          {loading && (
            <div className="p-4 flex flex-col items-center gap-1.5">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-[10px] text-muted-foreground">Analisando estrutura...</p>
            </div>
          )}

          {analysis && !loading && (
            <ScrollArea className="max-h-[350px] overflow-y-auto">
              <div className="p-2 space-y-2">
                {/* Completeness bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground font-medium">Completude</span>
                    <span className={`text-[9px] font-bold ${
                      completeness >= 80 ? "text-primary" :
                      completeness >= 50 ? "text-warning" :
                      "text-destructive"
                    }`}>
                      {completeness}% — {analysis.presentSections.length}/{totalSections} seções
                    </span>
                  </div>
                  <Progress
                    value={completeness}
                    className="h-1.5"
                  />
                </div>

                {analysis.summary && (
                  <p className="text-[10px] text-muted-foreground bg-muted/30 rounded p-2 leading-relaxed">
                    {analysis.summary}
                  </p>
                )}

                {/* Detected Elements */}
                {analysis.elements && analysis.elements.length > 0 && (
                  <div className="space-y-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full h-5 text-[8px] text-muted-foreground gap-1 justify-start px-1"
                      onClick={() => setShowElements(!showElements)}
                    >
                      <FileSearch className="h-2.5 w-2.5" />
                      {showElements ? "Ocultar" : "Mostrar"} Elementos Detectados ({analysis.elements.length})
                      {showElements ? <ChevronUp className="h-2.5 w-2.5 ml-auto" /> : <ChevronDown className="h-2.5 w-2.5 ml-auto" />}
                    </Button>

                    {showElements && (
                      <div className="grid grid-cols-2 gap-1">
                        {analysis.elements.map((el, i) => {
                          const config = ELEMENT_CONFIG[el.type] || { label: el.type, icon: FileText, className: "text-muted-foreground border-border" };
                          const Icon = config.icon;
                          return (
                            <div key={i} className={`p-1.5 rounded border ${config.className} bg-card/50`}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <Icon className="h-2.5 w-2.5 shrink-0" />
                                <span className="text-[8px] font-semibold truncate">{config.label}</span>
                                <Badge variant="outline" className="text-[7px] h-3 px-1 ml-auto border-current/20">
                                  {el.count}
                                </Badge>
                              </div>
                              <p className="text-[8px] opacity-60 truncate italic" title={el.text}>
                                "{el.text}"
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Missing critical */}
                {analysis.missingSections.filter(s => s.importance === "critical").length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold text-destructive uppercase tracking-wider flex items-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5" /> Obrigatórias Ausentes
                    </p>
                    {analysis.missingSections.filter(s => s.importance === "critical").map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1.5 rounded border border-destructive/15 bg-destructive/5">
                        <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
                        <span className="text-[10px] flex-1">{s.name}</span>
                        {onInsertSection && s.suggestion && (
                          <Button variant="outline" size="sm" className="h-5 text-[8px] px-1.5 gap-0.5 shrink-0"
                            onClick={() => onInsertSection(s.suggestion, s.name)}>
                            <PlusCircle className="h-2.5 w-2.5" />Inserir
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing recommended */}
                {analysis.missingSections.filter(s => s.importance === "recommended").length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-semibold text-warning uppercase tracking-wider">
                      Recomendadas
                    </p>
                    {analysis.missingSections.filter(s => s.importance === "recommended").map((s, i) => (
                      <div key={i} className="flex items-center gap-1.5 p-1.5 rounded border border-warning/15 bg-warning/5">
                        <span className="text-warning text-[10px]">○</span>
                        <span className="text-[10px] text-muted-foreground flex-1">{s.name}</span>
                        {onInsertSection && s.suggestion && (
                          <Button variant="ghost" size="sm" className="h-5 text-[8px] px-1 shrink-0"
                            onClick={() => onInsertSection(s.suggestion, s.name)}>
                            <PlusCircle className="h-2.5 w-2.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Present sections */}
                {analysis.presentSections.length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5" /> Presentes ({analysis.presentSections.length})
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {analysis.presentSections.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-[8px] h-4 px-1.5 border-primary/20 text-primary/70">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer: Reanalisar + timestamp */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 h-6 text-[9px] text-muted-foreground gap-1"
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
            </ScrollArea>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
