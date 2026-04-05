import { useState, useEffect, useRef, useCallback } from "react";
import { FileText } from "lucide-react";

interface FloatingPageIndicatorProps {
  currentPage: number;
  totalPages: number;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

export function FloatingPageIndicator({
  currentPage,
  totalPages,
  scrollContainerRef,
}: FloatingPageIndicatorProps) {
  const [visible, setVisible] = useState(false);
  const [animatePage, setAnimatePage] = useState(false);
  const prevPageRef = useRef(currentPage);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [position, setPosition] = useState({ bottom: 20, right: 20 });

  const showIndicator = useCallback(() => {
    setVisible(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setVisible(false), 2500);
  }, []);

  // Trigger bounce animation on page change
  useEffect(() => {
    if (prevPageRef.current !== currentPage) {
      prevPageRef.current = currentPage;
      setAnimatePage(true);
      showIndicator();
      const t = setTimeout(() => setAnimatePage(false), 350);
      return () => clearTimeout(t);
    }
  }, [currentPage, showIndicator]);

  // Track scroll container position to place indicator via fixed positioning
  useEffect(() => {
    const el = scrollContainerRef?.current;
    if (!el) return;

    const updatePosition = () => {
      const rect = el.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.bottom + 16,
        right: window.innerWidth - rect.right + 16,
      });
    };

    const onScroll = () => {
      showIndicator();
    };

    updatePosition();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updatePosition, { passive: true });

    const ro = new ResizeObserver(updatePosition);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updatePosition);
      ro.disconnect();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [scrollContainerRef, showIndicator]);

  if (totalPages <= 1) return null;

  const progress = totalPages > 1 ? ((currentPage - 1) / (totalPages - 1)) * 100 : 0;

  return (
    <div
      style={{
        position: "fixed",
        bottom: position.bottom,
        right: position.right,
        zIndex: 50,
        pointerEvents: "none",
        userSelect: "none",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
      }}
    >
      <div className="bg-foreground/85 text-background rounded-lg shadow-xl backdrop-blur-md overflow-hidden">
        {/* Progress bar */}
        <div className="h-[2px] w-full bg-background/10">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-2 px-3.5 py-2">
          <FileText className="h-3.5 w-3.5 text-background/60 shrink-0" />
          <span className="text-[11px] text-background/60 font-medium">Página</span>
          <span
            className="text-sm font-bold tabular-nums text-background"
            style={{
              transform: animatePage ? "scale(1.2)" : "scale(1)",
              transition: "transform 0.2s ease",
              display: "inline-block",
            }}
          >
            {currentPage}
          </span>
          <span className="text-[11px] text-background/40 font-medium">de {totalPages}</span>
        </div>
      </div>
    </div>
  );
}
