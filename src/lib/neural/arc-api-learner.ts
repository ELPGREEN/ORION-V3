/**
 * ═══ ARC-AGI-3 API Learner: Aprende com APIs e Frameworks Open Source ═══
 * 
 * Este módulo permite que o Orion aprenda automaticamente com:
 * 1. Documentações de APIs públicas
 * 2. Frameworks open source (React, TensorFlow, PyTorch, etc.)
 * 3. APIs deLLMs gratuitos
 * 4. Repositórios GitHub
 * 5. Codebases de referência
 * 
 * Usa padrões ARC-AGI-3:
 * - Symbolic: Detectar padrões de API
 * - Compositional: Combinar conhecimento de múltiplas fontes
 * - Contextual: Adaptar aprendizado ao contexto
 */

import { queryInternet } from "./arc-gateway";

export interface LearnedAPI {
  name: string;
  category: string;
  endpoints: string[];
  capabilities: string[];
  lastLearned: number;
  usageCount: number;
}

export interface FrameworkKnowledge {
  name: string;
  version: string;
  language: string;
  category?: string;
  features: string[];
  useCases: string[];
  documentation: string;
  usageCount?: number;
}

// ═══ Pre-configured Frameworks to Learn From ═══

const POPULAR_FRAMEWORKS = [
  { name: "React", language: "JavaScript", category: "frontend", docUrl: "https://react.dev" },
  { name: "TensorFlow", language: "Python", category: "ml", docUrl: "https://tensorflow.org" },
  { name: "PyTorch", language: "Python", category: "ml", docUrl: "https://pytorch.org" },
  { name: "FastAPI", language: "Python", category: "backend", docUrl: "https://fastapi.tiangolo.com" },
  { name: "LangChain", language: "Python", category: "ai", docUrl: "https://js.langchain.com" },
  { name: "LangGraph", language: "Python", category: "ai", docUrl: "https://langchain-ai.github.io/langgraph" },
  { name: "Vercel AI SDK", language: "JavaScript", category: "ai", docUrl: "https://sdk.vercel.ai" },
  { name: "OpenCV", language: "Python", category: "vision", docUrl: "https://opencv.org" },
  { name: "MediaPipe", language: "JavaScript", category: "vision", docUrl: "https://google.github.io/mediapipe" },
  { name: "ROS2", language: "Python", category: "robotics", docUrl: "https://docs.ros.org" },
  { name: "Node-RED", language: "JavaScript", category: "iot", docUrl: "https://nodered.org" },
  { name: "MQTT", language: "Various", category: "iot", docUrl: "https://mqtt.org" },
  { name: "Docker", language: "Various", category: "devops", docUrl: "https://docs.docker.com" },
  { name: "Kubernetes", language: "YAML", category: "devops", docUrl: "https://kubernetes.io" },
  { name: "PostgreSQL", language: "SQL", category: "database", docUrl: "https://postgresql.org" },
  { name: "Supabase", language: "JavaScript", category: "backend", docUrl: "https://supabase.com" },
  { name: "OpenAI", language: "Python", category: "ai", docUrl: "https://platform.openai.com" },
  { name: "Anthropic", language: "Python", category: "ai", docUrl: "https://docs.anthropic.com" },
];

// ═══ State ═══

let _learnedAPIs: LearnedAPI[] = [];
let _frameworkKnowledge: FrameworkKnowledge[] = [];
let _initialized = false;

const LEARNED_APIS_KEY = "orion_arc_learned_apis";
const FRAMEWORK_KNOWLEDGE_KEY = "orion_arc_framework_knowledge";

function initialize(): void {
  if (_initialized) return;
  try {
    const storedAPIs = localStorage.getItem(LEARNED_APIS_KEY);
    if (storedAPIs) _learnedAPIs = JSON.parse(storedAPIs);
    
    const storedFW = localStorage.getItem(FRAMEWORK_KNOWLEDGE_KEY);
    if (storedFW) _frameworkKnowledge = JSON.parse(storedFW);
  } catch { /* empty */ }
  _initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(LEARNED_APIS_KEY, JSON.stringify(_learnedAPIs));
    localStorage.setItem(FRAMEWORK_KNOWLEDGE_KEY, JSON.stringify(_frameworkKnowledge));
  } catch { /* quota */ }
}

// ═══ Core Learning Functions ═══

export function getLearnedAPIs(): LearnedAPI[] {
  initialize();
  return [..._learnedAPIs];
}

export function getFrameworkKnowledge(): FrameworkKnowledge[] {
  initialize();
  return [..._frameworkKnowledge];
}

/**
 * Learn about a specific framework/API from the internet
 */
export async function learnFramework(frameworkName: string): Promise<FrameworkKnowledge | null> {
  initialize();
  
  // Check if already learned
  const existing = _frameworkKnowledge.find(f => 
    f.name.toLowerCase() === frameworkName.toLowerCase()
  );
  if (existing) {
    existing.usageCount = (existing.usageCount ?? 0) + 1;
    persist();
    return existing;
  }
  
  // Find framework config
  const fw = POPULAR_FRAMEWORKS.find(f => 
    f.name.toLowerCase() === frameworkName.toLowerCase()
  );
  
  if (!fw) return null;
  
  // Query internet for more details
  const queryResult = await queryInternet(
    `${fw.name} framework capabilities features`,
    "symbolic"
  );
  
  // Build knowledge from result
  const knowledge: FrameworkKnowledge = {
    name: fw.name,
    version: "latest",
    language: fw.language,
    category: fw.category,
    features: extractFeatures(queryResult.data || ""),
    useCases: extractUseCases(fw.category),
    documentation: fw.docUrl,
    usageCount: 1,
  };
  
  _frameworkKnowledge.push(knowledge);
  persist();
  
  return knowledge;
}

/**
 * Learn about an API automatically
 */
export async function learnAPI(apiName: string, category: string): Promise<LearnedAPI | null> {
  initialize();
  
  // Check if already learned
  const existing = _learnedAPIs.find(a => 
    a.name.toLowerCase() === apiName.toLowerCase()
  );
  if (existing) {
    existing.usageCount++;
    persist();
    return existing;
  }
  
  // Query internet for API details
  const queryResult = await queryInternet(
    `${apiName} API endpoints documentation`,
    "compositional"
  );
  
  const learned: LearnedAPI = {
    name: apiName,
    category,
    endpoints: extractEndpoints(queryResult.data || ""),
    capabilities: extractCapabilities(queryResult.data || ""),
    lastLearned: Date.now(),
    usageCount: 1,
  };
  
  _learnedAPIs.push(learned);
  persist();
  
  return learned;
}

// ═══ ARC-AGI-3 Pattern Extraction Helpers ═══

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  
  // Common feature keywords
  const featureKeywords = [
    "reactive", "component", "hook", "state", "props",
    "neural", "tensor", "gradient", "model", "train",
    "api", "endpoint", "route", "middleware",
    "vision", "object", "detection", "tracking",
    "robot", "sensor", "actuator", "control",
    "iot", "mqtt", "device", "sensor",
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const keyword of featureKeywords) {
    if (lowerText.includes(keyword)) {
      features.push(keyword);
    }
  }
  
  return features.slice(0, 10);
}

function extractUseCases(category: string): string[] {
  const useCasesByCategory: Record<string, string[]> = {
    frontend: ["Web apps", "SPAs", "Mobile apps", "Dashboards"],
    ml: ["Image classification", "NLP", "Predictive analytics", "Computer vision"],
    backend: ["REST APIs", "Microservices", "Real-time apps", "CRUD operations"],
    ai: ["Chatbots", "Text generation", "Code completion", "Agent systems"],
    vision: ["Face detection", "Object tracking", "Gesture recognition", "OCR"],
    robotics: ["Autonomous navigation", "Manipulation", "Path planning", "Simulation"],
    iot: ["Home automation", "Sensor monitoring", "Edge computing", "Device management"],
    devops: ["Containerization", "Orchestration", "CI/CD", "Monitoring"],
    database: ["Relational data", "Analytics", "Real-time sync", "Geo-spatial"],
  };
  
  return useCasesByCategory[category] || ["General purpose"];
}

function extractEndpoints(text: string): string[] {
  // Try to extract endpoint patterns
  const endpointPatterns = [
    /\/api\/\w+/g,
    /\/v\d+\/\w+/g,
    /\/rest\/\w+/g,
  ];
  
  const endpoints: string[] = [];
  
  for (const pattern of endpointPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      endpoints.push(...matches);
    }
  }
  
  return [...new Set(endpoints)].slice(0, 10);
}

function extractCapabilities(text: string): string[] {
  const capabilities: string[] = [];
  
  // Common capability keywords
  const capabilityKeywords = [
    "Authentication", "Authorization", "CRUD", "Streaming",
    "Real-time", "Batch", "Sync", "Async",
    "Webhook", "Socket", "gRPC", "REST",
    "GraphQL", "WebSocket", "Serverless",
  ];
  
  const lowerText = text.toLowerCase();
  
  for (const cap of capabilityKeywords) {
    if (lowerText.includes(cap.toLowerCase())) {
      capabilities.push(cap);
    }
  }
  
  return capabilities.slice(0, 8);
}

// ═══ Auto-Discovery: Find Relevant APIs Based on Context ═══

export async function discoverRelevantAPIs(context: string): Promise<LearnedAPI[]> {
  initialize();
  
  const lowerContext = context.toLowerCase();
  const relevantAPIs: LearnedAPI[] = [];
  
  // Detect relevant categories based on context
  if (lowerContext.includes("vision") || lowerContext.includes("imagem") || lowerContext.includes("detectar")) {
    // Vision-related APIs
    const visionAPIs = _learnedAPIs.filter(a => 
      a.category === "vision" || a.name.toLowerCase().includes("vision")
    );
    relevantAPIs.push(...visionAPIs);
  }
  
  if (lowerContext.includes("ai") || lowerContext.includes("llm") || lowerContext.includes("chat")) {
    // AI/LLM APIs
    const aiAPIs = _learnedAPIs.filter(a => 
      a.category === "ai" || a.name.toLowerCase().includes("openai") || a.name.toLowerCase().includes("anthropic")
    );
    relevantAPIs.push(...aiAPIs);
  }
  
  if (lowerContext.includes("robot") || lowerContext.includes("ros") || lowerContext.includes("sensor")) {
    // Robotics APIs
    const roboticsAPIs = _learnedAPIs.filter(a => 
      a.category === "robotics" || a.name.toLowerCase().includes("ros")
    );
    relevantAPIs.push(...roboticsAPIs);
  }
  
  if (lowerContext.includes("iot") || lowerContext.includes("device") || lowerContext.includes("mqtt")) {
    // IoT APIs
    const iotAPIs = _learnedAPIs.filter(a => 
      a.category === "iot" || a.name.toLowerCase().includes("mqtt")
    );
    relevantAPIs.push(...iotAPIs);
  }
  
  // If no relevant APIs found, return popular ones
  if (relevantAPIs.length === 0) {
    return _learnedAPIs.slice(0, 5);
  }
  
  return relevantAPIs;
}

// ═══ Integration: Get Best API for Task ═══

export function getBestAPICapability(task: string): { api: string; capability: string } | null {
  initialize();
  
  const lowerTask = task.toLowerCase();
  
  // Task to API mapping (ARC-AGI-3 symbolic patterns)
  const taskMappings = [
    { task: /image|vision|detectar|reconhecer/i, api: "MediaPipe", capability: "Computer Vision" },
    { task: /llm|chat|gpt|claude|texto/i, api: "OpenAI", capability: "Text Generation" },
    { task: /robot|mover|posição|kinematics/i, api: "ROS2", capability: "Robotics Control" },
    { task: /iot|sensor|device|mqtt/i, api: "MQTT", capability: "IoT Communication" },
    { task: /database|banco|dados/i, api: "PostgreSQL", capability: "Data Storage" },
    { task: /auth|autenticar|login/i, api: "Supabase", capability: "Authentication" },
    { task: /api|endpoint|webhook/i, api: "FastAPI", capability: "REST API" },
  ];
  
  for (const mapping of taskMappings) {
    if (mapping.task.test(lowerTask)) {
      // Find matching learned API
      const matched = _learnedAPIs.find(a => 
        a.name.toLowerCase().includes(mapping.api.toLowerCase())
      );
      
      if (matched) {
        return { api: matched.name, capability: mapping.capability };
      }
    }
  }
  
  return null;
}

// ═══ Reset Knowledge ═══

export function resetAPIKnowledge(): void {
  _learnedAPIs = [];
  _frameworkKnowledge = [];
  localStorage.removeItem(LEARNED_APIS_KEY);
  localStorage.removeItem(FRAMEWORK_KNOWLEDGE_KEY);
}

// ═══ Diagnostics ═══

export function getAPILearnerDiagnostics(): {
  learnedAPIs: number;
  frameworkKnowledge: number;
  topUsedAPIs: LearnedAPI[];
  categories: string[];
} {
  initialize();
  
  const topUsed = [..._learnedAPIs]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
  
  const categories = [...new Set(_learnedAPIs.map(a => a.category))];
  
  return {
    learnedAPIs: _learnedAPIs.length,
    frameworkKnowledge: _frameworkKnowledge.length,
    topUsedAPIs: topUsed,
    categories,
  };
}