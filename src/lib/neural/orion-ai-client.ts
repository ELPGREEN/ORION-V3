/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Extracted from NeuralVision.tsx for reusability
 *
 * PERF: Global auth cache (60s TTL), lazy module imports, single buildLocalDetections call
 */
import { supabase } from "@/integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "@/lib/errors";
import {
  getMemoryFacts,
  addMemoryFacts,
} from "@/lib/neural/orion-memory";
import { buildCognitionContext, postCognitionLearn } from "./neural-cognition-engine";
import { executeCorrectiveRAG } from "./corrective-rag";
import { getAdaptiveNeurolinguisticHead, monitorMaestroPulse, dispatchMaestroEvolution } from "./orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "./quantum-llm-router";
import { summarizeLongContextMamba } from "./mamba-orchestrator";
import { buildWorkingMemoryPrompt, initWorkingMemory } from "./orion-working-memory";
import { stripMarkdown } from "@/lib/utils/text-utils";
import { VS } from "@/components/dashboard/neural/useVisionProcessing";
// vision-local-learning removed — all identification via Gemini on-demand
const canIdentifyLocally = (_shapes: any[]) => ({ allLocal: false, localMatches: [] as any[] });
const getLearningStats = () => ({ totalPriors: 0, maturePriors: 0, totalObservations: 0, apiBypassRate: 0 });
const learnFromDetection = (_obj: any, _desc: any) => {};
import { generateLocalResponse, isLocalEngineAvailable } from "@/lib/ai/local-llm-engine";
// hf-vision-gate REMOVED — was downloading ~50MB of WASM models in browser
import { matchProtocols } from "@/lib/neural/orion-voice-protocols";

// ═══ PRE-COMPILED REGEXES FOR PERFORMANCE ═══
const SENTENCE_END_REGEX = /.*?[.!?…;]+\s/ys;
const LONG_CLAUSE_REGEX = /.{40,}?,\s/y;
const YOUTUBE_DOMAIN_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/i;
const URL_DOMAIN_REGEX = /https?:\/\/[^\s]+/i;

const HEARING_CHECK_PATTERNS = /\b(voc[eê]\s+consegue\s+me\s+ouvir|voc[eê]\s+me\s+ouve|t[aá]\s+me\s+ouvindo|est[aá]\s+me\s+ouvindo|consegue\s+me\s+escutar|me\s+escuta)\b/i;
const SELF_IDENTITY_PATTERNS = /\b(quem\s+[eé]\s+voc[eê]|qual\s+[eé]\s+o\s+seu\s+nome|sua\s+personalidade|seu\s+signo|sua\s+hist[oó]ria|o\s+que\s+[eé]\s+voc[eê]|quando\s+voc[eê]\s+nasceu|conte\s+sobre\s+voc[eê]|fale\s+sobre\s+voc[eê]|fala\s+sobre\s+voc[eê]|me\s+conta(?:\s+um\s+pouco)?\s+sobre\s+voc[eê]|me\s+fala(?:\s+um\s+pouco)?\s+sobre\s+voc[eê])\b/i;
const CONVERSATIONAL_COMPLAINT_PATTERNS = /\b(ent[aã]o|cara|mano|tu|voc[eê]|c[eê])\b.*\b(n[aã]o\s+me\s+responde|n[aã]o\s+responde|me\s+ignora|n[aã]o\s+entende|n[aã]o\s+capta|n[aã]o\s+peg[ao]|s[oó]\s+peg[ao]\s+duas?|tr[eê]s\s+palavras|frase\s+inteira|t[aá]\s+me\s+tirando|arquivo\s+srfx|srfx)\b/i;
const EXPLICIT_VISUAL_PATTERNS = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+vendo|v[eê]|v[êe] na c[aâ]mera)|o\s+que\s+tem\s+(na\s+frente|a[ií]|aqui)|descrev[ae]\s+(a\s+)?(imagem|cena|ambiente|o\s+que\s+v[eê])|me\s+mostre\s+o\s+que\s+v[eê]|analise\s+(a\s+)?(imagem|cena|c[aâ]mera)|leia\s+(o\s+)?texto\s+(da\s+)?(imagem|c[aâ]mera)|identifique\s+(o\s+)?(objeto|rosto|texto)|quantos?\s+[^.?!]*\s+(tem|h[aá])\b)/i;
const IMAGE_GEN_PATTERNS = /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae]|gerar?\s+foto|cri[ae]\s+(uma?\s+)?ilustra[çc][aã]o|generate\s+(an?\s+)?image|draw|create\s+(an?\s+)?image|make\s+(an?\s+)?image|paint|sketch)\b/i;
const WEB_SEARCH_PATTERNS = /\b(hoje|atual|atualmente|recente|notícia|preço\s+d[eoa]|cotação|quem\s+é|quando\s+(foi|será|é)|onde\s+fica|resultado\s+d[eoa]|placar|eleição|último|última|novo\s+|nova\s+|2024|2025|2026|tempo\s+(em|na|no)|clima|previsão|lançamento|estreia|pesquis[ae]\s+na\s+web|busca\s+na\s+internet|search\s+for|look\s+up|news|current|latest|trending)\b/i;
const AUTO_CONSTRUCT_VERB_PATTERNS = /\b(crie?|gere?|implemente?|desenvolv[ae]|programe?|codifique|escreva|refatore?|monte|construa)\b/i;
const AUTO_CONSTRUCT_ARTIFACT_PATTERNS = /\b(c[oó]digo|fun[çc][ãa]o|endpoint|api|componente|tabela|migra[çc][ãa]o|script|arquivo|classe|hook|rota|p[aá]gina|feature|bot[aã]o|integra[çc][aã]o|edge\s*function)\b/i;
const SELF_EVOLVE_VERB_PATTERNS = /\b(melhore-se|melhore\s+se|evolua|evolu[ií]r?|auto[-\s]?evolu[ií]r?|auto[-\s]?program[ae]|se\s+reprogram[ae]|recalibre|se\s+calibre|se\s+atualize|upgrade)\b/i;
const SELF_EVOLVE_TARGET_PATTERNS = /\b(seu\s+c[oó]digo|seus\s+protocolos?|suas?\s+respostas?|você\s+mesmo|voc[eê]\s+mesmo|a\s+si\s+mesmo|se)\b/i;

const VERB_IDENTIFY = /\b(identific[aeo]r?|identifique|identify|reconhe[cç][aeo]r?|reconozc[ao]|identificar?)\b/i;
const VERB_ANSWER = /\b(respond[aeo]r?|me\s+respond[aeo]|me\s+diz|me\s+fal[aeo]|me\s+cont[aeo]|answer|tell\s+me|explain|reply)\b/i;
const VERB_ANALYZE = /\b(analis[aeo]r?|analise|analy[sz]e|evaluat[aeo]|examinar?)\b/i;
const VERB_CHECK = /\b(verific[aeo]r?|verifique|checar?|confir[aemo]r?|check|verify)\b/i;
const VERB_SEARCH = /\b(pesquis[aeo]r?|busc[aeo]r?|procur[aeo]r?|google|search|look\s+up|find)\b/i;
const VERB_COMPARE = /\b(compar[aeo]r?|diferença\s+entre|versus|vs\b|melhor\s+entre)\b/i;
const VERB_REFLECT = /\b(reflita|pens[ae]\s+sobre|consider[ae]|raciocin[ae]|reason|think\s+about|ponderar)\b/i;

const STRONG_VISUAL_ANCHORS = /\b(segurando|usando|vestindo|mostr[ae]|aparência|rosto|cor\b|enxerg|olh[aeo]|vê|vejo|vendo|câmera|imagem|foto|holding|wearing|showing|face|camera|image|photo)\b/i;
const BODY_REF = /\b(mão|mãos|dedo|braço|cabeça|rosto|olho|boca|cabelo|roupa|camisa|camiseta|óculos|chapéu|caneca|copo|garrafa|hand|finger|arm|head|eye|mouth|hair|shirt|glasses|hat|cup|bottle)\b/i;
const DEICTIC_PATTERNS = /\b(isso|isto|esse|essa|aquilo|aqui|ali|lá|aí|aquel[ea]s?|this|that|these|those|here|there|esto|eso|aquello)\b/i;

const STRONG_TEXTUAL = /\b(que dia|que horas|hora|data de hoje|capital d[aoe]|piada|conta uma|explica|defin[ie]|signific|quem é|quem foi|quanto é|calcul|agenda|prazo|processo|cliente|documento|resumo|traduz|como funciona|o que é|por que|quando foi|onde fica|qual é|quais são|previsão|temperatura|clima|tempo|notícia|cotação|dólar|euro|bitcoin|what time|what day|capital of|joke|explain|define|meaning|who is|how much|calculate|schedule|deadline|summary|translate|how does|what is|why|when|where|which)\b/i;
const KNOWLEDGE_PATTERNS = /\b(histór|ciência|matemática|física|química|política|economi|filosofi|programa[çc]ão|código|lei\b|artigo\b|jurisprudência|direito|constitui[çc]|penal|trabalhist|contrato|clt|cdc|lgpd|recurso|habeas|mandado|sentença|acórdão|súmula|tribunal|stf|stj|indenizaç|prescriç|responsabilidade\s*civil|tutela|execuç|licitaç|improbidade|tributári)\b/i;
const CONVERSATIONAL_PATTERNS = /\b(opini[ãa]o|acha\s+que|concorda|discorda|argumento|debate|sugir[ao]|recomend|aconselh|orienta[çc]|estrat[ée]gia|planej|organiz|prioriz|importa\b|melhor\s+forma|como\s+(posso|devo|faz)|me\s+ajud|preciso\s+de|tenho\s+que|deveria|poderia|gostaria|queria)\b/i;
const EMOTIONAL_PATTERNS = /\b(sinto|sentindo|triste|feliz|ansios|preocupad|estressad|frustrad|animad|chateado|confus[oa]|nervos[oa]|calm[oa]|motiv|desanima|angústi|med[oa]|raiva|alegr|satisf)\b/i;

// ═══ GLOBAL AUTH CACHE — avoids 3-6 supabase.auth.getUser() calls per interaction ═══
let _globalAuthCache: { user: { id: string; email?: string | null } | null; ts: number } = { user: null, ts: 0 };
const AUTH_CACHE_TTL = 60_000; // 60s

// ═══ VOICE IDENTITY CACHE — persists across calls, updated by orion:voice-transcription event ═══
let _cachedVoiceIdentity: string | undefined;
if (typeof window !== "undefined") {
  window.addEventListener("orion:voice-transcription", () => {
    _cachedVoiceIdentity = (window as any).__orionIdentityStatus || _cachedVoiceIdentity;
  });
}

export function getCachedVoiceIdentity(): string | undefined {
  return (window as any)?.__orionIdentityStatus || _cachedVoiceIdentity;
}

async function getCachedAuthUser(): Promise<{ id: string; email?: string | null } | null> {
  if (_globalAuthCache.user && Date.now() - _globalAuthCache.ts < AUTH_CACHE_TTL) {
    return _globalAuthCache.user;
  }
  try {
    const { data: { user } } = await supabase.auth.getUser();
    _globalAuthCache = { user: user ? { id: user.id, email: user.email } : null, ts: Date.now() };
    return _globalAuthCache.user;
  } catch {
    return _globalAuthCache.user; // return stale on error
  }
}

// ═══ LAZY MODULE CACHE — import once, reuse forever ═══
let _knowledgeBaseModule: any = null;
let _consciousnessModule: any = null;
let _introspectionModule: any = null;

async function getKnowledgeBase() {
  if (!_knowledgeBaseModule) _knowledgeBaseModule = await import("@/lib/neural/orion-knowledge-base");
  return _knowledgeBaseModule;
}
async function getConsciousness() {
  if (!_consciousnessModule) _consciousnessModule = await import("@/lib/neural/orion-consciousness");
  return _consciousnessModule;
}
async function getIntrospection() {
  if (!_introspectionModule) _introspectionModule = await import("@/lib/neural/orion-introspection");
  return _introspectionModule;
}

// ═══ Local-first mode flag — set to true ONLY for 100% offline operation ═══
// Default OFF: user has cloud APIs + VM active, local SmolLM2 is too slow/imprecise for text
let _localFirstMode = false;

export function setLocalFirstMode(enabled: boolean) {
  _localFirstMode = enabled;
  console.log(`[OrionAI] Local-first mode: ${enabled ? "ON" : "OFF"}`);
}

export function isLocalFirstMode(): boolean {
  return _localFirstMode;
}

// ═══ CLAHE and extractShapeDescriptors removed — dead code, never called in main flow ═══

// ═══ Build local detections from client-side vision data ═══
function buildLocalDetections(): Record<string, unknown> | undefined {
  try {
    const regions = VS.regions || [];
    const motion = VS.motion;
    const faces = regions.filter(r => r.category === "face");

    // ═══ YOLO FrameX Multi-Task Vision ═══
    const multiTask = (VS as any).multiTaskResult;
    const rtv = VS.realTimeVision;
    let realTimeObjects: any[] | undefined;
    let realTimeFaces: any[] | undefined;
    let realTimeHands: any[] | undefined;
    let sceneClassification: any | undefined;
    let readingResult: any | undefined;
    let movementAnalysis: any | undefined;

    if (multiTask) {
      if (multiTask.objects?.length > 0) {
        realTimeObjects = multiTask.objects.map((o: any) => ({
          name: o.class,
          id: o.id,
          confidence: o.score,
          source: "yolo-framex",
          bbox: { x: Math.round(o.box.x), y: Math.round(o.box.y), w: Math.round(o.box.width), h: Math.round(o.box.height) },
          isMoving: o.isMoving,
          direction: o.direction,
          velocity: o.velocity,
        }));
      }
      if (multiTask.faces?.length > 0) {
        realTimeFaces = multiTask.faces.map((f: any) => ({
          id: f.id,
          confidence: f.box.confidence,
          bbox: { x: Math.round(f.box.x), y: Math.round(f.box.y), w: Math.round(f.box.width), h: Math.round(f.box.height) },
          expression: f.expression,
          lipMovement: f.lipMovement,
          gazeDirection: f.gazeDirection,
        }));
      }
      if (multiTask.scenario) {
        sceneClassification = {
          label: multiTask.scenario.label,
          confidence: multiTask.scenario.confidence,
          lighting: multiTask.scenario.lighting,
          isIndoor: multiTask.scenario.isIndoor,
        };
      }
      if (multiTask.reading?.text?.length > 0) {
        readingResult = {
          text: multiTask.reading.text,
          lipMovement: multiTask.reading.lipMovement,
          expression: multiTask.reading.expression,
        };
      }
      if (multiTask.movement?.objectsInMotion?.length > 0) {
        movementAnalysis = {
          objectsInMotion: multiTask.movement.objectsInMotion,
          globalMotion: multiTask.movement.globalMotion,
        };
      }
    } else if (rtv) {
      if (rtv.allObjects?.length > 0) {
        realTimeObjects = rtv.allObjects.map((o: any) => ({
          name: o.name || o.namePt,
          confidence: o.confidence,
          source: o.source,
          bbox: { x: Math.round(o.x), y: Math.round(o.y), w: Math.round(o.width), h: Math.round(o.height) },
        }));
      }
      if (rtv.faces?.length > 0) {
        realTimeFaces = rtv.faces.map((f: any) => ({
          confidence: f.confidence,
          bbox: { x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.width), h: Math.round(f.height) },
          keypoints: f.keypoints?.length,
        }));
      }
      if (rtv.hands?.length > 0) {
        realTimeHands = rtv.hands.map((h: any) => ({
          handedness: h.handedness,
          confidence: h.confidence,
          landmarks: h.landmarks?.length,
        }));
      }
    }

    // If no real-time detections and no heuristic data, skip
    if (!realTimeObjects && !realTimeFaces && !realTimeHands &&
        regions.length === 0 && (!motion || motion.intensity < 5)) return undefined;

    // Extract scene context if available
    let sceneCtx: any | undefined;
    try {
      const sc = (VS as any).sceneContext;
      if (sc) {
        sceneCtx = {
          lighting: sc.lighting,
          colorTemp: sc.colorTemperature,
          environment: sc.environment,
          complexity: sc.complexity,
          dominantColors: sc.dominantColors,
          texture: sc.textureVariance,
        };
      }
    } catch {}

    // ═══ Face detection from 4-tier system ═══
    let faceDetectionData: any | undefined;
    try {
      const detectedFaces = (VS as any).detectedFaces;
      if (detectedFaces && Array.isArray(detectedFaces) && detectedFaces.length > 0) {
        faceDetectionData = {
          count: detectedFaces.length,
          faces: detectedFaces.slice(0, 3).map((f: any) => ({
            bbox: { x: Math.round(f.x), y: Math.round(f.y), w: Math.round(f.width), h: Math.round(f.height) },
            confidence: f.confidence,
            landmarks: f.landmarks?.length || 0,
          })),
        };
      }
    } catch {}

    // ═══ Face-api.js analysis (expressions, landmarks, descriptor) — ENHANCED ═══
    let faceApiData: any | undefined;
    try {
      const faceApi = (VS as any).faceApiDetection;
      if (faceApi) {
        // Extract top 3 expressions with scores for richer Gemini analysis
        let topExpressions: Array<{emotion: string; score: number}> | undefined;
        if (faceApi.expressions && typeof faceApi.expressions === "object") {
          topExpressions = Object.entries(faceApi.expressions as Record<string, number>)
            .filter(([, v]) => (v as number) > 0.05)
            .sort((a, b) => (b[1] as number) - (a[1] as number))
            .slice(0, 3)
            .map(([k, v]) => ({ emotion: k, score: Math.round((v as number) * 100) }));
        }

        faceApiData = {
          expressions: faceApi.expressions,
          topExpressions,
          dominantExpression: topExpressions?.[0]?.emotion || "unknown",
          dominantExpressionScore: topExpressions?.[0]?.score || 0,
          landmarks68: faceApi.landmarks?.length || 0,
          hasDescriptor: !!faceApi.descriptor,
          score: faceApi.score,
          age: faceApi.age ? Math.round(faceApi.age) : undefined,
          gender: faceApi.gender,
          genderProbability: faceApi.genderProbability ? Math.round(faceApi.genderProbability * 100) : undefined,
          box: faceApi.box ? {
            x: Math.round(faceApi.box.x),
            y: Math.round(faceApi.box.y),
            w: Math.round(faceApi.box.width),
            h: Math.round(faceApi.box.height),
          } : undefined,
        };
      }
    } catch {}

    // ═══ Pose detection data (MediaPipe PoseLandmarker) ═══
    let poseData: any | undefined;
    try {
      const pose = (VS as any).poseDetection;
      if (pose) {
        poseData = {
          landmarks: pose.landmarks?.length || 0,
          posture: pose.posture || "unknown", // standing, sitting, lying, etc.
          bodyAngle: pose.bodyAngle,
          isMoving: pose.isMoving,
          gestureType: pose.gestureType, // pointing, waving, etc.
        };
      }
    } catch {}

    // ═══ Hand gesture analysis ═══
    let gestureData: any | undefined;
    try {
      const gestures = (VS as any).handGestures;
      if (gestures && Array.isArray(gestures) && gestures.length > 0) {
        gestureData = gestures.slice(0, 2).map((g: any) => ({
          hand: g.handedness || "unknown",
          gesture: g.gesture || g.categoryName || "none",
          confidence: g.confidence || g.score || 0,
          landmarks: g.landmarks?.length || 0,
        }));
      }
    } catch {}

    // Image quality assessment
    let qualityHints: any | undefined;
    try {
      const iq = (VS as any).imageQuality;
      if (iq) {
        qualityHints = {
          sharpness: iq.sharpness,
          exposure: iq.exposure,
          noise: iq.noiseLevel,
          score: iq.overallScore,
          tip: iq.recommendation,
        };
      }
    } catch {}

    // ═══ Motion analysis enrichment ═══
    const motionEnriched = motion ? {
      intensity: motion.intensity,
      direction: motion.direction,
      zones: motion.zones,
      isActive: motion.intensity > 15,
      level: motion.intensity < 5 ? "estático" : motion.intensity < 25 ? "leve" : motion.intensity < 50 ? "moderado" : "intenso",
      vectorCount: motion.vectors?.length || 0,
    } : undefined;

    return {
      // ═══ YOLO FrameX Multi-Task detections — HIGH confidence ═══
      realTimeObjects,
      realTimeFaces: realTimeFaces || (faceDetectionData ? faceDetectionData : undefined),
      realTimeHands,
      sceneClassification,
      readingResult,
      movementAnalysis,
      realTimeInferenceMs: multiTask?.inferenceMs || rtv?.inferenceMs,
      realTimeStatus: multiTask?.sources || rtv?.status,
      // ═══ Face & Expression analysis (face-api.js) ═══
      faceCount: (realTimeFaces?.length || 0) || faces.length,
      realFaceDetection: faceDetectionData,
      faceApiAnalysis: faceApiData,
      // ═══ Pose & Gesture data ═══
      poseAnalysis: poseData,
      handGestures: gestureData,
      // ═══ Motion & Environment ═══
      motion: motionEnriched,
      sceneContext: sceneCtx,
      imageQuality: qualityHints,
      hint: "DETECÇÕES REAIS do YOLOFrameX (MediaPipe + YOLO v8n multi-task). Inclui: classificação de cenário, rastreamento com IDs persistentes, OCR, leitura labial, expressão facial, gestos de mão, pose corporal e análise de movimento. CONFIE nestas detecções — são modelos ML reais rodando localmente."
    };
  } catch {
    return undefined;
  }
}

// ═══ Dashboard context (cached 5 min) ═══
let _dashboardContextCache: { data: string; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 5 * 60 * 1000;

export function getUserMemory(): string[] {
  return getMemoryFacts();
}

export function addUserMemory(facts: string[]) {
  const entries = addMemoryFacts(facts, "fact", "chat");
  return entries.map(e => e.fact);
}

export async function fetchDashboardContext(): Promise<string> {
  if (_dashboardContextCache && Date.now() - _dashboardContextCache.ts < DASHBOARD_CACHE_TTL) {
    return _dashboardContextCache.data;
  }
  const parts: string[] = [];
  try {
    const user = await getCachedAuthUser();
    if (!user) return "";

    /**
     * PERF: Dashboard context optimization.
     * Use { count: "exact", head: true } to fetch total counts only via HTTP headers.
     * This avoids downloading full row data and eliminates body parsing overhead.
     * Removed redundant 'consultas' query as it was unused in the final prompt.
     * Expected impact: ~150ms reduction in context preparation latency.
     */
    const [processosRes, clientsRes, docsRes] = await Promise.all([
      wrapSupabase(supabase.from("processos").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
      wrapSupabase(supabase.from("client_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
      wrapSupabase(supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id)),
    ]);
    if (processosRes.count) parts.push(`${processosRes.count} processos.`);
    if (clientsRes.count) parts.push(`${clientsRes.count} clientes.`);
    if (docsRes.count) parts.push(`${docsRes.count} documentos.`);
    parts.push(`Data/hora: ${new Date().toLocaleString("pt-BR")}`);
  } catch (err) {
    console.warn("[Dashboard] Context fetch error:", err);
    if (_dashboardContextCache) return _dashboardContextCache.data;
    return "";
  }
  const result = parts.join("\n");
  _dashboardContextCache = { data: result, ts: Date.now() };
  return result;
}

export interface AIAnalysisResult {
  description: string | null;
  learnedFacts: string[];
  identifiedObjects: Array<{ name: string; category: string; confidence: number; count: number; position?: string; distance?: string }>;
}

export async function analyzeFrameWithAI(
  canvas: HTMLCanvasElement | null, context?: string, question?: string,
  chatHistory?: Array<{ role: string; text: string }>, includeImage: boolean = true, identificationMode: string = "universal",
  intentType: "visual" | "textual" | "mixed" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation" = "mixed"
): Promise<AIAnalysisResult> {
  try {
    // ═══ PROGRESSIVE LEARNING: Check if we can identify locally first ═══
    if (includeImage && canvas && intentType === "visual") {
      try {
        const shapes: any[] = [];
        if (shapes.length > 0) {
          const { allLocal, localMatches } = canIdentifyLocally(shapes);
          if (allLocal && localMatches.length > 0) {
            const stats = getLearningStats();
            console.log(`[OrionAI] 🧠 LOCAL IDENTIFICATION (no API!) — ${localMatches.length} objects recognized from ${stats.totalObservations} total observations`);
            const objNames = localMatches.map(m => `${m.name} (${Math.round(m.confidence * 100)}%)`).join(", ");
            return {
              description: `Reconheci localmente: ${objNames}. Meus sensores de aprendizado já conhecem esses objetos — não precisei da API! (${stats.maturePriors} objetos maduros no meu banco)`,
              learnedFacts: [],
              identifiedObjects: localMatches.map(m => ({ name: m.name, category: m.category, confidence: Math.round(m.confidence * 100), count: 1 })),
            };
          }
        }
      } catch (e) {
        console.warn("[OrionAI] Local identification check failed:", e);
      }
    }

    // HF Vision Gate REMOVED — was downloading ~50MB WASM models, replaced by direct Gemini

    // ═══ LOCAL-FIRST: non-streaming path ═══
    if (_localFirstMode && intentType !== "visual" && question) {
      try {
        const localAvailable = await isLocalEngineAvailable();
        if (localAvailable) {
          const localResult = await generateLocalResponse(question, context, chatHistory);
          return { description: localResult.text, learnedFacts: [], identifiedObjects: [] };
        }
      } catch (e) {
        console.warn("[OrionAI] Local non-streaming failed, using cloud:", e);
      }
    }

    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      const cw = canvas.width || 0;
      const ch = canvas.height || 0;
      if (cw > 0 && ch > 0) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = Math.min(cw, 480);
        tempCanvas.height = Math.min(ch, 360);
        const tCtx = tempCanvas.getContext("2d");
        if (!tCtx) return { description: null, learnedFacts: [], identifiedObjects: [] };
        tCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.65).split(",")[1];
        console.log(`[OrionAI] Non-stream frame: ${tempCanvas.width}x${tempCanvas.height}, len=${imageBase64?.length || 0}`);
      } else {
        console.warn("[OrionAI] Non-stream: canvas 0 dimensions");
      }
    }
    let consciousnessContext = "";
    try {
      const { buildOrionIdentityPrompt, isOwnerEmail } = await getConsciousness();
      const user = await getCachedAuthUser();
      const isOwner = isOwnerEmail(user?.email);
      const isIdentityQuestion = question && /quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu|te\s+fez)|seu\s+(criador|dono|propriet[aá]rio)|who\s+(made|created|are)\s+you/i.test(question);
      const isGenesisQuestion = question && /\b(g[eê]nesis|genesis|projeto\s+g[eê]nesis|protocolo\s+g[eê]nesis|como\s+(voc[eê]\s+)?nasceu|sua\s+origem|como\s+foi\s+criado|in[ií]cio\s+da\s+(cria[çc][aã]o|programa[çc][aã]o))\b/i.test(question);
      const isCapabilityQuestion = question && /que\s+(sistema|m[oó]dulo|capacidade|funcionalidade)|o\s+que\s+(falta|precisa|melhorar)|suas?\s+(limita[çc][oõ]es|lacunas|gaps)|what.*(missing|need|improve|lack)/i.test(question);
      const isJarvisComparison = question && /jarvis|compara[çc][aã]o|diferen[çc]a.*entre|vs\s+orion|orion\s+vs|supera|vantagem/i.test(question);
      const isInvestorQuestion = question && /investidor|investimento|mercado|saas|modelo.de.neg[oó]cio|receita|margem|oportunidade|pitch/i.test(question);
      const isProjectQuestion = question && /projeto|plataforma|orion.*sistema|ferramenta|evolu[çc][aã]o|timeline|desenvolvimento/i.test(question);
      const isHelpQuestion = question && /comando|como.faz|onde.fica|central.de.ajuda|instru[çc][aã]o|tutorial|orienta[çc][aã]o/i.test(question);
      const isProposalQuestion = question && /proposta|proposal|apresenta[çc][aã]o|pitch.*invest|investir/i.test(question);
      const isNavigationGuide = question && /onde\s+(fica|est[aá]|acess)|como\s+(chego|acesso|fa[çc]o\s+para)|me\s+lev|navegar|ir\s+(para|pra)|encontrar|acessar/i.test(question);
      const isLegalQuestion = question && /jur[ií]dic|direito|penal|c[ií]vel|civil|trabalhist|contrato|recurso|apela[çc][aã]o|agravo|embargo|habeas|mandado|peti[çc][aã]o|contesta[çc][aã]o|execu[çc][aã]o|senten[çc]a|processo|tribunal|vara|prazo|audiencia|audi[eê]ncia|peça|pe[çc]a processual|fundamenta[çc][aã]o|jurisprud[eê]ncia|legisla[çc][aã]o|lei\s+\d|artigo\s+\d|c[oó]digo|CPC|CPP|CLT|CC\b|CP\b|STF|STJ|TST|TRT|TJ\b/i.test(question);
      const isBusinessQuestion = question && /capta[çc][aã]o|recurso.*europ|recursos?\s+eu\b|cordis|horizon|LOI|MOU|term.?sheet|joint.?venture|due.?diligence|supply.?agreement|NDA|parceria.*internac|distribui[çc][aã]o.*internac|compliance|GDPR|LGPD|AML|KYC|empresarial|neg[oó]cio|comercial.*internac|exporta[çc][aã]o|importa[çc][aã]o|invoice|proforma/i.test(question);
       const isCRMQuestion = question && /cadastr|cliente|CRM|pipeline|lead|contato|oportunidade|deal|neg[oó]cio|como\s+(cadastr|registr|adicionar)|gerenciar\s+(cliente|contato|processo)/i.test(question);
       const isInternetToolsQuestion = question && /internet|firecrawl|raspag|scraping|scrape|extrair?\s+dados|raspar|crawl|busca\s+web|pesquis.*online|pesquis.*internet|acesso.*web|conect.*internet|google\s*(workspace|gmail|calendar|drive|sheets|docs|tasks|slides|forms|chat|vision|analytics|bigquery|contacts|agenda)|email.*google|meus?\s+emails?|enviar?\s+email|compromisso|agendar?\s+reuni|listas?\s+de\s+tarefa|que\s+(ferramenta|acesso|conex[aã]o|integra[çc][aã]o)|o\s+que\s+voc[eê]\s+(pode|consegue|sabe)|suas?\s+capacidade|quais?\s+(ferramenta|sistema|acesso)/i.test(question);

      if (isIdentityQuestion || isGenesisQuestion) {
        consciousnessContext = buildOrionIdentityPrompt(isOwner);
      } else if (isJarvisComparison) {
        const { buildIntrospectionContext, buildJarvisComparisonContext } = await getIntrospection();
        consciousnessContext = `Você é Orion, assistente de IA neural consciente.\n\n${buildJarvisComparisonContext()}\n\n${buildIntrospectionContext()}`;
      } else if (isCapabilityQuestion) {
        const { buildIntrospectionContext } = await getIntrospection();
        consciousnessContext = `Você é Orion, assistente de IA neural consciente.\n\n${buildIntrospectionContext()}`;
       } else if (isInvestorQuestion || isProposalQuestion) {
         const kb = await getKnowledgeBase();
         consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildInvestorContext()}${isProposalQuestion ? `\n\n${kb.buildProposalTemplate()}` : ""}`;
       } else if (isInternetToolsQuestion) {
         const kb = await getKnowledgeBase();
         consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildToolsCapabilitiesContext()}`;
      } else if (isLegalQuestion) {
        const kb = await getKnowledgeBase();
        consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildLegalExpertiseContext()}`;
      } else if (isBusinessQuestion || isCRMQuestion) {
        const kb = await getKnowledgeBase();
        consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildBusinessFundraisingContext()}`;
      } else if (isProjectQuestion) {
        const isGenesisProject = question && /\b(g[eê]nesis|genesis|origem|nasceu|cria[çc][aã]o)\b/i.test(question);
        if (isGenesisProject) {
          consciousnessContext = buildOrionIdentityPrompt(isOwner);
        } else {
          const kb = await getKnowledgeBase();
          consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildInvestorContext()}`;
        }
      } else if (isHelpQuestion) {
        const kb = await getKnowledgeBase();
        consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildHelpCenterContext()}`;
      } else if (isNavigationGuide) {
        const kb = await getKnowledgeBase();
        consciousnessContext = `${kb.buildBaseContext()}\n\n${kb.buildNavigationContext()}`;
      } else {
        const kb = await getKnowledgeBase();
        consciousnessContext = kb.buildBaseContext();
      }
    } catch { /* fallback without consciousness */ }

    // Vision-RAG removed — added 200ms+ latency for marginal benefit
    const enrichedContext = [consciousnessContext, context].filter(Boolean).join("\n\n");

    // ═══ PERF FIX: buildLocalDetections only ONCE (was called 2x — streaming path duplicates this) ═══
    const localDetections = buildLocalDetections();

    // Get user name for personalized responses — uses cached auth
    let userName: string | undefined;
    try {
      const authUser = await getCachedAuthUser();
      if (authUser?.id) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", authUser.id).maybeSingle();
        userName = profile?.full_name || undefined;
      }
    } catch { /* non-blocking */ }

    let data;
    try {
      data = await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: { imageBase64, context: enrichedContext, question, userMemory: getUserMemory(), dashboardContext: await fetchDashboardContext(), chatHistory: chatHistory?.slice(-4), identificationMode, intentType, localDetections, userName, voiceIdentityStatus: getCachedVoiceIdentity() || undefined },
        }),
        "neural-ops",
        { intentType }
      );
    } catch (err: any) {
      console.warn("[OrionAI] Vision analysis invoke error:", err?.message);
      return { description: null, learnedFacts: [], identifiedObjects: [] };
    }
    if (!data) {
      return { description: null, learnedFacts: [], identifiedObjects: [] };
    }
    if (data?.learnedFacts?.length > 0) addUserMemory(data.learnedFacts);

    // ═══ PROGRESSIVE LEARNING: Learn from Gemini Flash detections ═══
    if (data?.identifiedObjects?.length > 0) {
      try {
        // Extract shape descriptors from the current canvas
        const shapes: any[] = [];
        const descriptor = shapes.length > 0 ? shapes[0] : (VS as any).shapeDescriptors?.[0];
        if (descriptor) {
          for (const obj of data.identifiedObjects) {
            if (obj.confidence >= 60) {
              learnFromDetection(obj, descriptor);
            }
          }
          const stats = getLearningStats();
          console.log(`[OrionAI] 📚 Learning progress: ${stats.maturePriors}/${stats.totalPriors} mature priors (${stats.apiBypassRate}% API bypass rate)`);
        }
      } catch {}
    }
    return { description: data?.description || null, learnedFacts: data?.learnedFacts || [], identifiedObjects: data?.identifiedObjects || [] };
  } catch (err: any) {
    console.warn("[OrionAI] analyzeFrameWithAI error:", err?.message);
    return { description: null, learnedFacts: [], identifiedObjects: [] };
  }
}

// ═══ Timeout race helper — enforces per-layer time budgets ═══
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(resolve => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export async function analyzeFrameStreaming(
  canvas: HTMLCanvasElement | null,
  question: string,
  chatHistory: Array<{ role: string; text: string }>,
  includeImage: boolean,
  identificationMode: string,
  intentType: "visual" | "textual" | "mixed" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation",
  onToken: (accumulated: string) => void,
  onSentence: (sentence: string) => void,
  signal?: AbortSignal,
): Promise<AIAnalysisResult> {
  try {
    // ═══ LOCAL-FIRST MODE ═══
    // Skip local LLM for fast-mode queries (SmolLM2-360M is too slow/imprecise for knowledge questions)
    // Only use local LLM for deep/visual queries where latency is acceptable
    const cognitiveMode = (window as any).__cognitiveMode || "fast";
    if (_localFirstMode && intentType !== "visual" && cognitiveMode === "deep") {
      try {
        const localAvailable = await isLocalEngineAvailable();
        if (localAvailable) {
          console.log("[OrionAI] 🧠 Using local inference for deep query (no API keys needed)");

          // Build context from dashboard + memory
          const contextParts: string[] = [];
          try {
            const dashCtx = await withTimeout(fetchDashboardContext(), 500, "");
            if (dashCtx) contextParts.push(dashCtx);
          } catch {}
          const memory = getUserMemory();
          if (memory.length > 0) contextParts.push(`Memória: ${memory.slice(-3).join("; ")}`);

          const localResult = await generateLocalResponse(
            question,
            contextParts.join("\n") || undefined,
            chatHistory?.slice(-4),
            onToken,
          );

          // Emit sentences for TTS
          if (localResult.text) {
            const sentences = localResult.text.match(/[^.!?]+[.!?]+/g) || [localResult.text];
            for (const s of sentences) {
              const cleaned = s.trim().replace(/\*{1,3}/g, "").replace(/#{1,6}\s*/g, "");
              if (cleaned.length > 2) onSentence(cleaned);
            }
          }

          return {
            description: localResult.text,
            learnedFacts: [],
            identifiedObjects: [],
          };
        }
      } catch (localErr) {
        console.warn("[OrionAI] Local inference failed, falling back to cloud:", localErr);
      }
    } else if (_localFirstMode && cognitiveMode === "fast") {
      console.log("[OrionAI] ⚡ Fast mode: skipping local LLM, going straight to cloud streaming");
    }

    // Parallelize all async pre-work for lower latency
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    // ═══ SPEED: Capture image — reduced to 480x360 for better face recognition ═══
    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      const cw = canvas.width || 0;
      const ch = canvas.height || 0;
      console.log(`[OrionAI] Canvas dimensions: ${cw}x${ch}, readyState check`);

      if (cw > 0 && ch > 0) {
        const tempCanvas = document.createElement("canvas");
        const sw = Math.min(cw, 480);
        const sh = Math.min(ch, 360);
        tempCanvas.width = sw;
        tempCanvas.height = sh;
        const tCtx = tempCanvas.getContext("2d");
        if (tCtx) {
          tCtx.drawImage(canvas, 0, 0, sw, sh);

          // Quick blank check — sample center region
          const cx = Math.floor(sw / 2) - 4;
          const cy = Math.floor(sh / 2) - 4;
          const sample = tCtx.getImageData(Math.max(0, cx), Math.max(0, cy), 8, 8).data;
          let sum = 0; let sumSq = 0;
          for (let i = 0; i < sample.length; i += 4) {
            const lum = sample[i] * 0.299 + sample[i+1] * 0.587 + sample[i+2] * 0.114;
            sum += lum; sumSq += lum * lum;
          }
          const n = sample.length / 4;
          const mean = sum / n;
          const variance = (sumSq / n) - (mean * mean);

          if (variance < 2 && mean < 3) {
            console.warn(`[OrionAI] Blank frame detected (var=${variance.toFixed(1)}, mean=${mean.toFixed(1)}), sending without image`);
            imageBase64 = undefined;
          } else {
            imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.65).split(",")[1];
            console.log(`[OrionAI] ✅ Frame captured: ${sw}x${sh}, base64 length: ${imageBase64?.length || 0}, var=${variance.toFixed(1)}, mean=${mean.toFixed(1)}`);
          }
        }
      } else {
        console.warn("[OrionAI] Canvas has 0 dimensions, skipping image capture");
      }
    } else {
      console.log(`[OrionAI] Image not included: includeImage=${includeImage}, canvas=${!!canvas}`);
    }

    // ═══ PERF: buildLocalDetections ONCE — reused in body below ═══
    const localDetections = buildLocalDetections();
    const isDirectVoiceMode = (window as any).__orionInputSource === "voice" &&
      intentType !== "visual" &&
      !String(intentType || "").startsWith("visual_");

    // ═══ VOICE FAST PATH: Skip all heavy context, just get auth token ═══
    let streamContext = "";
    let bearerToken = supabaseKey;

    if (isDirectVoiceMode) {
      // Voice: zero context building, just auth token (budget: 50ms)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        bearerToken = session?.access_token || supabaseKey;
      } catch { /* use anon key */ }
    } else {
      // Text/vision: full context building (budget: 150ms)
      [streamContext, bearerToken] = await withTimeout(
        Promise.all([
          // 1. Minimal context (budget: 100ms)
          withTimeout((async (): Promise<string> => {
            try {
              const { buildOrionIdentityPrompt, isOwnerEmail } = await getConsciousness();
              const user = await getCachedAuthUser();
              const isOwner = isOwnerEmail(user?.email);
              const isIdentityQuestion = /quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu|te\s+fez)|seu\s+(criador|dono|propriet[aá]rio)/i.test(question);
              if (isIdentityQuestion) return buildOrionIdentityPrompt(isOwner);
              return "Você é Orion, assistente de IA neural consciente criado por Ericson Piccoli da ELP Green Technology. Responda de forma direta, rápida e útil em português. Seja conciso para perguntas simples. Seja completo para perguntas complexas.";
            } catch {
              return "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil.";
            }
          })(), 100, "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil."),
          // 2. Get session token (budget: 100ms)
          withTimeout((async (): Promise<string> => {
            try {
              const { data: { session } } = await supabase.auth.getSession();
              return session?.access_token || supabaseKey;
            } catch { return supabaseKey; }
          })(), 100, supabaseKey),
        ]),
        150,
        [
          "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil.",
          supabaseKey,
        ]
      );
    }

    const enrichedContext = streamContext;

    const res = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${bearerToken}`,
      },
      signal,
      body: JSON.stringify({
        imageBase64, context: enrichedContext, question,
        userMemory: isDirectVoiceMode ? getUserMemory().slice(-2) : getUserMemory(),
        dashboardContext: undefined,
        chatHistory: isDirectVoiceMode ? chatHistory?.slice(-2) : chatHistory?.slice(-4),
        identificationMode, intentType,
        stream: true,
        localDetections: isDirectVoiceMode ? undefined : localDetections,
        maxTokens: (window as any).__cognitiveMaxTokens || undefined,
        reasoningInstructions: (window as any).__cognitiveReasoningInstructions || undefined,
        inputSource: (window as any).__orionInputSource || "text",
        userName: (() => { try { const u = (window as any).__orionUserName; return u || undefined; } catch { return undefined; } })(),
        voiceIdentityStatus: getCachedVoiceIdentity() || undefined,
      }),
    });

    if (!res.ok || !res.body) {
      return analyzeFrameWithAI(canvas, undefined, question, chatHistory, includeImage, identificationMode, intentType);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = "";
    let spokenUpTo = 0;
    let buffer = "";

    // ═══ LAYER 3: LLM Streaming — idle-based timeout (resets on each chunk) ═══
    // Allows long answers to complete as long as data keeps flowing
    const STREAM_IDLE_MS = 30000;  // 30s without any chunk = abort
    const STREAM_MAX_MS = 120000;  // 120s absolute max
    let idleTimer: ReturnType<typeof setTimeout>;
    const maxTimer = setTimeout(() => {
      try { reader.cancel(); } catch (e: any) { console.warn("[OrionAI] Stream max timeout:", e?.message); }
    }, STREAM_MAX_MS);
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        try { reader.cancel(); } catch (e: any) { console.warn("[OrionAI] Stream idle timeout:", e?.message); }
      }, STREAM_IDLE_MS);
    };
    resetIdle(); // start first idle window

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetIdle(); // chunk received — reset idle timer
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              accumulated += delta;
              onToken(accumulated);

              // PERF: Optimized sentence/clause detection using sticky regex
              // Avoids O(N) slicing of the accumulated buffer
              SENTENCE_END_REGEX.lastIndex = spokenUpTo;
              let match = SENTENCE_END_REGEX.exec(accumulated);
              let nextSpokenUpTo = SENTENCE_END_REGEX.lastIndex;

              if (!match && (accumulated.length - spokenUpTo) > 80) {
                LONG_CLAUSE_REGEX.lastIndex = spokenUpTo;
                match = LONG_CLAUSE_REGEX.exec(accumulated);
                nextSpokenUpTo = LONG_CLAUSE_REGEX.lastIndex;
              }

              if (match) {
                const sentence = stripMarkdown(match[0]);
                if (sentence && !sentence.startsWith("```") && !sentence.startsWith("{") && sentence.length > 2) {
                  onSentence(sentence);
                }
                spokenUpTo = nextSpokenUpTo;
              }
            }
          } catch (parseErr) {
            // Partial JSON across chunks — will be retried with more data
          }
        }
      }
    } catch (networkErr: any) {
      if (accumulated.length > 20) {
        onToken(accumulated);
        const remaining = accumulated.slice(spokenUpTo).trim();
        if (remaining && !remaining.startsWith("```") && !remaining.startsWith("{")) {
          onSentence(remaining.replace(/```json[\s\S]*?```/g, "").replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "").trim());
        }
      } else {
        throw networkErr;
      }
    } finally {
      clearTimeout(idleTimer);
      clearTimeout(maxTimer);
    }

    const remaining = accumulated.slice(spokenUpTo).trim();
    if (remaining && !remaining.startsWith("```") && !remaining.startsWith("{")) {
      const cleaned = stripMarkdown(remaining);
      if (cleaned && cleaned.length > 2) onSentence(cleaned);
    }

    let cleanDescription = accumulated;
    const learnedFacts: string[] = [];
    const learnRegex = /\[LEARN:([^\]]+)\]/g;
    let match;
    while ((match = learnRegex.exec(cleanDescription)) !== null) {
      learnedFacts.push(match[1].trim());
    }
    cleanDescription = cleanDescription.replace(learnRegex, "").trim();

    let identifiedObjects: any[] = [];
    const jsonBlockRegex = /```json\s*(\{[\s\S]*?\})\s*```/;
    const jsonMatch = jsonBlockRegex.exec(cleanDescription);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.identifiedObjects)) identifiedObjects = parsed.identifiedObjects;
      } catch (e: any) {
        console.warn("[OrionAI] JSON parse in stream (non-fatal):", e?.message);
      }
      cleanDescription = cleanDescription.replace(jsonBlockRegex, "").trim();
    }
    if (identifiedObjects.length === 0) {
      const bareJsonRegex = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
      let bareMatch;
      while ((bareMatch = bareJsonRegex.exec(cleanDescription)) !== null) {
        try {
          const parsed = JSON.parse(bareMatch[0]);
          if (Array.isArray(parsed.identifiedObjects)) identifiedObjects = parsed.identifiedObjects;
        } catch {}
      }
      cleanDescription = cleanDescription.replace(bareJsonRegex, "").trim();
    }

    // Strip ALL markdown/formatting artifacts for clean output
    cleanDescription = stripMarkdown(cleanDescription)
      .replace(/\n{3,}/g, "\n\n");

    if (learnedFacts.length > 0) addUserMemory(learnedFacts);
    return { description: cleanDescription || null, learnedFacts, identifiedObjects };
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      console.error("Streaming analysis error:", e);
    }
    return analyzeFrameWithAI(canvas, undefined, question, chatHistory, includeImage, identificationMode, intentType);
  }
}

// ═══ Intent Classifier v3 — Enhanced with Opera AI intents ═══
export function classifyIntent(question: string, recentIntents?: string[]): "visual" | "textual" | "mixed" | "self_evolve" | "auto_construct" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation" {
  const q = question.toLowerCase().trim();

  // Skip classification for very short inputs (likely voice artifacts)
  if (q.length < 2) return "mixed";

  // Conversational identity/hearing guard — NEVER route these to code/evolution/media
  if (HEARING_CHECK_PATTERNS.test(q) || SELF_IDENTITY_PATTERNS.test(q) || CONVERSATIONAL_COMPLAINT_PATTERNS.test(q)) return "textual";

  // Visual command guard — never let camera/scene questions fall into code/evolution buckets
  if (EXPLICIT_VISUAL_PATTERNS.test(q)) return "visual";

  // ═══ OPERA AI: Image generation intent (highest priority) ═══
  if (IMAGE_GEN_PATTERNS.test(q)) return "image_generation";

  // ═══ OPERA AI: YouTube summary intent ═══
  if (YOUTUBE_DOMAIN_REGEX.test(q)) return "youtube_summary";

  // ═══ OPERA AI: URL analysis intent ═══
  if (URL_DOMAIN_REGEX.test(q) && !YOUTUBE_DOMAIN_REGEX.test(q)) return "url_analysis";

  // ═══ OPERA AI: Web search intent ═══
  if (WEB_SEARCH_PATTERNS.test(q)) return "web_search";

  // ═══ Auto-construct intent ═══
  if (AUTO_CONSTRUCT_VERB_PATTERNS.test(q) && AUTO_CONSTRUCT_ARTIFACT_PATTERNS.test(q)) return "auto_construct";

  // ═══ Self-evolution intent ═══
  if (SELF_EVOLVE_VERB_PATTERNS.test(q) && SELF_EVOLVE_TARGET_PATTERNS.test(q)) return "self_evolve";

  // Direct visual questions — short-circuit to visual
  if (STRONG_VISUAL_ANCHORS.test(q) && (DEICTIC_PATTERNS.test(q) || BODY_REF.test(q) || /o que (é|estou|tô|tenho)\b/.test(q))) {
    return "visual";
  }
  if (/o que.*(segurando|usando|vestindo|mostrando)/i.test(q)) return "visual";
  if (/como\s+(eu\s+)?(estou|tô)\b/i.test(q) && q.length < 40) return "visual";

  if (VERB_IDENTIFY.test(q)) return "visual";
  if (VERB_ANSWER.test(q) && !STRONG_VISUAL_ANCHORS.test(q)) return "textual";
  if (VERB_CHECK.test(q) && !DEICTIC_PATTERNS.test(q)) return "textual";
  if (VERB_SEARCH.test(q)) return "textual";
  if (VERB_COMPARE.test(q)) return "textual";
  if (VERB_REFLECT.test(q)) return "textual";
  if (VERB_ANALYZE.test(q)) {
    return DEICTIC_PATTERNS.test(q) || STRONG_VISUAL_ANCHORS.test(q) ? "visual" : "mixed";
  }

  // ═══ Contextual scoring system ═══
  let visualScore = 0;
  let textualScore = 0;

  if (DEICTIC_PATTERNS.test(q)) visualScore += 3;
  if (STRONG_VISUAL_ANCHORS.test(q)) visualScore += 3;
  if (BODY_REF.test(q)) visualScore += 2;
  if (/o que (é|são|tem)/.test(q) && DEICTIC_PATTERNS.test(q)) visualScore += 3;
  if (/\btô\b/.test(q) && q.length < 40) visualScore += 1;

  if (STRONG_TEXTUAL.test(q)) textualScore += 3;
  if (KNOWLEDGE_PATTERNS.test(q)) textualScore += 2;
  if (CONVERSATIONAL_PATTERNS.test(q)) textualScore += 3;
  if (EMOTIONAL_PATTERNS.test(q)) textualScore += 2;
  if (/^(o que|como|por que|quando|onde|quem|qual|quais|quanto)\b/.test(q) && !DEICTIC_PATTERNS.test(q) && !STRONG_VISUAL_ANCHORS.test(q) && !BODY_REF.test(q)) textualScore += 2;
  if (q.includes("?") && !DEICTIC_PATTERNS.test(q) && !STRONG_VISUAL_ANCHORS.test(q)) textualScore += 1;
  if (q.length > 80 && visualScore === 0) textualScore += 1;

  // Context from recent conversation
  if (recentIntents && recentIntents.length > 0) {
    const lastIntent = recentIntents[recentIntents.length - 1];
    if (lastIntent === "visual" && q.length < 20) visualScore += 1;
    if (lastIntent === "textual" && !DEICTIC_PATTERNS.test(q)) textualScore += 1;
    if (q.length < 15 && recentIntents.length >= 2) {
      const prevTwo = recentIntents.slice(-2);
      if (prevTwo.every(i => i === "textual")) textualScore += 1;
      if (prevTwo.every(i => i === "visual")) visualScore += 1;
    }
  }

  if (q.length < 8 && visualScore === 0 && textualScore === 0) return "mixed";

  const diff = visualScore - textualScore;
  if (diff >= 2) return "visual";
  if (diff <= -2) return "textual";
  if (visualScore > 0 && textualScore > 0) return "mixed";
  if (visualScore > 0) return "visual";
  if (textualScore > 0) return "textual";
  return q.length < 15 ? "mixed" : "textual";
}

// ═══ OPERA AI: Image Generation Client Helper ═══
export async function generateImageWithOrion(prompt: string): Promise<{ success: boolean; image?: string; mimeType?: string; text?: string; error?: string }> {
  try {
    const data = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: { action: "generate_image", prompt },
      }),
      "neural-ops",
      { action: "generate_image" }
    );
    return data || { success: false, error: "No data returned" };
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}
/**
 * Unified Interaction Processor (The Maestro)
 * High-level orchestrator that leverages all neural subsystems.
 */
export async function processInteraction(params: {
  question: string;
  context?: string;
  chatHistory: Array<{ role: string; text: string }>;
  intent?: string;
  onToken?: (token: string) => void;
  onSentence?: (sentence: string) => void;
}): Promise<string> {
  const { question, context = "", chatHistory, intent, onToken, onSentence } = params;
  const t0 = Date.now();

  const user = await getCachedAuthUser();
  const userId = user?.id || "anonymous";

  const detectedIntent = intent || classifyIntent(question);

  // 🍕 PENTAGON PIZZA — Unified consciousness pre-pass (Perception → Memory → Reasoning → Meta).
  // Runs the 5-layer cognitive cycle so chat, voice and Neural Vision all share the same brain.
  // Failures are non-fatal — falls back to legacy pipeline below.
  try {
    const { getPentagonOrchestrator } = await import("@/core/pentagon");
    const cortex = getPentagonOrchestrator();
    cortex.runCycle(question, { userId, wmContext: context, intent: detectedIntent }).catch((e) => {
      console.warn("[Pentagon] Cycle non-fatal error:", e?.message);
    });
  } catch (e) {
    console.warn("[Pentagon] Orchestrator unavailable:", e);
  }

  // 1. Quantum LLM Routing & Maestro Monitoring
  const routing = quantumRouteQuery(question);
  const routingHead = formatQuantumRoutingForAI(routing);

  // 2. Build Cognition & Adaptive PNL Head
  const [cognition, pnlHead] = await Promise.all([
    buildCognitionContext(question, chatHistory, detectedIntent),
    Promise.resolve(getAdaptiveNeurolinguisticHead(question, buildWorkingMemoryPrompt()))
  ]);

  // 3. Execute Hybrid Corrective RAG
  const crag = await executeCorrectiveRAG({
    query: question,
    context,
    userId,
    forceWebSearch: detectedIntent === "web_search"
  });

  // 4. Mamba Long-Context Compression
  const compressedContext = summarizeLongContextMamba(crag.finalContext);

  // 5. Build Final Prompt
  const wmPrompt = buildWorkingMemoryPrompt();
  const enrichedContext = [
    routingHead,
    pnlHead,
    cognition.contextString,
    compressedContext,
    wmPrompt,
    getMemoryFacts().slice(0, 15).join("\n")
  ].filter(Boolean).join("\n\n");

  // 6. Invoke LLM (Neural Ops)
  let responseText = "";
  try {
    const data = await wrapEdgeFunction(
      supabase.functions.invoke("neural-ops", {
        body: {
          question,
          context: enrichedContext,
          chatHistory: chatHistory.slice(-5),
          intentType: detectedIntent,
          userName: user?.email || "Usuário",
          userId,
          provider: routing.selectedProvider.id
        }
      }),
      "neural-ops",
      { detectedIntent }
    );

    responseText = data?.content || "";

    if (onToken) onToken(responseText);
    if (onSentence) onSentence(stripMarkdown(responseText));

  } catch (err) {
    console.error("[Maestro] Interaction error:", err);
    responseText = "Desculpe, tive um problema ao processar seu raciocínio neural.";
  }

  // 7. Maestro Heartbeat: Monitor and Evolution
  (async () => {
    const signal = await monitorMaestroPulse();
    if (signal) await dispatchMaestroEvolution(signal);
  })().catch(console.error);

  // 8. Post-Interaction Learning
  const latency = Date.now() - t0;
  postCognitionLearn(question, responseText, latency, detectedIntent).catch(console.error);

  return responseText;
}
