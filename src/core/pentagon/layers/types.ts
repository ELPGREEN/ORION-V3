/**
 * 🍕 Pentagon Pizza Core Types & Interfaces
 */

export type CognitiveState = "idle" | "perceiving" | "remembering" | "reasoning" | "acting" | "evaluating";

export interface PerceptionResult {
  intent: string;
  entities: Record<string, any>;
  sentiment: string;
  rawInput: string;
  contextualMarkers: string[];
}

export interface MemoryResult {
  shortTerm: any[];
  longTerm: any[];
  episodic: any[];
  mergedContext: string;
}

export interface ReasoningResult {
  plan: string[];
  rationale: string;
  confidence: number;
  subTasks: string[];
}

export interface ActionResult {
  success: boolean;
  data: any;
  output: string;
  roiImpact?: string;
}

export interface MetaResult {
  valid: boolean;
  score: number;
  feedback: string;
  adjustments?: Record<string, any>;
  guardrailBreach?: string;
}

export interface IPentagonLayer<TInput, TOutput> {
  process(input: TInput, context: any): Promise<TOutput>;
}

export interface IMemoryBackend {
  store(key: string, data: any): Promise<void>;
  retrieve(query: string, limit: number): Promise<any[]>;
  relate(nodeA: string, nodeB: string, relation: string): Promise<void>;
}
