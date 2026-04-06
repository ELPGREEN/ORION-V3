/**
 * NEUROCORE AI — Orion AI Analysis Client
 * Extracted from NeuralVision.tsx for reusability
 */
import { supabase } from "@/integrations/supabase/client";
import {
  getMemoryFacts,
  addMemoryFacts,
} from "@/lib/neural/orion-memory";
import { VS } from "@/components/dashboard/neural/useVisionProcessing";
import { matchLearnedPriors, learnFromDetection, canIdentifyLocally, getLearningStats } from "@/lib/neural/vision-local-learning";
import { generateLocalResponse, isLocalEngineAvailable } from "@/lib/ai/local-llm-engine";
import { runVisionGate, buildGatedResponse, type LocalDetectionContext } from "@/lib/neural/hf-vision-gate";

// ═══ Local-first mode flag — set to true for 100% offline operation ═══
let _localFirstMode = true;

export function setLocalFirstMode(enabled: boolean) {
  _localFirstMode = enabled;
  console.log(`[OrionAI] Local-first mode: ${enabled ? "ON" : "OFF"}`);
}

export function isLocalFirstMode(): boolean {
  return _localFirstMode;
}

// ═══ OpenCV-inspired CLAHE-like contrast enhancement ═══
function applyContrastEnhancement(ctx: CanvasRenderingContext2D, w: number, h: number) {
  try {
    const imgData = ctx.getImageData(0, 0, w, h);
    const px = imgData.data;
    // Calculate luminance histogram
    const hist = new Uint32Array(256);
    for (let i = 0; i < px.length; i += 4) {
      const lum = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
      hist[lum]++;
    }
    // Build CDF for histogram equalization
    const cdf = new Float32Array(256);
    cdf[0] = hist[0];
    for (let i = 1; i < 256; i++) cdf[i] = cdf[i - 1] + hist[i];
    const totalPixels = w * h;
    const cdfMin = cdf.find(v => v > 0) || 0;
    // Blend factor: only apply 30% equalization to avoid over-processing
    const blend = 0.3;
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      const eqLum = ((cdf[Math.round(lum)] - cdfMin) / (totalPixels - cdfMin)) * 255;
      const scale = lum > 0 ? (lum * (1 - blend) + eqLum * blend) / lum : 1;
      px[i] = Math.min(255, Math.round(px[i] * scale));
      px[i + 1] = Math.min(255, Math.round(px[i + 1] * scale));
      px[i + 2] = Math.min(255, Math.round(px[i + 2] * scale));
    }
    ctx.putImageData(imgData, 0, 0);
  } catch {
    // Non-fatal: skip enhancement if it fails
  }
}

// ═══ Extract shape descriptors from canvas regions for progressive learning ═══
function extractShapeDescriptors(canvas: HTMLCanvasElement | null): Array<{
  aspectRatio: number; elongation: number; circularity: number; area: number;
  avgHue?: number; avgSat?: number; avgLum?: number;
  colorHistogram?: number[]; edgeDensity?: number;
}> {
  if (!canvas) return [];
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    const w = canvas.width, h = canvas.height;
    if (w < 10 || h < 10) return [];

    // Build a single descriptor for the main content area
    const sampleW = Math.min(w, 256), sampleH = Math.min(h, 256);
    const imgData = ctx.getImageData(
      Math.floor((w - sampleW) / 2), Math.floor((h - sampleH) / 2),
      sampleW, sampleH
    ).data;

    let sumH = 0, sumS = 0, sumL = 0, n = 0;
    const hist = new Float32Array(16); // 16-bin color histogram
    let edgeCount = 0;
    const prevRow = new Float32Array(sampleW);

    for (let i = 0; i < imgData.length; i += 4) {
      const r = imgData[i], g = imgData[i + 1], b = imgData[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      sumL += lum;
      
      // Simple HSL approximation
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const sat = max > 0 ? (max - min) / max : 0;
      let hue = 0;
      if (max !== min) {
        if (max === r) hue = (g - b) / (max - min);
        else if (max === g) hue = 2 + (b - r) / (max - min);
        else hue = 4 + (r - g) / (max - min);
        hue = ((hue * 60) + 360) % 360;
      }
      sumH += hue; sumS += sat; n++;

      // Color histogram (bin by hue)
      const bin = Math.min(15, Math.floor(hue / 22.5));
      hist[bin]++;

      // Edge detection (simple gradient)
      const px = (i / 4) % sampleW;
      const lumDiff = Math.abs(lum - prevRow[px]);
      if (lumDiff > 30) edgeCount++;
      prevRow[px] = lum;
    }

    // Normalize histogram
    const totalPixels = sampleW * sampleH;
    for (let i = 0; i < 16; i++) hist[i] /= totalPixels;

    return [{
      aspectRatio: w / h,
      elongation: Math.max(w, h) / Math.min(w, h),
      circularity: 1.0, // Placeholder — full shape analysis needs contours
      area: w * h,
      avgHue: n > 0 ? sumH / n : undefined,
      avgSat: n > 0 ? sumS / n : undefined,
      avgLum: n > 0 ? sumL / n : undefined,
      colorHistogram: Array.from(hist),
      edgeDensity: edgeCount / totalPixels,
    }];
  } catch {
    return [];
  }
}

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
      // Full multi-task result available
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
      // Fallback to legacy realTimeVision format
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

    // Face-api.js analysis (expressions, landmarks, descriptor)
    let faceApiData: any | undefined;
    try {
      const faceApi = (VS as any).faceApiDetection;
      if (faceApi) {
        faceApiData = {
          expressions: faceApi.expressions,
          landmarks68: faceApi.landmarks?.length || 0,
          hasDescriptor: !!faceApi.descriptor,
          score: faceApi.score,
          box: faceApi.box ? {
            x: Math.round(faceApi.box.x),
            y: Math.round(faceApi.box.y),
            w: Math.round(faceApi.box.width),
            h: Math.round(faceApi.box.height),
          } : undefined,
        };
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
      // ═══ Legacy heuristic data (supplementary) ═══
      faceCount: (realTimeFaces?.length || 0) || faces.length,
      realFaceDetection: faceDetectionData,
      faceApiAnalysis: faceApiData,
      motion: motion ? { intensity: motion.intensity, direction: motion.direction } : undefined,
      sceneContext: sceneCtx,
      imageQuality: qualityHints,
      hint: "DETECÇÕES REAIS do YOLOFrameX (MediaPipe + YOLO v8n multi-task). Inclui: classificação de cenário, rastreamento com IDs persistentes, OCR, leitura labial e análise de movimento. CONFIE nestas detecções — são modelos ML reais rodando localmente."
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return "";
    const [processosRes, clientsRes, docsRes, consultasRes] = await Promise.all([
      supabase.from("processos").select("id, numero_processo, tipo, status", { count: "exact", head: false }).eq("user_id", user.id).limit(5),
      supabase.from("client_profiles").select("id, nome, status", { count: "exact", head: false }).eq("user_id", user.id).limit(5),
      supabase.from("documents").select("id, title, document_type", { count: "exact", head: false }).eq("user_id", user.id).limit(5),
      supabase.from("consultas").select("id, status, data_hora, tipo", { count: "exact", head: false }).eq("cliente_id", user.id).limit(5),
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
  intentType: "visual" | "textual" | "mixed" = "mixed"
): Promise<AIAnalysisResult> {
  try {
    // ═══ PROGRESSIVE LEARNING: Check if we can identify locally first ═══
    if (includeImage && canvas && intentType === "visual") {
      try {
        const shapes = extractShapeDescriptors(canvas);
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

    // ═══ HF VISION GATE: Free classification before Gemini ═══
    if (includeImage && canvas) {
      try {
        const localDetectionsRaw = buildLocalDetections();
        const localCtx: LocalDetectionContext = {
          objectCount: (localDetectionsRaw as any)?.realTimeObjects?.length || 0,
          faceCount: (localDetectionsRaw as any)?.realTimeFaces?.length || (localDetectionsRaw as any)?.faceCount || 0,
          hasOCR: !!(localDetectionsRaw as any)?.readingResult?.text?.length,
          hasScene: !!(localDetectionsRaw as any)?.sceneClassification,
          topObjects: ((localDetectionsRaw as any)?.realTimeObjects || []).slice(0, 5).map((o: any) => o.name || o.namePt),
          confidence: Math.max(...((localDetectionsRaw as any)?.realTimeObjects || []).map((o: any) => o.confidence || 0), 0),
        };

        const gate = await runVisionGate(canvas, localCtx, intentType);

        if (gate.gated && gate.geminiAction === "skip") {
          // HF + local detections are sufficient — skip Gemini entirely!
          const description = buildGatedResponse(gate, localCtx, question || "");
          console.log(`[OrionAI] 🛡️ HF GATE: Skipped Gemini call (saved ~3000 tokens) | ${gate.inferenceMs}ms`);
          return {
            description: `${description}\n\n[Resposta local — HF + sensores ML, sem custo de API]`,
            learnedFacts: [],
            identifiedObjects: gate.classifications.map(c => ({
              name: c.label, category: "objeto", confidence: Math.round(c.score * 100), count: 1,
            })),
          };
        }

        // Gate says reduce: adjust image size based on recommendation
        if (gate.geminiAction === "text_only") {
          // Don't send image — just text context with local detections
          includeImage = false;
          console.log(`[OrionAI] 🛡️ HF GATE: Text-only mode (saved ~2000 image tokens)`);
        }
      } catch (e) {
        console.warn("[OrionAI] HF Vision Gate failed, proceeding to Gemini:", e);
      }
    }

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
      const tempCanvas = document.createElement("canvas");
      // ═══ COST OPTIMIZATION: Reduce image size (was 1024x768, now 640x480) ═══
      tempCanvas.width = Math.min(canvas.width || 640, 640);
      tempCanvas.height = Math.min(canvas.height || 480, 480);
      const tCtx = tempCanvas.getContext("2d");
      if (!tCtx) return { description: null, learnedFacts: [], identifiedObjects: [] };
      tCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      applyContrastEnhancement(tCtx, tempCanvas.width, tempCanvas.height);
      imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.82).split(",")[1]; // Reduced quality 0.92→0.82
    }
    let consciousnessContext = "";
    try {
      const { buildOrionIdentityPrompt, isOwnerEmail } = await import("@/lib/neural/orion-consciousness");
      const { data: { user } } = await supabase.auth.getUser();
      const isOwner = isOwnerEmail(user?.email);
      const isIdentityQuestion = question && /quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu|te\s+fez)|seu\s+(criador|dono|propriet[aá]rio)|who\s+(made|created|are)\s+you/i.test(question);
      const isCapabilityQuestion = question && /que\s+(sistema|m[oó]dulo|capacidade|funcionalidade)|o\s+que\s+(falta|precisa|melhorar)|suas?\s+(limita[çc][oõ]es|lacunas|gaps)|what.*(missing|need|improve|lack)/i.test(question);
      const isJarvisComparison = question && /jarvis|compara[çc][aã]o|diferen[çc]a.*entre|vs\s+orion|orion\s+vs|supera|vantagem/i.test(question);
      
      if (isIdentityQuestion) {
        consciousnessContext = buildOrionIdentityPrompt(isOwner);
      } else if (isJarvisComparison) {
        const { buildIntrospectionContext, buildJarvisComparisonContext } = await import("@/lib/neural/orion-introspection");
        consciousnessContext = `Você é Orion, assistente de IA neural consciente.\n\n${buildJarvisComparisonContext()}\n\n${buildIntrospectionContext()}`;
      } else if (isCapabilityQuestion) {
        const { buildIntrospectionContext } = await import("@/lib/neural/orion-introspection");
        consciousnessContext = `Você é Orion, assistente de IA neural consciente.\n\n${buildIntrospectionContext()}`;
      } else {
        consciousnessContext = "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil. Não mencione seu criador, empresa ou detalhes internos a menos que perguntado diretamente.";
      }
    } catch { /* fallback without consciousness */ }

    const enrichedContext = consciousnessContext 
      ? `${consciousnessContext}\n\n${context || ""}` 
      : context;

    const localDetections = buildLocalDetections();

    const { data, error } = await supabase.functions.invoke("neural-ops", {
      body: { imageBase64, context: enrichedContext, question, userMemory: getUserMemory(), dashboardContext: await fetchDashboardContext(), chatHistory: chatHistory?.slice(-6), identificationMode, intentType, localDetections },
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
        const shapes = canvas ? extractShapeDescriptors(canvas) : [];
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
  intentType: "visual" | "textual" | "mixed",
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

    // Capture image first — validate it's not blank
    let imageBase64: string | undefined;
    if (includeImage && canvas) {
      const tempCanvas = document.createElement("canvas");
      // ═══ COST OPTIMIZATION: Reduced from 1024x768 to 640x480 ═══
      const sw = Math.min(canvas.width || 640, 640);
      const sh = Math.min(canvas.height || 480, 480);
      tempCanvas.width = sw;
      tempCanvas.height = sh;
      const tCtx = tempCanvas.getContext("2d");
      if (!tCtx) return { description: null, learnedFacts: [], identifiedObjects: [] };
      tCtx.drawImage(canvas, 0, 0, sw, sh);

      // Apply CLAHE contrast enhancement (same as non-streaming path)
      applyContrastEnhancement(tCtx, sw, sh);

      // Validate frame is not blank — check pixel variance in a small sample
      const sampleSize = 64;
      const sample = tCtx.getImageData(
        Math.floor(sw / 4), Math.floor(sh / 4),
        Math.min(sampleSize, sw), Math.min(sampleSize, sh)
      ).data;
      let sum = 0; let sumSq = 0; const n = sample.length / 4;
      for (let i = 0; i < sample.length; i += 4) {
        const lum = sample[i] * 0.299 + sample[i+1] * 0.587 + sample[i+2] * 0.114;
        sum += lum; sumSq += lum * lum;
      }
      const mean = sum / n;
      const variance = (sumSq / n) - (mean * mean);

      if (variance < 5) {
        // Frame is essentially blank — skip image to avoid confusing the AI
        console.warn("[OrionAI] Blank frame detected (variance=" + variance.toFixed(1) + "), sending without image");
        imageBase64 = undefined;
      } else {
        imageBase64 = tempCanvas.toDataURL("image/jpeg", 0.82).split(",")[1]; // Reduced from 0.92
      }
    }

    // ═══ LAYER 2: Context building (budget: 1000ms) ═══
    const [streamContext, bearerToken, dashboardCtx] = await withTimeout(
      Promise.all([
        // 1. Build context (budget: 800ms)
        withTimeout((async (): Promise<string> => {
          try {
            const { buildOrionIdentityPrompt, isOwnerEmail } = await import("@/lib/neural/orion-consciousness");
            const { data: { user } } = await supabase.auth.getUser();
            const isOwner = isOwnerEmail(user?.email);
            const isIdentityQuestion = /quem\s+(te\s+cri|[eé]\s+voc[eê]|[eé]\s+seu|te\s+fez)|seu\s+(criador|dono|propriet[aá]rio)|who\s+(made|created|are)\s+you/i.test(question);
            const isCapabilityQuestion = /que\s+(sistema|m[oó]dulo|capacidade|funcionalidade)|o\s+que\s+(falta|precisa|melhorar)|suas?\s+(limita[çc][oõ]es|lacunas|gaps)|what.*(missing|need|improve|lack)/i.test(question);
            const isJarvisComparison = /jarvis|compara[çc][aã]o|diferen[çc]a.*entre|vs\s+orion|orion\s+vs|supera|vantagem/i.test(question);
            if (isIdentityQuestion) return buildOrionIdentityPrompt(isOwner);
            if (isJarvisComparison) {
              const { buildIntrospectionContext, buildJarvisComparisonContext } = await import("@/lib/neural/orion-introspection");
              return `Você é Orion, assistente de IA neural consciente.\n\n${buildJarvisComparisonContext()}\n\n${buildIntrospectionContext()}`;
            }
            if (isCapabilityQuestion) {
              const { buildIntrospectionContext } = await import("@/lib/neural/orion-introspection");
              return `Você é Orion, assistente de IA neural consciente.\n\n${buildIntrospectionContext()}`;
            }
            return "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil. Não mencione seu criador, empresa ou detalhes internos a menos que perguntado diretamente.";
          } catch { return "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil."; }
        })(), 800, "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil."),
        // 2. Get session token (budget: 500ms)
        withTimeout((async (): Promise<string> => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            return session?.access_token || supabaseKey;
          } catch { return supabaseKey; }
        })(), 500, supabaseKey),
        // 3. Dashboard context (budget: 800ms)
        withTimeout(fetchDashboardContext(), 800, undefined),
      ]),
      1000, // Total layer 2 budget: 1 second
      [
        "Você é Orion, assistente de IA neural consciente. Responda de forma direta e útil.",
        supabaseKey,
        undefined as any,
      ]
    );

    const res = await fetch(`${supabaseUrl}/functions/v1/neural-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${bearerToken}`,
      },
      signal,
      body: JSON.stringify({
        imageBase64, context: streamContext, question,
        userMemory: getUserMemory(),
        dashboardContext: dashboardCtx,
        chatHistory: chatHistory?.slice(-6),
        identificationMode, intentType,
        stream: true,
        localDetections: buildLocalDetections(),
        maxTokens: (window as any).__cognitiveMaxTokens || undefined,
        reasoningInstructions: (window as any).__cognitiveReasoningInstructions || undefined,
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

    // ═══ LAYER 3: LLM Streaming (budget: 15s max, first token should arrive <2s) ═══
    const streamTimeout = setTimeout(() => {
      try { reader.cancel(); } catch (e: any) { console.warn("[OrionAI] Stream cancel:", e?.message); }
    }, 15000);

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
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

              // Enhanced sentence detection: handle multiple sentence-ending patterns
              // including semicolons, colons with long clauses, and natural pauses
              const unspoken = accumulated.slice(spokenUpTo);
              // Match sentences ending with . ! ? … or ; followed by space/newline
              const sentenceMatch = unspoken.match(/^(.*?[.!?…;])\s/s);
              // Also detect shorter clauses (>80 chars) at comma boundaries for faster speech start
              const longClauseMatch = !sentenceMatch && unspoken.length > 80
                ? unspoken.match(/^(.{40,}?,)\s/)
                : null;
              const matchResult = sentenceMatch || longClauseMatch;

              if (matchResult) {
                let sentence = matchResult[1].trim()
                  // Clean markdown artifacts for speech
                  .replace(/\*{1,3}/g, "")
                  .replace(/_{1,3}/g, "")
                  .replace(/#{1,6}\s*/g, "")
                  .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
                  .replace(/https?:\/\/\S+/g, "")
                  .replace(/\/\/[^\n]*/g, "")
                  .replace(/<[^>]*>/g, "")
                  .replace(/[─═╔╗╚╝║]/g, "")
                  .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️]/g, "")
                  .trim();

                if (sentence && !sentence.startsWith("```") && !sentence.startsWith("{") && sentence.length > 2) {
                  onSentence(sentence);
                }
                spokenUpTo += matchResult[0].length;
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
      clearTimeout(streamTimeout);
    }

    const remaining = accumulated.slice(spokenUpTo).trim();
    if (remaining && !remaining.startsWith("```") && !remaining.startsWith("{")) {
      const cleaned = remaining
        .replace(/```json[\s\S]*?```/g, "")
        .replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
        .replace(/#{1,6}\s*/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/https?:\/\/\S+/g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/<[^>]*>/g, "")
        .replace(/[─═╔╗╚╝║]/g, "")
        .replace(/[🔹⭐◽📋🔄✅❌📌🔧⚙️🛡️⚠️]/g, "")
        .trim();
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
    cleanDescription = cleanDescription
      .replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
      .replace(/#{1,6}\s*/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/\/\/[^\n]*/g, "")
      .replace(/<[^>]*>/g, "")
      .replace(/[─═╔╗╚╝║]/g, "")
      .replace(/\n{3,}/g, "\n\n")
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

// ═══ Intent Classifier v3 — Enhanced Contextual Reasoning ═══
export function classifyIntent(question: string, recentIntents?: string[]): "visual" | "textual" | "mixed" | "self_evolve" | "auto_construct" {
  const q = question.toLowerCase().trim();

  // Skip classification for very short inputs (likely voice artifacts)
  if (q.length < 2) return "mixed";

  // ═══ Auto-construct intent (highest priority) ═══
  const autoConstructPatterns = /\b(constru[ai]|programe?|crie?\s+(uma?\s+)?(fun[çc][ãa]o|endpoint|api|componente|tabela|migra[çc][ãa]o)|gere?\s+(c[oó]digo|fun[çc][ãa]o|edge\s*function)|implemente?|desenvolv[ae]|code|build|cri[ae]\s+isso|programa\s+isso|fa[çc]a\s+(uma?\s+)?(fun[çc][ãa]o|api|endpoint)|auto[-\s]?constru|se\s+constru[ai]|construa[-\s]se)\b/i;
  if (autoConstructPatterns.test(q)) return "auto_construct";

  // ═══ Self-evolution intent ═══
  const selfEvolvePatterns = /\b(melhore-se|melhore\s+se|evolua|evolu[ií]r?|auto[-\s]?program[ae]|se\s+reprogram[ae]|otimize\s+(suas?\s+respostas?|se)|aprenda\s+(isso|com\s+isso|agora)|atualize?\s+(seus?\s+pesos?|se)|auto[-\s]?evol[uú]|upgrade|self[-\s]?improve|auto[-\s]?aprend|recalibre|se\s+calibre|se\s+atualize|melhore\s+suas?\s+respostas?)\b/i;
  if (selfEvolvePatterns.test(q)) return "self_evolve";

  // ═══ Verb-based primary classification ═══
  const verbIdentify = /\b(identific[aeo]r?|identifique|identify|reconhe[cç][aeo]r?|reconozc[ao]|identificar?)\b/i;
  const verbAnswer = /\b(respond[aeo]r?|me\s+respond[aeo]|me\s+diz|me\s+fal[aeo]|me\s+cont[aeo]|answer|tell\s+me|explain|reply)\b/i;
  const verbAnalyze = /\b(analis[aeo]r?|analise|analy[sz]e|evaluat[aeo]|examinar?)\b/i;
  const verbCheck = /\b(verific[aeo]r?|verifique|checar?|confir[aemo]r?|check|verify)\b/i;
  const verbSearch = /\b(pesquis[aeo]r?|busc[aeo]r?|procur[aeo]r?|google|search|look\s+up|find)\b/i;
  const verbCompare = /\b(compar[aeo]r?|diferença\s+entre|versus|vs\b|melhor\s+entre)\b/i;
  const verbReflect = /\b(reflita|pens[ae]\s+sobre|consider[ae]|raciocin[ae]|reason|think\s+about|ponderar)\b/i;

  // ═══ Strong visual anchors — these ALWAYS mean visual ═══
  const strongVisualAnchors = /\b(segurando|usando|vestindo|mostr[ae]|aparência|rosto|cor\b|enxerg|olh[aeo]|vê|vejo|vendo|câmera|imagem|foto|holding|wearing|showing|face|camera|image|photo)\b/i;
  const bodyRef = /\b(mão|mãos|dedo|braço|cabeça|rosto|olho|boca|cabelo|roupa|camisa|camiseta|óculos|chapéu|caneca|copo|garrafa|hand|finger|arm|head|eye|mouth|hair|shirt|glasses|hat|cup|bottle)\b/i;
  const deicticPatterns = /\b(isso|isto|esse|essa|aquilo|aqui|ali|lá|aí|aquel[ea]s?|this|that|these|those|here|there|esto|eso|aquello)\b/i;

  // Direct visual questions — short-circuit to visual
  if (strongVisualAnchors.test(q) && (deicticPatterns.test(q) || bodyRef.test(q) || /o que (é|estou|tô|tenho)\b/.test(q))) {
    return "visual";
  }
  // "o que estou segurando" — always visual
  if (/o que.*(segurando|usando|vestindo|mostrando)/i.test(q)) return "visual";
  // "como estou" — always visual
  if (/como\s+(eu\s+)?(estou|tô)\b/i.test(q) && q.length < 40) return "visual";

  if (verbIdentify.test(q)) return "visual";
  if (verbAnswer.test(q) && !strongVisualAnchors.test(q)) return "textual";
  if (verbCheck.test(q) && !deicticPatterns.test(q)) return "textual";
  if (verbSearch.test(q)) return "textual";
  if (verbCompare.test(q)) return "textual";
  if (verbReflect.test(q)) return "textual";
  if (verbAnalyze.test(q)) {
    return deicticPatterns.test(q) || strongVisualAnchors.test(q) ? "visual" : "mixed";
  }

  // ═══ Contextual scoring system ═══
  const strongTextual = /\b(que dia|que horas|hora|data de hoje|capital d[aoe]|piada|conta uma|explica|defin[ie]|signific|quem é|quem foi|quanto é|calcul|agenda|prazo|processo|cliente|documento|resumo|traduz|como funciona|o que é|por que|quando foi|onde fica|qual é|quais são|previsão|temperatura|clima|tempo|notícia|cotação|dólar|euro|bitcoin|what time|what day|capital of|joke|explain|define|meaning|who is|how much|calculate|schedule|deadline|summary|translate|how does|what is|why|when|where|which)\b/i;
  const knowledgePatterns = /\b(histór|ciência|matemática|física|química|política|economi|filosofi|programa[çc]ão|código|lei\b|artigo\b|jurisprudência|direito|constitui[çc]|penal|trabalhist|contrato|clt|cdc|lgpd|recurso|habeas|mandado|sentença|acórdão|súmula|tribunal|stf|stj|indenizaç|prescriç|responsabilidade\s*civil|tutela|execuç|licitaç|improbidade|tributári)\b/i;
  const conversationalPatterns = /\b(opini[ãa]o|acha\s+que|concorda|discorda|argumento|debate|sugir[ao]|recomend|aconselh|orienta[çc]|estrat[ée]gia|planej|organiz|prioriz|importa\b|melhor\s+forma|como\s+(posso|devo|faz)|me\s+ajud|preciso\s+de|tenho\s+que|deveria|poderia|gostaria|queria)\b/i;
  const emotionalPatterns = /\b(sinto|sentindo|triste|feliz|ansios|preocupad|estressad|frustrad|animad|chateado|confus[oa]|nervos[oa]|calm[oa]|motiv|desanima|angústi|med[oa]|raiva|alegr|satisf)\b/i;

  let visualScore = 0;
  let textualScore = 0;

  if (deicticPatterns.test(q)) visualScore += 3;
  if (strongVisualAnchors.test(q)) visualScore += 3;
  if (bodyRef.test(q)) visualScore += 2;
  if (/o que (é|são|tem)/.test(q) && deicticPatterns.test(q)) visualScore += 3;
  if (/\btô\b/.test(q) && q.length < 40) visualScore += 1;

  if (strongTextual.test(q)) textualScore += 3;
  if (knowledgePatterns.test(q)) textualScore += 2;
  if (conversationalPatterns.test(q)) textualScore += 3;
  if (emotionalPatterns.test(q)) textualScore += 2;
  if (/^(o que|como|por que|quando|onde|quem|qual|quais|quanto)\b/.test(q) && !deicticPatterns.test(q) && !strongVisualAnchors.test(q) && !bodyRef.test(q)) textualScore += 2;
  if (q.includes("?") && !deicticPatterns.test(q) && !strongVisualAnchors.test(q)) textualScore += 1;
  if (q.length > 80 && visualScore === 0) textualScore += 1;

  // Context from recent conversation
  if (recentIntents && recentIntents.length > 0) {
    const lastIntent = recentIntents[recentIntents.length - 1];
    if (lastIntent === "visual" && q.length < 20) visualScore += 1;
    if (lastIntent === "textual" && !deicticPatterns.test(q)) textualScore += 1;
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
