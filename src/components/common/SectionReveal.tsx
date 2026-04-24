import { useEffect, useState, type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  /** Delay in ms before the reveal animation runs */
  delay?: number;
  as?: "div" | "section" | "article";
}

/**
 * Wraps a section to animate it into view on scroll.
 * Uses the `useScrollReveal` composable + Tailwind's `animate-fade-in`
 * keyframe (already defined in the design system). Honors reduced motion.
 */
export function SectionReveal({
  children,
  className,
  delay = 0,
  as: Tag = "div",
}: SectionRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener?.("change", handler);
    return () => mq.removeEventListener?.("change", handler);
  }, []);

  const visible = reduced || isVisible;

  return (
    <Tag
      ref={ref}
      style={visible && delay && !reduced ? { animationDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-opacity duration-500 will-change-[opacity,transform]",
        visible
          ? reduced
            ? "opacity-100"
            : "opacity-100 animate-fade-in"
          : "opacity-0 translate-y-3",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
