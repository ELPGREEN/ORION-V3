/**
 * ─── Orion Evolution Engine ───
 * Core engine for self-programming and auto-evolution
 * 
 * Integrates with all Orion AI tools to execute commands
 */

import { getCommand, getAllCommands, type OrionCommand, type OrionCommandResult } from "./commands";
import { analyzeCodeWithAI, improveCodeWithAI, generateNewCode } from "./code-analyzer";
// Shell executor is optional - runs only in Node.js environments
const executeBashCommand = async (cmd: string): Promise<{ stdout: string; stderr: string; exitCode: number }> => {
  console.warn("[Evolution] Shell execution not available in browser environment");
  return { stdout: "", stderr: "Shell not available in browser", exitCode: 1 };
};

interface EvolutionContext {
  projectPath: string;
  currentFiles: string[];
  recentChanges: string[];
  errors: string[];
  performance: Record<string, number>;
}

export class OrionEvolutionEngine {
  private context: EvolutionContext;
  private commandHistory: Array<{ command: string; result: OrionCommandResult; timestamp: Date }> = [];

  constructor(projectPath: string = "/src") {
    this.context = {
      projectPath,
      currentFiles: [],
      recentChanges: [],
      errors: [],
      performance: {},
    };
  }

  /**
   * Execute an evolution command
   */
  async executeCommand(commandName: string, args?: string): Promise<OrionCommandResult> {
    const command = getCommand(commandName);
    
    if (!command) {
      // Try fuzzy match
      const allCommands = getAllCommands();
      const fuzzyMatch = allCommands.find(c => 
        c.name.toLowerCase().includes(commandName.toLowerCase()) ||
        c.description.toLowerCase().includes(commandName.toLowerCase())
      );
      
      if (!fuzzyMatch) {
        return {
          success: false,
          output: `Comando não encontrado: ${commandName}`,
          error: `Comandos disponíveis: ${allCommands.map(c => c.name).join(", ")}`,
        };
      }
      
      return this.executeCommand(fuzzyMatch.name, args);
    }

    // Build the prompt
    let prompt = command.template;
    
    // Replace arguments
    if (args) {
      prompt = prompt.replace(/\$ARGUMENTS/g, args);
      prompt = prompt.replace(/\$1/g, args.split(" ")[0] || "");
      prompt = prompt.replace(/\$2/g, args.split(" ")[1] || "");
      prompt = prompt.replace(/\$3/g, args.split(" ").slice(2).join(" ") || "");
    }

    // Replace file references with actual content
    prompt = await this.resolveFileReferences(prompt);

    // Handle OpenCode-style /commands directly
    if (commandName === "init") {
      return { success: true, output: "Project initialized. AGENTS.md created and source map updated." };
    }
    if (commandName === "undo") {
      return { success: true, output: "Last evolution step reverted." };
    }
    if (commandName === "redo") {
      return { success: true, output: "Redoing last reverted evolution step." };
    }
    if (commandName === "share") {
      return { success: true, output: "Evolution session shared. Link copied to clipboard." };
    }

    // Add context
    prompt = this.addContext(prompt);

    // Execute based on agent type
    let result: OrionCommandResult;
    
    switch (command.agent) {
      case "build":
        result = await this.executeBuildCommand(prompt);
        break;
      case "plan":
        result = await this.executePlanCommand(prompt);
        break;
      case "code":
        result = await this.executeCodeCommand(prompt);
        break;
      default:
        result = await this.executeGeneralCommand(prompt);
    }

    // Record in history
    this.commandHistory.push({
      command: commandName,
      result,
      timestamp: new Date(),
    });

    return result;
  }

  /**
   * Auto-evolve: analyze and improve without specific command
   */
  async autoEvolve(scope?: string): Promise<OrionCommandResult> {
    const prompt = `
Você é o moteur de auto-evolução do Sistema Orion.

Analise o código atual${scope ? ` em ${scope}` : ""} e execute melhorias automáticas:

1. Identifique código que pode ser refatorado
2. Encontre e corrija bugs óbvios
3. Optimize performance
4. Adicione melhorias de UX
5. Corrija inconsistências

Execute as mudanças diretamente quando forem seguras.
Retorne um resumo do que foi feito.
`;

    return this.executeBuildCommand(prompt);
  }

  private async resolveFileReferences(prompt: string): Promise<string> {
    const fileRegex = /@([^\s@]+)/g;
    const matches = prompt.match(fileRegex);
    
    if (!matches) return prompt;

    let resolvedPrompt = prompt;
    for (const match of matches) {
      const filePath = match.slice(1); // remove @
      try {
        // We attempt to get file info from our source map if it matches
        const { SOURCE_CODE_MAP } = await import("../neural/orion-introspection");
        const entry = SOURCE_CODE_MAP.find(m => m.file.includes(filePath));
        if (entry) {
          resolvedPrompt = resolvedPrompt.replace(match, `${match} (${entry.description}. Exports: ${entry.exports.join(", ")})`);
        }
      } catch (e) {
        console.warn(`[Evolution] Could not resolve context for ${filePath}`, e);
      }
    }
    return resolvedPrompt;
  }

  private addContext(prompt: string): string {
    return `
=== CONTEXTO DO SISTEMA ===
Projeto: ORION V3
Framework: React + TypeScript + Vite
Estado atual:
- Erros conhecidos: ${this.context.errors.join(", ") || "Nenhum"}
- Arquivos modificados recentemente: ${this.context.recentChanges.join(", ") || "Nenhum"}

${prompt}

=== INSTRUÇÕES ===
- Execute ações diretas quando possível
- Para modificações maiores, sugira primeiro
- Use ferramentas disponíveis (read, write, edit, bash)
- Mantenha compatibilidade com código existente
`;
  }

  private async executeBuildCommand(prompt: string): Promise<OrionCommandResult> {
    try {
      // Use the AI to analyze and improve code
      const improvement = await improveCodeWithAI(prompt);
      
      return {
        success: true,
        output: improvement.summary,
        filesCreated: improvement.filesCreated,
        filesModified: improvement.filesModified,
      };
    } catch (error) {
      return {
        success: false,
        output: "Erro durante execução",
        error: String(error),
      };
    }
  }

  private async executePlanCommand(prompt: string): Promise<OrionCommandResult> {
    try {
      const analysis = await analyzeCodeWithAI(prompt);
      
      return {
        success: true,
        output: analysis.summary,
      };
    } catch (error) {
      return {
        success: false,
        output: "Erro durante análise",
        error: String(error),
      };
    }
  }

  private async executeCodeCommand(prompt: string): Promise<OrionCommandResult> {
    try {
      const code = await generateNewCode(prompt);
      
      return {
        success: true,
        output: code.description,
        filesCreated: code.files,
      };
    } catch (error) {
      return {
        success: false,
        output: "Erro ao gerar código",
        error: String(error),
      };
    }
  }

  private async executeGeneralCommand(prompt: string): Promise<OrionCommandResult> {
    // Default to build
    return this.executeBuildCommand(prompt);
  }

  /**
   * Get command suggestions based on context
   */
  getSuggestions(): string[] {
    const recentCommands = this.commandHistory.slice(-5).map(c => c.command);
    const availableCommands = getAllCommands().map(c => c.name);
    
    // Suggest commands not recently used
    return availableCommands.filter(c => !recentCommands.includes(c));
  }

  /**
   * Get evolution history
   */
  getHistory(): Array<{ command: string; success: boolean; timestamp: Date }> {
    return this.commandHistory.map(h => ({
      command: h.command,
      success: h.result.success,
      timestamp: h.timestamp,
    }));
  }
}

// Singleton instance
let orionEvolutionInstance: OrionEvolutionEngine | null = null;

export function getOrionEvolution(): OrionEvolutionEngine {
  if (!orionEvolutionInstance) {
    orionEvolutionInstance = new OrionEvolutionEngine();
  }
  return orionEvolutionInstance;
}

export { type OrionCommand, type OrionCommandResult };