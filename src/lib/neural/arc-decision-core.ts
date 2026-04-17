/**
 * Orion ARC-AGI-2 Decision Core
 * LLM + Planner + MCTS for strategic decision making
 */

import { LogManager, Logger } from '../core/log-manager';
import type { LLMProvider } from '../providers/llm/llm-factory';

export interface DecisionContext {
  objective: string;
  constraints: string[];
  availableActions: string[];
  currentState: Record<string, unknown>;
  timeHorizon?: number;
}

export interface MCTSNode {
  state: Record<string, unknown>;
  action: string | null;
  parent: MCTSNode | null;
  children: MCTSNode[];
  visits: number;
  value: number;
  untriedActions: string[];
}

export interface DecisionResult {
  action: string;
  confidence: number;
  reasoning: string;
  alternatives: Array<{ action: string; score: number }>;
  planning: string[];
}

export class ArcDecisionCore {
  private logger: Logger;
  private llmProvider: LLMProvider | null = null;
  private mctsConfig = {
    explorationConstant: Math.sqrt(2),
    maxIterations: 1000,
    maxDepth: 10,
    simulationDepth: 5,
  };
  private contextWindow: Array<{ context: DecisionContext; decision: DecisionResult; timestamp: number }> = [];
  private maxContextHistory = 100;

  constructor(llmProvider?: LLMProvider) {
    this.logger = LogManager.getInstance().createLogger('ArcDecisionCore');
    this.llmProvider = llmProvider || null;
    this.logger.info('ArcDecisionCore initialized');
  }

  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
    this.logger.info('LLM provider configured');
  }

  async decide(context: DecisionContext): Promise<DecisionResult> {
    const startTime = Date.now();
    this.logger.info(`Decision request: ${context.objective}`);

    try {
      const mctsResult = this.mctsSearch(context);
      const llmReasoning = await this.llmReasoning(context, mctsResult);
      const finalDecision = this.integrateDecisions(mctsResult, llmReasoning, context);

      const result: DecisionResult = {
        action: finalDecision.bestAction,
        confidence: finalDecision.confidence,
        reasoning: finalDecision.reasoning,
        alternatives: finalDecision.alternatives,
        planning: this.generatePlanning(context, finalDecision.bestAction),
      };

      this.addToHistory(context, result);
      this.logger.info(`Decision made in ${Date.now() - startTime}ms: ${result.action} (confidence: ${result.confidence})`);

      return result;
    } catch (error) {
      this.logger.error('Decision failed', error);
      throw error;
    }
  }

  private mctsSearch(context: DecisionContext): {
    bestAction: string;
    actionScores: Record<string, number>;
    reasoning: string;
  } {
    const root: MCTSNode = {
      state: context.currentState,
      action: null,
      parent: null,
      children: [],
      visits: 0,
      value: 0,
      untriedActions: [...context.availableActions],
    };

    for (let i = 0; i < this.mctsConfig.maxIterations; i++) {
      const node = this.select(root);
      if (node.untriedActions.length > 0 && node.visits > 0) {
        this.expand(node, context);
      }
      const simulationResult = this.simulate(node, context);
      this.backpropagate(node, simulationResult);

      if (i % 100 === 0) {
        this.logger.debug(`MCTS iteration ${i}/${this.mctsConfig.maxIterations}`);
      }
    }

    const actionScores: Record<string, number> = {};
    let bestAction = '';
    let bestScore = -Infinity;

    for (const child of root.children) {
      const score = child.visits > 0 ? child.value / child.visits : 0;
      actionScores[child.action as string] = score;
      if (score > bestScore) {
        bestScore = score;
        bestAction = child.action as string;
      }
    }

    return {
      bestAction,
      actionScores,
      reasoning: `MCTS analyzed ${root.children.length} actions over ${this.mctsConfig.maxIterations} simulations`,
    };
  }

  private select(node: MCTSNode): MCTSNode {
    while (node.children.length > 0 && node.untriedActions.length === 0) {
      node = this.bestChild(node);
    }
    return node;
  }

  private bestChild(node: MCTSNode): MCTSNode {
    let bestChild: MCTSNode | null = null;
    let bestUCB = -Infinity;

    for (const child of node.children) {
      const ucb = this.ucb(child, node);
      if (ucb > bestUCB) {
        bestUCB = ucb;
        bestChild = child;
      }
    }

    return bestChild!;
  }

  private ucb(node: MCTSNode, parent: MCTSNode): number {
    if (node.visits === 0) return Infinity;
    const exploitation = node.value / node.visits;
    const exploration = this.mctsConfig.explorationConstant * Math.sqrt(
      Math.log(parent.visits) / node.visits
    );
    return exploitation + exploration;
  }

  private expand(node: MCTSNode, context: DecisionContext): void {
    const actionIndex = Math.floor(Math.random() * node.untriedActions.length);
    const action = node.untriedActions.splice(actionIndex, 1)[0];
    const newState = this.applyAction(node.state, action, context);

    const child: MCTSNode = {
      state: newState,
      action,
      parent: node,
      children: [],
      visits: 0,
      value: 0,
      untriedActions: [...context.availableActions].filter(a => a !== action),
    };

    node.children.push(child);
  }

  private simulate(node: MCTSNode, context: DecisionContext): number {
    let state = { ...node.state };
    let depth = 0;
    let reward = 0;

    while (depth < this.mctsConfig.simulationDepth) {
      const actions = context.availableActions;
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      state = this.applyAction(state, randomAction, context);
      reward += this.evaluateState(state, context);
      depth++;
    }

    return reward;
  }

  private evaluateState(state: Record<string, unknown>, context: DecisionContext): number {
    let score = 0;
    if (state.goalProgress) score += Number(state.goalProgress) * 10;
    if (state.constraintsSatisfied === true) score += 5;
    if (state.riskLevel !== undefined) score -= Number(state.riskLevel);
    return score;
  }

  private applyAction(
    state: Record<string, unknown>,
    action: string,
    context: DecisionContext
  ): Record<string, unknown> {
    const newState = { ...state };
    newState.lastAction = action;
    newState.timestamp = Date.now();

    const actionEffects: Record<string, Record<string, unknown>> = {
      'move_forward': { distance: 1, energy: -5 },
      'move_backward': { distance: -1, energy: -5 },
      'turn_left': { angle: -90, energy: -2 },
      'turn_right': { angle: 90, energy: -2 },
      'scan': { scanned: true, energy: -10 },
      'communicate': { communicated: true, energy: -3 },
    };

    const effects = actionEffects[action] || {};
    Object.assign(newState, effects);

    return newState;
  }

  private backpropagate(node: MCTSNode, reward: number): void {
    while (node !== null) {
      node.visits++;
      node.value += reward;
      node = node.parent!;
    }
  }

  private async llmReasoning(
    context: DecisionContext,
    mctsResult: { bestAction: string; actionScores: Record<string, number>; reasoning: string }
  ): Promise<{
    reasoning: string;
    confidence: number;
    alternatives: Array<{ action: string; score: number }>;
  }> {
    if (!this.llmProvider) {
      return {
        reasoning: mctsResult.reasoning,
        confidence: 0.7,
        alternatives: Object.entries(mctsResult.actionScores)
          .map(([action, score]) => ({ action, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 5),
      };
    }

    try {
      const prompt = `Analyze this decision context and provide reasoning:

Objective: ${context.objective}
Constraints: ${context.constraints.join(', ')}
Available Actions: ${context.availableActions.join(', ')}
Current State: ${JSON.stringify(context.currentState)}

MCTS Analysis:
- Recommended Action: ${mctsResult.bestAction}
- Action Scores: ${JSON.stringify(mctsResult.actionScores)}

Provide:
1. Reasoning for the best action
2. Confidence level (0-1)
3. Top 3 alternative actions with rationale
`;

      const response = await this.llmProvider.complete(prompt, {
        maxTokens: 500,
        temperature: 0.3,
      });

      return {
        reasoning: response.text || mctsResult.reasoning,
        confidence: 0.85,
        alternatives: Object.entries(mctsResult.actionScores)
          .map(([action, score]) => ({ action, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3),
      };
    } catch (error) {
      this.logger.warn('LLM reasoning failed, using MCTS only', error);
      return {
        reasoning: mctsResult.reasoning,
        confidence: 0.6,
        alternatives: Object.entries(mctsResult.actionScores)
          .map(([action, score]) => ({ action, score }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 3),
      };
    }
  }

  private integrateDecisions(
    mctsResult: { bestAction: string; actionScores: Record<string, number>; reasoning: string },
    llmResult: { reasoning: string; confidence: number; alternatives: Array<{ action: string; score: number }> },
    context: DecisionContext
  ): {
    bestAction: string;
    confidence: number;
    reasoning: string;
    alternatives: Array<{ action: string; score: number }>;
  } {
    const mctsWeight = 0.4;
    const llmWeight = 0.6;

    const combinedScores: Record<string, { mcts: number; llm: number; combined: number }> = {};

    for (const [action, score] of Object.entries(mctsResult.actionScores)) {
      combinedScores[action] = {
        mcts: score,
        llm: llmResult.alternatives.find(a => a.action === action)?.score || 0,
        combined: 0,
      };
    }

    for (const action of Object.keys(combinedScores)) {
      const maxMcts = Math.max(...Object.values(mctsResult.actionScores), 1);
      const maxLlm = Math.max(...llmResult.alternatives.map(a => a.score), 1);
      combinedScores[action].combined =
        (combinedScores[action].mcts / maxMcts) * mctsWeight +
        (combinedScores[action].llm / maxLlm) * llmWeight;
    }

    const sortedActions = Object.entries(combinedScores)
      .sort((a, b) => b[1].combined - a[1].combined);

    return {
      bestAction: sortedActions[0]?.[0] || mctsResult.bestAction,
      confidence: llmResult.confidence,
      reasoning: `MCTS + LLM: ${llmResult.reasoning}`,
      alternatives: sortedActions.slice(0, 5).map(([action, scores]) => ({
        action,
        score: scores.combined,
      })),
    };
  }

  private generatePlanning(context: DecisionContext, action: string): string[] {
    const planning: string[] = [];
    planning.push(`1. Execute: ${action}`);
    planning.push(`2. Evaluate outcome`);
    planning.push(`3. Reassess constraints: ${context.constraints.join(', ')}`);
    planning.push(`4. Plan next action based on new state`);
    return planning;
  }

  private addToHistory(context: DecisionContext, decision: DecisionResult): void {
    this.contextWindow.push({
      context,
      decision,
      timestamp: Date.now(),
    });

    if (this.contextWindow.length > this.maxContextHistory) {
      this.contextWindow.shift();
    }
  }

  getHistory(): Array<{ context: DecisionContext; decision: DecisionResult; timestamp: number }> {
    return [...this.contextWindow];
  }

  getStatistics(): {
    totalDecisions: number;
    averageConfidence: number;
    actionDistribution: Record<string, number>;
    mctsIterations: number;
  } {
    const totalDecisions = this.contextWindow.length;
    const averageConfidence = totalDecisions > 0
      ? this.contextWindow.reduce((sum, entry) => sum + entry.decision.confidence, 0) / totalDecisions
      : 0;

    const actionDistribution: Record<string, number> = {};
    for (const entry of this.contextWindow) {
      actionDistribution[entry.decision.action] = (actionDistribution[entry.decision.action] || 0) + 1;
    }

    return {
      totalDecisions,
      averageConfidence,
      actionDistribution,
      mctsIterations: this.mctsConfig.maxIterations,
    };
  }

  configureMCTS(config: Partial<typeof ArcDecisionCore.prototype.mctsConfig>): void {
    this.mctsConfig = { ...this.mctsConfig, ...config };
    this.logger.info('MCTS configuration updated', this.mctsConfig);
  }
}
