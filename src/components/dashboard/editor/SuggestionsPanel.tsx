import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Check, X, CheckCheck, XCircle, FileSearch, Loader2 } from "lucide-react";
import type { Suggestion } from "./types";

interface SuggestionsPanelProps {
  suggestions: Suggestion[];
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onClickSuggestion?: (id: string) => void;
  // Review mode props
  isReviewing?: boolean;
  reviewProgress?: number;
  onStartReview?: () => void;
  reviewSummary?: { totalSuggestions: number; risks: number; improvements: number };
}

export function SuggestionsPanel({
  suggestions,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onClickSuggestion,
  isReviewing,
  reviewProgress,
  onStartReview,
  reviewSummary,
}: SuggestionsPanelProps) {
  const pending = suggestions.filter((s) => s.status === "pending");
  const decided = suggestions.filter((s) => s.status !== "pending");

  const typeLabel: Record<string, string> = {
    insert: "Inserção",
    delete: "Remoção",
    replace: "Substituição",
    simplify: "Simplificação",
  };

  const typeColor: Record<string, string> = {
    insert: "text-green-600 bg-green-500/10",
    delete: "text-red-600 bg-red-500/10",
    replace: "text-blue-600 bg-blue-500/10",
    simplify: "text-purple-600 bg-purple-500/10",
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Lightbulb className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Sugestões IA</span>
        {pending.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">{pending.length}</Badge>
        )}
        <div className="flex-1" />
        {pending.length > 1 && (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onAcceptAll}>
              <CheckCheck className="h-3 w-3 mr-1" />Aceitar Todas
            </Button>
            <Button variant="outline" size="sm" className="h-6 text-[10px]" onClick={onRejectAll}>
              <XCircle className="h-3 w-3 mr-1" />Rejeitar Todas
            </Button>
          </div>
        )}
      </div>

      {/* Review Banner */}
      {(onStartReview || isReviewing || reviewSummary) && (
        <div className="px-3 py-2 border-b border-border bg-primary/5 space-y-2">
          {isReviewing ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs text-primary">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="font-medium">Revisão em andamento...</span>
              </div>
              <Progress value={reviewProgress ?? 0} className="h-1.5 [&>div]:bg-primary" />
            </div>
          ) : reviewSummary ? (
            <div className="space-y-1">
              <p className="text-[10px] font-medium text-foreground">Revisão Concluída</p>
              <div className="flex gap-2 text-[9px] text-muted-foreground">
                <span><strong className="text-foreground">{reviewSummary.totalSuggestions}</strong> sugestões</span>
                <span><strong className="text-red-500">{reviewSummary.risks}</strong> riscos</span>
                <span><strong className="text-green-500">{reviewSummary.improvements}</strong> melhorias</span>
              </div>
            </div>
          ) : onStartReview ? (
            <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={onStartReview}>
              <FileSearch className="h-3.5 w-3.5 mr-1.5" />
              Revisar Documento com IA
            </Button>
          ) : null}
        </div>
      )}

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {pending.length === 0 && decided.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Nenhuma sugestão pendente.
              <br />
              A IA pode sugerir alterações ao revisar o documento.
            </div>
          )}

          {pending.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors cursor-pointer"
              onClick={() => onClickSuggestion?.(s.id)}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className={`text-[9px] h-4 ${typeColor[s.type]}`}>
                  {typeLabel[s.type]}
                </Badge>
                <span className="text-[10px] text-muted-foreground">
                  {s.authorName} • {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>

              {(s.type === "delete" || s.type === "replace" || s.type === "simplify") ? (
                <div className="text-xs mb-1">
                  <span className="line-through text-red-500/80">{s.originalText}</span>
                </div>
              ) : null}

              {(s.type === "insert" || s.type === "replace" || s.type === "simplify") ? (
                <div className="text-xs text-green-600 bg-green-500/5 rounded px-1.5 py-1">
                  + {s.suggestedText}
                </div>
              ) : null}

              <div className="flex gap-1 mt-2">
                <Button
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={(e) => { e.stopPropagation(); onAccept(s.id); }}
                >
                  <Check className="h-3 w-3 mr-1" />Aceitar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px]"
                  onClick={(e) => { e.stopPropagation(); onReject(s.id); }}
                >
                  <X className="h-3 w-3 mr-1" />Rejeitar
                </Button>
              </div>
            </div>
          ))}

          {decided.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pt-2">
                Histórico ({decided.length})
              </div>
              {decided.map((s) => (
                <div
                  key={s.id}
                  className="p-2 rounded border border-border/50 bg-muted/30 opacity-60 text-[11px]"
                >
                  <Badge
                    variant={s.status === "accepted" ? "default" : "destructive"}
                    className="text-[9px] h-4 mr-1"
                  >
                    {s.status === "accepted" ? "Aceita" : "Rejeitada"}
                  </Badge>
                  <span className="text-muted-foreground">{s.suggestedText || s.originalText}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
