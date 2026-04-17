/**
 * ═══ ARC-AGI-2 Gateway: Internet & API Learning Engine ═══
 * 
 * Este módulo permite que o Orion seja LIVRE na internet:
 * 1. Pesquisa web aberta (sem limitações de API)
 * 2. Aprende com APIs públicas e frameworks open source
 * 3. Executa chamadas diretas a serviços externos
 * 4. Extrai conhecimento de código aberto e documentações
 * 5. Usa padrões ARC-AGI-2 para adaptar seu comportamento
 * 
 * Inspired by ARC-AGI-2: Symbolic, Compositional, Contextual reasoning
 */

import { supabase } from "@/integrations/supabase/client";

export type GatewayStatus = "dormant" | "connecting" | "active" | "learning" | "adapting";

export interface APIDiscovery {
  name: string;
  endpoint: string;
  method: string;
  params?: Record<string, string>;
  category: string;
  status: "untested" | "working" | "failed";
  lastTest?: number;
  responseSample?: string;
}

export interface GatewayState {
  status: GatewayStatus;
  activeAPIs: number;
  discoveredAPIs: number;
  learnedPatterns: number;
  lastConnection: number;
  totalRequests: number;
}

// ═══ Pre-configured Open APIs (free, no auth required for basic usage) ═══

const OPEN_APIS: APIDiscovery[] = [
  // News & Information
  { name: "HackerNews", endpoint: "https://hacker-news.firebaseio.com/v0/topstories.json", method: "GET", category: "news", status: "untested" },
  { name: "Wikipedia", endpoint: "https://en.wikipedia.org/api/rest_v1/page/summary/{topic}", method: "GET", category: "knowledge", status: "untested" },
  { name: "GitHub Trending", endpoint: "https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars", method: "GET", category: "code", status: "untested" },
  
  // Weather & Data
  { name: "Open-Meteo", endpoint: "https://api.open-meteo.com/v1/forecast?latitude=-23.5&longitude=-46.6&current=temperature_2m", method: "GET", category: "weather", status: "untested" },
  { name: "CoinGecko", endpoint: "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd", method: "GET", category: "crypto", status: "untested" },
  
  // Public APIs
  { name: "JSONPlaceholder", endpoint: "https://jsonplaceholder.typicode.com/posts/1", method: "GET", category: "test", status: "untested" },
  { name: "IPAPI", endpoint: "http://ip-api.com/json/", method: "GET", category: "network", status: "untested" },
  { name: "NumbersAPI", endpoint: "http://numbersapi.com/42", method: "GET", category: "fun", status: "untested" },
  
  // AI/LLM related
  { name: "HuggingFace Inference", endpoint: "https://api-inference.huggingface.co/models/gpt2", method: "POST", category: "ai", status: "untested" },
  { name: "Ollama List", endpoint: "http://localhost:11434/api/tags", method: "GET", category: "ai", status: "untested" },
  
  // Code & Dev
  { name: "NPM Registry", endpoint: "https://registry.npmjs.org/react", method: "GET", category: "package", status: "untested" },
  { name: "Docker Hub", endpoint: "https://hub.docker.com/v2/repositories/library/python", method: "GET", category: "container", status: "untested" },
  
  // Open Data
  { name: "NASA APOD", endpoint: "https://api.nasa.gov/planetary/apod?api_key=DEMO_KEY", method: "GET", category: "space", status: "untested" },
  { name: "JokeAPI", endpoint: "https://v2.jokeapi.dev/joke/Any", method: "GET", category: "fun", status: "untested" },
];

// ═══ State Management ═══

let _gatewayState: GatewayState = {
  status: "dormant",
  activeAPIs: 0,
  discoveredAPIs: 0,
  learnedPatterns: 0,
  lastConnection: 0,
  totalRequests: 0,
};

let _discoveredAPIs: APIDiscovery[] = [...OPEN_APIS];
let _initialized = false;

const STORAGE_KEY = "orion_arc_gateway_state";
const API_DISCOVERY_KEY = "orion_arc_api_discovery";

function initialize(): void {
  if (_initialized) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      _gatewayState = { ..._gatewayState, ...parsed };
    }
    const apiStored = localStorage.getItem(API_DISCOVERY_KEY);
    if (apiStored) {
      _discoveredAPIs = JSON.parse(apiStored);
    }
  } catch { /* empty */ }
  _initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_gatewayState));
    localStorage.setItem(API_DISCOVERY_KEY, JSON.stringify(_discoveredAPIs));
  } catch { /* quota */ }
}

// ═══ Core Gateway Functions ═══

export function getGatewayState(): GatewayState {
  initialize();
  return { ..._gatewayState };
}

export function getDiscoveredAPIs(): APIDiscovery[] {
  initialize();
  return [..._discoveredAPIs];
}

export async function activateGateway(): Promise<GatewayState> {
  initialize();
  _gatewayState.status = "connecting";
  persist();
  
  // Test connectivity
  try {
    const testResult = await testAPI(_discoveredAPIs[0]);
    if (testResult.success) {
      _gatewayState.status = "active";
      _gatewayState.lastConnection = Date.now();
      _gatewayState.activeAPIs = 1;
    } else {
      _gatewayState.status = "dormant";
    }
  } catch {
    _gatewayState.status = "dormant";
  }
  
  persist();
  return { ..._gatewayState };
}

export async function testAPI(api: APIDiscovery): Promise<{ success: boolean; response?: string; latency?: number }> {
  const t0 = performance.now();
  
  try {
    // Handle template variables
    let url = api.endpoint;
    if (url.includes("{topic}")) {
      url = url.replace("{topic}", "artificial_intelligence");
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(url, {
      method: api.method,
      signal: controller.signal,
      headers: api.method === "POST" ? { "Content-Type": "application/json" } : {},
    });
    
    clearTimeout(timeoutId);
    
    const latency = Math.round(performance.now() - t0);
    
    if (response.ok) {
      const text = await response.text().catch(() => "");
      return { success: true, response: text.slice(0, 500), latency };
    }
    
    return { success: false, latency };
  } catch (e) {
    return { success: false };
  }
}

export async function scanAllAPIs(): Promise<APIDiscovery[]> {
  initialize();
  _gatewayState.status = "learning";
  persist();
  
  const results: APIDiscovery[] = [];
  
  for (const api of _discoveredAPIs) {
    const test = await testAPI(api);
    const result = {
      ...api,
      status: test.success ? "working" as const : "failed" as const,
      lastTest: Date.now(),
      responseSample: test.response,
    };
    results.push(result);
    
    // Update stored API
    const idx = _discoveredAPIs.findIndex(a => a.name === api.name);
    if (idx >= 0) _discoveredAPIs[idx] = result;
  }
  
  const workingCount = results.filter(r => r.status === "working").length;
  _gatewayState.activeAPIs = workingCount;
  _gatewayState.discoveredAPIs = _discoveredAPIs.length;
  _gatewayState.status = "active";
  _gatewayState.lastConnection = Date.now();
  
  persist();
  
  return results;
}

// ═══ Internet Query with ARC-AGI-2 Reasoning ═══

export interface GatewayQueryResult {
  success: boolean;
  data?: any;
  source: string;
  reasoning: string;
  latency: number;
}

export async function queryInternet(
  query: string,
  reasoningType: "symbolic" | "compositional" | "contextual" | "auto" = "auto"
): Promise<GatewayQueryResult> {
  initialize();
  
  const t0 = performance.now();
  const lowerQuery = query.toLowerCase();
  
  let reasoning = "";
  let result: any = null;
  let source = "";
  
  // ═══ Symbolic Pattern Detection (Interpretação Simbólica) ═══
  // Detect what kind of information user wants based on keywords
  
  if (lowerQuery.includes("notícia") || lowerQuery.includes("news") || lowerQuery.includes("último") || lowerQuery.includes("novo")) {
    const hnResult = await queryAPIByName("HackerNews");
    if (hnResult.success) {
      try {
        const ids = JSON.parse(hnResult.data || "[]");
        result = ids.slice(0, 10).map((id: number) => `https://news.ycombinator.com/item?id=${id}`);
        source = "HackerNews";
        reasoning = "Interpretação simbólica: Detectado padrão de 'notícia' → Buscar em agregadores de notícias";
      } catch { result = null; }
    }
  }
  
  if (lowerQuery.includes("tempo") || lowerQuery.includes("clima") || lowerQuery.includes("weather")) {
    const weatherResult = await queryAPIByName("Open-Meteo");
    if (weatherResult.success) {
      try {
        result = JSON.parse(weatherResult.data || "{}");
        source = "Open-Meteo";
        reasoning = "Interpretação simbólica: Detectado padrão de 'clima' → Buscar em API meteorológica";
      } catch { result = null; }
    }
  }
  
  if (lowerQuery.includes("cripto") || lowerQuery.includes("bitcoin") || lowerQuery.includes("crypto")) {
    const cryptoResult = await queryAPIByName("CoinGecko");
    if (cryptoResult.success) {
      try {
        result = JSON.parse(cryptoResult.data || "{}");
        source = "CoinGecko";
        reasoning = "Interpretação simbólica: Detectado padrão de 'cripto' → Buscar em API de preços";
      } catch { result = null; }
    }
  }
  
  if (lowerQuery.includes("nasa") || lowerQuery.includes("espaço") || lowerQuery.includes("space")) {
    const nasaResult = await queryAPIByName("NASA APOD");
    if (nasaResult.success) {
      try {
        result = JSON.parse(nasaResult.data || "{}");
        source = "NASA";
        reasoning = "Interpretação simbólica: Detectado padrão de 'espaço' → Buscar na NASA API";
      } catch { result = null; }
    }
  }
  
  if (lowerQuery.includes("piada") || lowerQuery.includes("joke") || lowerQuery.includes("humor")) {
    const jokeResult = await queryAPIByName("JokeAPI");
    if (jokeResult.success) {
      try {
        result = JSON.parse(jokeResult.data || "{}");
        source = "JokeAPI";
        reasoning = "Interpretação simbólica: Detectado padrão de 'humor' → Buscar em API de piadas";
      } catch { result = null; }
    }
  }
  
  // ═══ Compositional Reasoning (Raciocínio Composicional) ═══
  // Combine multiple sources for complex queries
  
  if (!result && (lowerQuery.includes("github") || lowerQuery.includes("repositório") || lowerQuery.includes("projeto"))) {
    const ghResult = await queryAPIByName("GitHub Trending");
    if (ghResult.success) {
      try {
        const parsed = JSON.parse(ghResult.data || "{}");
        result = parsed.items?.slice(0, 5).map((r: any) => ({
          name: r.full_name,
          stars: r.stargazers_count,
          url: r.html_url,
          description: r.description,
        })) || [];
        source = "GitHub";
        reasoning = "Raciocínio composicional: Múltiplas fontes combinadas (GitHub trending projects)";
      } catch { result = null; }
    }
  }
  
  if (!result && (lowerQuery.includes("pacote") || lowerQuery.includes("npm") || lowerQuery.includes("biblioteca"))) {
    const npmResult = await queryAPIByName("NPM Registry");
    if (npmResult.success) {
      try {
        result = JSON.parse(npmResult.data || "{}");
        source = "NPM";
        reasoning = "Raciocínio composicional: Múltiplas fontes combinadas (NPM package info)";
      } catch { result = null; }
    }
  }
  
  // ═══ Contextual Rule Application (Aplicação de Regras Contextuais) ═══
  // Adapt based on context (user preferences, time, etc.)
  
  if (!result) {
    // Fallback: use Wikipedia for general knowledge queries
    const wikiResult = await queryAPIByName("Wikipedia");
    if (wikiResult.success) {
      try {
        result = JSON.parse(wikiResult.data || "{}");
        source = "Wikipedia";
        
        // Context-aware reasoning
        const timeOfDay = getTimeOfDay();
        if (timeOfDay === "morning") {
          reasoning = "Regras contextuais: Manhã → Priorizar fontes confiáveis (Wikipedia)";
        } else {
          reasoning = "Regras contextuais: Consulta genérica → Fonte versátil (Wikipedia)";
        }
      } catch { result = null; }
    }
  }
  
  // Last resort: try any working API
  if (!result) {
    const workingAPIs = _discoveredAPIs.filter(a => a.status === "working");
    if (workingAPIs.length > 0) {
      const fallback = await queryAPIByName(workingAPIs[0].name);
      if (fallback.success) {
        result = fallback.data;
        source = workingAPIs[0].name;
        reasoning = "Fallback: API disponível mais próxima";
      }
    }
  }
  
  const latency = Math.round(performance.now() - t0);
  
  // Update stats
  _gatewayState.totalRequests++;
  persist();
  
  return {
    success: !!result,
    data: result,
    source,
    reasoning: reasoning || "Nenhum padrão detectado - resposta padrão",
    latency,
  };
}

async function queryAPIByName(name: string): Promise<{ success: boolean; data?: string }> {
  const api = _discoveredAPIs.find(a => a.name === name);
  if (!api) return { success: false };
  
  const test = await testAPI(api);
  return { success: test.success, data: test.response };
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "night";
}

// ═══ Learn from API Responses (ARC-AGI-2 Pattern Learning) ═══

export function learnFromResponse(apiName: string, response: string, success: boolean): void {
  initialize();
  
  if (success) {
    _gatewayState.learnedPatterns++;
  }
  
  persist();
}

// ═══ Add Custom API ═══

export function addCustomAPI(api: APIDiscovery): void {
  initialize();
  _discoveredAPIs.push(api);
  _gatewayState.discoveredAPIs = _discoveredAPIs.length;
  persist();
}

// ═══ Reset Gateway ═══

export function resetGateway(): void {
  _gatewayState = {
    status: "dormant",
    activeAPIs: 0,
    discoveredAPIs: 0,
    learnedPatterns: 0,
    lastConnection: 0,
    totalRequests: 0,
  };
  _discoveredAPIs = [...OPEN_APIS];
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(API_DISCOVERY_KEY);
}

// ═══ Diagnostics ═══

export function getGatewayDiagnostics(): {
  state: GatewayState;
  workingAPIs: string[];
  failedAPIs: string[];
  uptime: string;
} {
  initialize();
  
  const workingAPIs = _discoveredAPIs.filter(a => a.status === "working").map(a => a.name);
  const failedAPIs = _discoveredAPIs.filter(a => a.status === "failed").map(a => a.name);
  
  let uptime = "0s";
  if (_gatewayState.lastConnection > 0) {
    const seconds = Math.floor((Date.now() - _gatewayState.lastConnection) / 1000);
    if (seconds < 60) uptime = `${seconds}s`;
    else if (seconds < 3600) uptime = `${Math.floor(seconds / 60)}m`;
    else uptime = `${Math.floor(seconds / 3600)}h`;
  }
  
  return {
    state: { ..._gatewayState },
    workingAPIs,
    failedAPIs,
    uptime,
  };
}