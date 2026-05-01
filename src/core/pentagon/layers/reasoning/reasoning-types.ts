import { ReasoningResult } from "../types";

export interface ExtendedReasoningResult extends ReasoningResult {
  rationale: string;
  plan: string[];
  confidence: number;
}
