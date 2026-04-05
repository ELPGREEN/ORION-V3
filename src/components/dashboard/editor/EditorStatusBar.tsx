import { type RefObject } from "react";
import { XCircle, AlertTriangle, Info as InfoIcon } from "lucide-react";
import { PageNavigator } from "@/components/dashboard/editor/PageNavigator";
import { getQualityLabel } from "@/lib/analysis";

interface EditorStatusBarProps {
  isEditorMounted: boolean;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  currentPage: number;
  totalPages: number;
  scrollPageHeight: number;
  wordCount: number;
  charCount: number;
  currentFontFamily: string;
  currentFontSize: string;
  lintTotal: number;
  lintErrors: number;
  lintWarnings: number;
  lintInfos: number;
  qualityScore?: number | null;
  onShowAnalysis: () => void;
}

export function EditorStatusBar({
  isEditorMounted,
  scrollContainerRef,
  currentPage,
  totalPages,
  scrollPageHeight,
  wordCount,
  charCount,
  currentFontFamily,
  currentFontSize,
  lintTotal,
  lintErrors,
  lintWarnings,
  lintInfos,
  qualityScore,
  onShowAnalysis,
}: EditorStatusBarProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 border-t border-border bg-card/95 backdrop-blur-md"
      role="status"
      aria-label="Informações do documento"
    >
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium">
        {isEditorMounted && (
          <PageNavigator
            currentPage={currentPage}
            totalPages={totalPages}
            scrollContainerRef={scrollContainerRef}
            scrollPageHeight={scrollPageHeight}
          />
        )}
        <span className="text-border/40">|</span>
        <span>
          <strong className="text-foreground tabular-nums">{wordCount}</strong> palavras
        </span>
        <span>
          <strong className="text-foreground tabular-nums">{charCount}</strong> caracteres
        </span>
        <span className="text-border/40">|</span>
        <span className="hidden sm:inline text-muted-foreground/80">
          {currentFontFamily} · {currentFontSize}
        </span>
      </div>
      <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
        {lintTotal > 0 && (
          <button
            onClick={onShowAnalysis}
            className="flex items-center gap-2 hover:text-foreground transition-colors rounded-sm px-1.5 py-0.5 hover:bg-muted"
            title="Ver análise do documento"
            aria-label={`${lintErrors} erros, ${lintWarnings} avisos, ${lintInfos} informações`}
          >
            {lintErrors > 0 && (
              <span className="flex items-center gap-0.5 text-destructive">
                <XCircle className="h-3 w-3" />
                {lintErrors}
              </span>
            )}
            {lintWarnings > 0 && (
              <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3 w-3" />
                {lintWarnings}
              </span>
            )}
            {lintInfos > 0 && (
              <span className="flex items-center gap-0.5 text-muted-foreground">
                <InfoIcon className="h-3 w-3" />
                {lintInfos}
              </span>
            )}
          </button>
        )}
        {qualityScore !== null && qualityScore !== undefined && (
          <span className={`font-medium ${getQualityLabel(qualityScore / 100).color}`}>
            {getQualityLabel(qualityScore / 100).icon} {qualityScore}%
          </span>
        )}
        <span className="text-muted-foreground/50 hidden md:inline">
          {wordCount < 500
            ? "📝 Rascunho"
            : wordCount < 1500
              ? "📄 Em progresso"
              : wordCount < 2500
                ? "📋 Bem desenvolvido"
                : "✅ Completo"}
        </span>
      </div>
    </div>
  );
}
