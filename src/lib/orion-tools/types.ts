/**
 * ═══ Orion Tools Types ═══
 */

export type ToolName =
  // File operations
  | "file_read"
  | "file_write"
  | "file_edit"
  | "file_delete"
  | "file_search"
  | "glob"
  // Search operations
  | "text_search"
  | "web_search"
  | "web_fetch"
  // Shell operations
  | "shell"
  | "bash"
  | "exec"
  // Git operations
  | "git_status"
  | "git_commit"
  | "git_push"
  | "git_pull"
  | "git_branch"
  // Code operations
  | "lint"
  | "format"
  | "test"
  | "build"
  | "typecheck"
  // Deployment
  | "deploy"
  | "deploy_edge"
  // Analysis
  | "analyze_code"
  | "security_scan"
  // Vision
  | "vision_analyze"
  | "detect_objects"
  | "detect_faces"
  | "ocr"
  // Voice
  | "stt"
  | "tts"
  | "voice_analyze"
  // Database
  | "db_query"
  | "db_insert"
  | "db_update"
  | "db_delete"
  // Supabase
  | "supabase_function"
  | "supabase_storage";

export interface Tool {
  name: ToolName;
  description: string;
  parameters: Record<string, {
    type: string;
    description: string;
    required?: boolean;
  }>;
  requiresAuth?: boolean;
}

export type PlanTier = "free" | "premium" | "pro" | "enterprise";

export type ToolCategory =
  | "chat"
  | "voice"
  | "vision"
  | "browser"
  | "editor"
  | "legal"
  | "robotics"
  | "jules"
  | "stripe"
  | "memory"
  | "analytics";

/** Extended tool keys (beyond the base ToolName list) used by the distribution. */
export type DistributableTool =
  | ToolName
  | "orion_chat"
  | "orion_voice"
  | "orion_memory"
  | "browser_use"
  | "browser_use_legal"
  | "sales_editor"
  | "legal_agents"
  | "legal_rag"
  | "robotics"
  | "jules"
  | "computer_use"
  | "stripe_payments"
  | "stripe_payouts"
  | "analytics_dashboard"
  | "spotify_integration"
  | "youtube_integration"
  | "firecrawl"
  | "gemini_tts"
  | "ocr_documents"
  | "vision_products"
  | "calendar"
  | "translation"
  | "currency_converter"
  | "arc_abstract_reasoning"
  | "arc_gateway"
  | "arc_api_learner";

export interface AllowResult {
  allowed: boolean;
  reason?: "owner_only" | "role_blocked" | "plan_required";
  requiredPlan?: PlanTier;
}
