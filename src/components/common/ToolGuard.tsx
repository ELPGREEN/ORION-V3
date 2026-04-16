import { ReactNode } from "react";
import { useUserTools } from "@/hooks/useUserTools";
import { UpgradeCTA } from "./UpgradeCTA";
import type { DistributableTool } from "@/lib/orion-tools/tool-distribution";

interface ToolGuardProps {
  tool: DistributableTool;
  children: ReactNode;
  /** hide = render nothing; blur = blur + overlay; upgrade = show CTA card. */
  mode?: "hide" | "blur" | "upgrade";
  fallback?: ReactNode;
  toolLabel?: string;
}

export function ToolGuard({
  tool,
  children,
  mode = "upgrade",
  fallback,
  toolLabel,
}: ToolGuardProps) {
  const { checkTool, loading } = useUserTools();

  if (loading) {
    return <div className="h-24 animate-pulse rounded-md bg-muted/40" />;
  }

  const result = checkTool(tool);

  if (result.allowed) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  if (mode === "hide") return null;

  if (mode === "blur") {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none blur-sm">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <UpgradeCTA
            reason={result.reason}
            requiredPlan={result.requiredPlan}
            toolLabel={toolLabel}
          />
        </div>
      </div>
    );
  }

  return (
    <UpgradeCTA
      reason={result.reason}
      requiredPlan={result.requiredPlan}
      toolLabel={toolLabel}
    />
  );
}
