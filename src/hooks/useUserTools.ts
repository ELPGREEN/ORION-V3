import { useMemo } from "react";
import { useUserRole } from "./useUserRole";
import { useAdminAccess } from "./useAdminAccess";
import { useUserPlan } from "./useUserPlan";
import {
  checkToolAccess,
  getAllowedTools,
  getCategoriesSummary,
  type DistributableTool,
  type PlanTier,
  type AllowResult,
} from "@/lib/orion-tools/tool-distribution";

function planFromString(planType: string | null): PlanTier {
  if (!planType) return "free";
  const p = planType.toLowerCase();
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("business") || p.includes("pro")) return "pro";
  if (p.includes("professional") || p.includes("premium")) return "premium";
  return "free";
}

export function useUserTools() {
  const { role, loading: roleLoading } = useUserRole();
  const { isOwner } = useAdminAccess();
  const { isPremium, planType, loading: planLoading } = useUserPlan();

  const plan: PlanTier = useMemo(() => {
    if (isOwner) return "enterprise";
    const fromDb = planFromString(planType);
    if (fromDb !== "free") return fromDb;
    return isPremium ? "premium" : "free";
  }, [isOwner, isPremium, planType]);

  const tools = useMemo(
    () => getAllowedTools(role, plan, isOwner),
    [role, plan, isOwner],
  );

  const categories = useMemo(() => getCategoriesSummary(tools), [tools]);

  function hasTool(tool: DistributableTool): boolean {
    return checkToolAccess(tool, role, plan, isOwner).allowed;
  }

  function checkTool(tool: DistributableTool): AllowResult {
    return checkToolAccess(tool, role, plan, isOwner);
  }

  function requiresUpgrade(tool: DistributableTool): PlanTier | null {
    const result = checkTool(tool);
    if (result.allowed) return null;
    return result.requiredPlan ?? null;
  }

  return {
    tools,
    categories,
    hasTool,
    checkTool,
    requiresUpgrade,
    role,
    plan,
    isOwner,
    loading: roleLoading || planLoading,
  };
}
