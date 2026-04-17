/**
 * ═══ Intent → Tool Mapping ═══
 * Maps Orion intent IDs to the tool they require.
 * Used by useOrionReasoning to block intents the user cannot access.
 */

import type { DistributableTool } from "@/lib/orion-tools/tool-distribution";

export const INTENT_TOOL_MAP: Record<string, DistributableTool> = {
  // Robotics
  robot_command: "robotics",
  robot_move: "robotics",
  robot_status: "robotics",
  ros_command: "robotics",
  // Jules / self-improvement
  jules_pr: "jules",
  jules_fix: "jules",
  self_improvement: "jules",
  computer_use: "computer_use",
  // ARC-AGI-2 Abstract Reasoning
  arc_reasoning: "arc_abstract_reasoning",
  abstract_puzzle: "arc_abstract_reasoning",
  symbolic_reasoning: "arc_abstract_reasoning",
  compositional_rule: "arc_abstract_reasoning",
  contextual_rule: "arc_abstract_reasoning",
  solve_puzzle: "arc_abstract_reasoning",
  // Sales editor
  open_sales_editor: "sales_editor",
  edit_product_page: "sales_editor",
  // Legal
  legal_search: "legal_rag",
  petition_draft: "legal_agents",
  legal_advice: "legal_agents",
  // Voice (premium)
  tts_speak: "orion_voice",
  // Browser
  open_browser: "browser_use",
  web_browse: "browser_use",
  // Vision (allowed broadly via vision_analyze tool)
  vision_describe: "vision_analyze",
  what_seeing: "vision_analyze",
  describe_scene: "vision_analyze",
  identify_object: "vision_analyze",
  count_objects: "vision_analyze",
  read_text: "vision_analyze",
  ocr_document: "vision_analyze",
  identify_face: "vision_analyze",
  // Auto-evolution / code analysis (owner-only via jules tool)
  auto_evolution: "jules",
  auto_construct: "jules",
  self_evolve: "jules",
  code_analysis: "jules",
  code_refactor: "jules",
  improve_code: "jules",
  analyze_code: "jules",
};

export interface IntentBlockMessage {
  blocked: boolean;
  message?: string;
}

import { checkToolAccess, type PlanTier } from "@/lib/orion-tools/tool-distribution";
import type { AppRole } from "@/hooks/useUserRole";

const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Gratuito",
  premium: "Premium",
  pro: "Pro",
  enterprise: "Enterprise",
};

export function checkIntentAccess(
  intentId: string,
  role: AppRole | null,
  plan: PlanTier,
  isOwner: boolean,
  isAdmin: boolean = false,
): IntentBlockMessage {
  const tool = INTENT_TOOL_MAP[intentId];
  if (!tool) return { blocked: false };

  const result = checkToolAccess(tool, role, plan, isOwner, isAdmin);
  if (result.allowed) return { blocked: false };

  if (result.reason === "owner_only") {
    return {
      blocked: true,
      message: "Esse recurso é restrito à administração e não está disponível para o seu perfil.",
    };
  }
  if (result.reason === "plan_required") {
    return {
      blocked: true,
      message: `Esse recurso está disponível no plano ${PLAN_LABEL[result.requiredPlan ?? "premium"]}. Faça upgrade para liberar.`,
    };
  }
  return {
    blocked: true,
    message: "Esse recurso não está disponível para o seu papel atual.",
  };
}
