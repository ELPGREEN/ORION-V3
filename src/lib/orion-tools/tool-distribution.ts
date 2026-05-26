/**
 * ═══ Tool Distribution Matrix ═══
 * Maps each Role × Plan to allowed tools.
 * Owner always bypasses all restrictions.
 */

import type { AppRole } from "@/hooks/useUserRole";
import type { DistributableTool, PlanTier, ToolCategory } from "./types";

export const TOOL_CATEGORIES: Record<DistributableTool, ToolCategory> = {
  // chat
  orion_chat: "chat",
  orion_memory: "memory",
  // voice
  orion_voice: "voice",
  stt: "voice",
  tts: "voice",
  voice_analyze: "voice",
  gemini_tts: "voice",
  // vision
  vision_analyze: "vision",
  detect_objects: "vision",
  detect_faces: "vision",
  ocr: "vision",
  ocr_documents: "vision",
  vision_products: "vision",
  // browser
  browser_use: "browser",
  browser_use_legal: "browser",
  web_search: "browser",
  web_fetch: "browser",
  // editor / sales
  sales_editor: "editor",
  // legal
  legal_agents: "legal",
  legal_rag: "legal",
  // robotics
  robotics: "robotics",
  // jules
  jules: "jules",
  computer_use: "jules",
  // stripe
  stripe_payments: "stripe",
  stripe_payouts: "stripe",
  // analytics
  analytics_dashboard: "analytics",
  // arc-agi-2 reasoning
  arc_abstract_reasoning: "jules",
  arc_gateway: "jules",
  arc_api_learner: "jules",
  // integrations (lump under browser/editor as utility)
  spotify_integration: "editor",
  youtube_integration: "editor",
  firecrawl: "editor",
  calendar: "editor",
  translation: "editor",
  currency_converter: "editor",
  // base tools (rare for end users — owner only by default)
  file_read: "editor",
  file_write: "editor",
  file_edit: "editor",
  file_delete: "editor",
  file_search: "editor",
  glob: "editor",
  text_search: "editor",
  shell: "jules",
  bash: "jules",
  exec: "jules",
  git_status: "jules",
  git_commit: "jules",
  git_push: "jules",
  git_pull: "jules",
  git_branch: "jules",
  lint: "jules",
  format: "jules",
  test: "jules",
  build: "jules",
  typecheck: "jules",
  deploy: "jules",
  deploy_edge: "jules",
  analyze_code: "jules",
  security_scan: "jules",
  db_query: "jules",
  db_insert: "jules",
  db_update: "jules",
  db_delete: "jules",
  supabase_function: "jules",
  supabase_storage: "jules",
};

/** Minimum plan required to access each tool (when not owner). */
const TOOL_MIN_PLAN: Partial<Record<DistributableTool, PlanTier>> = {
  orion_voice: "premium",
  gemini_tts: "premium",
  legal_agents: "premium",
  legal_rag: "premium",
  sales_editor: "premium",
  vision_products: "premium",
  browser_use_legal: "premium",
  analytics_dashboard: "premium",
  stripe_payouts: "premium",
};

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  pro: 2,
  enterprise: 3,
};

/** Role → list of tools available (subject to plan gating). */
export const ROLE_TOOLS: Record<AppRole, DistributableTool[]> = {
  cliente: [
    "orion_chat",
    "orion_memory",
    "stripe_payments",
  ],
  advogado: [
    "orion_chat",
    "orion_memory",
    "orion_voice",
    "stt",
    "tts",
    "gemini_tts",
    "vision_analyze",
    "ocr",
    "ocr_documents",
    "legal_agents",
    "legal_rag",
    "browser_use_legal",
    "web_search",
    "stripe_payments",
    "analytics_dashboard",
  ],
  produtor: [
    "orion_chat",
    "orion_memory",
    "orion_voice",
    "stt",
    "tts",
    "gemini_tts",
    "vision_analyze",
    "vision_products",
    "ocr",
    "sales_editor",
    "browser_use",
    "web_search",
    "web_fetch",
    "firecrawl",
    "spotify_integration",
    "youtube_integration",
    "stripe_payments",
    "stripe_payouts",
    "analytics_dashboard",
  ],
  afiliado: [
    "orion_chat",
    "orion_voice",
    "stt",
    "tts",
    "browser_use",
    "web_search",
    "stripe_payments",
    "stripe_payouts",
    "analytics_dashboard",
  ],
  nomade: [
    "orion_chat",
    "orion_memory",
    "orion_voice",
    "stt",
    "tts",
    "gemini_tts",
    "vision_analyze",
    "ocr",
    "ocr_documents",
    "browser_use",
    "web_search",
    "web_fetch",
    "calendar",
    "translation",
    "currency_converter",
    "spotify_integration",
    "youtube_integration",
    "stripe_payments",
  ],
};

/** Tools reserved exclusively for the owner. */
export const OWNER_ONLY_TOOLS: DistributableTool[] = [
  "robotics",
  "computer_use",
  "arc_abstract_reasoning",
  "arc_gateway",
  "arc_api_learner",
  "shell",
  "bash",
  "exec",
  "git_commit",
  "git_push",
  "git_pull",
  "deploy",
  "deploy_edge",
  "db_update",
  "db_delete",
  "supabase_function",
  "supabase_storage",
  "file_write",
  "file_edit",
  "file_delete",
];

/**
 * Tools reserved for owner OR admin role (read-only / safe self-improvement).
 * Auto-evolution / jules code-analysis goes here so admins can trigger it
 * without exposing destructive infra ops.
 */
export const ADMIN_OR_OWNER_TOOLS: DistributableTool[] = [
  "jules",
];

export interface AllowResult {
  allowed: boolean;
  reason?: "owner_only" | "role_blocked" | "plan_required";
  requiredPlan?: PlanTier;
}

/** Core check: is this tool allowed for the given role/plan/owner status? */
export function checkToolAccess(
  tool: DistributableTool,
  role: AppRole | null,
  plan: PlanTier,
  isOwner: boolean,
  isAdmin: boolean = false,
): AllowResult {
  // Owner bypass — always allowed
  if (isOwner) return { allowed: true };

  // Admin bypass for safe self-improvement tools (e.g. jules / auto-evolution)
  if (isAdmin && ADMIN_OR_OWNER_TOOLS.includes(tool)) {
    return { allowed: true };
  }

  // Owner-only / admin-or-owner tool not unlocked above → deny
  if (OWNER_ONLY_TOOLS.includes(tool) || ADMIN_OR_OWNER_TOOLS.includes(tool)) {
    return { allowed: false, reason: "owner_only" };
  }

  // Role gate
  if (!role) return { allowed: false, reason: "role_blocked" };
  const allowedForRole = ROLE_TOOLS[role] ?? [];
  if (!allowedForRole.includes(tool)) {
    return { allowed: false, reason: "role_blocked" };
  }

  // Plan gate
  const minPlan = TOOL_MIN_PLAN[tool];
  if (minPlan && PLAN_RANK[plan] < PLAN_RANK[minPlan]) {
    return { allowed: false, reason: "plan_required", requiredPlan: minPlan };
  }

  return { allowed: true };
}

export function isToolAllowed(
  tool: DistributableTool,
  role: AppRole | null,
  plan: PlanTier,
  isOwner: boolean,
  isAdmin: boolean = false,
): boolean {
  return checkToolAccess(tool, role, plan, isOwner, isAdmin).allowed;
}

/** Returns full list of tools the user can access right now. */
export function getAllowedTools(
  role: AppRole | null,
  plan: PlanTier,
  isOwner: boolean,
): DistributableTool[] {
  if (isOwner) {
    // Owner gets union of all role tools + owner-only
    const all = new Set<DistributableTool>(OWNER_ONLY_TOOLS);
    Object.values(ROLE_TOOLS).forEach((list) => list.forEach((t) => all.add(t)));
    return Array.from(all);
  }
  if (!role) return [];
  return (ROLE_TOOLS[role] ?? []).filter(
    (t) => isToolAllowed(t, role, plan, isOwner),
  );
}

/** Group allowed tools by category for UI badges. */
export function getCategoriesSummary(tools: DistributableTool[]): Record<ToolCategory, number> {
  const summary = {} as Record<ToolCategory, number>;
  for (const t of tools) {
    const cat = TOOL_CATEGORIES[t];
    if (!cat) continue;
    summary[cat] = (summary[cat] ?? 0) + 1;
  }
  return summary;
}
