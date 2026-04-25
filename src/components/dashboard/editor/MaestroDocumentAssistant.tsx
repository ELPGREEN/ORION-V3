import { useState } from "react";
import { Brain, Sparkles, FileSearch, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";
import { toast } from "sonner";

export default function MaestroDocumentAssistant({ content, onApply }: { content: string, onApply: (t: string) => void }) {
  const [loading, setLoading] = useState(false);

  const performNeuralReview = async () => {
    if (content.length < 50) {
      toast.error("Documento muito curto para análise neural.");
      return;
    }
    setLoading(true);
    try {
      const response = await processInteraction({
        question: "Realize uma revisão profunda deste documento: identifique riscos jurídicos, lacunas de fundamentação e sugira melhorias na estrutura.",
        chatHistory: [],
        context: content,
        intent: "textual"
      });
      onApply(response);
      toast.success("Análise Maestro concluída!");
    } catch (e) {
      toast.error("Falha na orquestração de revisão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={performNeuralReview}
      disabled={loading}
      className="border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.1)] gap-2 h-8"
    >
      <Brain className="h-4 w-4" />
      {loading ? "REVISANDO..." : "REVISÃO MAESTRO"}
    </Button>
  );
}
