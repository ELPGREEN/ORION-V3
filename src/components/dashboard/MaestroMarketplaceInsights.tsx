import { useState } from "react";
import { Brain, Sparkles, TrendingUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { processInteraction } from "@/lib/neural/orion-ai-client";

export default function MaestroMarketplaceInsights({ products }: { products: any[] }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    try {
      const productSummary = products.map(p => `${p.title} (R$ ${p.price_cents/100}, ${p.commission_percent}% comissão)`).join(", ");
      const response = await processInteraction({
        question: `Analise estes produtos do marketplace e sugira as 3 melhores oportunidades para um afiliado hoje: ${productSummary}`,
        chatHistory: [],
        intent: "textual"
      });
      setInsight(response);
    } catch (e) {
      setInsight("Erro ao gerar insights neurais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-bold text-[hsl(var(--tron-neon))] flex items-center gap-2">
          <Brain className="h-4 w-4" />
          MAESTRO MARKETPLACE INSIGHTS
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insight ? (
          <div className="text-xs text-[hsl(var(--tron-neon)/0.9)] leading-relaxed bg-black/20 p-3 rounded border border-[hsl(var(--tron-neon)/0.1)]">
            {insight}
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 text-[10px] h-6 text-[hsl(var(--tron-neon)/0.6)] hover:text-[hsl(var(--tron-neon))]"
              onClick={() => setInsight(null)}
            >
              LIMPAR
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <p className="text-xs text-muted-foreground mb-4 max-w-xs">
              Deixe o Maestro analisar as tendências do marketplace e recomendar os melhores produtos para sua rede.
            </p>
            <Button
              size="sm"
              onClick={generateInsight}
              disabled={loading || products.length === 0}
              className="bg-[hsl(var(--tron-neon)/0.15)] border border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.25)] gap-2"
            >
              {loading ? "ANALISANDO..." : <><Sparkles className="h-3 w-3" /> GERAR RECOMENDAÇÕES</>}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
