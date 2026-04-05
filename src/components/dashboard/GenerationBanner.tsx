import { useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";

interface GenerationBannerProps {
  hasActiveJob: boolean;
  dismissed: boolean;
  onDismiss: () => void;
}

export function GenerationBanner({ hasActiveJob, dismissed, onDismiss }: GenerationBannerProps) {
  const navigate = useNavigate();

  if (!hasActiveJob || dismissed) return null;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-primary/10 border-b border-primary/20 text-sm">
      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary flex-shrink-0" />
      <span className="text-foreground flex-1">
        <span className="font-medium">Documento sendo gerado em segundo plano.</span>{" "}
        <button
          className="text-primary underline underline-offset-2 hover:no-underline"
          onClick={() => navigate("/dashboard/gerar-documento")}
        >
          Ver progresso
        </button>
      </span>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
