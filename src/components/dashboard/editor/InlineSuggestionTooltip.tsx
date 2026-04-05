import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Copy } from "lucide-react";

interface InlineSuggestionTooltipProps {
  visible: boolean;
  originalText: string;
  suggestedText: string;
  anchorRect: { top: number; left: number; bottom: number; right: number } | null;
  onAccept: () => void;
  onReject: () => void;
  onCopy: () => void;
}

export function InlineSuggestionTooltip({
  visible,
  originalText,
  suggestedText,
  anchorRect,
  onAccept,
  onReject,
  onCopy,
}: InlineSuggestionTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    if (!visible || !anchorRect || !ref.current) return;
    const tooltip = ref.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    let top = anchorRect.bottom + 8;
    let left = anchorRect.left;

    // Keep within viewport
    if (top + tooltipRect.height > window.innerHeight - 16) {
      top = anchorRect.top - tooltipRect.height - 8;
    }
    if (left + tooltipRect.width > window.innerWidth - 16) {
      left = window.innerWidth - tooltipRect.width - 16;
    }
    if (left < 8) left = 8;
    setPos({ top, left });
  }, [visible, anchorRect]);

  if (!visible || !anchorRect) return null;

  return (
    <div
      ref={ref}
      className="fixed z-[9999] bg-popover border border-border rounded-lg shadow-xl p-3 max-w-sm animate-in fade-in-0 zoom-in-95"
      style={{ top: pos.top, left: pos.left }}
    >
      <p className="text-[10px] font-medium text-muted-foreground mb-2">Sugestão da IA</p>

      {/* Diff view */}
      <div className="space-y-1.5 mb-3">
        {originalText && (
          <div className="text-[11px] bg-destructive/10 text-destructive rounded px-2 py-1 line-through">
            {originalText.length > 120 ? originalText.slice(0, 120) + "…" : originalText}
          </div>
        )}
        <div className="text-[11px] bg-green-500/10 text-green-700 dark:text-green-400 rounded px-2 py-1">
          {suggestedText.length > 200 ? suggestedText.slice(0, 200) + "…" : suggestedText}
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button size="sm" className="h-6 text-[10px] gap-1" onClick={onAccept}>
          <Check className="h-3 w-3" />Aceitar
        </Button>
        <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={onReject}>
          <X className="h-3 w-3" />Rejeitar
        </Button>
        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={onCopy}>
          <Copy className="h-3 w-3" />Copiar
        </Button>
      </div>
    </div>
  );
}
