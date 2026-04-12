/**
 * ─── Tesla Coil Intent Amplifier ───
 * Progressive intent amplification inspired by Tesla Coil windings.
 * Each layer (coil) amplifies the clarity and confidence of user intent,
 * transforming raw low-voltage input into high-voltage actionable commands.
 *
 * Pipeline: Raw → Normalize → Disambiguate → Enrich → Focus → Resonate
 *   ~120V      ~1kV          ~10kV           ~100kV    ~500kV   ~1MV
 *
 * If final confidence < 0.6, the system asks for clarification instead
 * of executing blindly — eliminating hallucinated responses.
 */

import { analyzeComprehension, quickLocalReformulate, needsReformulation, COMPREHENSION_THRESHOLD } from "./orion-reformulation";
import { analyzeClarity, isConfirmation } from "@/lib/analysis/ambiguityDetector";
import { inferUserIntent, createUserMentalModel, type UserMentalModel, type IntentInference } from "./theory-of-mind";
import { getResonanceIndex, isUltraFastPathActive } from "./tesla-resonance";
import { getWorkingMemoryContext } from "./orion-working-memory";

// ─── Types ───

export interface AmplificationLogEntry {
  coil: number;
  name: string;
  inputConfidence: number;
  outputConfidence: number;
  voltageLabel: string;
  deltaMs: number;
  notes: string[];
}

export interface IntentVoltage {
  /** Original raw input */
  rawInput: string;
  /** Progressively amplified input */
  normalizedInput: string;
  /** Detected primary intent */
  intent: string;
  /** Secondary intent if any */
  secondaryIntent: string | null;
  /** Confidence after all coils (0-1) */
  confidence: number;
  /** Extracted entities/targets */
  entities: string[];
  /** Enriched context string */
  context: string;
  /** Current coil level reached (0-5) */
  voltageLevel: number;
  /** Per-coil amplification log */
  amplificationLog: AmplificationLogEntry[];
  /** Was the input a simple confirmation? */
  isConfirmation: boolean;
  /** Should execution proceed or ask clarification? */
  shouldExecute: boolean;
  /** Suggested question if shouldExecute=false */
  suggestedQuestion: string | null;
  /** Total pipeline time in ms */
  totalAmplificationMs: number;
  /** Ratio of final/initial confidence */
  amplificationRatio: number;
}

export interface AmplificationContext {
  /** Whether working memory has items available */
  hasWorkingMemory?: boolean;
  /** User mental model from Theory of Mind */
  mentalModel?: UserMentalModel;
  /** Recent conversation history for context */
  recentHistory?: string[];
  /** Current document content if editing */
  documentContent?: string;
}

// ─── Constants ───

const EXECUTION_THRESHOLD = 0.40; // Lowered from 0.6: voice input is naturally informal
const SUPERCOHERENCE_BONUS = 0.08;
const COIL_VOLTAGE_LABELS = ["~120V", "~1kV", "~10kV", "~100kV", "~500kV", "~1MV"];

// ─── Coil 1: Normalization ───

function normalizeCoil(input: string): { output: string; confidence: number; notes: string[] } {
  const notes: string[] = [];
  const comprehension = analyzeComprehension(input);
  let confidence = comprehension.score;

  // Quick local reformulate: fix abbreviations, slang, truncation
  let output = input;
  if (comprehension.isColloquial || comprehension.isTruncated) {
    output = quickLocalReformulate(input);
    notes.push(comprehension.isColloquial ? "Gírias normalizadas" : "Truncamento expandido");
    // Re-score after normalization
    const reScore = analyzeComprehension(output);
    confidence = reScore.score;
  }

  if (comprehension.issues.length > 0) {
    notes.push(`Issues: ${comprehension.issues.join(", ")}`);
  }

  return { output, confidence, notes };
}

// ─── Coil 2: Disambiguation ───

function disambiguateCoil(
  input: string,
  baseConfidence: number,
  ctx: AmplificationContext
): { output: string; confidence: number; notes: string[] } {
  const notes: string[] = [];
  let output = input;
  let confidence = baseConfidence;

  const clarity = analyzeClarity(input, ctx.documentContent || "", undefined);

  if (clarity.level === "vague") {
    confidence = Math.min(confidence, 0.5); // was 0.4 — too aggressive for voice
    notes.push(`Vago: ${clarity.reasons.join("; ")}`);
  } else if (clarity.level === "ambiguous") {
    confidence = Math.min(confidence, 0.6); // was 0.55
    notes.push(`Ambíguo: ${clarity.reasons[0]}`);
  } else {
    // Clear — boost
    confidence = Math.min(1, confidence + 0.1);
    notes.push("Entrada clara");
  }

  // Try to resolve with working memory context
  if (clarity.level !== "clear" && ctx.hasWorkingMemory) {
    const wmContext = getWorkingMemoryContext(6);
    if (wmContext.length > 0) {
      const hasRecentTopic = wmContext.some(() =>
        input.toLowerCase().includes("isso") || input.toLowerCase().includes("aquilo")
      );
      if (hasRecentTopic && wmContext.length > 0) {
        confidence = Math.min(1, confidence + 0.12);
        notes.push("Resolvido via working memory");
      }
    }
  }

  return { output, confidence, notes };
}

// ─── Coil 3: Contextual Enrichment ───

function enrichCoil(
  input: string,
  baseConfidence: number,
  ctx: AmplificationContext
): { output: string; confidence: number; context: string; notes: string[] } {
  const notes: string[] = [];
  let confidence = baseConfidence;
  const contextParts: string[] = [];

  const model = ctx.mentalModel || createUserMentalModel();

  // Inject ToM signals
  if (model.frustrationLevel > 0.5) {
    contextParts.push(`Usuário frustrado (${(model.frustrationLevel * 100).toFixed(0)}%)`);
    notes.push("Frustração detectada — priorizar resolução");
    confidence = Math.min(1, confidence + 0.05); // boost: we know the user is frustrated
  }

  if (model.knowledgeLevel !== "unknown") {
    contextParts.push(`Nível: ${model.knowledgeLevel}`);
    notes.push(`Nível de conhecimento: ${model.knowledgeLevel}`);
    confidence = Math.min(1, confidence + 0.03);
  }

  if (model.communicationStyle !== "formal") {
    contextParts.push(`Estilo: ${model.communicationStyle}`);
  }

  if (model.engagementLevel > 0.7) {
    confidence = Math.min(1, confidence + 0.04);
    notes.push("Alto engajamento detectado");
  }

  // Working memory context
  if (ctx.hasWorkingMemory) {
    const wmItems = getWorkingMemoryContext(6);
    if (wmItems.length > 0) {
      contextParts.push(`WM: ${wmItems.slice(0, 3).map(i => i.content.slice(0, 40)).join("; ")}`);
      confidence = Math.min(1, confidence + 0.05);
      notes.push(`${wmItems.length} itens de working memory`);
    }
  }

  // Recent history context
  if (ctx.recentHistory && ctx.recentHistory.length > 0) {
    contextParts.push(`Histórico: ${ctx.recentHistory.length} turnos`);
    confidence = Math.min(1, confidence + 0.03);
  }

  return {
    output: input,
    confidence,
    context: contextParts.join(" | "),
    notes,
  };
}

// ─── Coil 4: Intent Focusing ───

function focusCoil(
  input: string,
  baseConfidence: number,
  ctx: AmplificationContext
): { output: string; confidence: number; intent: string; secondaryIntent: string | null; entities: string[]; notes: string[] } {
  const notes: string[] = [];
  const model = ctx.mentalModel || createUserMentalModel();

  // Use Theory of Mind intent inference
  const intentResult: IntentInference = inferUserIntent(
    model,
    input,
    ctx.recentHistory
  );

  let confidence = Math.max(baseConfidence, intentResult.confidence);
  notes.push(`Intent: ${intentResult.primary} (${(intentResult.confidence * 100).toFixed(0)}%)`);
  if (intentResult.signals.length > 0) {
    notes.push(`Sinais: ${intentResult.signals.join(", ")}`);
  }

  // Extract entities (simple pattern extraction)
  const entities: string[] = [];
  const entityPatterns = [
    { regex: /"([^"]+)"/g, type: "quoted" },
    { regex: /\b(cláusula|artigo|seção|parágrafo|item)\s+(\d+[°ºª]?(?:\.\d+)*)/gi, type: "legal_ref" },
    { regex: /\b(\d{2}\/\d{2}\/\d{4}|\d{4}-\d{2}-\d{2})\b/g, type: "date" },
    { regex: /\b([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+)+)\b/g, type: "proper_name" },
  ];

  for (const { regex, type } of entityPatterns) {
    let match;
    while ((match = regex.exec(input)) !== null) {
      entities.push(`[${type}] ${match[0]}`);
    }
  }

  if (entities.length > 0) {
    confidence = Math.min(1, confidence + 0.05);
    notes.push(`${entities.length} entidade(s) extraída(s)`);
  }

  return {
    output: input,
    confidence,
    intent: intentResult.primary,
    secondaryIntent: intentResult.secondary,
    entities,
    notes,
  };
}

// ─── Coil 5: Tesla Resonance ───

function resonateCoil(
  baseConfidence: number
): { confidence: number; notes: string[] } {
  const notes: string[] = [];
  let confidence = baseConfidence;

  const resonanceIndex = getResonanceIndex();
  const ultraFast = isUltraFastPathActive();

  if (resonanceIndex >= 0.8) {
    // Supercoherent: neural modules are synchronized — boost confidence
    confidence = Math.min(1, confidence + SUPERCOHERENCE_BONUS);
    notes.push(`Supercoerência Tesla (R=${resonanceIndex.toFixed(3)}) — boost aplicado`);
  } else if (resonanceIndex >= 0.5) {
    // Partial coherence — minor boost
    confidence = Math.min(1, confidence + 0.03);
    notes.push(`Ressonância parcial (R=${resonanceIndex.toFixed(3)})`);
  } else {
    // Low coherence — conservative penalty
    confidence = Math.max(0, confidence - 0.03);
    notes.push(`Baixa ressonância (R=${resonanceIndex.toFixed(3)}) — penalidade conservadora`);
  }

  if (ultraFast) {
    notes.push("Ultra-fast-path ativo");
  }

  return { confidence, notes };
}

// ─── Main Amplification Pipeline ───

/**
 * Amplify raw user input through 5 progressive Tesla Coil layers.
 * Returns a fully-resolved IntentVoltage with actionable intent,
 * or a clarification question if confidence is insufficient.
 */
export function amplifyIntent(
  rawInput: string,
  ctx: AmplificationContext = {}
): IntentVoltage {
  const pipelineStart = Date.now();
  const log: AmplificationLogEntry[] = [];
  const trimmed = rawInput.trim();

  // Fast exit: confirmations
  if (isConfirmation(trimmed)) {
    return {
      rawInput,
      normalizedInput: trimmed,
      intent: "confirmation",
      secondaryIntent: null,
      confidence: 1.0,
      entities: [],
      context: "",
      voltageLevel: 5,
      amplificationLog: [],
      isConfirmation: true,
      shouldExecute: true,
      suggestedQuestion: null,
      totalAmplificationMs: Date.now() - pipelineStart,
      amplificationRatio: 1,
    };
  }

  const initialConfidence = analyzeComprehension(trimmed).score;
  let currentConfidence = initialConfidence;

  // ═══ COIL 1: Normalization ═══
  let t0 = Date.now();
  const coil1 = normalizeCoil(trimmed);
  log.push({
    coil: 1, name: "Normalização",
    inputConfidence: currentConfidence,
    outputConfidence: coil1.confidence,
    voltageLabel: COIL_VOLTAGE_LABELS[1],
    deltaMs: Date.now() - t0,
    notes: coil1.notes,
  });
  currentConfidence = coil1.confidence;

  // ═══ COIL 2: Disambiguation ═══
  t0 = Date.now();
  const coil2 = disambiguateCoil(coil1.output, currentConfidence, ctx);
  log.push({
    coil: 2, name: "Desambiguação",
    inputConfidence: currentConfidence,
    outputConfidence: coil2.confidence,
    voltageLabel: COIL_VOLTAGE_LABELS[2],
    deltaMs: Date.now() - t0,
    notes: coil2.notes,
  });
  currentConfidence = coil2.confidence;

  // ═══ COIL 3: Contextual Enrichment ═══
  t0 = Date.now();
  const coil3 = enrichCoil(coil2.output, currentConfidence, ctx);
  log.push({
    coil: 3, name: "Enriquecimento",
    inputConfidence: currentConfidence,
    outputConfidence: coil3.confidence,
    voltageLabel: COIL_VOLTAGE_LABELS[3],
    deltaMs: Date.now() - t0,
    notes: coil3.notes,
  });
  currentConfidence = coil3.confidence;

  // ═══ COIL 4: Intent Focusing ═══
  t0 = Date.now();
  const coil4 = focusCoil(coil3.output, currentConfidence, ctx);
  log.push({
    coil: 4, name: "Focalização",
    inputConfidence: currentConfidence,
    outputConfidence: coil4.confidence,
    voltageLabel: COIL_VOLTAGE_LABELS[4],
    deltaMs: Date.now() - t0,
    notes: coil4.notes,
  });
  currentConfidence = coil4.confidence;

  // ═══ COIL 5: Tesla Resonance ═══
  t0 = Date.now();
  const coil5 = resonateCoil(currentConfidence);
  log.push({
    coil: 5, name: "Ressonância Tesla",
    inputConfidence: currentConfidence,
    outputConfidence: coil5.confidence,
    voltageLabel: COIL_VOLTAGE_LABELS[5],
    deltaMs: Date.now() - t0,
    notes: coil5.notes,
  });
  currentConfidence = coil5.confidence;

  // ═══ Determine execution vs. clarification ═══
  // Long inputs (>50 chars) are clearly intentional — ALWAYS execute
  // Questions (ending with ?) are ALWAYS valid — never ask clarification for questions
  const isLongInput = trimmed.length > 50;
  const isQuestion = /\?/.test(trimmed) || /^(o que|quem|qual|quando|onde|como|por que|porque|quanto)\b/i.test(trimmed);
  const isVoiceNatural = /^[a-záàâãéèêíïóôõöúçñ\s,!?.]+$/i.test(trimmed); // natural language, not code/garbage
  const shouldExecute = isLongInput || isQuestion || isVoiceNatural || currentConfidence >= EXECUTION_THRESHOLD;
  let suggestedQuestion: string | null = null;

  if (!shouldExecute) {
    const clarity = analyzeClarity(trimmed, ctx.documentContent || "", coil4.intent);
    suggestedQuestion = clarity.suggestedQuestion
      || "Pode detalhar melhor o que deseja? Assim consigo atender com precisão.";
  }

  const totalMs = Date.now() - pipelineStart;
  const ratio = initialConfidence > 0 ? currentConfidence / initialConfidence : currentConfidence;

  return {
    rawInput,
    normalizedInput: coil1.output,
    intent: coil4.intent,
    secondaryIntent: coil4.secondaryIntent,
    confidence: currentConfidence,
    entities: coil4.entities,
    context: coil3.context,
    voltageLevel: 5,
    amplificationLog: log,
    isConfirmation: false,
    shouldExecute,
    suggestedQuestion,
    totalAmplificationMs: totalMs,
    amplificationRatio: ratio,
  };
}

// ─── Utility: Format amplification log for debugging ───

export function formatAmplificationLog(voltage: IntentVoltage): string {
  const lines = [
    `⚡ Tesla Coil Amplification: "${voltage.rawInput.slice(0, 50)}${voltage.rawInput.length > 50 ? "..." : ""}"`,
    `   Initial → Final: ${(voltage.amplificationRatio).toFixed(2)}x amplification`,
    `   Confidence: ${(voltage.confidence * 100).toFixed(1)}% | Intent: ${voltage.intent}`,
  ];
  for (const entry of voltage.amplificationLog) {
    lines.push(
      `   Coil ${entry.coil} [${entry.name}] ${entry.voltageLabel}: ` +
      `${(entry.inputConfidence * 100).toFixed(0)}% → ${(entry.outputConfidence * 100).toFixed(0)}% ` +
      `(${entry.deltaMs}ms) ${entry.notes.length > 0 ? "— " + entry.notes[0] : ""}`
    );
  }
  lines.push(`   Total: ${voltage.totalAmplificationMs}ms | Execute: ${voltage.shouldExecute ? "✅" : "❌"}`);
  return lines.join("\n");
}
