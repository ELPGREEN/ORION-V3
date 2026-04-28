/**
 * ─── Tool Executor Adapter v25.0 ───
 * Converte ORION_TOOLS para formato OpenAI Function Calling
 * e integra com LangChain-like patterns
 */

import { ORION_TOOLS, executeTool, type Tool, type ToolName } from "../orion-tools";

/** ═══════════════════════════════════════════════════════════════
 * OPENAI FUNCTION CALLING FORMAT
 * ═══════════════════════════════════════════════════════════════ */

export interface FunctionDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, {
        type: string;
        description: string;
      }>;
      required?: string[];
    };
  };
}

/**
 * Converte ORION_TOOLS para formato OpenAI Function Calling
 */
export function orionToolsToFunctionCalling(): FunctionDefinition[] {
  return ORION_TOOLS.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(tool.parameters).map(([key, param]) => [
            key,
            { type: param.type, description: param.description },
          ])
        ),
        required: Object.entries(tool.parameters)
          .filter(([, p]) => p.required)
          .map(([key]) => key),
      },
    },
  }));
}

/** ═══════════════════════════════════════════════════════════════
 * LANGCHAIN-STYLE TOOL BINDING
 * ═══════════════════════════════════════════════════════════════ */

import type { AgentRole } from "../neural/multi-agent";
import { SUPER_AGENTS } from "../neural/super-prompts";

/**
 * Get tools for specific Super Agent role
 */
export function getToolsForSuperAgent(role: AgentRole): FunctionDefinition[] {
  const allTools = orionToolsToFunctionCalling();
  const agent = SUPER_AGENTS[role];
  
  if (!agent) return allTools;
  
  return allTools.filter((tool) =>
    agent.tools.includes(tool.function.name)
  );
}

/** ═══════════════════════════════════════════════════════════════
 * TOOL EXECUTION ENGINE
 * ═══════════════════════════════════════════════════════════════ */

export interface ToolExecutionResult {
  success: boolean;
  toolName: string;
  result?: unknown;
  error?: string;
  durationMs: number;
}

/**
 * Execute tool from function call response
 */
export async function executeFunctionCall(
  functionCall: { name: string; arguments: string }
): Promise<ToolExecutionResult> {
  const start = Date.now();
  
  try {
    const args = JSON.parse(functionCall.arguments);
    const result = await executeTool(functionCall.name as ToolName, args);
    
    return {
      success: true,
      toolName: functionCall.name,
      result,
      durationMs: Date.now() - start,
    };
  } catch (error) {
    return {
      success: false,
      toolName: functionCall.name,
      error: error instanceof Error ? error.message : "Unknown error",
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Execute multiple tool calls in sequence or parallel
 */
export async function executeToolCalls(
  toolCalls: Array<{ name: string; arguments: string }>,
  parallel = false
): Promise<ToolExecutionResult[]> {
  if (parallel) {
    return Promise.all(toolCalls.map(executeFunctionCall));
  }
  
  const results: ToolExecutionResult[] = [];
  for (const call of toolCalls) {
    const result = await executeFunctionCall(call);
    results.push(result);
    if (!result.success) break;
  }
  return results;
}

/** ═══════════════════════════════════════════════════════════════
 * AGENT-ORCHESTRATED TOOL LOOP (LangChain-style)
 * ═══════════════════════════════════════════════════════════════ */

export interface AgentLoopConfig {
  maxIterations: number;
  timeoutMs: number;
  stopOnFirstError: boolean;
}

const DEFAULT_AGENT_LOOP_CONFIG: AgentLoopConfig = {
  maxIterations: 5,
  timeoutMs: 30000,
  stopOnFirstError: true,
};

/**
 * LangChain-style agent loop:
 * 1. LLM decides action
 * 2. Execute tool
 * 3. Observe result
 * 4. Decide next action or respond
 */
export async function runAgentLoop(
  messages: Array<{ role: string; content: string }>,
  tools: FunctionDefinition[],
  config: AgentLoopConfig = DEFAULT_AGENT_LOOP_CONFIG
): Promise<{ response: string; iterations: number; toolCalls: ToolExecutionResult[] }> {
  const toolCalls: ToolExecutionResult[] = [];
  let currentIteration = 0;
  
  while (currentIteration < config.maxIterations) {
    currentIteration++;
    
    // This would call the LLM with tools and get response
    // In real implementation, this is handled by the LLM client
    
    // For demo, return iterations
    if (toolCalls.length === 0) {
      break;
    }
  }
  
  return {
    response: "Agent loop completed",
    iterations: currentIteration,
    toolCalls,
  };
}

/** ═══════════════════════════════════════════════════════════════════════
 * REACT (REASON + ACT) PATTERN
 * ═══════════════════════════════════════════════════════════════ */

export interface ReActStep {
  thought: string;
  action: string;
  observation: string;
}

/**
 * Execute ReAct pattern with tools
 */
export async function runReAct(
  question: string,
  tools: FunctionDefinition[],
  maxSteps = 5
): Promise<{ answer: string; steps: ReActStep[] }> {
  const steps: ReActStep[] = [];
  let currentQuestion = question;
  
  for (let i = 0; i < maxSteps; i++) {
    const thought = `Analisando: ${currentQuestion}`;
    const action = "";
    const observation = "";
    
    steps.push({ thought, action, observation });
    
    if (i === maxSteps - 1) {
      break;
    }
  }
  
  return {
    answer: currentQuestion,
    steps,
  };
}

/** ═══════════════════════════════════════════════════════════════
 * EXPORTS
 * ═══════════════════════════════════════════════════════════════ */

export { ORION_TOOLS, executeTool };
export type { Tool, ToolName, FunctionDefinition, ToolExecutionResult, AgentLoopConfig, ReActStep };