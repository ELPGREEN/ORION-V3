import { cn } from "@/lib/utils";
import { forwardRef } from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: string;
  hover?: boolean;
}

export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("bg-card/80 backdrop-blur-md border border-border rounded-lg p-6", className)} {...props}>
      {children}
    </div>
  )
);
GlassCard.displayName = "GlassCard";
