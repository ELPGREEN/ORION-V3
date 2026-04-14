/**
 * Jules Auto-Improvement Triggers v1
 * ────────────────────────────────────
 * Centralized failure tracking for TF, ONNX, Vision, STT, TTS, IoT.
 * When any subsystem fails 3+ times, Jules is triggered to auto-fix.
 */

import { orionSelfImprove } from "./jules-client";
import { getPipelineLatency } from "./pipeline-latency-tracker";

// ─── Failure Tracker ───

const FAIL_STORE_KEY = "orion_jules_subsystem_fails";

interface SubsystemFail {
  count: number;
  lastError: string;
  lastTs: number;
  julesTriggered: boolean;
}

type SubsystemKey =
  | "tf_continuous_learning"
  | "tf_predictive"
  | "tf_mlops"
  | "tf_inference"
  | "tf_model_monitoring"
  | "onnx_yolo"
  | "vision_gemini"
  | "vision_mediapipe"
  | "stt_gcp"
  | "stt_webspeech"
  | "tts_gemini"
  | "tts_webspeech"
  | "iot_mqtt"
  | "iot_bluetooth"
  | "iot_smart_home"
  | "iot_ros2";

function getFailStore(): Record<string, SubsystemFail> {
  try {
    return JSON.parse(localStorage.getItem(FAIL_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveFailStore(store: Record<string, SubsystemFail>): void {
  try {
    localStorage.setItem(FAIL_STORE_KEY, JSON.stringify(store));
  } catch {}
}

/**
 * Record a subsystem failure. After 3 failures, triggers Jules auto-PR.
 */
export async function recordSubsystemFailure(
  subsystem: SubsystemKey,
  error: string,
  context?: string
): Promise<{ julesTriggered: boolean; sessionId?: string }> {
  const store = getFailStore();
  const entry = store[subsystem] || { count: 0, lastError: "", lastTs: 0, julesTriggered: false };

  // Reset if last failure was >1h ago
  if (Date.now() - entry.lastTs > 3600_000) {
    entry.count = 0;
    entry.julesTriggered = false;
  }

  entry.count++;
  entry.lastError = error.slice(0, 200);
  entry.lastTs = Date.now();
  store[subsystem] = entry;
  saveFailStore(store);

  const THRESHOLD = 3;

  if (entry.count >= THRESHOLD && !entry.julesTriggered) {
    console.log(`[Jules-Trigger] ${subsystem} failed ${entry.count}x — requesting self-improvement`);

    const latency = getPipelineLatency();
    const task = buildJulesTask(subsystem, error, latency, context);
    const result = await orionSelfImprove({ task, autoPR: true });

    if (result.success) {
      entry.julesTriggered = true;
      entry.count = 0;
      saveFailStore(store);
      console.log(`[Jules-Trigger] Session ${result.sessionId} created for ${subsystem}`);
      return { julesTriggered: true, sessionId: result.sessionId };
    }
  }

  return { julesTriggered: false };
}

/**
 * Reset a subsystem's failure counter (e.g., after manual fix).
 */
export function resetSubsystemFailures(subsystem: SubsystemKey): void {
  const store = getFailStore();
  delete store[subsystem];
  saveFailStore(store);
}

/**
 * Get current failure status for all subsystems.
 */
export function getSubsystemFailureStatus(): Record<string, SubsystemFail> {
  return getFailStore();
}

// ─── Task Builders ───

function buildJulesTask(
  subsystem: SubsystemKey,
  error: string,
  latency: ReturnType<typeof getPipelineLatency>,
  context?: string
): string {
  const latencyInfo = `Pipeline latency: STT=${latency.sttMs}ms, LLM=${latency.llmMs}ms, TTS=${latency.ttsMs}ms, Vision=${latency.visionMs}ms, Total=${latency.totalMs}ms`;

  const subsystemMap: Record<string, { file: string; desc: string }> = {
    tf_continuous_learning: {
      file: "src/lib/neural/tf-continuous-learning.ts",
      desc: "TensorFlow continuous learning adaptation is failing",
    },
    tf_predictive: {
      file: "src/lib/neural/tf-predictive-analytics.ts",
      desc: "TF predictive analytics anomaly detection is failing",
    },
    tf_mlops: {
      file: "src/lib/neural/tf-mlops-pipeline.ts",
      desc: "MLOps pipeline health evaluation is failing",
    },
    tf_inference: {
      file: "src/lib/neural/tf-inference-optimization.ts",
      desc: "TF inference optimization is failing",
    },
    tf_model_monitoring: {
      file: "src/lib/neural/tf-model-monitoring.ts",
      desc: "TF model performance monitoring is failing",
    },
    onnx_yolo: {
      file: "src/lib/neural/yolo-onnx-detector.ts",
      desc: "YOLO ONNX object detection is failing",
    },
    vision_gemini: {
      file: "src/lib/voice/gcpSTT.ts",
      desc: "Gemini vision processing is failing",
    },
    vision_mediapipe: {
      file: "src/lib/neural/mediapipe-vision.ts",
      desc: "MediaPipe vision pipeline is failing",
    },
    stt_gcp: {
      file: "src/lib/voice/gcpSTT.ts",
      desc: "Google Cloud STT speech recognition is failing or too slow",
    },
    stt_webspeech: {
      file: "src/lib/capacitor/native-speech-plugin.ts",
      desc: "Web Speech API fallback STT is failing",
    },
    tts_gemini: {
      file: "src/lib/tts/geminiTTS.ts",
      desc: "Gemini TTS voice synthesis is failing",
    },
    tts_webspeech: {
      file: "src/lib/capacitor/native-speech-plugin.ts",
      desc: "Web Speech API fallback TTS is failing",
    },
    iot_mqtt: {
      file: "src/lib/neural/iot-device-bridge.ts",
      desc: "MQTT IoT device bridge connection is failing",
    },
    iot_bluetooth: {
      file: "src/lib/neural/bluetooth-manager.ts",
      desc: "Bluetooth BLE device manager is failing",
    },
    iot_smart_home: {
      file: "src/lib/neural/smart-home-controller.ts",
      desc: "Smart home controller is failing",
    },
    iot_ros2: {
      file: "src/lib/neural/ros2-protocol-bridge.ts",
      desc: "ROS2 protocol bridge is failing",
    },
  };

  const info = subsystemMap[subsystem] || { file: "unknown", desc: subsystem };

  return (
    `Fix recurring failure in Orion subsystem: ${info.desc}\n` +
    `File: ${info.file}\n` +
    `Error: ${error}\n` +
    `${latencyInfo}\n` +
    (context ? `Context: ${context}\n` : "") +
    `This has failed 3+ times in the last hour. ` +
    `Please diagnose the root cause, fix it, and add error handling to prevent recurrence.`
  );
}

// ─── Convenience Wrappers ───

/** TensorFlow training failure */
export const recordTFFailure = (module: string, error: string) =>
  recordSubsystemFailure(`tf_${module}` as SubsystemKey, error);

/** Vision processing failure */
export const recordVisionFailure = (provider: "gemini" | "mediapipe", error: string) =>
  recordSubsystemFailure(`vision_${provider}` as SubsystemKey, error);

/** STT failure */
export const recordSTTFailure = (provider: "gcp" | "webspeech", error: string) =>
  recordSubsystemFailure(`stt_${provider}` as SubsystemKey, error);

/** TTS failure */
export const recordTTSFailure = (provider: "gemini" | "webspeech", error: string) =>
  recordSubsystemFailure(`tts_${provider}` as SubsystemKey, error);

/** IoT failure */
export const recordIoTFailure = (protocol: "mqtt" | "bluetooth" | "smart_home" | "ros2", error: string) =>
  recordSubsystemFailure(`iot_${protocol}` as SubsystemKey, error);

/** ONNX/YOLO failure */
export const recordONNXFailure = (error: string) =>
  recordSubsystemFailure("onnx_yolo", error);
