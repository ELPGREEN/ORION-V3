/**
 * ─── useKnowledgeHarvester Hook ───
 * React hook for the Knowledge Harvester pipeline.
 * Provides state management, progress tracking, and results.
 */

import { useState, useCallback, useRef } from "react";
import {
  KnowledgeHarvesterPipeline,
  type HarvestResult,
  type HarvestSession,
  type PipelineConfig,
  type PipelineState,
  type PipelineStatus,
  DEFAULT_PIPELINE_CONFIG,
  QUICK_PIPELINE,
  FULL_PIPELINE,
} from "@/lib/neural/knowledge-harvester-pipeline";
import {
  AUTOCOGNITIVE_PROMPTS,
  KNOWLEDGE_TOPICS,
  getRandomTopic,
  getTopicCount,
  type AutocognitivePrompt,
} from "@/lib/neural/knowledge-harvester-prompts";

export interface UseKnowledgeHarvesterReturn {
  prompts: AutocognitivePrompt[];
  topics: { category: string; topics: string[] }[];
  topicCount: number;
  state: PipelineState;
  status: PipelineStatus;
  progress: number;
  totalSteps: number;
  results: HarvestResult[];
  currentSession: HarvestSession | null;
  error: string | null;
  isRunning: boolean;
  run: (topic: string, config?: Partial<PipelineConfig>) => Promise<HarvestSession>;
  runQuick: (topic: string) => Promise<HarvestSession>;
  runFull: (topic: string) => Promise<HarvestSession>;
  runRandom: () => Promise<HarvestSession>;
  cancel: () => void;
  clearResults: () => void;
}

export function useKnowledgeHarvester(
  initialConfig: Partial<PipelineConfig> = {}
): UseKnowledgeHarvesterReturn {
  const [state, setState] = useState<PipelineState>({
    status: "idle",
    currentPrompt: null,
    currentModel: null,
    progress: 0,
    totalSteps: 0,
    results: [],
    error: null,
  });
  const [currentSession, setCurrentSession] = useState<HarvestSession | null>(null);
  const pipelineRef = useRef<KnowledgeHarvesterPipeline | null>(null);

  const run = useCallback(
    async (topic: string, config?: Partial<PipelineConfig>): Promise<HarvestSession> => {
      const mergedConfig = { ...DEFAULT_PIPELINE_CONFIG, ...initialConfig, ...config };
      const pipeline = new KnowledgeHarvesterPipeline(mergedConfig);
      pipelineRef.current = pipeline;

      pipeline.on({
        onStep: (step, total, promptId, model) => {
          setState((prev) => ({
            ...prev,
            progress: step,
            totalSteps: total,
            currentPrompt: promptId,
            currentModel: model,
          }));
        },
        onResult: (result) => {
          setState((prev) => ({
            ...prev,
            results: [...prev.results, result],
          }));
        },
        onComplete: (session) => {
          setState((prev) => ({
            ...prev,
            status: "completed",
            progress: prev.totalSteps,
          }));
          setCurrentSession(session);
        },
        onError: (error) => {
          setState((prev) => ({ ...prev, status: "failed", error }));
        },
        onStatusChange: (status) => {
          setState((prev) => ({ ...prev, status }));
        },
      });

      return pipeline.run(topic);
    },
    [initialConfig]
  );

  const runQuick = useCallback(
    (topic: string) => run(topic, QUICK_PIPELINE),
    [run]
  );

  const runFull = useCallback(
    (topic: string) => run(topic, FULL_PIPELINE),
    [run]
  );

  const runRandom = useCallback(async (): Promise<HarvestSession> => {
    const topic = getRandomTopic();
    return run(topic, QUICK_PIPELINE);
  }, [run]);

  const cancel = useCallback(() => {
    pipelineRef.current?.cancel();
  }, []);

  const clearResults = useCallback(() => {
    setState({
      status: "idle",
      currentPrompt: null,
      currentModel: null,
      progress: 0,
      totalSteps: 0,
      results: [],
      error: null,
    });
    setCurrentSession(null);
    pipelineRef.current = null;
  }, []);

  return {
    prompts: AUTOCOGNITIVE_PROMPTS,
    topics: Object.entries(KNOWLEDGE_TOPICS).map(([category, topics]) => ({
      category,
      topics,
    })),
    topicCount: getTopicCount(),
    state,
    status: state.status,
    progress: state.progress,
    totalSteps: state.totalSteps,
    results: state.results,
    currentSession,
    error: state.error,
    isRunning: state.status === "running",
    run,
    runQuick,
    runFull,
    runRandom,
    cancel,
    clearResults,
  };
}
