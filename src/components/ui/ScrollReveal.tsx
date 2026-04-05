import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

type RevealDirection = "up" | "down" | "left" | "right" | "scale" | "fade";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: RevealDirection;
  delay?: number;
  duration?: number;
  className?: string;
  distance?: number;
}

const directionStyles: Record<RevealDirection, (d: number) => string> = {
  up: (d) => `translate3d(0, ${d}px, 0)`,
  down: (d) => `translate3d(0, -${d}px, 0)`,
  left: (d) => `translate3d(${d}px, 0, 0)`,
  right: (d) => `translate3d(-${d}px, 0, 0)`,
  scale: () => `scale(0.88)`,
  fade: () => `translate3d(0, 0, 0)`,
};

export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.8,
  className,
  distance = 60,
}: ScrollRevealProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={cn("will-change-transform", className)}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translate3d(0,0,0) scale(1)" : directionStyles[direction](distance),
        transition: `opacity ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, transform ${duration}s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
