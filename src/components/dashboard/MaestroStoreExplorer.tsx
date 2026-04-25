import { useState } from "react";
import { Brain, Sparkles, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";

export default function MaestroStoreExplorer({ stores }: { stores: any[] }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const askMaestro = async () => {
    setLoading(true);
    try {
      const summary = stores.map(s => `${s.creator_name} (${s.product_count} produtos em ${s.categories.join(", ")})`).join("; ");
      const response = await processInteraction({
        question: `Com base nessas lojas do marketplace Órion: ${summary}, qual você me recomenda explorar primeiro considerando tendências de 2026?`,
        chatHistory: [],
        intent: "textual"
      });
      setAdvice(response);
    } catch (e) {
      setAdvice("Não consegui conectar com o núcleo Maestro.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[hsl(var(--tron-bg-deep))] border border-[hsl(var(--tron-neon)/0.2)] p-4 rounded-lg mb-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-5 w-5 text-[hsl(var(--tron-neon))]" />
          <div>
            <h3 className="text-sm font-bold text-[hsl(var(--tron-neon))]">RECOMENDAÇÃO MAESTRO</h3>
            <p className="text-[10px] text-muted-foreground uppercase">Curadoria neural de ecossistema</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={askMaestro}
          disabled={loading}
          className="bg-[hsl(var(--tron-neon)/0.1)] border border-[hsl(var(--tron-neon)/0.3)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.2)] h-8 gap-2"
        >
          {loading ? "SINCRO..." : <><Sparkles className="h-3 w-3" /> SUGERIR LOJA</>}
        </Button>
      </div>
      {advice && (
        <div className="mt-3 p-3 bg-black/20 rounded border border-[hsl(var(--tron-neon)/0.1)] text-xs text-[hsl(var(--tron-neon)/0.9)] leading-relaxed animate-in slide-in-from-top-1">
          {advice}
          <button className="block mt-2 text-[9px] underline opacity-50 hover:opacity-100" onClick={() => setAdvice(null)}>OCULTAR</button>
        </div>
      )}
    </div>
  );
}
