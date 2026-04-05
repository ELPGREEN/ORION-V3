import { useState, useMemo, useCallback } from "react";
import { Search, BookOpen, Plus, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { rankByEnsemble } from "@/lib/analysis";
import { agentePesquisa } from "@/lib/api";

interface LegalReferenceSearchProps {
  selectedText: string;
  onInsertReference: (ref: string) => void;
}

interface SuggestedReference {
  text: string;
  type: string;
  formatted: string;
  keywords: string;
  source?: string;
}

// ─── Local reference database (fallback) ───
const REFERENCE_DATABASE: SuggestedReference[] = [
  // Constitucional
  { text: "Art. 1º, CF/88", type: "artigo", formatted: "Art. 1º da Constituição Federal de 1988", keywords: "fundamento república federativa soberania cidadania dignidade valores sociais trabalho livre iniciativa pluralismo político" },
  { text: "Art. 5º, CF/88", type: "artigo", formatted: "Art. 5º da Constituição Federal de 1988", keywords: "direito garantia fundamental liberdade igualdade propriedade segurança vida inviolabilidade" },
  { text: "Art. 5º, LIV e LV, CF/88", type: "artigo", formatted: "Art. 5º, incisos LIV e LV, da Constituição Federal de 1988", keywords: "devido processo legal ampla defesa contraditório" },
  { text: "Art. 5º, XXXV, CF/88", type: "artigo", formatted: "Art. 5º, inciso XXXV, da Constituição Federal de 1988", keywords: "inafastabilidade jurisdição acesso justiça lesão ameaça direito" },
  { text: "Art. 6º, CF/88", type: "artigo", formatted: "Art. 6º da Constituição Federal de 1988", keywords: "direito social educação saúde alimentação trabalho moradia transporte lazer segurança previdência proteção maternidade infância assistência desamparados" },
  { text: "Art. 37, CF/88", type: "artigo", formatted: "Art. 37 da Constituição Federal de 1988", keywords: "administração pública legalidade impessoalidade moralidade publicidade eficiência servidor concurso" },
  // Código Civil
  { text: "Art. 186, CC", type: "artigo", formatted: "Art. 186 da Lei nº 10.406/2002 (Código Civil)", keywords: "ato ilícito ação omissão negligência imprudência imperícia dano direito" },
  { text: "Art. 927, CC", type: "artigo", formatted: "Art. 927 da Lei nº 10.406/2002 (Código Civil)", keywords: "responsabilidade civil dano reparação obrigação ato ilícito independente culpa risco atividade" },
  { text: "Art. 421, CC", type: "artigo", formatted: "Art. 421 da Lei nº 10.406/2002 (Código Civil)", keywords: "contrato liberdade contratar função social limite" },
  { text: "Art. 422, CC", type: "artigo", formatted: "Art. 422 da Lei nº 10.406/2002 (Código Civil)", keywords: "contrato boa fé objetiva probidade contratante" },
  // CPC
  { text: "Art. 319, CPC", type: "artigo", formatted: "Art. 319 da Lei nº 13.105/2015 (CPC)", keywords: "petição inicial requisitos juízo partes causa pedir pedido valor" },
  { text: "Art. 373, CPC", type: "artigo", formatted: "Art. 373 da Lei nº 13.105/2015 (CPC)", keywords: "ônus prova autor réu fato constitutivo impeditivo modificativo extintivo" },
  { text: "Art. 300, CPC", type: "artigo", formatted: "Art. 300 da Lei nº 13.105/2015 (CPC)", keywords: "tutela urgência antecipada cautelar probabilidade direito perigo dano resultado útil" },
  // CP
  { text: "Art. 121, CP", type: "artigo", formatted: "Art. 121 do Decreto-Lei nº 2.848/1940 (Código Penal)", keywords: "homicídio matar alguém simples qualificado privilegiado feminicídio" },
  { text: "Art. 155, CP", type: "artigo", formatted: "Art. 155 do Decreto-Lei nº 2.848/1940 (Código Penal)", keywords: "furto subtrair coisa alheia móvel" },
  // CDC
  { text: "Art. 6º, CDC", type: "artigo", formatted: "Art. 6º da Lei nº 8.078/1990 (Código de Defesa do Consumidor)", keywords: "direito básico consumidor proteção vida saúde informação adequada reparação danos" },
  { text: "Art. 14, CDC", type: "artigo", formatted: "Art. 14 da Lei nº 8.078/1990 (Código de Defesa do Consumidor)", keywords: "responsabilidade fato serviço fornecedor defeito prestação" },
  // CLT
  { text: "Art. 477, CLT", type: "artigo", formatted: "Art. 477 do Decreto-Lei nº 5.452/1943 (CLT)", keywords: "rescisão contrato trabalho verbas rescisórias prazo pagamento multa" },
  { text: "Art. 482, CLT", type: "artigo", formatted: "Art. 482 do Decreto-Lei nº 5.452/1943 (CLT)", keywords: "justa causa demissão falta grave improbidade incontinência mau procedimento" },
  // Súmulas
  { text: "Súmula 7, STJ", type: "súmula", formatted: "Súmula nº 7 do Superior Tribunal de Justiça", keywords: "reexame prova recurso especial fatos matéria fática" },
  { text: "Súmula 301, STJ", type: "súmula", formatted: "Súmula nº 301 do Superior Tribunal de Justiça", keywords: "investigação paternidade recusa DNA presunção" },
  { text: "Súmula Vinculante 10", type: "súmula", formatted: "Súmula Vinculante nº 10 do STF", keywords: "reserva plenário inconstitucionalidade cláusula tribunal pleno" },
];

interface AIReference {
  text: string;
  type: string;
  formatted: string;
  source: string;
}

export function LegalReferenceSearch({ selectedText, onInsertReference }: LegalReferenceSearchProps) {
  const [open, setOpen] = useState(false);
  const [aiResults, setAiResults] = useState<AIReference[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSearched, setAiSearched] = useState(false);

  // Local suggestions (instant)
  const localSuggestions = useMemo(() => {
    if (!selectedText || selectedText.length < 3) return [];
    const ranked = rankByEnsemble(
      selectedText,
      REFERENCE_DATABASE,
      (ref) => `${ref.text} ${ref.formatted} ${ref.keywords}`,
      8
    );
    return ranked.map((r) => ({ ...r.item, score: r.score }));
  }, [selectedText]);

  // AI-powered search via agente-pesquisa
  const searchWithAgent = useCallback(async () => {
    if (!selectedText || selectedText.length < 3 || aiLoading) return;
    setAiLoading(true);
    try {
      const result = await agentePesquisa.legalSearch(selectedText, ["lexml", "datajud_stj", "datajud_tst", "stf"]);
      if (result.success && result.raw_results && (result.raw_results as any[]).length > 0) {
        const refs: AIReference[] = (result.raw_results as any[]).slice(0, 6).map((r: any) => ({
          text: r.title || "Referência",
          type: r.content_type || "jurisprudência",
          formatted: r.title || r.content?.substring(0, 100) || "Referência legal",
          source: r.source_label || r.source || "RAG ELP",
        }));
        setAiResults(refs);
      } else if (result.analysis) {
        // Parse analysis text for references
        const lines = result.analysis.split("\n").filter((l: string) => l.trim().length > 10);
        const refs: AIReference[] = lines.slice(0, 5).map((line: string) => ({
          text: line.replace(/^\d+\.\s*/, "").substring(0, 80),
          type: "análise",
          formatted: line.replace(/^\d+\.\s*/, ""),
          source: "Agente Pesquisador",
        }));
        setAiResults(refs);
      }
    } catch (err) {
    } finally {
      setAiLoading(false);
      setAiSearched(true);
    }
  }, [selectedText, aiLoading]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-popover-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Buscar referência legal"
        >
          <BookOpen className="h-3 w-3" /> Referência
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start" side="bottom">
        <div className="p-3 border-b border-border">
          <p className="text-[10px] text-muted-foreground mb-1">Sugestões para:</p>
          <p className="text-xs font-medium truncate">"{selectedText.slice(0, 60)}{selectedText.length > 60 ? "..." : ""}"</p>
        </div>
        <ScrollArea className="max-h-[300px]">
          {/* Local results (instant) */}
          {localSuggestions.length > 0 && (
            <div className="p-2 space-y-1">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider px-1 font-semibold">Referências Locais</p>
              {localSuggestions.map((s, i) => (
                <button
                  key={`local-${i}`}
                  className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-accent text-left transition-colors group"
                  onClick={() => {
                    onInsertReference(` (${s.formatted})`);
                    setOpen(false);
                  }}
                >
                  <Badge variant="outline" className="text-[7px] h-4 px-1 shrink-0 mt-0.5 border-primary/30 text-primary">
                    {s.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-foreground">{s.text}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{s.formatted}</p>
                  </div>
                  <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}

          {localSuggestions.length === 0 && !aiSearched && (
            <div className="p-4 text-center">
              <Search className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
              <p className="text-[10px] text-muted-foreground">Sem sugestões locais. Use a busca IA abaixo.</p>
            </div>
          )}

          {/* AI results */}
          {aiResults.length > 0 && (
            <div className="p-2 space-y-1 border-t border-border">
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider px-1 font-semibold flex items-center gap-1">
                <Sparkles className="h-2.5 w-2.5 text-primary" /> RAG ELP
              </p>
              {aiResults.map((r, i) => (
                <button
                  key={`ai-${i}`}
                  className="w-full flex items-start gap-2 p-2 rounded-md hover:bg-accent text-left transition-colors group"
                  onClick={() => {
                    onInsertReference(` (${r.formatted})`);
                    setOpen(false);
                  }}
                >
                  <Badge variant="outline" className="text-[7px] h-4 px-1 shrink-0 mt-0.5 border-amber-500/30 text-amber-600">
                    {r.type}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium text-foreground line-clamp-1">{r.text}</p>
                    <p className="text-[9px] text-muted-foreground truncate">{r.source}</p>
                  </div>
                  <Plus className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* AI Search Button */}
        <div className="p-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="w-full h-7 text-[10px] gap-1.5"
            onClick={searchWithAgent}
            disabled={aiLoading || !selectedText || selectedText.length < 3}
          >
            {aiLoading ? (
              <><Loader2 className="h-3 w-3 animate-spin" />Buscando no RAG ELP...</>
            ) : (
              <><Sparkles className="h-3 w-3 text-primary" />Buscar com IA (87k+ fontes)</>
            )}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
