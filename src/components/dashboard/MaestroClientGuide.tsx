import { useState } from "react";
import { Brain, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";

export default function MaestroClientGuide({ procesos, clientName }: { procesos: any[], clientName: string }) {
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateGuide = async () => {
    setLoading(true);
    try {
      const summary = procesos.map(p => `Processo ${p.numero_processo}: ${p.status} (Tipo: ${p.tipo})`).join(", ");
      const response = await processInteraction({
        question: `Olá Maestro, sou ${clientName}. Com base nos meus processos: ${summary || "nenhum ativo"}, o que devo priorizar ou saber sobre meus andamentos hoje?`,
        chatHistory: [],
        intent: "textual"
      });
      setGuide(response);
    } catch (e) {
      setGuide("Erro ao sincronizar com o núcleo Maestro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--tron-bg-deep))] border border-[hsl(var(--tron-neon)/0.2)] p-4 rounded-lg mb-6 shadow-[0_0_15px_rgba(0,255,136,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-[hsl(var(--tron-neon)/0.1)] border border-[hsl(var(--tron-neon)/0.3)]">
            <Brain className="h-5 w-5 text-[hsl(var(--tron-neon))]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--tron-neon))] tracking-tight">MAESTRO: RESUMO COGNITIVO</h3>
            <p className="text-[10px] text-[hsl(var(--tron-neon)/0.6)] uppercase">Análise estratégica de seus processos</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={generateGuide}
          disabled={loading}
          className="bg-[hsl(var(--tron-neon)/0.15)] border border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.25)] h-8 gap-2"
        >
          {loading ? "SINCRO..." : <><Sparkles className="h-3 w-3" /> ANALISAR</>}
        </Button>
      </div>

      {guide && (
        <div className="mt-4 p-3 bg-black/30 rounded border border-[hsl(var(--tron-neon)/0.1)] text-xs text-[hsl(var(--tron-neon)/0.95)] leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-2">
          {guide}
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" className="h-6 text-[9px] text-[hsl(var(--tron-neon)/0.5)]" onClick={() => setGuide(null)}>FECHAR</Button>
          </div>
        </div>
      )}
    </div>
  );
}
