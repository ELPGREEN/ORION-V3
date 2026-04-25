/**
 * ─── Orion Maestro Actuators ───
 * Unified actuation layer for Maestro interactions.
 */

import { matchAndExecuteTool } from "./orion-tool-executor";
import { runLAMPipeline } from "./large-action-model";

export interface ActuationResult {
  executed: boolean;
  toolResponse?: string;
  toolName?: string;
  actionPlan?: any;
}

/**
 * Parses the interaction and executes corresponding tools or action plans.
 */
export async function executeMaestroActuation(
  text: string,
  userId: string,
  identityStatus?: string
): Promise<ActuationResult> {
  // 1. Local Pattern Actuation (Fast Path)
  const toolResult = await matchAndExecuteTool(text, undefined, identityStatus as any);
  if (toolResult.handled) {
    return {
      executed: true,
      toolResponse: toolResult.response,
      toolName: toolResult.toolName
    };
  }

  // 2. Neuro-Symbolic Action Planning (LAM)
  const lamResult = runLAMPipeline(text);
  if (lamResult.totalTasks > 0) {
    return {
      executed: true,
      actionPlan: lamResult
    };
  }

  return { executed: false };
}
