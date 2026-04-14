/**
 * Jules Auto-Improvement Triggers v2
 * ────────────────────────────────────
 * Centralized failure tracking with DB persistence, cooldown,
 * follow-up loop, and post-merge resolution metrics.
 */

import { orionSelfImprove, julesFollowUp, getJulesDBSessions, updateJulesSessionStatus } from "./jules-client";
import { getPipelineLatency } from "./pipeline-latency-tracker";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

const FAIL_STORE_KEY = "orion_jules_subsystem_fails";
const COOLDOWN_MS = 600_000; // 10 min cooldown between triggers per subsystem

interface SubsystemFail {
  count: number;
  lastError: string;
  lastTs: number;
  julesTriggered: boolean;
  lastSessionId?: string;
}

export type SubsystemKey =
  | "tf_continuous_learning" | "tf_predictive" | "tf_mlops" | "tf_inference" | "tf_model_monitoring"
  | "onnx_yolo"
  | "vision_gemini" | "vision_mediapipe"
  | "stt_gcp" | "stt_webspeech"
  | "tts_gemini" | "tts_webspeech"
  | "iot_mqtt" | "iot_bluetooth" | "iot_smart_home" | "iot_ros2"
  // Core/Bugs
  | "core_routing" | "core_state" | "core_auth" | "core_api"
  // Performance
  | "perf_bundle" | "perf_render" | "perf_memory" | "perf_network"
  // Design
  | "design_responsive" | "design_accessibility" | "design_animation"
  // Security
  | "sec_rls" | "sec_xss" | "sec_injection" | "sec_auth_flow";

// ─── Local Store ───

function getFailStore(): Record<string, SubsystemFail> {
  try { return JSON.parse(localStorage.getItem(FAIL_STORE_KEY) || "{}"); } catch { return {}; }
}

function saveFailStore(store: Record<string, SubsystemFail>): void {
  try { localStorage.setItem(FAIL_STORE_KEY, JSON.stringify(store)); } catch {}
}

// ─── Cooldown Check (DB-based) ───

async function isOnCooldown(subsystem: string): Promise<boolean> {
  const cooldownCutoff = new Date(Date.now() - COOLDOWN_MS).toISOString();
  const { count } = await supabase
    .from("jules_sessions")
    .select("*", { count: "exact", head: true })
    .eq("subsystem", subsystem)
    .gte("created_at", cooldownCutoff);
  return (count ?? 0) > 0;
}

// ─── Main Record Function ───

export async function recordSubsystemFailure(
  subsystem: SubsystemKey,
  error: string,
  context?: string,
): Promise<{ julesTriggered: boolean; sessionId?: string; followUp?: boolean }> {
  const store = getFailStore();
  const entry = store[subsystem] || { count: 0, lastError: "", lastTs: 0, julesTriggered: false };

  // Reset if last failure was >1h ago
  if (Date.now() - entry.lastTs > 3600_000) {
    entry.count = 0;
    entry.julesTriggered = false;
    delete entry.lastSessionId;
  }

  entry.count++;
  entry.lastError = error.slice(0, 200);
  entry.lastTs = Date.now();
  store[subsystem] = entry;
  saveFailStore(store);

  const THRESHOLD = 3;

  if (entry.count >= THRESHOLD && !entry.julesTriggered) {
    // Check cooldown
    if (await isOnCooldown(subsystem)) {
      console.log(`[Jules-Trigger] ${subsystem} on cooldown, skipping`);
      return { julesTriggered: false };
    }

    console.log(`[Jules-Trigger] ${subsystem} failed ${entry.count}x — requesting self-improvement`);
    const latency = getPipelineLatency();
    const task = buildJulesTask(subsystem, error, latency, context);
    const result = await orionSelfImprove({ task, autoPR: true, subsystem });

    if (result.success) {
      entry.julesTriggered = true;
      entry.lastSessionId = result.sessionId;
      entry.count = 0;
      saveFailStore(store);
      console.log(`[Jules-Trigger] Session ${result.sessionId} created for ${subsystem}`);
      return { julesTriggered: true, sessionId: result.sessionId };
    }
  }

  // Follow-up: if already triggered and still failing, send follow-up message
  if (entry.julesTriggered && entry.lastSessionId && entry.count >= THRESHOLD) {
    const sessions = await getJulesDBSessions(5);
    const dbSession = sessions.find((s) => s.session_id === entry.lastSessionId);
    if (dbSession && dbSession.follow_up_count < 2 && dbSession.status === "completed") {
      console.log(`[Jules-Trigger] Sending follow-up to ${entry.lastSessionId}`);
      const followUpMsg = `The previous fix did not resolve the issue. New error: ${error}\nSubsystem: ${subsystem}. Please investigate further.`;
      await julesFollowUp(entry.lastSessionId, followUpMsg);
      entry.count = 0;
      saveFailStore(store);
      return { julesTriggered: false, followUp: true, sessionId: entry.lastSessionId };
    }
  }

  return { julesTriggered: false };
}

export function resetSubsystemFailures(subsystem: SubsystemKey): void {
  const store = getFailStore();
  delete store[subsystem];
  saveFailStore(store);
}

export function getSubsystemFailureStatus(): Record<string, SubsystemFail> {
  return getFailStore();
}

// ─── Post-Merge Resolution Check ───

export async function checkJulesResolution(subsystem: string): Promise<void> {
  const { data } = await supabase
    .from("jules_sessions")
    .select("*")
    .eq("subsystem", subsystem)
    .eq("status", "completed")
    .is("resolved", null)
    .order("completed_at", { ascending: false })
    .limit(1);

  const session = (data as Array<{ session_id: string; completed_at: string }> | null)?.[0];
  if (!session?.completed_at) return;

  const completedAt = new Date(session.completed_at).getTime();
  const twoHoursAfter = completedAt + 7200_000;

  if (Date.now() < twoHoursAfter) return; // Too early to judge

  // Check if subsystem has failures after completion
  const store = getFailStore();
  const entry = store[subsystem];
  const hasRecentFailures = entry && entry.lastTs > completedAt && entry.count > 0;

  await updateJulesSessionStatus(session.session_id, {
    resolved: !hasRecentFailures,
    resolved_at: new Date().toISOString(),
  });

  console.log(`[Jules-Metrics] ${subsystem} resolution: ${!hasRecentFailures ? "✓ Resolved" : "✗ Still failing"}`);
}

// ─── Task Builders ───

const SUBSYSTEM_MAP: Record<string, { file: string; desc: string }> = {
  tf_continuous_learning: { file: "src/lib/neural/tf-continuous-learning.ts", desc: "TensorFlow continuous learning adaptation is failing" },
  tf_predictive: { file: "src/lib/neural/tf-predictive-analytics.ts", desc: "TF predictive analytics is failing" },
  tf_mlops: { file: "src/lib/neural/tf-mlops-pipeline.ts", desc: "MLOps pipeline is failing" },
  tf_inference: { file: "src/lib/neural/tf-inference-optimization.ts", desc: "TF inference optimization is failing" },
  tf_model_monitoring: { file: "src/lib/neural/tf-model-monitoring.ts", desc: "TF model monitoring is failing" },
  onnx_yolo: { file: "src/lib/neural/yolo-onnx-detector.ts", desc: "YOLO ONNX object detection is failing" },
  vision_gemini: { file: "src/lib/voice/gcpSTT.ts", desc: "Gemini vision processing is failing" },
  vision_mediapipe: { file: "src/lib/neural/mediapipe-vision.ts", desc: "MediaPipe vision pipeline is failing" },
  stt_gcp: { file: "src/lib/voice/gcpSTT.ts", desc: "Google Cloud STT is failing or too slow" },
  stt_webspeech: { file: "src/lib/capacitor/native-speech-plugin.ts", desc: "Web Speech API STT is failing" },
  tts_gemini: { file: "src/lib/tts/geminiTTS.ts", desc: "Gemini TTS is failing" },
  tts_webspeech: { file: "src/lib/capacitor/native-speech-plugin.ts", desc: "Web Speech API TTS is failing" },
  iot_mqtt: { file: "src/lib/neural/iot-device-bridge.ts", desc: "MQTT IoT bridge is failing" },
  iot_bluetooth: { file: "src/lib/neural/bluetooth-manager.ts", desc: "Bluetooth BLE manager is failing" },
  iot_smart_home: { file: "src/lib/neural/smart-home-controller.ts", desc: "Smart home controller is failing" },
  iot_ros2: { file: "src/lib/neural/ros2-protocol-bridge.ts", desc: "ROS2 protocol bridge is failing" },
  // Core/Bugs
  core_routing: { file: "src/App.tsx", desc: "React Router navigation or routing is failing" },
  core_state: { file: "src/lib/neural/orion-consciousness.ts", desc: "Global state management has errors" },
  core_auth: { file: "src/hooks/useAuth.ts", desc: "Authentication flow is failing" },
  core_api: { file: "src/integrations/supabase/client.ts", desc: "API calls or Supabase queries are failing" },
  // Performance
  perf_bundle: { file: "vite.config.ts", desc: "Bundle size or build performance is degraded" },
  perf_render: { file: "src/App.tsx", desc: "React render performance is degraded (long tasks, excessive re-renders)" },
  perf_memory: { file: "src/lib/neural/system-health.ts", desc: "Memory usage is excessive or leaking" },
  perf_network: { file: "src/lib/neural/orion-api-orchestrator.ts", desc: "Network requests are slow or failing" },
  // Design
  design_responsive: { file: "src/index.css", desc: "Responsive layout issues (overflow, broken on mobile)" },
  design_accessibility: { file: "src/index.css", desc: "Accessibility issues (missing alt, ARIA, contrast)" },
  design_animation: { file: "src/index.css", desc: "Animation performance or visual glitches" },
  // Security
  sec_rls: { file: "supabase/migrations/", desc: "Row Level Security policies are missing or misconfigured" },
  sec_xss: { file: "src/App.tsx", desc: "XSS vulnerability detected (inline handlers, exposed secrets)" },
  sec_injection: { file: "supabase/functions/", desc: "SQL injection or input validation vulnerability" },
  sec_auth_flow: { file: "src/hooks/useAuth.ts", desc: "Authentication security issue (token exposure, improper validation)" },
};

function buildJulesTask(
  subsystem: SubsystemKey,
  error: string,
  latency: ReturnType<typeof getPipelineLatency>,
  context?: string,
): string {
  const latencyInfo = `Pipeline latency: STT=${latency.sttMs}ms, LLM=${latency.llmMs}ms, TTS=${latency.ttsMs}ms, Vision=${latency.visionMs}ms, Total=${latency.totalMs}ms`;
  const info = SUBSYSTEM_MAP[subsystem] || { file: "unknown", desc: subsystem };

  return (
    `Fix recurring failure in Orion subsystem: ${info.desc}\n` +
    `File: ${info.file}\nError: ${error}\n${latencyInfo}\n` +
    (context ? `Context: ${context}\n` : "") +
    `This has failed 3+ times in the last hour. ` +
    `Please diagnose the root cause, fix it, and add error handling to prevent recurrence.`
  );
}

// ─── Convenience Wrappers ───

export const recordTFFailure = (module: string, error: string) =>
  recordSubsystemFailure(`tf_${module}` as SubsystemKey, error);

export const recordVisionFailure = (provider: "gemini" | "mediapipe", error: string) =>
  recordSubsystemFailure(`vision_${provider}` as SubsystemKey, error);

export const recordSTTFailure = (provider: "gcp" | "webspeech", error: string) =>
  recordSubsystemFailure(`stt_${provider}` as SubsystemKey, error);

export const recordTTSFailure = (provider: "gemini" | "webspeech", error: string) =>
  recordSubsystemFailure(`tts_${provider}` as SubsystemKey, error);

export const recordIoTFailure = (protocol: "mqtt" | "bluetooth" | "smart_home" | "ros2", error: string) =>
  recordSubsystemFailure(`iot_${protocol}` as SubsystemKey, error);

export const recordONNXFailure = (error: string) =>
  recordSubsystemFailure("onnx_yolo", error);

export const recordCoreFailure = (module: "routing" | "state" | "auth" | "api", error: string) =>
  recordSubsystemFailure(`core_${module}` as SubsystemKey, error);

export const recordPerfFailure = (area: "bundle" | "render" | "memory" | "network", error: string) =>
  recordSubsystemFailure(`perf_${area}` as SubsystemKey, error);

export const recordDesignFailure = (area: "responsive" | "accessibility" | "animation", error: string) =>
  recordSubsystemFailure(`design_${area}` as SubsystemKey, error);

export const recordSecurityFailure = (area: "rls" | "xss" | "injection" | "auth_flow", error: string) =>
  recordSubsystemFailure(`sec_${area}` as SubsystemKey, error);
