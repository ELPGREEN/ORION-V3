/**
 * ─── AI Feedback Buttons ───
 * 
 * Reusable 👍/👎 feedback component that feeds neural_learning_data.
 * Compact, drop-in component for any AI response.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { processReward, type FeedbackSignal } from "@/lib/neural/reward-loop";

interface AIFeedbackButtonsProps {
  inputText: string;
  outputText: string;
  interactionType: string;
  provider?: string;
  metadata?: Record<string, unknown>;
  className?: string;
  size?: "sm" | "xs";
}

export function AIFeedbackButtons({
  inputText,
  outputText,
  interactionType,
  provider,
  metadata,
  className,
  size = "xs",
}: AIFeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleFeedback = async (type: "up" | "down") => {
    if (feedback || loading) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const qualityScore = type === "up" ? 0.9 : 0.2;

      const { error } = await supabase.from("neural_learning_data").insert({
        interaction_type: interactionType,
        input_text: inputText.substring(0, 5000),
        output_text: outputText.substring(0, 10000),
        quality_score: qualityScore,
        feedback: type === "up" ? "Aprovado pelo usuário" : "Reprovado pelo usuário",
        learned: qualityScore >= 0.6,
        user_id: user?.id ?? null,
        metadata: {
          thumbs: type,
          provider: provider ?? "unknown",
          ...metadata,
          timestamp: new Date().toISOString(),
        },
      } as any);

      if (error) throw error;
      setFeedback(type);

      // Feed reward loop
      const signal: FeedbackSignal = {
        interactionId: crypto.randomUUID(),
        userId: user?.id || "anonymous",
        provider: provider ?? "unknown",
        domain: interactionType,
        feedbackType: type === "up" ? "thumbs_up" : "thumbs_down",
        value: type === "up" ? 1 : -1,
        timestamp: Date.now(),
      };
      processReward(signal);
    } catch (err) {
      toast({
        title: "Erro ao registrar feedback",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const btnCls = size === "xs"
    ? "h-6 w-6 p-0"
    : "h-7 px-2";
  const iconCls = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";

  if (loading) {
    return <Loader2 className={cn("animate-spin text-muted-foreground", iconCls)} />;
  }

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          btnCls,
          "text-muted-foreground hover:text-primary",
          feedback === "up" && "bg-primary/10 text-primary"
        )}
        onClick={() => handleFeedback("up")}
        disabled={!!feedback}
        title="Resposta útil"
      >
        <ThumbsUp className={iconCls} />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          btnCls,
          "text-muted-foreground hover:text-destructive",
          feedback === "down" && "bg-destructive/10 text-destructive"
        )}
        onClick={() => handleFeedback("down")}
        disabled={!!feedback}
        title="Resposta não útil"
      >
        <ThumbsDown className={iconCls} />
      </Button>
    </div>
  );
}
