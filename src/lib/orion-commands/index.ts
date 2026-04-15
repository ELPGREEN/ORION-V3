/**
 * ═══ Orion Commands System ═══
 * Similar to OpenCode commands for auto-building
 */

export interface OrionCommand {
  name: string;
  description: string;
  agent?: string;
  model?: string;
  subtask?: boolean;
  enabled?: boolean;
}

// ═══ Auto-Building Commands ═══
export const ORION_COMMANDS: OrionCommand[] = [
  // ═══ Build Commands ═══
  {
    name: "build",
    description: "Build the project (npm run build)",
    agent: "build",
    subtask: true,
  },
  {
    name: "test",
    description: "Run all tests with coverage",
    agent: "build",
    subtask: true,
  },
  {
    name: "lint",
    description: "Run linter and fix issues",
    agent: "build",
    subtask: true,
  },
  {
    name: "typecheck",
    description: "Run TypeScript type checking",
    agent: "build",
    subtask: true,
  },
  
  // ═══ Git Commands ═══
  {
    name: "commit",
    description: "Commit changes with message",
    agent: "build",
    subtask: true,
  },
  {
    name: "push",
    description: "Push to remote repository",
    agent: "build",
    subtask: true,
  },
  {
    name: "pull",
    description: "Pull latest changes",
    agent: "build",
    subtask: true,
  },
  {
    name: "status",
    description: "Show git status",
    agent: "build",
    subtask: true,
  },
  
  // ═══ Code Analysis Commands ═══
  {
    name: "analyze",
    description: "Analyze code for issues and improvements",
    agent: "review",
    subtask: true,
  },
  {
    name: "review",
    description: "Review code and suggest fixes",
    agent: "review",
    subtask: true,
  },
  {
    name: "security",
    description: "Scan for security vulnerabilities",
    agent: "security",
    subtask: true,
  },
  
  // ═══ Evolution Commands ═══
  {
    name: "auto-evolve",
    description: "Auto-evolve and improve the system",
    agent: "evolution",
    subtask: true,
  },
  {
    name: "optimize",
    description: "Optimize performance",
    agent: "evolution",
    subtask: true,
  },
  {
    name: "refactor",
    description: "Refactor code for better quality",
    agent: "evolution",
    subtask: true,
  },
  {
    name: "fix",
    description: "Fix bugs automatically",
    agent: "evolution",
    subtask: true,
  },
  
  // ═══ Research Commands ═══
  {
    name: "research",
    description: "Research a topic on the web",
    agent: "research",
    subtask: true,
  },
  {
    name: "docs",
    description: "Generate or update documentation",
    agent: "code",
    subtask: true,
  },
  
  // ═══ Deploy Commands ═══
  {
    name: "deploy",
    description: "Deploy to production",
    agent: "build",
    subtask: true,
  },
  {
    name: "deploy-edge",
    description: "Deploy Supabase Edge Functions",
    agent: "build",
    subtask: true,
  },
  
  // ═══ Project Commands ═══
  {
    name: "init",
    description: "Initialize new project structure",
    agent: "build",
    subtask: true,
  },
  {
    name: "add-feature",
    description: "Add a new feature",
    agent: "code",
    subtask: true,
  },
  {
    name: "create-component",
    description: "Create a new React component",
    agent: "code",
    subtask: true,
  },
  {
    name: "create-hook",
    description: "Create a new custom hook",
    agent: "code",
    subtask: true,
  },
  {
    name: "create-api",
    description: "Create a new API endpoint",
    agent: "code",
    subtask: true,
  },
];

// ═══ Command Aliases ═══
export const COMMAND_ALIASES: Record<string, string> = {
  "": "",
};

// ═══ Get Command ═══
export function getCommand(name: string): OrionCommand | undefined {
  return ORION_COMMANDS.find(
    c => c.name === name || c.name.includes(name.toLowerCase())
  );
}

// ═══ Get Commands for Agent ═══
export function getCommandsForAgent(agentId: string): OrionCommand[] {
  const agentCommandMap: Record<string, string[]> = {
    general: ["analyze", "research", "docs"],
    build: ["build", "test", "lint", "typecheck", "commit", "push", "pull", "deploy"],
    code: ["add-feature", "create-component", "create-hook", "create-api", "lint", "format"],
    review: ["analyze", "review", "security"],
    research: ["research", "docs"],
    security: ["security", "analyze"],
    evolution: ["auto-evolve", "optimize", "refactor", "fix", "deploy-edge"],
  };
  
  const commandNames = agentCommandMap[agentId] || [];
  return ORION_COMMANDS.filter(c => commandNames.includes(c.name));
}

// ═══ Execute Command ═══
export async function executeCommand(
  commandName: string,
  args?: Record<string, unknown>
): Promise<{ success: boolean; output: string; error?: string }> {
  const command = getCommand(commandName);
  
  if (!command) {
    return {
      success: false,
      output: "",
      error: `Command not found: ${commandName}`,
    };
  }
  
  console.log(`[OrionCommands] Executing: ${command.name} with agent: ${command.agent}`);
  
  // In a real implementation, this would dispatch to the appropriate agent
  // For now, we return a placeholder response
  return {
    success: true,
    output: `Command '${command.name}' queued. Agent '${command.agent}' will execute it.`,
  };
}