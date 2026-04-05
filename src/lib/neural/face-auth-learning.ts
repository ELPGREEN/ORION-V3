/**
 * ─── Face Auth Neural Learning ───
 * Feeds neural_learning_data and reward loop from facial recognition events.
 * Tracks enrollment quality, login success/failure, detection tier performance,
 * and liveness challenge outcomes for continuous self-improvement.
 */

import { supabase } from "@/integrations/supabase/client";
import { processReward, type FeedbackSignal } from "./reward-loop";

export type FaceAuthEvent =
  | "enroll_success"
  | "enroll_failure"
  | "login_success"
  | "login_failure"
  | "liveness_pass"
  | "liveness_fail"
  | "spoof_detected"
  | "detection_tier_fallback";

export interface FaceAuthLearningPayload {
  event: FaceAuthEvent;
  confidence: number;          // 0-1
  detectionTier?: string;      // "faceapi" | "blazeface" | "native" | "fallback"
  centeringQuality?: number;   // 0-100
  captureCount?: number;
  livenessChallenge?: string;
  expressionDetected?: string;
  processingTimeMs?: number;
  errorMessage?: string;
}

/**
 * Log face auth interaction to neural_learning_data and feed reward loop.
 * Non-blocking — fires and forgets so it never blocks the auth flow.
 */
export function logFaceAuthLearning(payload: FaceAuthLearningPayload): void {
  // Fire async without awaiting
  _persistLearning(payload).catch(() => {});
}

async function _persistLearning(payload: FaceAuthLearningPayload): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();

  const isPositive = ["enroll_success", "login_success", "liveness_pass"].includes(payload.event);
  const qualityScore = isPositive
    ? Math.min(1, 0.6 + payload.confidence * 0.4)
    : Math.max(0, payload.confidence * 0.3);

  const feedbackText = {
    enroll_success: "Cadastro facial concluído com sucesso",
    enroll_failure: "Falha no cadastro facial",
    login_success: "Login facial verificado",
    login_failure: "Login facial não reconhecido",
    liveness_pass: "Desafio de vivacidade aprovado",
    liveness_fail: "Desafio de vivacidade reprovado",
    spoof_detected: "Tentativa de spoofing detectada",
    detection_tier_fallback: "Fallback de tier de detecção utilizado",
  }[payload.event];

  // 1. Persist to neural_learning_data
  await supabase.from("neural_learning_data").insert({
    interaction_type: "face_auth",
    input_text: `[FaceAuth] ${payload.event}`,
    output_text: feedbackText,
    quality_score: qualityScore,
    feedback: feedbackText,
    learned: isPositive && payload.confidence >= 0.7,
    user_id: user?.id ?? null,
    metadata: {
      event: payload.event,
      confidence: payload.confidence,
      detectionTier: payload.detectionTier ?? "unknown",
      centeringQuality: payload.centeringQuality ?? null,
      captureCount: payload.captureCount ?? null,
      livenessChallenge: payload.livenessChallenge ?? null,
      expressionDetected: payload.expressionDetected ?? null,
      processingTimeMs: payload.processingTimeMs ?? null,
      errorMessage: payload.errorMessage ?? null,
      timestamp: new Date().toISOString(),
    },
  });

  // 2. Feed reward loop
  const signal: FeedbackSignal = {
    interactionId: crypto.randomUUID(),
    userId: user?.id || "anonymous",
    provider: payload.detectionTier ?? "face-auth",
    domain: "biometric_auth",
    feedbackType: isPositive ? "thumbs_up" : "thumbs_down",
    value: isPositive ? 1 : -1,
    timestamp: Date.now(),
  };
  processReward(signal);
}
