/**
 * ═══ Orion Tools System ═══
 * Similar to OpenCode tools: file, search, shell, git, etc.
 */

import { supabase } from "@/integrations/supabase/client";

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

export const ORION_TOOLS: Tool[] = [
  // ═══ File Tools ═══
  {
    name: "file_read",
    description: "Read a file from the project",
    parameters: {
      path: { type: "string", description: "File path to read", required: true },
    },
  },
  {
    name: "file_write",
    description: "Write content to a file",
    parameters: {
      path: { type: "string", description: "File path to write", required: true },
      content: { type: "string", description: "Content to write", required: true },
    },
  },
  {
    name: "file_edit",
    description: "Edit a specific part of a file",
    parameters: {
      path: { type: "string", description: "File path", required: true },
      oldString: { type: "string", description: "Text to replace", required: true },
      newString: { type: "string", description: "New text", required: true },
    },
  },
  {
    name: "file_search",
    description: "Search for text in files",
    parameters: {
      pattern: { type: "string", description: "Search pattern", required: true },
      path: { type: "string", description: "Directory to search" },
      regex: { type: "boolean", description: "Use regex" },
    },
  },
  {
    name: "glob",
    description: "Find files by pattern",
    parameters: {
      pattern: { type: "string", description: "Glob pattern", required: true },
      path: { type: "string", description: "Directory to search" },
    },
  },
  
  // ═══ Shell Tools ═══
  {
    name: "shell",
    description: "Execute a shell command",
    parameters: {
      command: { type: "string", description: "Command to execute", required: true },
      cwd: { type: "string", description: "Working directory" },
      timeout: { type: "number", description: "Timeout in ms" },
    },
  },
  {
    name: "bash",
    description: "Execute a bash command",
    parameters: {
      command: { type: "string", description: "Bash command", required: true },
    },
  },
  
  // ═══ Git Tools ═══
  {
    name: "git_status",
    description: "Get git status",
    parameters: {},
  },
  {
    name: "git_commit",
    description: "Create a git commit",
    parameters: {
      message: { type: "string", description: "Commit message", required: true },
      files: { type: "string", description: "Files to commit" },
    },
  },
  {
    name: "git_push",
    description: "Push to remote",
    parameters: {
      branch: { type: "string", description: "Branch to push" },
    },
  },
  {
    name: "git_pull",
    description: "Pull from remote",
    parameters: {
      branch: { type: "string", description: "Branch to pull" },
    },
  },
  
  // ═══ Code Tools ═══
  {
    name: "build",
    description: "Build the project",
    parameters: {
      target: { type: "string", description: "Build target" },
    },
  },
  {
    name: "test",
    description: "Run tests",
    parameters: {
      pattern: { type: "string", description: "Test pattern" },
      coverage: { type: "boolean", description: "Generate coverage" },
    },
  },
  {
    name: "lint",
    description: "Run linter",
    parameters: {
      fix: { type: "boolean", description: "Auto-fix issues" },
    },
  },
  {
    name: "typecheck",
    description: "Run TypeScript type checking",
    parameters: {},
  },
  
  // ═══ Web Tools ═══
  {
    name: "web_search",
    description: "Search the web",
    parameters: {
      query: { type: "string", description: "Search query", required: true },
      numResults: { type: "number", description: "Number of results" },
    },
  },
  {
    name: "web_fetch",
    description: "Fetch a URL",
    parameters: {
      url: { type: "string", description: "URL to fetch", required: true },
    },
  },
  
  // ═══ Database Tools ═══
  {
    name: "db_query",
    description: "Query the database",
    parameters: {
      query: { type: "string", description: "SQL query", required: true },
    },
  },
  {
    name: "db_insert",
    description: "Insert into database",
    parameters: {
      table: { type: "string", description: "Table name", required: true },
      data: { type: "object", description: "Data to insert", required: true },
    },
  },
  
  // ═══ Supabase Tools ═══
  {
    name: "supabase_function",
    description: "Call a Supabase Edge Function",
    parameters: {
      functionName: { type: "string", description: "Function name", required: true },
      body: { type: "object", description: "Request body" },
    },
  },
  
  // ═══ Vision Tools ═══
  {
    name: "vision_analyze",
    description: "Analyze image with AI",
    parameters: {
      imageBase64: { type: "string", description: "Image data", required: true },
      question: { type: "string", description: "Question about image" },
    },
  },
  {
    name: "detect_objects",
    description: "Detect objects in image",
    parameters: {
      imageBase64: { type: "string", description: "Image data", required: true },
    },
  },
  {
    name: "detect_faces",
    description: "Detect faces in image",
    parameters: {
      imageBase64: { type: "string", description: "Image data", required: true },
    },
  },
  {
    name: "ocr",
    description: "Extract text from image (OCR)",
    parameters: {
      imageBase64: { type: "string", description: "Image data", required: true },
    },
  },
];

// ═══ Tool Executor ═══
export async function executeTool(
  toolName: ToolName,
  params: Record<string, unknown>
): Promise<unknown> {
  console.log(`[OrionTools] Executing: ${toolName}`, params);
  
  switch (toolName) {
    // Use neural-ops for AI tasks and code operations
    case "analyze_code":
    case "security_scan":
    case "vision_analyze":
    case "file_read":
    case "file_write":
    case "file_edit":
    case "file_search":
    case "glob":
    case "shell":
    case "bash":
    case "git_status":
    case "git_commit":
    case "test":
    case "lint":
    case "build": {
      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          action: "code_operation",
          tool: toolName,
          params,
          question: params.question || params.pattern || `Execute ${toolName}`,
        },
      });
      if (error) throw error;
      return data;
    }
    
    // Use search APIs
    case "web_search": {
      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          question: params.query,
          intentType: "web_search",
        },
      });
      if (error) throw error;
      return data;
    }
    
    // Supabase functions
    case "supabase_function": {
      const { data, error } = await supabase.functions.invoke(
        params.functionName as string,
        { body: params.body }
      );
      if (error) throw error;
      return data;
    }
    
    // Database operations (read-only via Supabase client)
    case "db_query": {
      const tableName = (params.table as string) || "ai_metrics";
      const { data, error } = await supabase
        .from(tableName as any)
        .select(params.select as string || "*")
        .limit(params.limit as number || 100);
      if (error) throw error;
      return data;
    }
    
    default:
      throw new Error(`Tool ${toolName} not implemented yet`);
  }
}

// ═══ Get Tools for Agent ═══
export function getToolsForAgent(agentId: string): ToolName[] {
  const agentTools: Record<string, ToolName[]> = {
    general: ["file_read", "file_search", "web_search", "shell", "vision_analyze"],
    plan: ["file_read", "file_search", "web_search", "analyze_code"],
    build: ["file_read", "file_write", "file_edit", "shell", "git_commit", "build", "test", "lint", "typecheck"],
    code: ["file_read", "file_write", "file_edit", "glob", "lint", "format"],
    research: ["web_search", "web_fetch", "analyze_code"],
    review: ["file_read", "file_search", "analyze_code", "lint", "security_scan"],
    security: ["file_read", "analyze_code", "security_scan"],
    vision: ["vision_analyze", "detect_objects", "detect_faces", "ocr"],
    voice: ["stt", "tts"],
    robotics: ["shell", "supabase_function"],
    evolution: ["file_read", "file_write", "file_edit", "shell", "git_commit", "git_push", "build", "test", "lint", "typecheck", "deploy_edge"],
  };
  
  return agentTools[agentId] || agentTools.general;
}