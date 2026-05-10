/**
 * ═══ Orion Tools System ═══
 * Similar to OpenCode tools: file, search, shell, git, etc.
 */

import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "@/lib/errors";
import type { ToolName, Tool } from "./types";

export type { ToolName, Tool };

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
    // Use neural-ops for AI tasks
    case "analyze_code":
    case "security_scan":
    case "vision_analyze": {
      return await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: {
            question: params.question || "Analyze this code",
            intentType: toolName === "security_scan" ? "security" : "code_analysis",
            ...params,
          },
        }),
        "neural-ops",
        { toolName }
      );
    }
    
    // Use search APIs
    case "web_search": {
      return await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: {
            question: params.query,
            intentType: "web_search",
          },
        }),
        "neural-ops",
        { toolName, query: params.query }
      );
    }
    
    // Supabase functions
    case "supabase_function": {
      const functionName = params.functionName as string;
      return await wrapEdgeFunction(
        supabase.functions.invoke(functionName, { body: params.body }),
        functionName,
        { toolName }
      );
    }
    
    // Database operations (read-only via Supabase client)
    case "db_query": {
      const tableName = (params.table as string) || "ai_metrics";
      const { data } = await wrapSupabase(
        supabase
          .from(tableName as any)
          .select(params.select as string || "*")
          .limit(params.limit as number || 100),
        { toolName, tableName }
      );
      return data;
    }
    
    default:
      throw new Error(`Tool ${toolName} not implemented yet`);
  }
}

// ═══ Get Tools for Agent ═══
import { isToolAllowed } from "./tool-distribution";
import type { DistributableTool, PlanTier } from "./types";
import type { AppRole } from "@/hooks/useUserRole";

export function getToolsForAgent(
  agentId: string,
  role?: AppRole | null,
  plan: PlanTier = "free",
  isOwner = false,
): ToolName[] {
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

  const base = agentTools[agentId] || agentTools.general;

  // Owner bypass: full access without filtering.
  if (isOwner) return base;

  // If no role context provided, return base (legacy behavior).
  if (role === undefined) return base;

  return base.filter((tool) =>
    isToolAllowed(tool as DistributableTool, role ?? null, plan, isOwner),
  );
}

export { isToolAllowed, getAllowedTools } from "./tool-distribution";
export type { DistributableTool, PlanTier } from "./types";