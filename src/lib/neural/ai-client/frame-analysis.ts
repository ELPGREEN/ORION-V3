/**
 * Frame Analysis — analyzeFrameWithAI, analyzeFrameStreaming, buildLocalDetections, shouldUseVoiceFastShortcut
 * Extracted from orion-ai-client.ts (lines 85-92, 252-470, 548-730, 732-1090)
 */
import { getCachedAuthUser } from "./user-memory";
import { supabase } from "../../../integrations/supabase/client";
import { wrapSupabase, wrapEdgeFunction } from "../../../lib/errors";
import {
  getMemoryFacts,
  addMemoryFacts,
} from "../orion-memory";
import { buildCognitionContext, postCognitionLearn } from "../neural-cognition-engine";
import { executeCorrectiveRAG } from "../corrective-rag";
import { getAdaptiveNeurolinguisticHead, monitorMaestroPulse, dispatchMaestroEvolution } from "../orion-maestro-unification";
import { quantumRouteQuery, formatQuantumRoutingForAI } from "../quantum-llm-router";
import { summarizeLongContextMamba } from "../mamba-orchestrator";
import { buildWorkingMemoryPrompt, initWorkingMemory, pushToWorkingMemory } from "../orion-working-memory";
import { stripMarkdown } from "../../../lib/utils/text-utils";
import { getVS } from "../vision-state";
// vision-local-learning removed — all identification via Gemini on-demand
const canIdentifyLocally = (_shapes: any[]) => ({ allLocal: false, localMatches: [] as any[] });
const getLearningStats = () => ({ totalPriors: 0, maturePriors: 0, totalObservations: 0, apiBypassRate: 0 });
const learnFromDetection = (_obj: any, _desc: any) => {};
import { generateLocalResponse, isLocalEngineAvailable } from "../../../lib/ai/local-llm-engine";
// hf-vision-gate REMOVED — was downloading ~50MB of WASM models in browser
import { matchProtocols } from "../orion-voice-protocols";

// ═══ PRE-COMPILED REGEXES FOR PERFORMANCE ═══
const SENTENCE_END_REGEX = /.*?[.!?…;]+\s/ys;
const LONG_CLAUSE_REGEX = /.{40,}?,\s/y;
const YOUTUBE_DOMAIN_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/i;
const URL_DOMAIN_REGEX = /https?:\/\/[^\s]+/i;

const HEARING_CHECK_PATTERNS = /\b(voc[eê]\s+consegue\s+me\s+ouvir|voc[eê]\s+me\s+ouve|t[aá]\s+me\s+ouvindo|est[aá]\s+me\s+ouvindo|consegue\s+me\s+escutar|me\s+escuta)\b/i;
const SELF_IDENTITY_PATTERNS = /\b(quem\s+[eé]\s+voc[eê]|qual\s+[eé]\s+o\s+seu\s+nome|sua\s+personalidade|seu\s+signo|sua\s+hist[óo]ria|o\s+que\s+[eé]\s+voc[eê]|quando\s+voc[eê]\s+nasceu|conte\s+sobre\s+voc[eê]|fale\s+sobre\s+voc[eê]|fala\s+sobre\s+voc[eê]|me\s+conta(?:\s+um\s+pouco)?\s+sobre\s+voc[eê]|me\s+fala(?:\s+um\s+pouco)?\s+sobre\s+voc[eê])\b/i;
const CONVERSATIONAL_COMPLAINT_PATTERNS = /\b(ent[aã]o|cara|mano|tu|voc[eê]|c[eê])\b.*\b(n[aã]o\s+me\s+responde|n[aã]o\s+responde|me\s+ignora|n[aã]o\s+entende|n[aã]o\s+capta|n[aã]o\s+peg[ao]|s[oó]\s+peg[ao]\s+duas?|tr[eê]s\s+palavras|frase\s+inteira|t[aá]\s+me\s+tirando|arquivo\s+srfx|srfx)\b/i;
const VOICE_FAST_SHORTCUT_REGEX = /^(?:oi|ol[áa]|ola|opa|ei|hey|e\s*aí|e\s*ai|fala|bom\s+dia|boa\s+tarde|boa\s+noite|tudo\s+bem|valeu|obrigad[oa]|ok(?:ay)?|certo|beleza|sim|n[aã]o|nao|pode\s+repetir|repete|repita|me\s+ouve|me\s+escuta|t[aá]\s+me\s+tirando|arquivo\s+srfx|srfx)\b/i;
const VOICE_COMPLEXITY_GUARD_REGEX = /\b(quem|qual|quais|como|por\s+que|porque|quando|onde|explica|explique|resuma|resume|analisa|analise|compare|detalha|detalhe|contexto|mem[óo]ria|hist[óo]rico|base|conteúdo|documento|contrato|lei|artigo|processo|cliente|jules|pentagon|pentagol|rede\s+neural)\b/i;
const EXPLICIT_VISUAL_PATTERNS = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+vendo|v[eê]|v[êe] na c[aâ]mera)|o\s+que\s+tem\s+(na\s+frente|a[ií]|aqui)|descrev[ae]|s\s+mostre\s+o\s+que\s+v[eê]|analise\s+(a\s+)?(imagem|cena|ambiente|o\s+que\s+v[eê])|me\s+mostre\s+o\s+que\s+v[eê]|analise\s+(a\s+)?(imagem|cena|c[aâ]mera)|leia\s+(o\s+)?texto\s+(da\s+)?(imagem|c[aâ]mera)|identifique\s+(o\s+)?(objeto|rosto|texto)|quantos?\s+[^.?!]*\s+(tem|h[aá]))\b/i;
const IMAGE_GEN_PATTERNS = /\b(gere?\s+(uma?\s+)?imagem|crie?\s+(uma?\s+)?imagem|desenh[ae]|ilustr[ae]|gerar?\s+foto|cri[ae]\s+(uma?\s+)?ilustra[çc][aã]o|generate\s+(an?\s+)?image|draw|create\s+(an?\s+)?image|make\s+(an?\s+)?image|paint|sketch)\b/i;
const WEB_SEARCH_PATTERNS = /\b(hoje|atual|atualmente|recente|notícia|preço\s+d[eoa]|cotação|quem\s+é|quando\s+(foi|será|é)|onde\s+fica|resultado\s+d[eoa]|placar|eleição|último|última|novo\s+|nova\s+|2024|2025|2026|tempo\s+(em|na|no)|clima|previsão|lançamento|estreia|pesquis[ae]\s+na\s+web|busca\s+na\s+internet|search\s+for|look\s+up|news|current|latest|trending)\b/i;
const AUTO_CONSTRUCT_VERB_PATTERNS = /\b(crie?|gere?|implemente?|desenvolv[ae]|programe?|codifique|escreva|refatore?|monte|construa)\b/i;
const AUTO_CONSTRUCT_ARTIFACT_PATTERNS = /\b(c[óo]digo|fun[çc][ãa]o|endpoint|api|componente|tabela|migra[çc][ãa]o|script|arquivo|classe|hook|rota|p[áa]gina|feature|bot[aã]o|integra[çc][ãa]o|edge\s*function)\b/i;
const SELF_EVOLVE_VERB_PATTERNS = /\b(melhore-se|melhore\s+se|evolua|evolu[íi]r?|auto[-\s]?evolu[íi]r?|auto[-\s]?program[ae]|se\s+reprogram[ae]|recalibre|se\s+calibre|se\s+atualize|upgrade)\b/i;
const SELF_EVOLVE_TARGET_PATTERNS = /\b(seu\s+c[óo]digo|seus?\s+protocolos?|suas?\s+respostas?|você\s+mesmo|voc[eê]\s+mesmo|a\s+si\s+mesmo|se)\b/i;

const VERB_IDENTIFY = /\b(identific[ãa]r?|identifique|identify|reconhe[cç][ãa]o|reconozc[ãa]|identificar?)\b/i;
const VERB_ANSWER = /\b(respond[ãa]r?|me\s+respond[ãa]o|me\s+diz|me\s+fal[ãa]o|me\s+cont[ãa]o|answer|tell\s+me|explain|reply)\b/i;
const VERB_ANALYZE = /\b(analis[ãa]r?|analise|analy[sz]e|evaluat[ãa]o|examinar?)\b/i;
const VERB_CHECK = /\b(verific[ãa]r?|verifique|checar?|confir[aem]r?|check|verify)\b/i;
const VERB_SEARCH = /\b(pesquis[ãa]r?|busc[ãa]r?|procur[ãa]r?|google|search|look\s+up|find)\b/i;
const VERB_COMPARE = /\b(compar[ãa]r?|diferença\s+entre|versus|vs\b|melhor\s+entre)\b/i;
const VERB_REFLECT = /\b(reflita|pens[ãa]s\s+sobre|consider[ãa]o|raciocin[ãa]o|reason|think\s+about|ponderar)\b/i;

const STRONG_VISUAL_ANCHORS = /\b(segurando|usando|vestindo|mostr[ae]|aparência|rosto|cor\b|enxerg|olh[ae]|vê|vejo|vendo|câmera|imagem|foto|holding|wearing|showing|face|camera|image|photo)\b/i;
const BODY_REF = /\b(mão|mãos|dedo|braço|cabeça|rosto|olho|boca|cabelo|roupa|camisa|camiseta|óculos|chapéu|caneca|copo|garrafa|hand|finger|arm|head|eye|mouth|hair|shirt|glasses|hat|cup|bottle)\b/i;
const DEICTIC_PATTERNS = /\b(isso|isto|esse|essa|aquilo|aqui|ali|lá|aí|aquel[ea]s?|this|that|these|those|here|there|esto|eso|aquello)\b/i;

const STRONG_TEXTUAL = /\b(que dia|que horas|hora|data de hoje|capital d[aoe]|piada|conta uma|explica|defin[ie]|signific|quem é|quem foi|quanto é|calcul|agenda|prazo|processo|cliente|documento|resumo|traduz|como funciona|o que é|por que|quando foi|onde fica|qual é|quais são|previsão|temperatura|clima|tempo|notícia|cotação|dólar|euro|bitcoin|what time|what day|capital of|joke|explain|define|meaning|who is|how much|calculate|schedule|deadline|summary|translate|how does|what is|why|when|where|which)\b/i;
const KNOWLEDGE_PATTERNS = /\b(histór|ciência|matemática|física|química|política|economi|filosofi|programa[çc]ão|código|lei\b|artigo\b|jurisprudência|direito|constitui[çc]|penal|trabalhist|contrato|clt|cdc|lgpd|recurso|habeas|mandado|sentença|acórdão|súmula|tribunal|stf|stj|indenizaç|prescriç|responsabilidade\s*civil|tutela|execuç|licitaç|improbidade|tributári)\b/i;
const CONVERSATIONAL_PATTERNS = /\b(opini[ãa]o|acha\s+que|concorda|discorda|argumento|debate|sugir[ãa]o|recomend|aconselh|orienta[çc]ã|estrat[ée]gia|planej|organiz|prioriz|importa\b|melhor\s+forma|como\s+(posso|devo|faz)|me\s+ajud|preciso\s+de|tenho\s+que|deveria|poderia|gostaria|queria)\b/i;
const EMOTIONAL_PATTERNS = /\b(sinto|sentindo|triste|feliz|ansios|preocupad|estressad|frustrad|animad|chateado|confus[oa]|nervos[oa]|calm[oa]|motiv|desanima|angústi|med[oa]|raiva|alegr|satisf)\b/i;

export function shouldUseVoiceFastShortcut(question: string): boolean {
  const normalized = question.trim();
  if (!normalized) return true;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (normalized.length > 24 || words.length > 4) return false;
  if (/[,:;]/.test(normalized) || VOICE_COMPLEXITY_GUARD_REGEX.test(normalized)) return false;
  return VOICE_FAST_SHORTCUT_REGEX.test(normalized);
}

// ═══ Build local detections from client-side vision data ═══
export function buildLocalDetections(): Record<string, unknown> | undefined {
  try {
    const vs = getVS();
    if (!vs) return undefined;
    const regions = vs.regions || [];
    const motion = vs.motion;
    const faces = regions.filter(r => r.category === "face");

    // ═══ YOLO FrameX Multi-Task Vision ═══
    const multiTask = (vs as any).multiTaskResult;
    const rtv = vs.realTimeVision;
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
      const sc = (vs as any).sceneContext;
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
      const detectedFaces = (vs as any).detectedFaces;
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

    // ═══ Face API detection (emotional) ═══
    let faceApiData: any | undefined;
    try {
      const faceApi = (vs as any).faceApiDetection;
      if (faceApi && faceApi.detections?.length > 0) {
        faceApiData = {
          count: faceApi.detections.length,
          emotions: faceApi.detections.slice(0, 3).map((d: any) => ({
            bbox: { x: Math.round(d.x), y: Math.round(d.y), w: Math.round(d.width), h: Math.round(d.height) },
            expressions: d.expressions,
          })),
        };
      }
    } catch {}

    // ═══ Pose detection ═══
    let poseData: any | undefined;
    try {
      const pose = (vs as any).poseDetection;
      if (pose && pose.keypoints?.length > 0) {
        poseData = {
          keypoints: pose.keypoints.length,
          confidence: pose.score || 0.7,
        };
      }
    } catch {}

    // ═══ Hand gestures ═══
    let gestureData: any | undefined;
    try {
      const gestures = (vs as any).handGestures;
      if (gestures && gestures.length > 0) {
        gestureData = {
          count: gestures.length,
          gestures: gestures.slice(0, 3).map((g: any) => ({
            type: g.type,
            confidence: g.confidence,
          })),
        };
      }
    } catch {}

    // ═══ Image quality from vision pipeline ═══
    let qualityData: any | undefined;
    try {
      const iq = (vs as any).imageQuality;
      if (iq) {
        qualityData = {
          sharpness: iq.sharpness,
          brightness: iq.brightness,
          contrast: iq.contrast,
        };
      }
    } catch {}

    return {
      realTimeObjects, realTimeFaces, realTimeHands, sceneClassification,
      readingResult, movementAnalysis, faceDetectionData,
      faceApiData, poseData, gestureData, qualityData,
    };
  } catch (err) {
    console.warn("[LocalDetection] Error:", err);
    return undefined;
  }
}

export interface AIAnalysisResult {
  description: string | null;
  learnedFacts: string[];
  identifiedObjects: Array<{ name: string; category: string; confidence: number; count: number; position?: string; distance?: string }>;
}

/**
 * analyzeFrameWithAI - Non-streaming vision analysis
 * Uses Gemini Vision API for object detection and scene understanding
 */
export async function analyzeFrameWithAI(
  canvas: HTMLCanvasElement | null, context?: string, question?: string,
  chatHistory?: Array<{ role: string; text: string }>, includeImage: boolean = true, identificationMode: string = "universal",
  intentType: "visual" | "textual" | "mixed" | "web_search" | "url_analysis" | "youtube_summary" | "image_generation" = "mixed"
): Promise<AIAnalysisResult> {
  try {
    if (question?.trim()) {
      pushToWorkingMemory(question, "user_intent", 0.92, { source: includeImage ? "vision" : "chat", intentType });
    }

    // ═══ PROGRESSIVE LEARNING: Check if we can identify locally first ═══
    if (includeImage && canvas && intentType === "visual") {
      try {
        const shapes: any[] = [];
        if (shapes.length > 0) {
          const { allLocal, localMatches } = canIdentifyLocally(shapes);
          if (allLocal && localMatches.length > 0) {
            const stats = getLearningStats();
            console.log(`[OrionAI] 📚 LOCAL IDENTIFICATION (no API!) — ${localMatches.length} objects recognized from ${stats.totalObservations} total observations`);
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
    if (isLocalFirstMode() && intentType !== "visual" && question) {
      try {
        const localAvailable = await isLocalEngineAvailable();
        if (localAvailable) {
          const localResult = await generateLocalResponse(question, context, chatHistory);
          return { description: localResult.text, learnedFacts: [], identifiedObjects: [] };
        }
      } catch (e) {
        console.warn("[OrionAI] Local non-streaming failed, falling back to cloud:", e);
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
      const isIdentityQuestion = question && /\b(quem\s+(te\s+cri|[eé]\s+voc[eê])|([eé]\s+voc[eê]\s+)?fez|fez\s+(voc[eê]|isso)|(criador|dono|proprietário|proprietario)|who\s+(made|created|are)\s+you)\b/i.test(question);
      const isGenesisQuestion = question && /\b(g[êe]nesis|genesis|projeto\s+g[êe]nesis|protocolo\s+g[êe]nesis|como\s+(voc[eê]\s+)?nasceu|sua\s+origem|como\s+foi\s+criado|in[íi]cio\s+da\s+(cria[çc][ãa]o|programa[çc][ãa]o))\b/i.test(question);
      const isCapabilityQuestion = question && /\b(que\s+(sistema|m[óo]dulo)|capacid[ae]|funcionalidade)|o\s+que\s+(falta|precisa|melhorar)|suas?\s+(limita[çc][õo]es|lacunas|gaps)|what.*(missing|need|improve|lack)\b/i.test(question);
      const isJarvisComparison = question && /\bjarvis|compar[çc][ãa]o|diferen[çc]a.*entre|vs\s+orion|orion\s+vs|superior|vantagem\b/i.test(question);
      const isInvestorQuestion = question && /\binvestidor|investimento|mercado|saas|modelo\s+de\s+neg[óo]cio|receita|margem|oportunidade|pitch\b/i.test(question);
      const isProjectQuestion = question && /\bprojeto|plataforma|orion.*sistema|ferramenta|evolu[çc][ãa]o|timeline|desenvolvimento\b/i.test(question);
      const isHelpQuestion = question && /\bcomando|como\s+faz|onde\s+fica|central\s+de\s+ajuda|instru[çc][ãa]o|tutorial|orienta[çc][ãa]o\b/i.test(question);
      const isProposalQuestion = question && /\bproposta|proposal|apresenta[çc][ãa]o|pitch.*invest|investir\b/i.test(question);
      const isNavigationGuide = question && /\bonde\s+(fica|est[áa]|acess)|como\s+(chego|acesso|fa[çc]o\s+para)|me\s+lev|navegar|ir\s+(para|pra)|encontrar|acessar\b/i.test(question);
      const isLegalQuestion = question && /\b(jur[íi]dic|direito|penal|c[íi]vel|civil|trabalhist|contrato|recurso|apela[çc][ãa]o|agravo|embargo|habeas|mandado|peti[çc][ãa]o|contesta[çc][ãa]o|execu[çc][ãa]o|senten[çc]a|processo|tribunal|vara|prazo|audiencia|audi[êe]ncia|pe[çc]a processual|fundamenta[çc][ãa]o|jurisprud[êe]ncia|legisl[çc][ãa]o|lei\s+\d|artigo\s+\d|c[óo]digo|CPC|CPP|CLT|CC\b|CP\b|STF|STJ|TST|TJ\b)\b/i.test(question);
      const isBusinessQuestion = question && /\bcapta[çc][ãa]o|recurso.*europ|recursos?\s+eu\b|cordis|horizon|LOI|MOU|term.?sheet|joint.?venture|due.?diligence|supply.?agreement|NDA|parceria.*internac|distribui[çc][ãa]o.*internac|compliance|GDPR|LGPD|AML|KYC|empresarial|neg[óo]cio|comercial.*internac|exporta[çc][ãa]o|importa[çc][ãa]o|invoice|proforma\b/i.test(question);
      const isCRMQuestion = question && /\bcadastr|cliente|CRM|pipeline|lead|contato|oportunidade|deal|neg[óo]cio|como\s+(cadastr|registr|adicionar)|gerenciar\s+(cliente|contato|processo)\b/i.test(question);
      const isInternetToolsQuestion = question && /\binternet|firecrawl|raspag|scraping|scrape|extrair?\s+dados|raspar|crawl|busca\s+web|pesqui.*online|pesquis.*internet|acesso.*web|conect.*internet|google\s*(workspace|gmail|calendar|drive|sheets|docs|tasks|slides|forms|chat|vision|analytics|bigquery|contacts|agenda)|email.*google|meus?\s+emails?|enviar?\s+email|compromisso|agendar?\s+reuni|listas?\s+de\s+tarefa|que\s+(ferramenta|acesso|conex[ãa]o|integra[çc][ãa]o)|o\s+que\s+(voc[eê]\s+)?pode|suas?\s+capacidade|quais?\s+(ferramentas|sistema|acesso)\b/i.test(question);

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
        const isGenesisProject = question && /\b(g[êe]nesis|genesis|origem|nasceu|cria[çc][ãa]o)\b/i.test(question);
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
    if (data?.description) {
      pushToWorkingMemory(data.description, "ai_response", 0.78, { source: includeImage ? "vision" : "chat", intentType });
    }

    // ═══ PROGRESSIVE LEARNING: Learn from Gemini Flash detections ═══
    if (data?.identifiedObjects?.length > 0) {
      try {
        // Extract shape descriptors from the current canvas
        const shapes: any[] = [];
        const descriptor = shapes.length > 0 ? shapes[0] : getVS()?.shapeDescriptors?.[0];
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

/**
 * analyzeFrameStreaming - Streaming vision analysis with token/sentence callbacks
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
    // ═══ LOCAL-FIRST MODE ═══
    // Skip local LLM for fast-mode queries (SmolLM2-360M is too slow/imprecise for knowledge questions)
    // Only use local LLM for deep/visual queries where latency is acceptable
    const cognitiveMode = (window as any).__cognitiveMode || "fast";
    if (isLocalFirstMode() && intentType !== "visual" && cognitiveMode === "deep") {
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
              const cleaned = s.trim().replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "").trim();
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
    }

    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      const cw = canvas.width || 0;
      const ch = canvas.height || 0;
      if (cw > 0 && ch > 0) {
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = Math.min(cw, 640);
        tempCanvas.height = Math.min(ch, 480);
        const tCtx = tempCanvas.getContext("2d");
        if (!tCtx) return { description: null, learnedFacts: [], identifiedObjects: [] };
        tCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
        imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.7).split(",")[1];
        console.log(`[OrionAI] Stream frame: ${tempCanvas.width}x${tempCanvas.height}, len=${imageBase64?.length || 0}`);
      }
    }

    // ═══ Pentagon Pizza — unified consciousness pre-pass ═══
    let pentagonContext = "";
    try {
      const user = await getCachedAuthUser();
      pentagonContext = await buildPentagonPromptContext(
        question,
        [context, ...(chatHistory?.slice(-4).map(msg => `${msg.role}: ${msg.text}`) || [])].filter(Boolean).join("\n"),
        intentType
      );
    } catch {}

    // ═══ PERF FIX: buildLocalDetections only ONCE ═══
    const localDetections = buildLocalDetections();

    // Quantum LLM Routing
    const routing = quantumRouteQuery(question);
    const routingHead = formatQuantumRoutingForAI(routing);

    // Build Cognition & Adaptive PNL Head
    const [cognition, pnlHead] = await Promise.all([
      buildCognitionContext(question, chatHistory, intentType),
      Promise.resolve(getAdaptiveNeurolinguisticHead(question, buildWorkingMemoryPrompt())),
    ]);

    // Execute Hybrid Corrective RAG
    const crag = await executeCorrectiveRAG({
      query: question,
      context,
      userId: (await getCachedAuthUser())?.id || "anonymous",
      forceWebSearch: intentType === "web_search"
    });

    // Mamba Long-Context Compression
    const compressedContext = summarizeLongContextMamba(crag.finalContext);

    // Build Final Prompt — Pentagon outputs FIRST (highest priority)
    const wmPrompt = buildWorkingMemoryPrompt();
    const enrichedContext = [
      pentagonContext,     // 🍕 Unified pentagon context (Governance + Hint + RAG + Trail)
      routingHead,
      pnlHead,
      cognition.contextString,
      compressedContext,
      wmPrompt,
      getUserMemory().slice(0, 15).join("\n")
    ].filter(Boolean).join("\n\n");

    // Build fetch options with AbortController
    const fetchOptions: RequestInit = {};
    if (signal) fetchOptions.signal = signal;

    // Invoke streaming LLM
    let accumulated = "";
    let spokenUpTo = 0;
    const startTime = Date.now();
    const SENTENCE_END_REGEX_COPY = /.*?[.!?…;]+\s/ys;
    const LONG_CLAUSE_REGEX_COPY = /.{40,}?,\s/y;

    try {
      const data = await wrapEdgeFunction(
        supabase.functions.invoke("neural-ops", {
          body: {
            question,
            context: enrichedContext,
            chatHistory: chatHistory.slice(-5),
            intentType,
            userName: (await getCachedAuthUser())?.email || "Usuário",
            userId: (await getCachedAuthUser())?.id || "anonymous",
            provider: routing.selectedProvider.id,
            imageBase64,
            localDetections,
            identityStatus: getCachedVoiceIdentity() || undefined,
          }
        }),
        "neural-ops",
        { intentType }
      );

      if (!data) return { description: null, learnedFacts: [], identifiedObjects: [] };

      // Streaming simulation — split response into sentences
      accumulated = data.content || "";
      if (accumulated) {
        onToken(accumulated);
        pushToWorkingMemory(accumulated, "ai_response", 0.78, { source: "streaming", intentType });

        // Emit complete sentences for TTS
        try {
          let match;
          SENTENCE_END_REGEX_COPY.lastIndex = spokenUpTo;
          while ((match = SENTENCE_END_REGEX_COPY.exec(accumulated)) !== null) {
            const sentence = stripMarkdown(match[0]);
            if (sentence && !sentence.startsWith("```") && sentence.length > 2) {
              onSentence(sentence);
            }
            spokenUpTo = SENTENCE_END_REGEX_COPY.lastIndex;
          }

          // Handle long clauses without sentence-ending punctuation
          if (accumulated.length - spokenUpTo > 80) {
            LONG_CLAUSE_REGEX_COPY.lastIndex = spokenUpTo;
            match = LONG_CLAUSE_REGEX_COPY.exec(accumulated);
            if (match) {
              const sentence = stripMarkdown(match[0]);
              if (sentence && !sentence.startsWith("```") && sentence.length > 2) {
                onSentence(sentence);
                spokenUpTo = LONG_CLAUSE_REGEX_COPY.lastIndex;
              }
            }
          }
        } catch (parseErr) {
          // Partial JSON across chunks — will be retried with more data
        }
      }

      return { description: accumulated, learnedFacts: [], identifiedObjects: [] };
    } catch (err: any) {
      if (accumulated.length > 20) {
        onToken(accumulated);
        const remaining = accumulated.slice(spokenUpTo).trim();
        if (remaining && !remaining.startsWith("```") && !remaining.startsWith("{")) {
          onSentence(remaining.replace(/```json[\s\S]*?```/g, "").replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "").trim());
        }
      }
      throw err;
    }
  } catch (err: any) {
    console.warn("[OrionAI] Streaming error:", err?.message);
    return { description: null, learnedFacts: [], identifiedObjects: [] };
  }
}

/**
 * 🍕 PENTAGON PIZZA — Unified consciousness pre-pass.
 * Mandatório e síncrono para garantir governança e alinhamento do orquestrador.
 */
export async function buildPentagonPromptContext(question: string, wmContext: string, intent: string): Promise<string> {
  try {
    const user = await getCachedAuthUser();
    const { getPentagonOrchestrator } = await import("../../../core/pentagon");
    const cortex = getPentagonOrchestrator();

    // 🍕 Síncrono e obrigatório para tarefas cognitivas
    const actionResult = await cortex.runCycle(question, { userId: user?.id || "anonymous", wmContext, intent });

    const state = cortex.getState();
    const reasoning: any = state.reasoning || {};
    const memory: any = state.memory || {};
    const perception: any = state.perception || {};

    if (state.action?.data?.fastLane) return "";

    const blocks: string[] = [];

    // 🍕 Strict Governance Prompt: Prohibit generation from scratch
    blocks.push(
      "═══ DIRETRIZ DE GOVERNANÇA ═══\n" +
      "Você é o Gerador Final de uma arquitetura de dois estágios. " +
      "Sua única função é expandir e refinar o RASCUNHO DO LOBO FRONTAL fornecido abaixo. " +
      "PROIBIÇÃO: Não ignore o rascunho nem gere uma resposta do zero. " +
      "Se houver FONTES INGERIDAS, você DEVE citá-las usando [1], [2], etc."
    );

    // 1. responseHint = frontal lobe draft → HIGHEST priority for the LLM
    if (typeof reasoning.responseHint === "string" && reasoning.responseHint.trim().length > 0) {
      blocks.push(
        `═══ RASCUNHO DO LOBO FRONTAL (OBRIGATÓRIO: Use como base exclusiva) ═══\n${reasoning.responseHint.trim()}`,
      );
    } else if (actionResult.success && actionResult.output) {
       // If reasoning failed but action had output (e.g. tool enforcement)
       blocks.push(`═══ DADOS DA FERRAMENTA (Use para responder) ═══\n${actionResult.output}`);
    }

    // 2. RAG snippets — cite directly
    if (Array.isArray(memory.ragSnippets) && memory.ragSnippets.length > 0) {
      const cited = memory.ragSnippets
        .slice(0, 5)
        .map((s: string, i: number) => `[${i + 1}] ${s.slice(0, 600)}`)
        .join("\n\n");
      blocks.push(`═══ FONTES INGERIDAS (CITE OBRIGATORIAMENTE) ═══\n${cited}`);
    }

    // 3. Reasoning trail
    const trail: string[] = [];
    if (perception.intent) trail.push(`Intento: ${perception.intent}`);
    if (Array.isArray(reasoning.plan) && reasoning.plan.length > 0) {
      trail.push(`Plano: ${reasoning.plan.slice(0, 5).join(" → ")}`);
    }
    if (reasoning.rationale) trail.push(`Raciocínio: ${String(reasoning.rationale).slice(0, 400)}`);
    if (trail.length) blocks.push(`═══ CADEIA DE PENSAMENTO ═══\n${trail.join("\n")}`);

    // 4. Memory context (truncated, fallback)
    if (memory.mergedContext && (!memory.ragSnippets || memory.ragSnippets.length === 0)) {
      blocks.push(`═══ MEMÓRIA INTEGRADA ═══\n${String(memory.mergedContext).slice(0, 800)}`);
    }

    if (typeof window !== "undefined") {
      (window as any).__pentagonLastHint = reasoning.responseHint || null;
      (window as any).__pentagonLastModel = reasoning.model || null;
    }

    return blocks.length > 0 ? blocks.join("\n\n") : "";
  } catch (error) {
    console.error("[Pentagon] Critical loop failed in context builder:", error);
    return "ERRO DE GOVERNANÇA: Falha no loop cognitivo. Por favor, tente novamente.";
  }
}
