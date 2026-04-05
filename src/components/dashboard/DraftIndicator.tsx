import React from "react";
import { CloudOff, Loader2, Check, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DraftIndicatorProps {
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasDraft: boolean;
  onRestore: () => void;
  onClear: () => void;
  showRestoreButton?: boolean;
}

export const DraftIndicator = React.forwardRef<HTMLDivElement, DraftIndicatorProps>(function DraftIndicator({
  isSaving,
  lastSavedAt,
  hasDraft,
  onRestore,
  onClear,
  showRestoreButton = false,
}, ref) {
  const formatTime = (date: Date) => {
    return format(date, "HH:mm:ss", { locale: ptBR });
  };

  return (
    <div ref={ref} className="flex items-center gap-2 text-xs">
      {/* Saving Status */}
      <div className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded-sm">
        {isSaving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
            <span className="text-muted-foreground">Salvando...</span>
          </>
        ) : lastSavedAt ? (
          <>
            <Check className="h-3 w-3 text-primary" />
            <span className="text-muted-foreground">
              Salvo às {formatTime(lastSavedAt)}
            </span>
          </>
        ) : (
          <>
            <CloudOff className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-muted-foreground/50">Não salvo</span>
          </>
        )}
      </div>

      {/* Restore Button */}
      {showRestoreButton && hasDraft && (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-primary hover:text-primary/80"
          onClick={onRestore}
          title="Restaurar dados salvos anteriormente"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Restaurar rascunho
        </Button>
      )}

      {/* Clear Draft Button */}
      {hasDraft && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground/50 hover:text-destructive"
          onClick={onClear}
          title="Limpar rascunho salvo"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});
