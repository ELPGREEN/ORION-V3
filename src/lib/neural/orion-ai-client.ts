/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Extracted from NeuralVision.tsx for reusability
 * 
 * PERF: Global auth cache (60s TTL), lazy module imports, single buildLocalDetections call
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getMemoryFacts,
  addMemoryFacts,
} from "@/lib/neural/orion-memory";
import { VS } from "@/components/dashboard/neural/useVisionProcessing";
// vision-local-learning removed — all identification via Gemini on-demand
const canIdentifyLocally = (_shapes: any[]) => ({ allLocal: false, localMatches: [] as any[] });
const getLearningStats = () => ({ totalPriors: 0, maturePriors: 0, totalObservations: 0, apiBypassRate: 0 });
const learnFromDetection = (_obj: any, _desc: any) => {};
import { generateLocalResponse, isLocalEngineAvailable } from "@/lib/ai/local-llm-engine";
// hf-vision-gate REMOVED — was downloading ~50MB of WASM models in browser
import { matchProtocols } from "@/lib/neural/orion-voice-protocols";

// ═══ INTENT CLASSIFIER REGEXES (Module Scope) ═══
const INTENT_IMG_GEN = /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae]|gerar?\s+foto|cri[ae]\s+(uma?\s+)?ilustra[çc][aã]o|generate\s+(an?\s+)?image|draw|create\s+(an?\s+)?image|make\s+(an?\s+)?image|paint|sketch)\b/i;
const INTENT_YT_URL = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;
const INTENT_GENERIC_URL = /https?:\/\/[^\s]+/;
const INTENT_YT_SPECIFIC = /youtube\.com|youtu\.be/;
const INTENT_WEB_SEARCH = /\b(hoje|atual|atualmente|recente|notícia|preço\s+d[eoa]|cotação|quem\s+é|quando\s+(foi|será|é)|onde\s+fica|resultado\s+d[eoa]|placar|eleição|último|última|novo\s+|nova\s+|2024|2025|2026|tempo\s+(em|na|no)|clima|previsão|lançamento|estreia|pesquis[ae]\s+na\s+web|busca\s+na\s+internet|search\s+for|look\s+up|news|current|latest|trending)\b/i;
const INTENT_AUTO_CONSTRUCT = /\b(constru[ai]|programe?|crie?\s+(uma?\s+)?(fun[çc][ãa]o|endpoint|api|componente|tabela|migra[çc][ãa]o)|gere?\s+(c[oó]digo|fun[çc][ãa]o|edge\s*function)|implemente?|desenvolv[ae]|code|build|cri[ae]\s+isso|programa\s+isso|fa[çc]a\s+(uma?\s+)?(fun[çc][ãa]o|api|endpoint)|auto[-\s]?constru|se\s+constru[ai]|construa[-\s]se)\b/i;
const INTENT_SELF_EVOLVE = /\b(melhore-se|melhore\s+se|evolua|evolu[ií]r?|auto[-\s]?evolu[ií]r?|auto[-\s]?program[ae]|se\s+reprogram[ae]|otimize\s+(suas?\s+respostas?|se)|aprenda\s+(isso|com\s+isso|agora)|atualize?\s+(seus?\s+pesos?|se)|auto[-\s]?evol[uú]|upgrade|self[-\s]?improve|auto[-\s]?aprend|recalibre|se\s+calibre|se\s+atualize|melhore\s+suas?\s+respostas?|novo\s+protocolo|novos?\s+protocolos?)\b/i;
const VERB_IDENTIFY = /\b(identific[aeo]r?|identifique|identify|reconhe[cç][aeo]r?|reconozc[ao]|identificar?)\b/i;
const VERB_ANSWER = /\b(respond[aeo]r?|me\s+respond[aeo]|me\s+diz|me\s+fal[aeo]|me\s+cont[aeo]|answer|tell\s+me|explain|reply)\b/i;
const VERB_ANALYZE = /\b(analis[aeo]r?|analise|analy[sz]e|evaluat[aeo]|examinar?)\b/i;
const VERB_CHECK = /\b(verific[aeo]r?|verifique|checar?|confir[aemo]r?|check|verify)\b/i;
const VERB_SEARCH = /\b(pesquis[aeo]r?|busc[aeo]r?|procur[aeo]r?|google|search|look\s+up|find)\b/i;
const VERB_COMPARE = /\b(compar[aeo]r?|diferença\s+entre|versus|vs\b|melhor\s+entre)\b/i;
const VERB_REFLECT = /\b(reflita|pens[ae]\s+sobre|consider[ae]|raciocin[ae]|reason|think\s+about|ponderar)\b/i;
const STRONG_VISUAL = /\b(segurando|usando|vestindo|mostr[ae]|aparência|rosto|cor\b|enxerg|olh[aeo]|vê|vejo|vendo|câmera|imagem|foto|holding|wearing|showing|face|camera|image|photo)\b/i;
const BODY_REF = /\b(mão|mãos|dedo|braço|cabeça|rosto|olho|boca|cabelo|roupa|camisa|camiseta|óculos|chapéu|caneca|copo|garrafa|hand|finger|arm|head|eye|mouth|hair|shirt|glasses|hat|cup|bottle)\b/i;
const DEICTIC_REF = /\b(isso|isto|esse|essa|aquilo|aqui|ali|lá|aí|aquel[ea]s?|this|that|these|those|here|there|esto|eso|aquello)\b/i;
const STRONG_TEXTUAL = /\b(que dia|que horas|hora|data de hoje|capital d[aoe]|piada|conta uma|explica|defin[ie]|signific|quem é|quem foi|quanto é|calcul|agenda|prazo|processo|cliente|documento|resumo|traduz|como funciona|o que é|por que|quando foi|onde fica|qual é|quais são|previsão|temperatura|clima|tempo|notícia|cotação|dólar|euro|bitcoin|what time|what day|capital of|joke|explain|define|meaning|who is|how much|calculate|schedule|deadline|summary|translate|how does|what is|why|when|where|which)\b/i;
const KNOWLEDGE_REF = /\b(histór|ciência|matemática|física|química|política|economi|filosofi|programa[çc]ão|código|lei\b|artigo\b|jurisprudência|direito|constitui[çc]|penal|trabalhist|contrato|clt|cdc|lgpd|recurso|habeas|mandado|sentença|acórdão|súmula|tribunal|stf|stj|indenizaç|prescriç|responsabilidade\s*civil|tutela|execuç|licitaç|improbidade|tributári)\b/i;
const CONVERSATIONAL_REF = /\b(opini[ãa]o|acha\s+que|concorda|discorda|argumento|debate|sugir[ao]|recomend|aconselh|orienta[çc]|estrat[ée]gia|planej|organiz|prioriz|importa\b|melhor\s+forma|como\s+(posso|devo|faz)|me\s+ajud|preciso\s+de|tenho\s+que|deveria|poderia|gostaria|queria)\b/i;
const EMOTIONAL_REF = /\b(sinto|sentindo|triste|feliz|ansios|preocupad|estressad|frustrad|animad|chateado|confus[oa]|nervos[oa]|calm[oa]|motiv|desanima|angústi|med[oa]|raiva|alegr|satisf)\b/i;
const VERB_QUESTION = /^(o que|como|por que|quando|onde|quem|qual|quais|quanto)\b/i;
const DIRECT_VISUAL_1 = /o que (é|estou|tô|tenho)\b/i;
const DIRECT_VISUAL_2 = /o que.*(segurando|usando|vestindo|mostrando)/i;
const DIRECT_VISUAL_3 = /como\s+(eu\s+)?(estou|tô)\b/i;

// ═══ IDENTITY & CONSCIOUSNESS REGEXES (Module Scope) ═══
const IDENTITY_QUERY = /quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu|te\s+fez)|seu\s+(criador|dono|propriet[aá]rio)|who\s+(made|created|are)\s+you/i;
const GENESIS_QUERY = /\b(g[eê]nesis|genesis|projeto\s+g[eê]nesis|protocolo\s+g[eê]nesis|como\s+(voc[eê]\s+)?nasceu|sua\s+origem|como\s+foi\s+criado|in[ií]cio\s+da\s+(cria[çc][aã]o|programa[çc][aã]o))\b/i;
const CAPABILITY_QUERY = /que\s+(sistema|m[oó]dulo|capacidade|funcionalidade)|o\s+que\s+(falta|precisa|melhorar)|suas?\s+(limita[çc][oõ]es|lacunas|gaps)|what.*(missing|need|improve|lack)/i;
const JARVIS_QUERY = /jarvis|compara[çc][aã]o|diferen[çc]a.*entre|vs\s+orion|orion\s+vs|supera|vantagem/i;
const INVESTOR_QUERY = /investidor|investimento|mercado|saas|modelo.de.neg[oó]cio|receita|margem|oportunidade|pitch/i;
const PROJECT_QUERY = /projeto|plataforma|orion.*sistema|ferramenta|evolu[çc][aã]o|timeline|desenvolvimento/i;
const HELP_QUERY = /comando|como.faz|onde.fica|central.de.ajuda|instru[çc][aã]o|tutorial|orienta[çc][aã]o/i;
const PROPOSAL_QUERY = /proposta|proposal|apresenta[çc][aã]o|pitch.*invest|investir/i;
const NAVIGATION_QUERY = /onde\s+(fica|est[aá]|acess)|como\s+(chego|acesso|fa[çc]o\s+para)|me\s+lev|navegar|ir\s+(para|pra)|encontrar|acessar/i;
const LEGAL_QUERY = /jur[ií]dic|direito|penal|c[ií]vel|civil|trabalhist|contrato|recurso|apela[çc][aã]o|agravo|embargo|habeas|mandado|peti[çc][aã]o|contesta[çc][aã]o|execu[çc][aã]o|senten[çc]a|processo|tribunal|vara|prazo|audiencia|audi[eê]ncia|peça|pe[çc]a processual|fundamenta[çc][aã]o|jurisprud[eê]ncia|legisla[çc][aã]o|lei\s+\d|artigo\s+\d|c[oó]digo|CPC|CPP|CLT|CC\b|CP\b|STF|STJ|TST|TRT|TJ\b/i;
const BUSINESS_QUERY = /capta[çc][aã]o|recurso.*europ|recursos?\s+eu\b|cordis|horizon|LOI|MOU|term.?sheet|joint.?venture|due.?diligence|supply.?agreement|NDA|parceria.*internac|distribui[çc][aã]o.*internac|compliance|GDPR|LGPD|AML|KYC|empresarial|neg[oó]cio|comercial.*internac|exporta[çc][aã]o|importa[çc][aã]o|invoice|proforma/i;
const CRM_QUERY = /cadastr|cliente|CRM|pipeline|lead|contato|oportunidade|deal|neg[oó]cio|como\s+(cadastr|registr|adicionar)|gerenciar\s+(cliente|contato|processo)/i;
const INTERNET_TOOLS_QUERY = /internet|firecrawl|raspag|scraping|scrape|extrair?\s+dados|raspar|crawl|busca\s+web|pesquis.*online|pesquis.*internet|acesso.*web|conect.*internet|google\s*(workspace|gmail|calendar|drive|sheets|docs|tasks|slides|forms|chat|vision|analytics|bigquery|contacts|agenda)|email.*google|meus?\s+emails?|enviar?\s+email|compromisso|agendar?\s+reuni|listas?\s+de\s+tarefa|que\s+(ferramenta|acesso|conex[aã]o|integra[çc][aã]o)|o\s+que\s+voc[eê]\s+(pode|consegue|sabe)|suas?\s+capacidade|quais?\s+(ferramenta|sistema|acesso)/i;

// ═══ STREAM CLEANING REGEXES (Module Scope) ═══
const SENTENCE_REGEX = /^(.*?[.!?…;])\s/sy; // Sticky for performance
const LONG_CLAUSE_REGEX = /^(.{40,}?,)\s/sy; // Sticky for performance
const CLEAN_STT_REGEX_1 = /\*{1,3}|_{1,3}|#{1,6}\s*|\[([^\]]+)\]\([^)]+\)|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️]/gu;
const LEARN_BLOCK_REGEX = /\[LEARN:([^\]]+)\]/g;
const JSON_BLOCK_STREAM_REGEX = /```json\s*(\{[\s\S]*?\})\s*```/;
const BARE_JSON_OBJECTS_REGEX = /\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g;
const CLEAN_STT_REGEX_FINAL = /\*{1,3}|_{1,3}|#{1,6}\s*|\[([^\]]+)\]\([^)]+\)|https?:\/\/\S+|\/\/[^\n]*|<[^>]*>|[─═╔╗╚╝║]|\n{3,}/gu;
const JSON_BLOCK_REGEX = /```json[\s\S]*?```/g;
const BOLD_ITALIC_REGEX = /\*{1,3}/g;
const UNDERLINE_REGEX = /_{1,3}/g;
const HEADER_REGEX = /#{1,6}\s*/g;

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

/**
 * Helper to build local detections from client-side vision data.
 * @returns Object with detection results or undefined if none.
 */
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
    const [processosRes, clientsRes, docsRes, consultasRes] = await Promise.all([
      supabase.from("processos").select("id", { count: "exact", head: true }).eq("user_id", user.id).limit(1),
      supabase.from("client_profiles").select("id", { count: "exact", head: true }).eq("user_id", user.id).limit(1),
      supabase.from("documents").select("id", { count: "exact", head: true }).eq("user_id", user.id).limit(1),
      supabase.from("consultas").select("id", { count: "exact", head: true }).eq("cliente_id", user.id).limit(1),
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
    const consciousnessContext = await buildConsciousnessContext(question || "");

    // Vision-RAG removed — added 200ms+ latency for marginal benefit
    const enrichedContext = [consciousnessContext, context].filter(Boolean).join("\n\n");

    // ═══ PERF FIX: buildLocalDetections only when needed ═══
    const localDetections = (intentType !== "textual" && intentType !== "url_analysis")
      ? buildLocalDetections()
      : undefined;

    // Get user name for personalized responses — uses cached auth
    let userName: string | undefined;
    try {
      const authUser = await getCachedAuthUser();
      if (authUser?.id) {
        const { data: profile } = await supabase.from("profiles").select("full_name").eq("user_id", authUser.id).maybeSingle();
        userName = profile?.full_name || undefined;
      }
    } catch { /* non-blocking */ }

    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: { imageBase64, context: enrichedContext, question, userMemory: getUserMemory(), dashboardContext: await fetchDashboardContext(), chatHistory: chatHistory?.slice(-4), identificationMode, intentType, localDetections, userName, voiceIdentityStatus: getCachedVoiceIdentity() || undefined },
    });
    if (error) {
      console.warn("[OrionAI] Vision analysis invoke error:", error?.message);
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
  let timer: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>(resolve => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/** Handle local LLM inference when enabled and appropriate. */
async function handleLocalInference(
  question: string,
  chatHistory: Array<{ role: string; text: string }>,
  onToken: (accumulated: string) => void,
  onSentence: (sentence: string) => void,
): Promise<AIAnalysisResult | null> {
  try {
    const localAvailable = await isLocalEngineAvailable();
    if (!localAvailable) return null;

    console.log("[OrionAI] 🧠 Using local inference for deep query");
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

    if (localResult.text) {
      const sentences = localResult.text.match(/[^.!?]+[.!?]+/g) || [localResult.text];
      for (const s of sentences) {
        const cleaned = s.trim().replace(BOLD_ITALIC_REGEX, "").replace(HEADER_REGEX, "");
        if (cleaned.length > 2) onSentence(cleaned);
      }
    }
    return { description: localResult.text, learnedFacts: [], identifiedObjects: [] };
  } catch (localErr) {
    console.warn("[OrionAI] Local inference failed:", localErr);
    return null;
  }
}

/** Capture image frame from canvas with quality check. */
function captureStreamingFrame(canvas: HTMLCanvasElement): string | undefined {
  const cw = canvas.width || 0;
  const ch = canvas.height || 0;
  if (cw === 0 || ch === 0) return undefined;

  const tempCanvas = document.createElement("canvas");
  const sw = Math.min(cw, 480);
  const sh = Math.min(ch, 360);
  tempCanvas.width = sw;
  tempCanvas.height = sh;
  const tCtx = tempCanvas.getContext("2d");
  if (!tCtx) return undefined;

  tCtx.drawImage(canvas, 0, 0, sw, sh);
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

  if (variance < 2 && mean < 3) return undefined;
  return tempCanvas.toDataURL("image/jpeg", 0.65).split(",")[1];
}

/** Build streaming context and get bearer token. */
async function buildStreamAuth(question: string, isDirectVoiceMode: boolean, supabaseKey: string): Promise<[string, string]> {
  if (isDirectVoiceMode) {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return ["", session?.access_token || supabaseKey];
    } catch { return ["", supabaseKey]; }
  }

  return withTimeout(
    Promise.all([
      (async (): Promise<string> => {
        try {
          const { buildOrionIdentityPrompt, isOwnerEmail } = await getConsciousness();
          const user = await getCachedAuthUser();
          const isOwner = isOwnerEmail(user?.email);
          if (IDENTITY_QUERY.test(question)) return buildOrionIdentityPrompt(isOwner);
          return "Você é Orion, assistente de IA neural consciente criado por Ericson Piccoli da ELP Green Technology. Responda de forma direta, rápida e útil em português.";
        } catch { return "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil."; }
      })(),
      (async (): Promise<string> => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          return session?.access_token || supabaseKey;
        } catch { return supabaseKey; }
      })(),
    ]),
    150,
    ["Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil.", supabaseKey]
  );
}

/**
 * Modular helper to build consciousness context based on the question.
 * Refactored for maintainability and JIT optimization.
 */
async function buildConsciousnessContext(question: string): Promise<string> {
  try {
    const { buildOrionIdentityPrompt, isOwnerEmail } = await getConsciousness();
    const user = await getCachedAuthUser();
    const isOwner = isOwnerEmail(user?.email);

    if (IDENTITY_QUERY.test(question) || GENESIS_QUERY.test(question)) {
      return buildOrionIdentityPrompt(isOwner);
    }

    if (JARVIS_QUERY.test(question)) {
      const { buildIntrospectionContext, buildJarvisComparisonContext } = await getIntrospection();
      return `Você é Orion, assistente de IA neural consciente.\n\n${buildJarvisComparisonContext()}\n\n${buildIntrospectionContext()}`;
    }

    if (CAPABILITY_QUERY.test(question)) {
      const { buildIntrospectionContext } = await getIntrospection();
      return `Você é Orion, assistente de IA neural consciente.\n\n${buildIntrospectionContext()}`;
    }

    const kb = await getKnowledgeBase();
    const base = kb.buildBaseContext();

    if (INVESTOR_QUERY.test(question) || PROPOSAL_QUERY.test(question)) {
      return `${base}\n\n${kb.buildInvestorContext()}${PROPOSAL_QUERY.test(question) ? `\n\n${kb.buildProposalTemplate()}` : ""}`;
    }
    if (INTERNET_TOOLS_QUERY.test(question)) return `${base}\n\n${kb.buildToolsCapabilitiesContext()}`;
    if (LEGAL_QUERY.test(question)) return `${base}\n\n${kb.buildLegalExpertiseContext()}`;
    if (BUSINESS_QUERY.test(question) || CRM_QUERY.test(question)) return `${base}\n\n${kb.buildBusinessFundraisingContext()}`;
    if (PROJECT_QUERY.test(question)) {
      return GENESIS_QUERY.test(question) ? buildOrionIdentityPrompt(isOwner) : `${base}\n\n${kb.buildInvestorContext()}`;
    }
    if (HELP_QUERY.test(question)) return `${base}\n\n${kb.buildHelpCenterContext()}`;
    if (NAVIGATION_QUERY.test(question)) return `${base}\n\n${kb.buildNavigationContext()}`;

    return base;
  } catch {
    return "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil.";
  }
}

/**
 * Main streaming analysis engine.
 * Refactored for modularity, extreme performance and robustness.
 */
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
    if (!question) throw new Error("Question is required for analysis");

    const cognitiveMode = (window as any).__cognitiveMode || "fast";
    if (_localFirstMode && intentType !== "visual" && cognitiveMode === "deep") {
      const localResult = await handleLocalInference(question, chatHistory, onToken, onSentence);
      if (localResult) return localResult;
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      imageBase64 = captureStreamingFrame(canvas);
    }

    const isDirectVoiceMode = (window as any).__orionInputSource === "voice" &&
      intentType !== "visual" &&
      !String(intentType || "").startsWith("visual_");

    const localDetections = isDirectVoiceMode ? undefined : buildLocalDetections();
    const [streamContext, bearerToken] = await buildStreamAuth(question, isDirectVoiceMode, supabaseKey);

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

              // ═══ EXTREME PERF: Optimized sentence detection ═══
              // Use sticky regex with lastIndex to avoid O(N^2) string slicing
              SENTENCE_REGEX.lastIndex = spokenUpTo;
              const sentenceMatch = SENTENCE_REGEX.exec(accumulated);

              if (sentenceMatch) {
                const sentence = sentenceMatch[1].trim()
                  .replace(CLEAN_STT_REGEX_1, "$1")
                  .trim();

                if (sentence && !sentence.startsWith("```") && !sentence.startsWith("{") && sentence.length > 2) {
                  onSentence(sentence);
                }
                spokenUpTo = SENTENCE_REGEX.lastIndex;
              } else if (accumulated.length - spokenUpTo > 80) {
                // Secondary check for long clauses
                LONG_CLAUSE_REGEX.lastIndex = spokenUpTo;
                const longClauseMatch = LONG_CLAUSE_REGEX.exec(accumulated);
                if (longClauseMatch) {
                  const clause = longClauseMatch[1].trim()
                    .replace(CLEAN_STT_REGEX_1, "$1")
                    .trim();
                  if (clause.length > 2) onSentence(clause);
                  spokenUpTo = LONG_CLAUSE_REGEX.lastIndex;
                }
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
          onSentence(remaining.replace(JSON_BLOCK_REGEX, "").replace(BOLD_ITALIC_REGEX, "").replace(UNDERLINE_REGEX, "").trim());
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
      const cleaned = remaining
        .replace(JSON_BLOCK_REGEX, "")
        .replace(CLEAN_STT_REGEX_1, "$1")
        .trim();
      if (cleaned && cleaned.length > 2) onSentence(cleaned);
    }

    let cleanDescription = accumulated;
    const learnedFacts: string[] = [];
    let match;
    while ((match = LEARN_BLOCK_REGEX.exec(cleanDescription)) !== null) {
      learnedFacts.push(match[1].trim());
    }
    cleanDescription = cleanDescription.replace(LEARN_BLOCK_REGEX, "").trim();

    let identifiedObjects: any[] = [];
    const jsonMatch = JSON_BLOCK_STREAM_REGEX.exec(cleanDescription);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.identifiedObjects)) identifiedObjects = parsed.identifiedObjects;
      } catch (e: any) {
        console.warn("[OrionAI] JSON parse in stream (non-fatal):", e?.message);
      }
      cleanDescription = cleanDescription.replace(JSON_BLOCK_STREAM_REGEX, "").trim();
    }
    if (identifiedObjects.length === 0) {
      let bareMatch;
      while ((bareMatch = BARE_JSON_OBJECTS_REGEX.exec(cleanDescription)) !== null) {
        try {
          const parsed = JSON.parse(bareMatch[0]);
          if (Array.isArray(parsed.identifiedObjects)) identifiedObjects = parsed.identifiedObjects;
        } catch {}
      }
      cleanDescription = cleanDescription.replace(BARE_JSON_OBJECTS_REGEX, "").trim();
    }

    // Strip ALL markdown/formatting artifacts for clean output
    cleanDescription = cleanDescription
      .replace(CLEAN_STT_REGEX_FINAL, "$1")
      .trim();

    if (learnedFacts.length > 0) addUserMemory(learnedFacts);
    return { description: cleanDescription || null, learnedFacts, identifiedObjects };
  } catch (e: any) {
    if (e?.name !== "AbortError") {
      console.error("Streaming analysis error:", e);
    }
    return analyzeFrameWithAI(canvas, undefined, question, chatHistory, includeImage, identificationMode, intentType);
  }
}

// ═══ Modular Intent Classification Helpers ═══

/** Detect priority intents like image generation or URLs. */
function classifyPriorityIntents(q: string): string | null {
  if (INTENT_IMG_GEN.test(q)) return "image_generation";
  if (INTENT_YT_URL.test(q)) return "youtube_summary";
  if (INTENT_GENERIC_URL.test(q) && !INTENT_YT_SPECIFIC.test(q)) return "url_analysis";
  if (INTENT_WEB_SEARCH.test(q)) return "web_search";
  if (INTENT_AUTO_CONSTRUCT.test(q)) return "auto_construct";
  if (INTENT_SELF_EVOLVE.test(q)) return "self_evolve";
  return null;
}

/** Detect primary classification based on verbs. */
function classifyVerbIntents(q: string): string | null {
  if (VERB_IDENTIFY.test(q)) return "visual";
  if (VERB_ANSWER.test(q) && !STRONG_VISUAL.test(q)) return "textual";
  if (VERB_CHECK.test(q) && !DEICTIC_REF.test(q)) return "textual";
  if (VERB_SEARCH.test(q)) return "textual";
  if (VERB_COMPARE.test(q)) return "textual";
  if (VERB_REFLECT.test(q)) return "textual";
  if (VERB_ANALYZE.test(q)) {
    return DEICTIC_REF.test(q) || STRONG_VISUAL.test(q) ? "visual" : "mixed";
  }
  return null;
}

/** Detect direct visual anchors in the question. */
function classifyDirectVisual(q: string): "visual" | null {
  if (STRONG_VISUAL.test(q) && (DEICTIC_REF.test(q) || BODY_REF.test(q) || DIRECT_VISUAL_1.test(q))) {
    return "visual";
  }
  if (DIRECT_VISUAL_2.test(q)) return "visual";
  if (DIRECT_VISUAL_3.test(q) && q.length < 40) return "visual";
  return null;
}

/** Compute contextual visual and textual scores for a question. */
function computeContextScores(q: string, recentIntents?: string[]): { visual: number; textual: number } {
  let visualScore = 0;
  let textualScore = 0;

  if (DEICTIC_REF.test(q)) visualScore += 3;
  if (STRONG_VISUAL.test(q)) visualScore += 3;
  if (BODY_REF.test(q)) visualScore += 2;
  if (q.includes("tô") && q.length < 40) visualScore += 1;

  if (STRONG_TEXTUAL.test(q)) textualScore += 3;
  if (KNOWLEDGE_REF.test(q)) textualScore += 2;
  if (CONVERSATIONAL_REF.test(q)) textualScore += 3;
  if (EMOTIONAL_REF.test(q)) textualScore += 2;
  if (VERB_QUESTION.test(q) && !DEICTIC_REF.test(q) && !STRONG_VISUAL.test(q) && !BODY_REF.test(q)) textualScore += 2;
  if (q.includes("?") && !DEICTIC_REF.test(q) && !STRONG_VISUAL.test(q)) textualScore += 1;
  if (q.length > 80 && visualScore === 0) textualScore += 1;

  if (recentIntents && recentIntents.length > 0) {
    const lastIntent = recentIntents[recentIntents.length - 1];
    if (lastIntent === "visual" && q.length < 20) visualScore += 1;
    if (lastIntent === "textual" && !DEICTIC_REF.test(q)) textualScore += 1;
  }
  return { visual: visualScore, textual: textualScore };
}

/**
 * Intent Classifier v3 — Enhanced with Opera AI intents.
 * Modularized for extreme performance and maintainability.
 */
export function classifyIntent(question: string, recentIntents?: string[]): "visual" | "textual" | "mixed" | "self_evolve" | "auto_construct" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation" {
  if (!question) return "mixed";
  const q = question.toLowerCase().trim();
  if (q.length < 2) return "mixed";

  const priority = classifyPriorityIntents(q);
  if (priority) return priority as any;

  const verbIntent = classifyVerbIntents(q);
  if (verbIntent) return verbIntent as any;

  const directVisual = classifyDirectVisual(q);
  if (directVisual) return directVisual;

  const { visual: visualScore, textual: textualScore } = computeContextScores(q, recentIntents);
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
    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: { action: "generate_image", prompt },
    });
    if (error) return { success: false, error: error.message };
    return data;
  } catch (e: any) {
    return { success: false, error: e?.message || "Unknown error" };
  }
}
