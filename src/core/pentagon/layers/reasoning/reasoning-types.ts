import { ReasoningResult } from "../types";

export interface ExtendedReasoningResult extends ReasoningResult {
  responseHint?: string;
  model?: string;
  feynmanExplanation?: string;
}
