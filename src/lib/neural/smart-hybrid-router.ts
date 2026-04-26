/**
 * ─── Orion Smart Hybrid Router (Local vs Cloud) ───
 * Orchestrates task distribution between local GPU (Ollama)
 * and Cloud APIs (Gemini/OpenRouter/Claude).
 *
 * Decision factors:
 * 1. Data Privacy (Sensitive -> Local)
 * 2. Task Complexity (High Reasoning -> Cloud)
 * 3. Resource Availability (GPU/RAM Check)
 * 4. Latency & Cost Optimization
 */

import { classifyQueryComplexity } from "./slim-model-router";
import { getCognitionState } from "./neural-cognition-engine";

export type RoutingTarget = "local" | "cloud" | "hybrid";

export interface RoutingTask {
  prompt: string;
  isSensitive?: boolean;
  priority?: "speed" | "quality";
  complexity?: number; // 0-1
}

export interface SystemCapabilities {
  hasGPU: boolean;
  ramGB: number;
  cores: number;
  ollamaAvailable: boolean;
}

/**
 * Detect local system capabilities
 */
export async function detectSystemCapabilities(): Promise<SystemCapabilities> {
  const isBrowser = typeof window !== "undefined";

  // Heuristic detection in browser
  const ram = (navigator as any).deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 4;

  // Check if Ollama is responding
  let ollamaOk = false;
  if (isBrowser) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000);
      const res = await fetch("http://localhost:11434/api/tags", {
        signal: controller.signal,
        mode: 'no-cors' // Simple check, might not return tags but confirms port is open
      });
      ollamaOk = true;
      clearTimeout(timeoutId);
    } catch {
      ollamaOk = false;
    }
  }

  return {
    hasGPU: ram > 12, // Simple heuristic: high RAM usually implies dedicated GPU or M-series Mac
    ramGB: ram,
    cores: cores,
    ollamaAvailable: ollamaOk
  };
}

/**
 * Intelligent decision logic for routing
 */
export async function decideHybridRoute(task: RoutingTask): Promise<{ target: RoutingTarget; rationale: string }> {
  const sys = await detectSystemCapabilities();
  const complexity = classifyQueryComplexity(task.prompt);
  const cognition = getCognitionState();

  // Rule 1: Privacy First
  if (task.isSensitive) {
    return {
      target: sys.ollamaAvailable ? "local" : "cloud",
      rationale: "Dados sensíveis - Prioridade para processamento local privado."
    };
  }

  // Rule 2: High Reasoning Threshold
  if (complexity.score > 0.8 || cognition.lastQuantumEntropy > 0.8) {
    return {
      target: "cloud",
      rationale: "Complexidade extrema detectada - Exige modelos de raciocínio profundo na nuvem."
    };
  }

  // Rule 3: Quality over Cost
  if (task.priority === "quality" && !sys.hasGPU) {
    return {
      target: "cloud",
      rationale: "Prioridade para qualidade e hardware local limitado - Roteado para nuvem."
    };
  }

  // Rule 4: Resource Efficiency
  if (sys.ollamaAvailable && (sys.hasGPU || complexity.score < 0.4)) {
    return {
      target: "local",
      rationale: "Eficiência de recursos - Tarefa compatível com processamento local."
    };
  }

  return { target: "cloud", rationale: "Roteamento padrão para nuvem (Nível de serviço equilibrado)." };
}

/**
 * Execute local inference via Ollama
 */
export async function callLocalInference(prompt: string, model: string = "llama3"): Promise<string> {
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model,
        prompt,
        stream: false
      })
    });
    const data = await res.json();
    return data.response;
  } catch (e) {
    console.error("[Ollama] Local inference failed, falling back to cloud.", e);
    throw e;
  }
}
