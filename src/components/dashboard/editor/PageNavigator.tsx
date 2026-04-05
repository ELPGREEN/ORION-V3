import { useState, useCallback, useRef } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

interface PageNavigatorProps {
  /** Current page (1-indexed), controlled from parent */
  currentPage: number;
  /** Total pages, controlled from parent */
  totalPages: number;
  /** The scrollable container element ref */
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
  /** Average height per visual page in the scroll container (content + spacers) */
  scrollPageHeight?: number;
}

export function PageNavigator({
  currentPage,
  totalPages,
  scrollContainerRef,
  scrollPageHeight = 1123,
}: PageNavigatorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const navigateToPage = useCallback((pageNum: number) => {
    const target = Math.max(1, Math.min(pageNum, totalPages));

    const container = scrollContainerRef?.current;
    if (container) {
      const targetScroll = (target - 1) * scrollPageHeight;
      container.scrollTo({ top: targetScroll, behavior: "smooth" });
    }
    setIsOpen(false);
  }, [totalPages, scrollContainerRef, scrollPageHeight]);

  const handleGoToPage = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && num >= 1 && num <= totalPages) {
      navigateToPage(num);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleGoToPage();
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-0.5">
      {/* Previous page button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-foreground"
        onClick={() => navigateToPage(currentPage - 1)}
        disabled={currentPage <= 1}
        title="Página anterior"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>

      {/* Page indicator with popover for direct navigation */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-accent transition-colors text-[10px] text-muted-foreground hover:text-foreground cursor-pointer min-w-[50px] justify-center"
            title="Ir para página"
          >
            <span>Pág.</span>
            <strong className="text-foreground">{currentPage}</strong>
            <span>/</span>
            <span>{totalPages}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-48 p-2"
          side="top"
          align="center"
          onOpenAutoFocus={() => {
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
        >
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-foreground">Ir para página</p>
            <div className="flex items-center gap-1.5">
              <Input
                ref={inputRef}
                type="number"
                min={1}
                max={totalPages}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`1–${totalPages}`}
                className="h-7 text-xs"
              />
              <Button
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={handleGoToPage}
                disabled={!inputValue || parseInt(inputValue, 10) < 1 || parseInt(inputValue, 10) > totalPages}
              >
                Ir
              </Button>
            </div>
            {/* Quick page buttons (show up to 20 pages) */}
            {totalPages > 1 && totalPages <= 20 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => navigateToPage(page)}
                    className={`h-6 w-6 rounded text-[10px] font-medium transition-colors ${
                      page === currentPage
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {/* Next page button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 text-muted-foreground hover:text-foreground"
        onClick={() => navigateToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
        title="Próxima página"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>
    </div>
  );
}
