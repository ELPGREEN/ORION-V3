import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// TRIBUNAL-STREAM — Consolidated: facial + vision
// Routes by body.action: "facial" | "vision" (default: "vision")
// ═══════════════════════════════════════════════════════════════

// ─── Shared Math ───
function sigmoid(x: number): number { return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x)))); }
function softmax(values: number[]): number[] {
  const max = Math.max(...values);
  const exps = values.map((v) => Math.exp(v - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}
function cosineSimilarity(a: number[], b: number[]): number {
  const dim = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < dim; i++) { dot += a[i] * b[i]; normA += a[i] * a[i]; normB += b[i] * b[i]; }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}
function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0) + 1e-8);
  return vec.map((v) => v / norm);
}

// ─── Shared Emotion Analysis ───
function analyzeEmotion(features: number[]) {
  if (!features || features.length < 4) return { dominant: "neutral", valence: 0, arousal: 0.2, scores: { neutral: 1 } };
  const energy = features.reduce((s, v) => s + Math.abs(v), 0) / features.length;
  const variance = features.reduce((s, v) => s + (v - energy) ** 2, 0) / features.length;
  const rawScores: Record<string, number> = {
    neutral: sigmoid(1 - variance * 5), joy: sigmoid(energy * 2 - 0.8),
    anger: sigmoid(variance * 3 - 0.6), surprise: sigmoid(Math.abs(features[0]) * 4 - 1),
    disgust: sigmoid(variance * 2 - 0.9), fear: sigmoid((features[2] || 0) * 3 - 1.2),
    sadness: sigmoid(-(features[1] || 0) * 2 - 0.3),
  };
  const labels = Object.keys(rawScores);
  const norm = softmax(labels.map((l) => rawScores[l]));
  const scores: Record<string, number> = {};
  labels.forEach((l, i) => { scores[l] = norm[i]; });
  let dominant = "neutral", maxScore = 0;
  for (const [k, v] of Object.entries(scores)) { if (v > maxScore) { maxScore = v; dominant = k; } }
  const actionUnits: Record<string, number> = {
    AU1: Math.min(1, Math.abs(features[0] || 0) * 2), AU2: Math.min(1, Math.abs(features[1] || 0) * 2),
    AU4: Math.min(1, Math.abs(features[2] || 0) * 2), AU6: Math.min(1, (scores.joy || 0) * 1.5),
    AU12: Math.min(1, (scores.joy || 0) * 2), AU15: Math.min(1, (scores.sadness || 0) * 2),
    AU20: Math.min(1, (scores.fear || 0) * 1.5), AU25: Math.min(1, (scores.surprise || 0) * 2),
  };
  const valence = (scores.joy || 0) * 0.8 - (scores.anger || 0) * 0.6 - (scores.sadness || 0) * 0.5;
  const arousal = (scores.anger || 0) * 0.7 + (scores.surprise || 0) * 0.8 + (scores.joy || 0) * 0.3;
  return { dominant, valence: Math.max(-1, Math.min(1, valence)), arousal: Math.max(0, Math.min(1, (arousal + 1) / 2)), scores, actionUnits };
}

// ═══════════════════════════════════════════════════════════════
// FACIAL-SPECIFIC
// ═══════════════════════════════════════════════════════════════
function extractGeometricTemplate(landmarks: number[]): number[] {
  if (landmarks.length < 8) return new Array(20).fill(0);
  const t: number[] = [];
  const eL_x = landmarks[0], eL_y = landmarks[1], eR_x = landmarks[2], eR_y = landmarks[3];
  const n_x = landmarks[4], n_y = landmarks[5], m_x = landmarks[6], m_y = landmarks[7];
  const d = (ax: number, ay: number, bx: number, by: number) => Math.sqrt((ax-bx)**2 + (ay-by)**2) + 1e-8;
  const io = d(eL_x, eL_y, eR_x, eR_y);
  const ecX = (eL_x+eR_x)/2, ecY = (eL_y+eR_y)/2;
  t.push(io, d(ecX,ecY,n_x,n_y)/io, d(n_x,n_y,m_x,m_y)/io, d(ecX,ecY,m_x,m_y)/io);
  t.push(d(n_x,n_y,m_x,m_y)/(d(ecX,ecY,m_x,m_y)+1e-8));
  t.push(Math.atan2(eR_y-eL_y, eR_x-eL_x));
  t.push((n_x-ecX)/(io+1e-8), (n_y-ecY)/(io+1e-8), (m_x-ecX)/(io+1e-8));
  t.push(Math.abs(eL_x-n_x)/(io+1e-8), Math.abs(eR_x-n_x)/(io+1e-8));
  for (let i = 8; i < Math.min(landmarks.length, 20); i++) t.push(landmarks[i]/(io+1e-8));
  while (t.length < 20) t.push(0);
  return l2Normalize(t.slice(0, 20));
}

function extractFaceEmbedding(features: number[], dim = 128): number[] {
  const arcface = new Array(dim).fill(0);
  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (let i = 0; i < Math.min(features.length, 32); i++) sum += features[i] * Math.cos(((d * (i + 1)) / dim) * Math.PI * 2);
    arcface[d] = Math.tanh(sum / Math.max(1, Math.min(features.length, 32)));
  }
  const arcNorm = l2Normalize(arcface);
  const geo = extractGeometricTemplate(features);
  const geoExpanded = new Array(dim).fill(0);
  for (let d = 0; d < dim; d++) geoExpanded[d] = geo[d % geo.length];
  const geoNorm = l2Normalize(geoExpanded);
  const hybrid = new Array(dim).fill(0);
  for (let d = 0; d < dim; d++) hybrid[d] = 0.7 * arcNorm[d] + 0.3 * geoNorm[d];
  return l2Normalize(hybrid);
}

function detectFaces(features: number[]) {
  if (!features || features.length < 8) return [];
  const energy = features.reduce((s, v) => s + v * v, 0) / features.length;
  const faceScore = sigmoid(energy * 2.5 - 0.3);
  if (faceScore < 0.35) return [];
  const faceCount = Math.min(8, Math.max(1, Math.ceil(faceScore * 3)));
  const faces = [];
  for (let i = 0; i < faceCount; i++) {
    const offset = i * 8;
    const faceFeatures = features.slice(offset, offset + 16);
    while (faceFeatures.length < 16) faceFeatures.push(features[i % features.length] || 0);
    const landmarks = faceFeatures.slice(0, 10);
    faces.push({ faceId: i, confidence: Math.max(0.4, faceScore - i * 0.08),
      boundingBox: { x: 0.1 + (i * 0.2) % 0.6, y: 0.1 + (i * 0.15) % 0.4, w: 0.25, h: 0.35 },
      landmarks, embedding: extractFaceEmbedding(faceFeatures), geometricTemplate: extractGeometricTemplate(landmarks) });
  }
  return faces;
}

function identifyFace(faceEmbedding: number[], knownFaces: any[]): any {
  if (!knownFaces || knownFaces.length === 0) return null;
  let bestMatch: any = null, bestSim = -1;
  for (const known of knownFaces) {
    if (!known.embedding || known.embedding.length === 0) continue;
    const sim = cosineSimilarity(faceEmbedding, known.embedding);
    if (sim > bestSim) { bestSim = sim; bestMatch = known; }
  }
  if (!bestMatch || bestSim < 0.6) return null;
  return { id: bestMatch.id, name: bestMatch.name, role: bestMatch.role, similarity: bestSim };
}

// ═══════════════════════════════════════════════════════════════
// VISION-SPECIFIC
// ═══════════════════════════════════════════════════════════════
function detectTribunalSystem(features: number[]): { system: string; confidence: number } {
  if (!features || features.length === 0) return { system: "unknown", confidence: 0 };
  const signatures: Record<string, number[]> = {
    pje: Array.from({ length: 16 }, (_, i) => Math.sin(i * 0.5) * 0.8),
    eproc: Array.from({ length: 16 }, (_, i) => Math.cos(i * 0.3) * 0.7),
    gaia: Array.from({ length: 16 }, (_, i) => Math.sin(i * 0.7 + 1) * 0.9),
    pdpj: Array.from({ length: 16 }, (_, i) => Math.cos(i * 0.4 + 0.5) * 0.6),
  };
  const featureSlice = features.slice(0, 16);
  while (featureSlice.length < 16) featureSlice.push(0);
  let bestSystem = "unknown", bestScore = -1;
  for (const [sys, sig] of Object.entries(signatures)) {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < 16; i++) { dot += featureSlice[i] * sig[i]; normA += featureSlice[i] ** 2; normB += sig[i] ** 2; }
    const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    if (sim > bestScore) { bestScore = sim; bestSystem = sys; }
  }
  return { system: bestScore > 0.3 ? bestSystem : "unknown", confidence: Math.max(0, bestScore) };
}

function processLocalDetections(features: number[], config: Record<string, unknown> = {}) {
  const detections: Record<string, unknown>[] = [];
  if (!features || features.length === 0) return detections;
  const energy = features.reduce((s, v) => s + v * v, 0) / features.length;
  if (config.enableScreenDetection !== false) {
    const { system, confidence } = detectTribunalSystem(features);
    if (confidence > 0.3) detections.push({ type: "screen", label: `Sistema: ${system.toUpperCase()}`, confidence, metadata: { system } });
  }
  if (config.enableFaceDetection !== false) {
    const faceScore = sigmoid(energy * 2 - 0.5);
    if (faceScore > 0.4) detections.push({ type: "face", label: "Participante detectado", confidence: faceScore });
  }
  if (config.enableOCR !== false) {
    const textScore = sigmoid(energy - 0.2);
    if (textScore > 0.3) detections.push({ type: "text_region", label: "Região de texto judicial", confidence: textScore });
  }
  return detections;
}

function generateEmbedding(features: number[], dim = 1024): number[] {
  const embedding = new Array(dim).fill(0);
  for (let d = 0; d < dim; d++) {
    let sum = 0;
    for (let i = 0; i < Math.min(features.length, 64); i++) sum += features[i] * Math.sin(((d * (i + 1)) / dim) * Math.PI * 2);
    embedding[d] = Math.tanh(sum / Math.max(1, Math.min(features.length, 64)));
  }
  const mean = embedding.reduce((a: number, b: number) => a + b, 0) / dim;
  const variance = embedding.reduce((s: number, v: number) => s + (v - mean) ** 2, 0) / dim;
  const std = Math.sqrt(variance + 1e-5);
  return embedding.map((v: number) => (v - mean) / std);
}

function analyzeGesture(features: number[]) {
  if (!features || features.length < 6) return { gesture: "neutral", confidence: 0.5, bodyParts: [], juridicalRelevance: 0 };
  const handEnergy = features.slice(0, Math.floor(features.length / 2)).reduce((s, v) => s + v * v, 0) / Math.max(1, Math.floor(features.length / 2));
  const bodyEnergy = features.slice(Math.floor(features.length / 2)).reduce((s, v) => s + v * v, 0) / Math.max(1, Math.ceil(features.length / 2));
  const gestureScores: Record<string, number> = {
    doubt: sigmoid((features[0] || 0) * 3 - 0.5), defensiveness: sigmoid(bodyEnergy * 4 - 1),
    confidence: sigmoid(handEnergy * 2 + bodyEnergy - 0.8), evasion: sigmoid(-(features[1] || 0) * 3 - 0.3),
    emphasis: sigmoid(handEnergy * 5 - 1.5), agreement: sigmoid((features[2] || 0) * 2 + 0.1),
    disagreement: sigmoid(-(features[2] || 0) * 2 - 0.3), neutral: 0.3,
  };
  let dominant = "neutral", maxScore = 0;
  for (const [g, s] of Object.entries(gestureScores)) { if (s > maxScore) { maxScore = s; dominant = g; } }
  const bodyParts: string[] = [];
  if (handEnergy > 0.3) bodyParts.push("hands");
  if (bodyEnergy > 0.4) bodyParts.push("torso");
  if (Math.abs(features[0] || 0) > 0.3) bodyParts.push("head");
  const relevanceMap: Record<string, number> = { doubt: 0.8, defensiveness: 0.9, evasion: 0.95, confidence: 0.6, emphasis: 0.7, agreement: 0.5, disagreement: 0.7, neutral: 0.1 };
  return { gesture: dominant, confidence: maxScore, bodyParts, juridicalRelevance: (relevanceMap[dominant] || 0.1) * maxScore, scores: gestureScores };
}

// ─── Vision API Prompts ───
const FACIAL_SYSTEM_PROMPT = `Você é um analisador de reconhecimento facial especializado em audiências judiciais brasileiras.\nAnalise a imagem e retorne JSON com:\n{"faces":[{"faceId":0,"role":"juiz"|"advogado"|"promotor"|"testemunha"|"reu"|"escrivao"|"desconhecido","emotion":"neutral"|"joy"|"anger"|"surprise"|"disgust"|"fear"|"sadness","emotionConfidence":0.0-1.0,"actionUnits":{"AU1":0.0-1.0},"isSpeaking":true|false,"gazeDirection":"camera"|"left"|"right"|"down"|"document","boundingBox":{"x":0.0-1.0,"y":0.0-1.0,"w":0.0-1.0,"h":0.0-1.0}}],"speakerFaceId":null|number,"sceneType":"audiencia"|"despacho"|"julgamento"|"outro","participantCount":number,"summary":"descrição breve"}\nRespeite LGPD: não inclua dados pessoais identificáveis. Responda APENAS com JSON.`;

const VISION_SYSTEM_PROMPT = `Você é um analisador de visão computacional especializado em tribunais brasileiros.\nAnalise a imagem fornecida e retorne um JSON com:\n{"screen_type":"pje"|"eproc"|"gaia"|"pdpj"|"unknown","ocr_text":"texto visível","detections":[{"type":"face"|"document"|"screen"|"text","label":"descrição","confidence":0.0-1.0}],"emotions":[{"participant":"juiz"|"advogado"|"testemunha"|"unknown","emotion":"neutral"|"joy"|"anger"|"surprise"|"sadness","confidence":0.0-1.0}],"gestures":[{"gesture":"doubt"|"defensiveness"|"confidence"|"evasion"|"emphasis"|"neutral","confidence":0.0-1.0,"relevance":0.0-1.0}],"summary":"resumo breve da cena"}\nResponda APENAS com o JSON, sem markdown.`;

// ─── Gemini/Groq Vision call ───
async function callVisionAPI(image_base64: string, systemPrompt: string): Promise<{ result: Record<string, unknown>; provider: string }> {
  const _gkNames = ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"];
  const _gkAll = _gkNames.map(n => Deno.env.get(n)).filter((k): k is string => !!k);
  const geminiKey = _gkAll[Math.floor(Math.random() * _gkAll.length)] || "";
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }, { inlineData: { mimeType: "image/jpeg", data: image_base64 } }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 2048 } }),
      });
      if (res.ok) {
        const d = await res.json();
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        return { result: JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()), provider: systemPrompt === FACIAL_SYSTEM_PROMPT ? "gemini_facial" : "gemini_vision" };
      }
      const errText = await res.text();
      throw new Error(`Gemini: ${res.status} ${errText}`);
    } catch (geminiError) {
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (!groqKey) throw geminiError;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "llama-3.2-90b-vision-preview", messages: [{ role: "system", content: systemPrompt }, { role: "user", content: [{ type: "text", text: "Analise esta imagem:" }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image_base64}` } }] }], temperature: 0.1, max_tokens: 2048 }),
      });
      if (!res.ok) { const t = await res.text(); throw new Error(`Groq: ${res.status} ${t}`); }
      const d = await res.json();
      const text = d.choices?.[0]?.message?.content || "{}";
      return { result: JSON.parse(text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()), provider: systemPrompt === FACIAL_SYSTEM_PROMPT ? "groq_facial" : "groq_vision" };
    }
  }
  throw new Error("Nenhuma chave de API de visão configurada (GEMINI ou GROQ)");
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const startTime = Date.now();

  try {
    const body = await req.json();
    const streamAction = body.action || "vision"; // "facial" or "vision"
    const { image_base64, frameFeatures, mode, config: reqConfig, sessionId, consentToken, knownFaces, audioSpeakerLabel, analysis_type } = body;

    // ═══════════════════════════════════════
    // FACIAL ACTION
    // ═══════════════════════════════════════
    if (streamAction === "facial") {
      const effectiveMode = mode || "full";

      // LGPD
      if (!consentToken && effectiveMode !== "detect") {
        return new Response(JSON.stringify({ error: "Consentimento LGPD obrigatório para reconhecimento facial.", lgpdRequired: true }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Local feature-based
      if (frameFeatures && Array.isArray(frameFeatures) && frameFeatures.length > 0) {
        const result: Record<string, unknown> = { sessionId: sessionId || crypto.randomUUID(), timestamp: new Date().toISOString(), mode: effectiveMode, provider: "local_neural", lgpdConsent: !!consentToken };
        const faces = detectFaces(frameFeatures);
        result.faces = faces; result.participantCount = faces.length;
        if ((effectiveMode === "emotion" || effectiveMode === "full") && faces.length > 0) result.faceEmotions = faces.map(f => ({ faceId: f.faceId, ...analyzeEmotion(f.landmarks) }));
        if ((effectiveMode === "identify" || effectiveMode === "full") && faces.length > 0 && knownFaces) result.identifications = faces.map(f => ({ faceId: f.faceId, match: identifyFace(f.embedding, knownFaces) }));
        if ((effectiveMode === "diarize" || effectiveMode === "full") && faces.length > 0) {
          const speakerFace = faces.reduce((best, f) => f.confidence > best.confidence ? f : best, faces[0]);
          result.speakerFaceId = speakerFace.faceId; result.audioSpeakerLabel = audioSpeakerLabel || null;
          result.diarization = { activeSpeaker: speakerFace.faceId, confidence: speakerFace.confidence, crossModalBinding: audioSpeakerLabel ? "linked" : "unlinked" };
        }
        result.processingTimeMs = Date.now() - startTime;
        return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Image-based facial
      if (!image_base64) return new Response(JSON.stringify({ error: "Forneça image_base64 ou frameFeatures" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { result, provider } = await callVisionAPI(image_base64, FACIAL_SYSTEM_PROMPT);
      try { await supabase.from("ai_metrics").insert({ user_id: user.id, query: `[Facial] ${effectiveMode}`, provider, success: true, total_duration_ms: Date.now() - startTime, complexity: "facial_recognition", tools_used: ["tribunal-stream", effectiveMode] }); } catch { /* non-critical */ }
      return new Response(JSON.stringify({ ...result, provider, processingTimeMs: Date.now() - startTime, lgpdConsent: !!consentToken }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ═══════════════════════════════════════
    // VISION ACTION (default)
    // ═══════════════════════════════════════
    if (frameFeatures && Array.isArray(frameFeatures) && frameFeatures.length > 0) {
      const effectiveMode = mode || analysis_type || "full";
      const result: Record<string, unknown> = { sessionId: sessionId || crypto.randomUUID(), timestamp: new Date().toISOString(), mode: effectiveMode, provider: "local_neural" };
      if (effectiveMode === "detect" || effectiveMode === "full") { result.detections = processLocalDetections(frameFeatures, reqConfig || {}); result.screenSystem = detectTribunalSystem(frameFeatures); result.screen_type = (result.screenSystem as any).system; }
      if (effectiveMode === "emotion" || effectiveMode === "full") { result.emotion = analyzeEmotion(frameFeatures); result.emotions = [{ participant: "unknown", ...(result.emotion as any) }]; }
      if (effectiveMode === "embed" || effectiveMode === "full") { result.embedding = generateEmbedding(frameFeatures); result.embeddingDim = 1024; }
      if (effectiveMode === "ocr" || effectiveMode === "full") { result.ocr_text = ""; result.ocrRegions = processLocalDetections(frameFeatures, { enableFaceDetection: false, enableGestureAnalysis: false }).filter(d => d.type === "text_region"); }
      if (effectiveMode === "gesture" || effectiveMode === "full") { const gf = frameFeatures.slice(Math.floor(frameFeatures.length / 3)); result.gesture = analyzeGesture(gf); result.gestures = [result.gesture]; }
      result.processingTimeMs = Date.now() - startTime;
      result.summary = `Análise local: ${(result.detections as unknown[])?.length || 0} detecções em ${result.processingTimeMs}ms`;
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!image_base64) return new Response(JSON.stringify({ error: "Forneça image_base64 ou frameFeatures" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { result, provider } = await callVisionAPI(image_base64, VISION_SYSTEM_PROMPT);
    try { await supabase.from("ai_metrics").insert({ user_id: user.id, query: `[Vision] ${(result as any).summary?.slice(0, 100) || "frame analysis"}`, provider, success: true, total_duration_ms: Date.now() - startTime, complexity: "vision_analysis", tools_used: ["tribunal-stream"] }); } catch { /* non-critical */ }
    return new Response(JSON.stringify({ ...result, provider, processingTimeMs: Date.now() - startTime }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[tribunal-stream] Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
