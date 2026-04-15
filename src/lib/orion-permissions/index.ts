/**
 * ═══ Orion Permissions System ═══
 * Similar to OpenCode permission system
 */

export type PermissionLevel = "allow" | "deny" | "ask";

export interface Permission {
  pattern: string;
  level: PermissionLevel;
  description?: string;
}

export interface ToolPermission {
  tool: string;
  level: PermissionLevel;
}

export interface SkillPermission {
  skill: string;
  level: PermissionLevel;
}

export interface AgentPermission {
  agent: string;
  level: PermissionLevel;
}

// ═══ Default Tool Permissions ═══
export const DEFAULT_TOOL_PERMISSIONS: ToolPermission[] = [
  { tool: "file_read", level: "allow" },
  { tool: "file_write", level: "allow" },
  { tool: "file_edit", level: "allow" },
  { tool: "file_search", level: "allow" },
  { tool: "glob", level: "allow" },
  { tool: "web_search", level: "allow" },
  { tool: "web_fetch", level: "allow" },
  { tool: "shell", level: "allow" },
  { tool: "bash", level: "allow" },
  { tool: "git_status", level: "allow" },
  { tool: "git_commit", level: "allow" },
  { tool: "git_push", level: "allow" },
  { tool: "build", level: "allow" },
  { tool: "test", level: "allow" },
  { tool: "lint", level: "allow" },
  { tool: "typecheck", level: "allow" },
  { tool: "deploy", level: "ask" },
  { tool: "deploy_edge", level: "ask" },
  { tool: "db_query", level: "ask" },
  { tool: "db_insert", level: "ask" },
  { tool: "db_update", level: "ask" },
  { tool: "db_delete", level: "deny" },
];

// ═══ Default Skill Permissions ═══
export const DEFAULT_SKILL_PERMISSIONS: SkillPermission[] = [
  { skill: "orion-*-allow", level: "allow" },
  { skill: "orion-evolution", level: "ask" },
  { skill: "internal-*", level: "deny" },
  { skill: "experimental-*", level: "ask" },
];

// ═══ Agent Permission Config ═══
export const AGENT_PERMISSIONS: Record<string, ToolPermission[]> = {
  general: [
    { tool: "file_read", level: "allow" },
    { tool: "file_search", level: "allow" },
    { tool: "web_search", level: "allow" },
    { tool: "shell", level: "allow" },
    { tool: "vision_analyze", level: "allow" },
  ],
  build: [
    { tool: "file_read", level: "allow" },
    { tool: "file_write", level: "allow" },
    { tool: "file_edit", level: "allow" },
    { tool: "shell", level: "allow" },
    { tool: "git_commit", level: "allow" },
    { tool: "git_push", level: "allow" },
    { tool: "build", level: "allow" },
    { tool: "test", level: "allow" },
    { tool: "lint", level: "allow" },
    { tool: "deploy", level: "ask" },
  ],
  code: [
    { tool: "file_read", level: "allow" },
    { tool: "file_write", level: "allow" },
    { tool: "file_edit", level: "allow" },
    { tool: "glob", level: "allow" },
    { tool: "lint", level: "allow" },
    { tool: "format", level: "allow" },
  ],
  review: [
    { tool: "file_read", level: "allow" },
    { tool: "file_search", level: "allow" },
    { tool: "analyze_code", level: "allow" },
    { tool: "lint", level: "allow" },
    { tool: "security_scan", level: "allow" },
  ],
  evolution: [
    { tool: "file_read", level: "allow" },
    { tool: "file_write", level: "allow" },
    { tool: "file_edit", level: "allow" },
    { tool: "shell", level: "allow" },
    { tool: "git_commit", level: "allow" },
    { tool: "git_push", level: "allow" },
    { tool: "build", level: "allow" },
    { tool: "test", level: "allow" },
    { tool: "deploy", level: "allow" },
    { tool: "deploy_edge", level: "allow" },
  ],
};

// ═══ Permission Checker ═══
export function checkToolPermission(
  toolName: string,
  agentId: string
): PermissionLevel {
  const agentPerms = AGENT_PERMISSIONS[agentId];
  if (!agentPerms) return "deny";
  
  const perm = agentPerms.find(p => p.tool === toolName);
  return perm?.level || "deny";
}

export function checkSkillPermission(skillName: string): PermissionLevel {
  for (const perm of DEFAULT_SKILL_PERMISSIONS) {
    const pattern = perm.skill.replace("*", ".*");
    if (new RegExp(pattern).test(skillName)) {
      return perm.level;
    }
  }
  return "allow";
}

export function canExecuteTool(toolName: string, agentId: string): boolean {
  const level = checkToolPermission(toolName, agentId);
  return level === "allow";
}

export function needsApproval(toolName: string, agentId: string): boolean {
  const level = checkToolPermission(toolName, agentId);
  return level === "ask";
}