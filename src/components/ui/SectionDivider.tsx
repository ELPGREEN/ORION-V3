import { cn } from "@/lib/utils";

interface SectionDividerProps {
  variant?: "gold-line" | "fade" | "beam" | "gradient";
  className?: string;
}

export function SectionDivider({ variant = "gold-line", className }: SectionDividerProps) {
  if (variant === "beam") {
    return (
      <div className={cn("relative h-32 overflow-hidden", className)}>
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-primary/60 rounded-full glow-pulse" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-primary/5 rounded-full blur-2xl" />
      </div>
    );
  }

  if (variant === "gradient") {
    return (
      <div className={cn("h-24 bg-gradient-to-b from-background via-muted/50 to-background", className)} />
    );
  }

  if (variant === "fade") {
    return (
      <div className={cn("h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent", className)} />
    );
  }

  return <div className={cn("gold-line", className)} />;
}
