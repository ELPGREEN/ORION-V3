import { useState } from "react";
import { Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";
import { toast } from "sonner";

export default function MaestroEditorialAssistant({ content, onSuggestion }: { content: string, onSuggestion: (s: string) => void }) {
  const [loading, setLoading] = useState(false);

  const optimizeSEO = async () => {
    if (!content || content.length < 100) {
      toast.error("Conteúdo muito curto para análise.");
      return;
    }
    setLoading(true);
    try {
      const response = await processInteraction({
        question: "Analise este artigo e sugira 3 melhorias de SEO e um título mais impactante.",
        chatHistory: [],
        context: content.slice(0, 2000),
        intent: "textual"
      });
      onSuggestion(response);
      toast.success("Sugestões Maestro geradas!");
    } catch (e) {
      toast.error("Erro na orquestração editorial.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={optimizeSEO}
      disabled={loading}
      className="border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.1)] gap-2"
    >
      <Brain className="h-4 w-4" />
      {loading ? "ANALISANDO..." : "MAESTRO SEO"}
    </Button>
  );
}
