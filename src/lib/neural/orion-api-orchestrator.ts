/**
 * ─── Orion API Orchestrator ───
 * Unified registry of ALL APIs/models used by Orion across 5 capabilities:
 * 👁️ Ver | 👂 Ouvir | 🗣️ Falar | 🧠 Raciocinar | 🔐 Reconhecimento Facial
 * 
 * Provides real-time health status, fallback ordering, and capability queries.
 */

// Vision: Gemini handles all vision on-demand (local ML removed)
import { getTFMetrics } from "./tf-runtime";
const getFaceApiMetrics = () => ({ modelsLoaded: false, loadTimeMs: 0, hasMatcher: false });
import { getHealthSnapshot, type SystemHealthSnapshot } from "./system-health";

// ─── Types ───

export type OrionCapability = "vision" | "hearing" | "speech" | "reasoning" | "face_recognition" | "quantum_compute";
export type APITier = "primary" | "secondary" | "tertiary" | "fallback";
export type APIRuntime = "local_wasm" | "local_webgl" | "local_browser" | "local_dsp" | "cloud" | "edge_function";
export type APIHealth = "online" | "loading" | "offline" | "error" | "unknown";

export interface OrionAPI {
  id: string;
  name: string;
  brandName: string;          // Orion motor brand name (no public API names)
  capability: OrionCapability;
  tier: APITier;
  runtime: APIRuntime;
  library: string;            // npm package or native API
  version: string;
  health: APIHealth;
  lastLatencyMs: number;
  errorCount: number;
  features: string[];
  checkHealth: () => APIHealth;
}

export interface CapabilityStatus {
  capability: OrionCapability;
  label: string;
  icon: string;
  activeAPI: string | null;
  activeTier: APITier | null;
  apis: OrionAPI[];
  overallHealth: APIHealth;
}

export interface OrchestratorSnapshot {
  timestamp: number;
  capabilities: CapabilityStatus[];
  totalAPIs: number;
  onlineAPIs: number;
  systemHealth: SystemHealthSnapshot;
}


// ─── Health Check Helpers ───

function checkBlazeFace(): APIHealth {
  const metrics = getTFMetrics();
  return metrics.blazeFaceReady ? "online" : "loading";
}

function checkFaceApi(): APIHealth {
  const metrics = getFaceApiMetrics();
  return metrics.modelsLoaded ? "online" : "loading";
}


function checkBrowserSTT(): APIHealth {
  return typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
    ? "online" : "offline";
}

function checkFaceDetectorAPI(): APIHealth {
  return typeof window !== "undefined" && typeof (window as any).FaceDetector === "function"
    ? "online" : "offline";
}

function alwaysCloud(): APIHealth {
  return "online"; // Cloud APIs assumed available (circuit breaker handles failures)
}

// ─── API Registry ───

const API_REGISTRY: OrionAPI[] = [
  // ═══ 👁️ VISÃO — Gemini only ═══
  {
    id: "gemini_vision", name: "Gemini Vision", brandName: "Orion Vision Core",
    capability: "vision", tier: "primary", runtime: "cloud",
    library: "Lovable AI Gateway / Gemini API", version: "2.5-flash",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Análise multimodal", "Descrição de cenas", "OCR avançado", "Detecção de objetos"],
    checkHealth: alwaysCloud,
  },

  // ═══ 👂 OUVIR ═══
  {
    id: "web_speech_stt", name: "Web Speech API (STT)", brandName: "Orion Audição Nativa",
    capability: "hearing", tier: "primary", runtime: "local_browser",
    library: "SpeechRecognition (Browser)", version: "Nativo",
    health: "unknown", lastLatencyMs: 0, errorCount: 0,
    features: ["Wake-word 'Orion'", "Reconhecimento contínuo", "Resultados parciais"],
    checkHealth: checkBrowserSTT,
  },
  {
    id: "whisper_browser", name: "Whisper Browser STT", brandName: "Orion Audição Neural",
    capability: "hearing", tier: "secondary", runtime: "local_browser",
    library: "Web Speech API", version: "Nativo",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Transcrição gratuita", "Multi-idioma", "Reconhecimento contínuo"],
    checkHealth: checkBrowserSTT,
  },

  // ═══ 🗣️ FALAR ═══
  {
    id: "orion_evolved_voice", name: "Orion Evolved Voice", brandName: "Orion Voz Evolutiva",
    capability: "speech", tier: "primary", runtime: "local_dsp",
    library: "Web Audio API + DSP", version: "v2.0",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Motor evolutivo", "Formantes DSP", "Absorção prosódica", "Barítono ~120Hz"],
    checkHealth: () => "online",
  },
  {
    id: "google_translate_tts", name: "Google Translate TTS", brandName: "Orion Voz Google",
    capability: "speech", tier: "secondary", runtime: "cloud",
    library: "Google Translate", version: "gTTS",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["TTS gratuito ilimitado", "PT-BR natural", "Zero custo"],
    checkHealth: alwaysCloud,
  },
  {
    id: "jarvis_tts", name: "JARVIS TTS (Piper)", brandName: "Orion Voz JARVIS",
    capability: "speech", tier: "secondary", runtime: "cloud",
    library: "jgkawell/jarvis", version: "medium",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Voz JARVIS (British English)", "Piper ONNX", "22050Hz WAV", "Home Assistant compatível", "DSP pós-processamento"],
    checkHealth: alwaysCloud,
  },
  {
    id: "piper_tts", name: "Piper TTS (WASM)", brandName: "Orion Voz Offline",
    capability: "speech", tier: "tertiary", runtime: "local_wasm",
    library: "@mintplex-labs/piper-tts-web", version: "^1.0.x",
    health: "unknown", lastLatencyMs: 0, errorCount: 0,
    features: ["Síntese offline pt-BR", "Modelo ONNX faber-medium", "~50MB"],
    checkHealth: () => "online",
  },
  // Web Speech TTS removed — Gemini TTS only, silence on failure

  // ═══ 🧠 RACIOCINAR ═══
  {
    id: "lovable_ai", name: "Lovable AI Gateway", brandName: "Motor Primário",
    capability: "reasoning", tier: "primary", runtime: "cloud",
    library: "Lovable AI Gateway", version: "gemini-3-flash-preview",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["SSE streaming", "Chat primário", "Alta confiabilidade"],
    checkHealth: alwaysCloud,
  },
  {
    id: "groq", name: "Groq", brandName: "Motor Alpha (Velocidade)",
    capability: "reasoning", tier: "primary", runtime: "cloud",
    library: "Groq API", version: "llama-3.3-70b",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Ultra-baixa latência", "Timeout 6s", "LPU inference"],
    checkHealth: alwaysCloud,
  },
  {
    id: "gemini", name: "Google Gemini", brandName: "Motor Beta (Multimodal)",
    capability: "reasoning", tier: "secondary", runtime: "cloud",
    library: "Gemini API", version: "2.5-flash/pro",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Multimodal", "Context longo", "Timeout 8s"],
    checkHealth: alwaysCloud,
  },
  {
    id: "deepseek", name: "DeepSeek", brandName: "Motor Delta (Raciocínio)",
    capability: "reasoning", tier: "secondary", runtime: "cloud",
    library: "DeepSeek API", version: "V3.2 / Reasoner",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Raciocínio profundo", "Thinking chain", "Análise jurídica"],
    checkHealth: alwaysCloud,
  },
  {
    id: "mistral", name: "Mistral AI", brandName: "Motor Gamma (Europeu)",
    capability: "reasoning", tier: "tertiary", runtime: "cloud",
    library: "Mistral API", version: "mistral-large",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Embeddings", "GDPR-compliant", "Busca semântica"],
    checkHealth: alwaysCloud,
  },
  {
    id: "anthropic", name: "Anthropic Claude", brandName: "Motor Epsilon (Profundidade)",
    capability: "reasoning", tier: "tertiary", runtime: "cloud",
    library: "Anthropic API", version: "claude-3.5-sonnet",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Análise profunda", "200k context", "Documentos complexos"],
    checkHealth: alwaysCloud,
  },
  {
    id: "openai", name: "OpenAI", brandName: "Motor Zeta (Revisão)",
    capability: "reasoning", tier: "fallback", runtime: "cloud",
    library: "OpenAI API", version: "gpt-4o",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Revisão de qualidade", "Code generation", "Fallback estável"],
    checkHealth: alwaysCloud,
  },

  // ═══ 🔐 RECONHECIMENTO FACIAL ═══
  {
    id: "face_api", name: "face-api.js", brandName: "Orion Face ID (Tier 0)",
    capability: "face_recognition", tier: "primary", runtime: "local_webgl",
    library: "@vladmandic/face-api", version: "^1.7.x",
    health: "unknown", lastLatencyMs: 0, errorCount: 0,
    features: ["68 landmarks", "128d descriptor", "Expressões faciais", "Identificação"],
    checkHealth: checkFaceApi,
  },
  {
    id: "blazeface_tf", name: "BlazeFace (TF.js)", brandName: "Orion Face ID (Tier 1)",
    capability: "face_recognition", tier: "secondary", runtime: "local_webgl",
    library: "@tensorflow-models/blazeface", version: "^0.1.x",
    health: "unknown", lastLatencyMs: 0, errorCount: 0,
    features: ["Detecção ultra-rápida", "6 landmarks", "GPU-accelerated"],
    checkHealth: checkBlazeFace,
  },
  {
    id: "native_face_detector", name: "Browser FaceDetector", brandName: "Orion Face ID (Tier 2)",
    capability: "face_recognition", tier: "tertiary", runtime: "local_browser",
    library: "FaceDetector API (Chrome/Edge)", version: "Nativo",
    health: "unknown", lastLatencyMs: 0, errorCount: 0,
    features: ["API nativa Chrome/Edge", "Sem dependências"],
    checkHealth: checkFaceDetectorAPI,
  },
  {
    id: "sobel_hog", name: "Sobel + HOG Heurístico", brandName: "Orion Face ID (Tier 3)",
    capability: "face_recognition", tier: "fallback", runtime: "local_wasm",
    library: "Implementação própria", version: "v1.0",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Skin-tone detection", "Sobel edges", "HOG confirmation", "Sem ML"],
    checkHealth: () => "online",
  },
  {
    id: "face_auth_edge", name: "Edge Function face-auth", brandName: "Orion Face Auth",
    capability: "face_recognition", tier: "primary", runtime: "edge_function",
    library: "@supabase/supabase-js", version: "^2.x",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["Magic link login", "Score > 0.92", "Bloqueio após 5 falhas"],
    checkHealth: alwaysCloud,
  },

  // ─── Quantum Compute ───
  {
    id: "qiskit_local", name: "Qiskit Runtime Local", brandName: "Orion Quantum Core",
    capability: "quantum_compute", tier: "primary", runtime: "local_wasm",
    library: "orion-quantum", version: "23.0",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["VQC", "Error Mitigation", "Transpilação", "Estimator v2", "Sampler v2"],
    checkHealth: () => "online",
  },
  {
    id: "ibm_runtime", name: "IBM Quantum Runtime", brandName: "Orion Quantum Cloud",
    capability: "quantum_compute", tier: "secondary", runtime: "cloud",
    library: "qiskit-runtime", version: "2.0",
    health: "online", lastLatencyMs: 0, errorCount: 0,
    features: ["156 qubits", "Heron r3/r2", "Nighthawk r1", "ZNE/M3/PEC", "Noise Learner", "10 QPUs", "OpenQASM 3"],
    checkHealth: () => "online",
  },
];

// ─── State ───

let lastRefresh = 0;
const REFRESH_INTERVAL = 10_000; // 10s

// ─── Core Functions ───

/** Refresh health status of all APIs */
export function refreshAllHealth(): void {
  const now = Date.now();
  if (now - lastRefresh < REFRESH_INTERVAL) return;
  lastRefresh = now;

  for (const api of API_REGISTRY) {
    try {
      api.health = api.checkHealth();
    } catch {
      api.health = "error";
      api.errorCount++;
    }
  }
}

/** Get APIs for a specific capability, ordered by tier */
export function getAPIsForCapability(capability: OrionCapability): OrionAPI[] {
  refreshAllHealth();
  const tierOrder: Record<APITier, number> = { primary: 0, secondary: 1, tertiary: 2, fallback: 3 };
  return API_REGISTRY
    .filter(a => a.capability === capability)
    .sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
}

/** Get the best available API for a capability */
export function getBestAPI(capability: OrionCapability): OrionAPI | null {
  const apis = getAPIsForCapability(capability);
  return apis.find(a => a.health === "online") || apis.find(a => a.health === "loading") || null;
}

/** Get full capability status */
function getCapabilityStatus(capability: OrionCapability, label: string, icon: string): CapabilityStatus {
  const apis = getAPIsForCapability(capability);
  const best = apis.find(a => a.health === "online");
  const anyOnline = apis.some(a => a.health === "online");
  const anyLoading = apis.some(a => a.health === "loading");

  return {
    capability, label, icon,
    activeAPI: best?.brandName || null,
    activeTier: best?.tier || null,
    apis,
    overallHealth: anyOnline ? "online" : anyLoading ? "loading" : "offline",
  };
}

/** Get complete orchestrator snapshot */
export function getOrchestratorSnapshot(): OrchestratorSnapshot {
  refreshAllHealth();

  const capabilities: CapabilityStatus[] = [
    getCapabilityStatus("vision", "Visão Computacional", "👁️"),
    getCapabilityStatus("hearing", "Audição (STT)", "👂"),
    getCapabilityStatus("speech", "Fala (TTS)", "🗣️"),
    getCapabilityStatus("reasoning", "Raciocínio (LLMs)", "🧠"),
    getCapabilityStatus("face_recognition", "Reconhecimento Facial", "🔐"),
    getCapabilityStatus("quantum_compute", "Computação Quântica", "⚛️"),
  ];

  const totalAPIs = API_REGISTRY.length;
  const onlineAPIs = API_REGISTRY.filter(a => a.health === "online").length;

  return {
    timestamp: Date.now(),
    capabilities,
    totalAPIs,
    onlineAPIs,
    systemHealth: getHealthSnapshot(),
  };
}

/** Report a latency measurement for an API */
export function reportAPILatency(apiId: string, latencyMs: number, success: boolean): void {
  const api = API_REGISTRY.find(a => a.id === apiId);
  if (!api) return;

  api.lastLatencyMs = latencyMs;
  if (!success) {
    api.errorCount++;
    if (api.errorCount >= 5) api.health = "error";
  } else {
    api.errorCount = Math.max(0, api.errorCount - 1);
  }
}

/** Get all APIs as flat list */
export function getAllAPIs(): OrionAPI[] {
  refreshAllHealth();
  return [...API_REGISTRY];
}

/** Format status for AI context injection */
export function formatOrchestratorForAI(): string {
  const snap = getOrchestratorSnapshot();
  const lines = [`[ORION ORCHESTRATOR] ${snap.onlineAPIs}/${snap.totalAPIs} APIs online`];
  for (const cap of snap.capabilities) {
    const active = cap.activeAPI ? `✅ ${cap.activeAPI}` : "❌ Offline";
    lines.push(`${cap.icon} ${cap.label}: ${active} (${cap.apis.filter(a => a.health === "online").length}/${cap.apis.length})`);
  }
  return lines.join("\n");
}
