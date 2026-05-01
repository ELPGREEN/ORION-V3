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
