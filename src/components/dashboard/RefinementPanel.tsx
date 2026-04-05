import { useState } from "react";
import { Lightbulb, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RefinementPanelProps {
  questions: string[];
  onRefine: (responses: Record<string, string>) => void;
  onSkip: () => void;
  isRefining: boolean;
}

export function RefinementPanel({ questions, onRefine, onSkip, isRefining }: RefinementPanelProps) {
  const [responses, setResponses] = useState<Record<string, string>>({});

  const handleChange = (question: string, value: string) => {
    setResponses((prev) => ({ ...prev, [question]: value }));
  };

  const hasAnyResponse = Object.values(responses).some((v) => v.trim().length > 0);

  const handleSubmit = () => {
    const filled = Object.fromEntries(
      Object.entries(responses).filter(([, v]) => v.trim().length > 0)
    );
    onRefine(filled);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            Quer personalizar ainda mais?
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSkip} disabled={isRefining}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Responda as perguntas abaixo para tornar o documento mais específico ao seu caso. Campos em branco são ignorados.
      </p>

      <div className="space-y-3">
        {questions.map((q, idx) => (
          <div key={idx} className="space-y-1">
            <Label className="text-xs text-foreground">{q}</Label>
            <Input
              className="h-8 text-xs"
              placeholder="Opcional..."
              value={responses[q] || ""}
              onChange={(e) => handleChange(q, e.target.value)}
              disabled={isRefining}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          className="text-xs"
          onClick={handleSubmit}
          disabled={!hasAnyResponse || isRefining}
        >
          {isRefining ? (
            <>
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Refinando...
            </>
          ) : (
            <>
              <Send className="h-3 w-3 mr-1" />
              Refinar com Detalhes
            </>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onSkip} disabled={isRefining}>
          Pular
        </Button>
      </div>
    </div>
  );
}
