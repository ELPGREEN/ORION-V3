import { useState } from "react";
import { Brain, Sparkles, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";

export default function MaestroSearchGuide({ results }: { results: any[] }) {
  const [strategy, setStrategy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeResults = async () => {
    setLoading(true);
    try {
      const summary = results.slice(0, 5).map(r => `${r.title} (Fonte: ${r.source})`).join("; ");
      const response = await processInteraction({
        question: `Com base nestes resultados de pesquisa: ${summary}, qual o melhor caminho para fundamentar uma tese jurídica sólida?`,
        chatHistory: [],
        intent: "textual"
      });
      setStrategy(response);
    } catch (e) {
      setStrategy("Erro ao processar estratégia neural.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--tron-bg-deep))] border border-[hsl(var(--tron-neon)/0.2)] p-4 rounded-lg mb-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gavel className="h-5 w-5 text-[hsl(var(--tron-neon))]" />
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--tron-neon))]">ESTRATEGISTA MAESTRO</h3>
            <p className="text-[10px] text-muted-foreground uppercase">Análise de jurisprudência e doutrina</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={analyzeResults}
          disabled={loading || results.length === 0}
          className="bg-[hsl(var(--tron-neon)/0.1)] border border-[hsl(var(--tron-neon)/0.3)] text-[hsl(var(--tron-neon))] h-8 gap-2"
        >
          {loading ? "SINCRO..." : <><Sparkles className="h-3 w-3" /> GERAR TESE</>}
        </Button>
      </div>
      {strategy && (
        <div className="mt-4 p-3 bg-black/30 rounded border border-[hsl(var(--tron-neon)/0.1)] text-xs text-[hsl(var(--tron-neon)/0.9)] leading-relaxed whitespace-pre-wrap animate-in fade-in zoom-in-95">
          {strategy}
          <div className="mt-2 text-right">
            <button className="text-[9px] text-[hsl(var(--tron-neon)/0.4)] underline hover:text-[hsl(var(--tron-neon))]" onClick={() => setStrategy(null)}>FECHAR</button>
          </div>
        </div>
      )}
    </div>
  );
}
