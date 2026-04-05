import { cn } from "@/lib/utils";

export function TechDivider({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-px w-full overflow-hidden", className)}>
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/60 to-transparent animate-pulse" style={{ animationDuration: '3s' }} />
    </div>
  );
}
