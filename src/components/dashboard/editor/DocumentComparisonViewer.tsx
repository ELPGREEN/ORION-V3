import { useMemo } from "react";
import { computeDiff, getDiffStats, type DiffSegment } from "@/lib/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, X, Plus, Minus, Equal } from "lucide-react";

interface DocumentComparisonViewerProps {
  originalHtml: string;
  modifiedHtml: string;
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
  onReject: () => void;
  title?: string;
}

function DiffSegmentView({ segment }: { segment: DiffSegment }) {
  if (segment.type === "same") {
    return <span className="text-foreground">{segment.text}</span>;
  }
  if (segment.type === "added") {
    return (
      <span className="bg-green-500/20 text-green-400 border-b border-green-500/40 px-0.5">
        {segment.text}
      </span>
    );
  }
  return (
    <span className="bg-red-500/20 text-red-400 line-through border-b border-red-500/40 px-0.5">
      {segment.text}
    </span>
  );
}

export function DocumentComparisonViewer({
  originalHtml,
  modifiedHtml,
  open,
  onClose,
  onAccept,
  onReject,
  title = "Comparar alterações",
}: DocumentComparisonViewerProps) {
  const segments = useMemo(() => computeDiff(originalHtml, modifiedHtml), [originalHtml, modifiedHtml]);
  const stats = useMemo(() => getDiffStats(segments), [segments]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            {title}
            <Badge variant="outline" className="text-xs gap-1">
              <Plus className="h-3 w-3 text-green-400" />
              {stats.addedWords}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Minus className="h-3 w-3 text-red-400" />
              {stats.removedWords}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Equal className="h-3 w-3 text-muted-foreground" />
              {stats.unchangedWords}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {stats.changePercentage.toFixed(1)}% alterado
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/30 rounded-lg text-sm leading-relaxed font-mono">
          {segments.map((seg, i) => (
            <DiffSegmentView key={i} segment={seg} />
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onReject} className="gap-1">
            <X className="h-3.5 w-3.5" />
            Rejeitar
          </Button>
          <Button size="sm" onClick={onAccept} className="gap-1 btn-gold">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aceitar alterações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
