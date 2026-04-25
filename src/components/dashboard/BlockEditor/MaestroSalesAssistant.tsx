import { useState } from "react";
import { Brain, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { processInteraction } from "@/lib/neural/orion-ai-client";
import { toast } from "sonner";

export default function MaestroSalesAssistant({ onCopyGenerated }: { onCopyGenerated: (copy: string) => void }) {
  const [loading, setLoading] = useState(false);

  const generateCopy = async () => {
    const context = "Produto: Plataforma LegalTech com IA Neural. Público: Advogados e gestores jurídicos.";
    setLoading(true);
    try {
      const response = await processInteraction({
        question: "Gere uma headline matadora e uma sub-headline persuasiva para este produto.",
        chatHistory: [],
        context,
        intent: "textual"
      });
      onCopyGenerated(response);
      toast.success("Copy gerada com sucesso pelo Maestro!");
    } catch (e) {
      toast.error("Falha na orquestração neural.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={generateCopy}
      disabled={loading}
      className="border-[hsl(var(--tron-neon)/0.4)] text-[hsl(var(--tron-neon))] hover:bg-[hsl(var(--tron-neon)/0.1)] gap-2"
    >
      <Brain className="h-4 w-4" />
      {loading ? "ORQUESTRANDO..." : "AI COPYWRITER"}
    </Button>
  );
}
