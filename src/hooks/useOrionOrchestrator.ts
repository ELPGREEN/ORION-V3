/**
 * useOrionOrchestrator — React hook to drive the Orion-V3 agent kernel
 * from voice or text. Compatible with the existing always-on STT engine.
 */

import { useCallback, useState } from "react";
import {
  orchestrate,
  type OrchestrationRequest,
  type OrchestrationResponse,
} from "@/lib/neural/orchestrator/orion-v3-orchestrator";

export interface UseOrionOrchestratorState {
  isRunning: boolean;
  lastResponse: OrchestrationResponse | null;
  error: string | null;
  history: OrchestrationResponse[];
}

export function useOrionOrchestrator() {
  const [state, setState] = useState<UseOrionOrchestratorState>({
    isRunning: false,
    lastResponse: null,
    error: null,
    history: [],
  });

  const run = useCallback(async (req: OrchestrationRequest) => {
    setState((s) => ({ ...s, isRunning: true, error: null }));
    try {
      const res = await orchestrate(req);
      // Silence filter: empty plan + empty summary → passive observation,
      // do NOT push to history and do NOT mark as a real response.
      const isSilent = res.plan.length === 0 && !res.summary;
      setState((s) => ({
        ...s,
        isRunning: false,
        lastResponse: isSilent ? s.lastResponse : res,
        history: isSilent ? s.history : [...s.history.slice(-9), res],
      }));
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState((s) => ({ ...s, isRunning: false, error: msg }));
      throw err;
    }
  }, []);

  /**
   * Voice entry point — wired to the STT engine.
   * Honors the sensorial gate: empty/silent transcripts with no visual
   * delta will return a "skip" response and the UI should stay quiet.
   */
  const runVoice = useCallback(
    (transcript: string, context?: string) =>
      run({ command: transcript, source: "voice", conversationContext: context }),
    [run],
  );

  const runText = useCallback(
    (text: string, context?: string) =>
      run({ command: text, source: "text", conversationContext: context }),
    [run],
  );

  return { ...state, run, runVoice, runText };
}
