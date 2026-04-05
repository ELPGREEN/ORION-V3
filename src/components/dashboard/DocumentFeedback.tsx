import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown, Star, Send, Loader2, CheckCircle2, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DocumentFeedbackProps {
  documentType: string;
  generatedContent: string;
  provider?: string;
  promptVersionId?: string;
  onFeedbackSubmitted?: () => void;
}

export function DocumentFeedback({
  documentType,
  generatedContent,
  provider,
  promptVersionId,
  onFeedbackSubmitted,
}: DocumentFeedbackProps) {
  const { toast } = useToast();
  const [thumbs, setThumbs] = useState<"up" | "down" | null>(null);
  const [stars, setStars] = useState(0);
  const [hoverStar, setHoverStar] = useState(0);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState<number | null>(null);

  // Fetch count of previous feedbacks for this document type
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const { count } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .in("interaction_type", ["document_generation", "document_feedback"])
          .not("quality_score", "is", null);
        
        // We can't filter by jsonb in the count query easily via client, so we use total count
        setFeedbackCount(count || 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
  }, [documentType]);

  const handleThumbClick = (value: "up" | "down") => {
    setThumbs(value);
    if (value === "down") {
      setShowComment(true);
    }
    if (value === "up" && stars === 0) setStars(4);
    if (value === "down" && stars === 0) setStars(2);
  };

  const handleSubmit = async () => {
    if (!thumbs) return;

    setSubmitting(true);
    try {
      const qualityScore = stars > 0 ? stars / 5 : (thumbs === "up" ? 0.8 : 0.3);

      const { data: { user } } = await supabase.auth.getUser();

      const { error: learningError } = await supabase.from("neural_learning_data").insert({
        interaction_type: "document_feedback",
        input_text: `[Feedback] Tipo: ${documentType} | Avaliação: ${thumbs} | Estrelas: ${stars}/5`,
        output_text: generatedContent.substring(0, 10000),
        quality_score: qualityScore,
        feedback: comment || (thumbs === "up" ? "Aprovado pelo usuário" : "Reprovado pelo usuário"),
        learned: qualityScore >= 0.6,
        user_id: user?.id ?? null,
        metadata: {
          thumbs,
          stars,
          documentType,
          tipo: documentType,
          provider: provider || "unknown",
          prompt_version_id: promptVersionId || null,
          feedbackSource: "user_manual",
          contentLength: generatedContent.length,
          timestamp: new Date().toISOString(),
        } as any,
      });

      if (learningError) throw learningError;

      if (qualityScore >= 0.7 && generatedContent.length > 1000) {
        if (user) {
          await supabase.from("neural_knowledge_base").insert({
            user_id: user.id,
            title: `Documento aprovado: ${documentType} - ${new Date().toLocaleDateString("pt-BR")}`,
            content: generatedContent.substring(0, 5000),
            source_type: "modelo_documento",
            source_reference: `feedback:${documentType}:${qualityScore.toFixed(2)}`,
            tags: [documentType, "user-approved", `score-${Math.round(qualityScore * 10)}`],
            is_processed: false,
          });
        }
      }

      setSubmitted(true);
      toast({
        title: "Feedback registrado!",
        description: "Sua avaliação ajuda a rede neural a melhorar os próximos documentos.",
      });
      onFeedbackSubmitted?.();
    } catch (err) {
      toast({
        title: "Erro ao enviar feedback",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <span className="text-xs text-muted-foreground">
            Feedback registrado — a rede neural vai aprender com esta avaliação.
          </span>
        </div>
        {feedbackCount !== null && feedbackCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-md">
            <Brain className="h-3.5 w-3.5 text-primary/70" />
            <span className="text-[11px] text-muted-foreground">
              A rede neural já aprendeu com <strong>{feedbackCount}</strong> avaliações. Sua avaliação melhora a próxima geração de <strong>{documentType}</strong>.
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 bg-card border border-border rounded-lg">
      <p className="text-xs font-medium text-foreground">
        Como ficou o documento gerado?
      </p>

      <div className="flex items-center gap-4">
        {/* Thumbs */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              thumbs === "up" && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
            onClick={() => handleThumbClick("up")}
          >
            <ThumbsUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 w-8 p-0",
              thumbs === "down" && "bg-destructive/10 text-destructive hover:bg-destructive/20"
            )}
            onClick={() => handleThumbClick("down")}
          >
            <ThumbsDown className="h-4 w-4" />
          </Button>
        </div>

        {/* Star rating */}
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              className="p-0.5 transition-colors"
              onMouseEnter={() => setHoverStar(s)}
              onMouseLeave={() => setHoverStar(0)}
              onClick={() => setStars(s)}
            >
              <Star
                className={cn(
                  "h-4 w-4 transition-colors",
                  (hoverStar || stars) >= s
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
          {stars > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">{stars}/5</span>
          )}
        </div>

        {/* Toggle comment */}
        {!showComment && thumbs && (
          <button
            className="text-[10px] text-muted-foreground hover:text-foreground underline"
            onClick={() => setShowComment(true)}
          >
            Adicionar comentário
          </button>
        )}

        {/* Submit */}
        {thumbs && !showComment && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs ml-auto"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
            ) : (
              <Send className="h-3 w-3 mr-1" />
            )}
            Enviar
          </Button>
        )}
      </div>

      {/* Comment area */}
      {showComment && (
        <div className="space-y-2">
          <Textarea
            placeholder={
              thumbs === "down"
                ? "O que pode ser melhorado? (ex: fundamentação fraca, faltou jurisprudência...)"
                : "Algum comentário adicional? (opcional)"
            }
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-xs min-h-[60px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              size="sm"
              className="text-xs"
              onClick={handleSubmit}
              disabled={submitting || !thumbs}
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Enviar Feedback
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
