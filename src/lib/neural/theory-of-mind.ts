/**
 * ─── v22.4: Theory of Mind (ToM) Module ───
 * Models the mental states, intentions, beliefs, and emotions of the user.
 * Enables Orion to predict reactions, tailor responses, and detect frustration.
 *
 * Ref: Premack & Woodruff (1978) "Does the chimpanzee have a theory of mind?"
 *      Baron-Cohen (1995) "Mindblindness"
 *      Rabinowitz et al. (2018) "Machine Theory of Mind"
 */

// ─── Types ───

export type KnowledgeLevel = "expert" | "intermediate" | "beginner" | "unknown";

export interface UserMentalModel {
  userId: string;
  inferredIntent: string;
  emotionalState: {
    valence: number;    // -1 to 1
    arousal: number;    //  0 to 1
  };
  knowledgeLevel: KnowledgeLevel;
  beliefs: Map<string, number>;       // topic → confidence (0-1)
  frustrationLevel: number;           // 0-1
  engagementLevel: number;            // 0-1
  communicationStyle: "formal" | "casual" | "technical" | "emotional";
  interactionHistory: InteractionSnapshot[];
  lastUpdated: number;
}

export interface InteractionSnapshot {
  timestamp: number;
  userInput: string;
  inferredIntent: string;
  emotionDetected: { valence: number; arousal: number };
  responseQuality: number;  // 0-1, estimated satisfaction
}

export interface IntentInference {
  primary: string;
  secondary: string | null;
  confidence: number;
  signals: string[];        // what signals led to this inference
}

export interface ReactionPrediction {
  likelySatisfied: boolean;
  estimatedSatisfaction: number; // 0-1
  suggestedAdjustments: string[];
  reasoning: string;
}

// ─── Constants ───

const MAX_INTERACTION_HISTORY = 50;

const FRUSTRATION_KEYWORDS = [
  "não entendeu", "errado", "de novo", "já falei", "não é isso",
  "por favor", "desisto", "impossível", "bug", "problema",
  "travou", "lento", "demora", "complicado", "difícil",
];

const ENGAGEMENT_SIGNALS = [
  "interessante", "legal", "ótimo", "perfeito", "excelente",
  "continue", "mais", "explique", "como", "por que",
  "quero", "preciso", "importante", "urgente", "ajude",
];

const EXPERT_SIGNALS = [
  "api", "sdk", "deploy", "pipeline", "latência", "throughput",
  "embedding", "token", "model", "inference", "batch", "runtime",
  "rls", "migration", "edge function", "webhook", "cors",
];

// ─── Core Functions ───

export function createUserMentalModel(userId: string = "default"): UserMentalModel {
  return {
    userId,
    inferredIntent: "unknown",
    emotionalState: { valence: 0, arousal: 0.3 },
    knowledgeLevel: "unknown",
    beliefs: new Map(),
    frustrationLevel: 0,
    engagementLevel: 0.5,
    communicationStyle: "formal",
    interactionHistory: [],
    lastUpdated: Date.now(),
  };
}

/**
 * Infer user intent from their input + conversation history.
 */
export function inferUserIntent(
  model: UserMentalModel,
  userInput: string,
  conversationContext?: string[]
): IntentInference {
  const input = userInput.toLowerCase();
  const signals: string[] = [];
  let primary = "information_seeking";
  let secondary: string | null = null;
  let confidence = 0.5;

  // Question patterns
  if (/\?|como|o que|qual|por que|quando|onde|quem/.test(input)) {
    primary = "information_seeking";
    signals.push("pergunta detectada");
    confidence = 0.7;
  }

  // Command patterns
  if (/^(faça|execute|crie|gere|abra|feche|ative|desative|configure)/i.test(input)) {
    primary = "command_execution";
    signals.push("comando imperativo");
    confidence = 0.8;
  }

  // Complaint / frustration
  if (FRUSTRATION_KEYWORDS.some(k => input.includes(k))) {
    secondary = "expressing_frustration";
    signals.push("sinais de frustração");
    confidence = Math.max(confidence, 0.6);
  }

  // Exploration / learning
  if (/explique|ensine|como funciona|o que significa|me diga mais/.test(input)) {
    primary = "learning";
    signals.push("desejo de aprendizado");
    confidence = 0.75;
  }

  // Debugging
  if (/erro|bug|crash|falha|não funciona|quebrou|travou/.test(input)) {
    primary = "debugging";
    signals.push("relato de problema");
    confidence = 0.8;
  }

  // Self-awareness questions about Orion
  if (/você (sabe|pode|tem|consegue)|seus? (sistema|módulo|capacidade)|o que falta/.test(input)) {
    primary = "system_inquiry";
    signals.push("pergunta sobre capacidades do sistema");
    confidence = 0.85;
  }

  // Repeated intent (persistence increases confidence)
  if (model.interactionHistory.length > 0) {
    const lastIntent = model.interactionHistory[model.interactionHistory.length - 1]?.inferredIntent;
    if (lastIntent === primary) {
      confidence = Math.min(1, confidence + 0.1);
      signals.push("intenção repetida — persistência");
    }
  }

  return { primary, secondary, confidence, signals };
}

/**
 * Predict how the user will react to a given response approach.
 */
export function predictUserReaction(
  model: UserMentalModel,
  responseApproach: "detailed" | "concise" | "technical" | "empathetic" | "directive"
): ReactionPrediction {
  let satisfaction = 0.5;
  const adjustments: string[] = [];

  // Match response style to user's communication style
  const styleMatch: Record<string, string[]> = {
    formal: ["detailed", "technical"],
    casual: ["concise", "empathetic"],
    technical: ["technical", "detailed"],
    emotional: ["empathetic", "directive"],
  };

  const preferredStyles = styleMatch[model.communicationStyle] || ["concise"];
  if (preferredStyles.includes(responseApproach)) {
    satisfaction += 0.2;
  } else {
    adjustments.push(`Considerar estilo ${preferredStyles[0]} para este usuário`);
  }

  // Frustration handling
  if (model.frustrationLevel > 0.6) {
    if (responseApproach === "empathetic") {
      satisfaction += 0.15;
    } else if (responseApproach === "technical") {
      satisfaction -= 0.1;
      adjustments.push("Usuário frustrado — usar tom mais empático");
    }
  }

  // Knowledge level matching
  if (model.knowledgeLevel === "beginner" && responseApproach === "technical") {
    satisfaction -= 0.15;
    adjustments.push("Simplificar linguagem para nível iniciante");
  }
  if (model.knowledgeLevel === "expert" && responseApproach === "concise") {
    satisfaction += 0.1; // experts prefer efficiency
  }

  // Engagement factor
  satisfaction += model.engagementLevel * 0.1;

  satisfaction = Math.max(0, Math.min(1, satisfaction));

  return {
    likelySatisfied: satisfaction > 0.6,
    estimatedSatisfaction: satisfaction,
    suggestedAdjustments: adjustments,
    reasoning: `Previsão baseada em: estilo=${model.communicationStyle}, frustração=${(model.frustrationLevel * 100).toFixed(0)}%, conhecimento=${model.knowledgeLevel}, engajamento=${(model.engagementLevel * 100).toFixed(0)}%`,
  };
}

/**
 * Update the mental model from a new interaction.
 */
export function updateFromInteraction(
  model: UserMentalModel,
  userInput: string,
  emotionFromVision?: { valence: number; arousal: number },
  responseSuccess?: boolean
): UserMentalModel {
  const input = userInput.toLowerCase();
  const updated = { ...model, lastUpdated: Date.now() };

  // Infer intent
  const intent = inferUserIntent(model, userInput);
  updated.inferredIntent = intent.primary;

  // Update frustration
  const frustrationSignals = FRUSTRATION_KEYWORDS.filter(k => input.includes(k)).length;
  updated.frustrationLevel = Math.max(0, Math.min(1,
    model.frustrationLevel * 0.7 + (frustrationSignals > 0 ? 0.3 : -0.1)
  ));

  // Update engagement
  const engagementSignals = ENGAGEMENT_SIGNALS.filter(k => input.includes(k)).length;
  updated.engagementLevel = Math.max(0, Math.min(1,
    model.engagementLevel * 0.8 + (engagementSignals > 0 ? 0.2 : -0.05)
  ));

  // Update knowledge level
  const expertSignals = EXPERT_SIGNALS.filter(k => input.includes(k)).length;
  if (expertSignals >= 2) updated.knowledgeLevel = "expert";
  else if (expertSignals === 1 && updated.knowledgeLevel === "unknown") updated.knowledgeLevel = "intermediate";
  else if (updated.knowledgeLevel === "unknown" && userInput.length < 30) updated.knowledgeLevel = "beginner";

  // Update emotional state
  if (emotionFromVision) {
    updated.emotionalState = {
      valence: emotionFromVision.valence * 0.6 + model.emotionalState.valence * 0.4,
      arousal: emotionFromVision.arousal * 0.5 + model.emotionalState.arousal * 0.5,
    };
  } else {
    // Infer from text
    const textValence = frustrationSignals > 0 ? -0.3 : engagementSignals > 0 ? 0.3 : 0;
    updated.emotionalState = {
      valence: textValence * 0.4 + model.emotionalState.valence * 0.6,
      arousal: model.emotionalState.arousal * 0.9,
    };
  }

  // Detect communication style
  if (/senhor|prezado|formalmente|atenciosamente/.test(input)) {
    updated.communicationStyle = "formal";
  } else if (expertSignals >= 2) {
    updated.communicationStyle = "technical";
  } else if (/haha|rsrs|kk|😂|😊|❤️/.test(input)) {
    updated.communicationStyle = "casual";
  } else if (frustrationSignals > 0) {
    updated.communicationStyle = "emotional";
  }

  // Record interaction
  const snapshot: InteractionSnapshot = {
    timestamp: Date.now(),
    userInput: userInput.slice(0, 200),
    inferredIntent: intent.primary,
    emotionDetected: { ...updated.emotionalState },
    responseQuality: responseSuccess !== undefined ? (responseSuccess ? 0.8 : 0.3) : 0.5,
  };

  updated.interactionHistory = [
    ...model.interactionHistory.slice(-(MAX_INTERACTION_HISTORY - 1)),
    snapshot,
  ];

  // Update beliefs from repeated topics
  const words = input.split(/\s+/).filter(w => w.length > 4);
  const beliefs = new Map(model.beliefs);
  for (const word of words) {
    const current = beliefs.get(word) || 0;
    beliefs.set(word, Math.min(1, current + 0.05));
  }
  // Decay old beliefs
  for (const [key, val] of beliefs) {
    if (val < 0.05) beliefs.delete(key);
    else beliefs.set(key, val * 0.99);
  }
  updated.beliefs = beliefs;

  return updated;
}

/**
 * Get a summary of the mental model for the AI system prompt.
 */
export function getToMSummary(model: UserMentalModel): string {
  const topBeliefs = Array.from(model.beliefs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic, conf]) => `${topic}(${(conf * 100).toFixed(0)}%)`)
    .join(", ");

  return [
    `[ToM] Intent: ${model.inferredIntent}`,
    `Emoção: valence=${model.emotionalState.valence.toFixed(2)}, arousal=${model.emotionalState.arousal.toFixed(2)}`,
    `Frustração: ${(model.frustrationLevel * 100).toFixed(0)}%`,
    `Engajamento: ${(model.engagementLevel * 100).toFixed(0)}%`,
    `Conhecimento: ${model.knowledgeLevel}`,
    `Estilo: ${model.communicationStyle}`,
    topBeliefs ? `Tópicos: ${topBeliefs}` : "",
  ].filter(Boolean).join(" | ");
}
