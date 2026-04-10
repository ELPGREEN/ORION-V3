/**
 * ─── Vision Semantic Cortex ───
 * Transforms raw detections into human-like scene comprehension.
 * 
 * Inspired by:
 * - AnyTouch (ICLR 2025): Unified multi-sensor representation learning
 * - Human visual cortex hierarchy: V1→V4→IT→Parietal→Prefrontal
 * 
 * Layers:
 * 1. Spatial Relationship Graph — "X is on/near/behind Y"
 * 2. Action/Intent Inference — what the person is doing/about to do
 * 3. Scene Narrative — coherent description like a human observer
 * 4. Attention Priority — what's most important right now
 * 5. Object Affordances — what objects can be used for
 */

import type { RealTimeVisionResult, UnifiedDetection } from "./realtime-vision-engine";
import type { FaceAttributes } from "./face-attributes-engine";
import type { GazeResult } from "./gaze-detection";
import type { DepthEstimationResult } from "./depth-estimation-engine";
import type { MPPose } from "./mediapipe-vision";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

export type SpatialRelation =
  | "em_cima_de" | "embaixo_de" | "à_esquerda_de" | "à_direita_de"
  | "perto_de" | "longe_de" | "na_frente_de" | "atrás_de"
  | "dentro_de" | "ao_lado_de" | "segurando" | "tocando";

export interface SpatialRelationship {
  subject: string;
  relation: SpatialRelation;
  object: string;
  confidence: number;
}

export interface InferredAction {
  actor: string;
  action: string;
  target?: string;
  confidence: number;
  intent?: string;
}

export interface AttentionFocus {
  element: string;
  priority: number; // 0-1, 1 = highest
  reason: string;
}

export interface ObjectAffordance {
  object: string;
  affordances: string[];
}

export interface SemanticScene {
  /** Natural language narrative of the scene */
  narrative: string;
  /** Spatial relationships between objects */
  spatialGraph: SpatialRelationship[];
  /** Inferred actions and intents */
  actions: InferredAction[];
  /** What to pay attention to */
  attentionFoci: AttentionFocus[];
  /** Object affordances */
  affordances: ObjectAffordance[];
  /** Scene category */
  sceneType: string;
  /** Emotional atmosphere */
  atmosphere: string;
  /** Complexity score 0-1 */
  complexity: number;
}

// ═══════════════════════════════════════════
// 1. Spatial Relationship Graph
// ═══════════════════════════════════════════

function computeSpatialRelationships(
  objects: UnifiedDetection[],
  depth?: DepthEstimationResult | null
): SpatialRelationship[] {
  const relations: SpatialRelationship[] = [];
  if (objects.length < 2) return relations;

  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i];
      const b = objects[j];

      const aCx = a.x + a.width / 2;
      const aCy = a.y + a.height / 2;
      const bCx = b.x + b.width / 2;
      const bCy = b.y + b.height / 2;

      const dx = bCx - aCx;
      const dy = bCy - aCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const avgSize = (Math.max(a.width, a.height) + Math.max(b.width, b.height)) / 2;
      const relDist = dist / (avgSize || 1);

      // Vertical relationships
      const aBottom = a.y + a.height;
      const bBottom = b.y + b.height;
      const horizontalOverlap = Math.max(0,
        Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
      );
      const hasHOverlap = horizontalOverlap > Math.min(a.width, b.width) * 0.3;

      // "A is on top of B" — A's bottom touches B's top and they overlap horizontally
      if (hasHOverlap && Math.abs(aBottom - b.y) < avgSize * 0.3 && aCy < bCy) {
        relations.push({
          subject: a.namePt,
          relation: "em_cima_de",
          object: b.namePt,
          confidence: Math.min(a.confidence, b.confidence) * 0.9,
        });
      }

      // Horizontal relationships
      if (Math.abs(dy) < avgSize * 0.5) {
        if (dx > avgSize * 0.3) {
          relations.push({
            subject: a.namePt,
            relation: "à_esquerda_de",
            object: b.namePt,
            confidence: Math.min(a.confidence, b.confidence) * 0.8,
          });
        } else if (dx < -avgSize * 0.3) {
          relations.push({
            subject: a.namePt,
            relation: "à_direita_de",
            object: b.namePt,
            confidence: Math.min(a.confidence, b.confidence) * 0.8,
          });
        }
      }

      // Proximity
      if (relDist < 1.5) {
        relations.push({
          subject: a.namePt,
          relation: "perto_de",
          object: b.namePt,
          confidence: Math.min(a.confidence, b.confidence) * (1 - relDist / 3),
        });
      }

      // Containment — small object inside larger one
      if (a.x >= b.x && a.y >= b.y &&
        a.x + a.width <= b.x + b.width &&
        a.y + a.height <= b.y + b.height &&
        a.width * a.height < b.width * b.height * 0.5) {
        relations.push({
          subject: a.namePt,
          relation: "dentro_de",
          object: b.namePt,
          confidence: Math.min(a.confidence, b.confidence) * 0.85,
        });
      }

      // Depth-based front/behind
      if (depth?.depthMap) {
        const aDepthIdx = Math.round(aCy) * (depth.width || 640) + Math.round(aCx);
        const bDepthIdx = Math.round(bCy) * (depth.width || 640) + Math.round(bCx);
        if (aDepthIdx >= 0 && bDepthIdx >= 0 &&
          aDepthIdx < depth.depthMap.length && bDepthIdx < depth.depthMap.length) {
          const depthDiff = depth.depthMap[aDepthIdx] - depth.depthMap[bDepthIdx];
          if (Math.abs(depthDiff) > 0.1) {
            relations.push({
              subject: depthDiff < 0 ? a.namePt : b.namePt,
              relation: "na_frente_de",
              object: depthDiff < 0 ? b.namePt : a.namePt,
              confidence: Math.min(a.confidence, b.confidence) * Math.min(Math.abs(depthDiff) * 2, 0.9),
            });
          }
        }
      }
    }
  }

  // Person holding object — hand near small object
  return relations
    .filter((r) => r.confidence > 0.3)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 15); // Keep top 15 relationships
}

// ═══════════════════════════════════════════
// 2. Action/Intent Inference
// ═══════════════════════════════════════════

const HOLDABLE_OBJECTS = new Set([
  "celular", "telefone", "xícara", "copo", "garrafa", "livro",
  "controle remoto", "mouse", "teclado", "caneta", "faca",
  "garfo", "colher", "tesoura", "escova de dentes", "câmera",
  "cell phone", "cup", "bottle", "book", "remote", "mouse",
  "keyboard", "pen", "knife", "fork", "spoon", "scissors",
  "toothbrush", "camera",
]);

function inferActions(
  objects: UnifiedDetection[],
  poses: MPPose[],
  hands: RealTimeVisionResult["hands"],
  faces: RealTimeVisionResult["faces"],
  faceAttrs: FaceAttributes[],
  gaze: GazeResult | null,
  spatialGraph: SpatialRelationship[]
): InferredAction[] {
  const actions: InferredAction[] = [];

  // Person + holdable object nearby → "segurando"
  if (hands.length > 0) {
    for (const hand of hands) {
      // Use wrist landmark (index 0) as hand center
      const wrist = hand.landmarks?.[0];
      if (!wrist) continue;
      const handCx = wrist.x * 640; // Normalized → pixel approx
      const handCy = wrist.y * 480;

      for (const obj of objects) {
        const objCx = obj.x + obj.width / 2;
        const objCy = obj.y + obj.height / 2;
        const dist = Math.sqrt((handCx - objCx) ** 2 + (handCy - objCy) ** 2);

        if (dist < 80 && HOLDABLE_OBJECTS.has(obj.name.toLowerCase())) {
          actions.push({
            actor: "pessoa",
            action: "segurando",
            target: obj.namePt,
            confidence: 0.75 * obj.confidence,
            intent: inferHoldingIntent(obj.name),
          });
        }
      }
    }
  }

  // Pose-based actions
  for (let i = 0; i < poses.length; i++) {
    const pose = poses[i];
    const lm = pose.landmarks;
    if (!lm || lm.length < 25) continue;

    // Waving — one hand raised above head
    const nose = lm[0];
    const lWrist = lm[15];
    const rWrist = lm[16];
    if (nose && lWrist && lWrist.y < nose.y - 0.1) {
      actions.push({ actor: `pessoa ${i + 1}`, action: "acenando", confidence: 0.7 });
    }
    if (nose && rWrist && rWrist.y < nose.y - 0.1) {
      actions.push({ actor: `pessoa ${i + 1}`, action: "acenando", confidence: 0.7 });
    }

    // Pointing — arm extended with index finger direction
    const lElbow = lm[13];
    const rElbow = lm[14];
    if (rWrist && rElbow) {
      const armLen = Math.sqrt((rWrist.x - rElbow.x) ** 2 + (rWrist.y - rElbow.y) ** 2);
      if (armLen > 0.2) {
        actions.push({ actor: `pessoa ${i + 1}`, action: "apontando", confidence: 0.6 });
      }
    }

    // Sitting at desk — person seated + laptop/keyboard nearby
    const lHip = lm[23];
    const rHip = lm[24];
    const lShoulder = lm[11];
    const rShoulder = lm[12];
    if (lHip && rHip && lShoulder && rShoulder) {
      const hipY = (lHip.y + rHip.y) / 2;
      const shoulderY = (lShoulder.y + rShoulder.y) / 2;
      if (Math.abs(hipY - shoulderY) < 0.15) {
        const hasDesk = objects.some((o) =>
          ["laptop", "notebook", "teclado", "keyboard", "monitor", "tv"].includes(o.name.toLowerCase())
        );
        if (hasDesk) {
          actions.push({
            actor: `pessoa ${i + 1}`,
            action: "trabalhando no computador",
            confidence: 0.8,
            intent: "produtividade/trabalho",
          });
        } else {
          actions.push({ actor: `pessoa ${i + 1}`, action: "sentado(a)", confidence: 0.7 });
        }
      }
    }
  }

  // Gaze-based intent
  if (gaze && gaze.confidence > 0.4) {
    const gazeDir = gaze.direction || "frente";
    if (gazeDir === "down" || gazeDir === "baixo") {
      const hasPhone = objects.some((o) => o.name.toLowerCase().includes("phone") || o.name.toLowerCase().includes("celular"));
      if (hasPhone) {
        actions.push({ actor: "pessoa", action: "olhando o celular", confidence: 0.75, intent: "leitura/comunicação" });
      } else {
        actions.push({ actor: "pessoa", action: "olhando para baixo", confidence: 0.6, intent: "leitura/reflexão" });
      }
    }
  }

  // Emotion-driven intent
  if (faceAttrs.length > 0) {
    const dominant = faceAttrs[0];
    if (dominant.emotion && dominant.emotionConfidence > 0.5) {
      const emotionIntents: Record<string, string> = {
        happy: "interação positiva, diversão",
        sad: "precisa de apoio ou conforto",
        angry: "frustrado, pode precisar de ajuda",
        surprised: "reação a algo inesperado",
        fearful: "situação de alerta",
        disgusted: "desconforto com algo",
        neutral: "estado calmo, disponível",
      };
      const intent = emotionIntents[dominant.emotion] || "estado emocional indeterminado";
      actions.push({
        actor: "pessoa",
        action: `expressando ${dominant.emotion}`,
        confidence: dominant.emotionConfidence,
        intent,
      });
    }
  }

  return actions
    .filter((a) => a.confidence > 0.4)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 8);
}

function inferHoldingIntent(objectName: string): string {
  const intents: Record<string, string> = {
    "cell phone": "comunicação ou navegação",
    celular: "comunicação ou navegação",
    cup: "bebendo algo",
    xícara: "bebendo café/chá",
    copo: "bebendo algo",
    bottle: "hidratação",
    garrafa: "hidratação",
    book: "leitura",
    livro: "leitura",
    remote: "controlando TV/dispositivo",
    "controle remoto": "controlando TV/dispositivo",
    knife: "preparando comida",
    faca: "preparando comida",
    fork: "comendo",
    garfo: "comendo",
    pen: "escrevendo",
    caneta: "escrevendo",
    camera: "fotografando/filmando",
    câmera: "fotografando/filmando",
  };
  return intents[objectName.toLowerCase()] || "usando objeto";
}

// ═══════════════════════════════════════════
// 3. Attention Priority System
// ═══════════════════════════════════════════

function computeAttentionFoci(
  objects: UnifiedDetection[],
  faces: RealTimeVisionResult["faces"],
  faceAttrs: FaceAttributes[],
  actions: InferredAction[],
  spatialGraph: SpatialRelationship[]
): AttentionFocus[] {
  const foci: AttentionFocus[] = [];

  // Faces always get high attention (humans prioritize faces)
  if (faces.length > 0) {
    foci.push({
      element: `${faces.length} rosto(s)`,
      priority: 0.95,
      reason: "humanos priorizam rostos naturalmente",
    });
  }

  // Strong emotions get attention
  for (const attr of faceAttrs) {
    if (attr.emotion && attr.emotion !== "neutral" && attr.emotionConfidence > 0.6) {
      foci.push({
        element: `emoção: ${attr.emotion}`,
        priority: 0.85,
        reason: "expressão emocional intensa requer atenção",
      });
    }
  }

  // Moving/new objects get attention
  for (const action of actions) {
    if (action.confidence > 0.7) {
      foci.push({
        element: `${action.actor}: ${action.action}`,
        priority: 0.8,
        reason: "ação em andamento",
      });
    }
  }

  // Unusual objects (low confidence or rare)
  for (const obj of objects) {
    if (obj.confidence > 0.5 && obj.confidence < 0.7) {
      foci.push({
        element: obj.namePt,
        priority: 0.6,
        reason: "objeto com confiança moderada — merece atenção",
      });
    }
  }

  // Text on screen gets attention
  const hasText = objects.some((o) => o.name.toLowerCase().includes("book") || o.name.toLowerCase().includes("monitor"));
  if (hasText) {
    foci.push({ element: "texto visível", priority: 0.7, reason: "texto presente requer leitura" });
  }

  return foci.sort((a, b) => b.priority - a.priority).slice(0, 6);
}

// ═══════════════════════════════════════════
// 4. Object Affordances
// ═══════════════════════════════════════════

const AFFORDANCE_MAP: Record<string, string[]> = {
  chair: ["sentar", "apoiar"],
  cadeira: ["sentar", "apoiar"],
  table: ["apoiar objetos", "trabalhar", "comer"],
  mesa: ["apoiar objetos", "trabalhar", "comer"],
  cup: ["beber", "segurar"],
  xícara: ["beber café/chá"],
  bottle: ["beber", "armazenar líquido"],
  garrafa: ["beber", "armazenar líquido"],
  laptop: ["trabalhar", "assistir", "comunicar"],
  notebook: ["trabalhar", "assistir", "comunicar"],
  "cell phone": ["ligar", "navegar", "fotografar"],
  celular: ["ligar", "navegar", "fotografar"],
  book: ["ler", "estudar"],
  livro: ["ler", "estudar"],
  door: ["abrir", "fechar", "passar"],
  porta: ["abrir", "fechar", "passar"],
  keyboard: ["digitar", "trabalhar"],
  teclado: ["digitar", "trabalhar"],
  mouse: ["clicar", "navegar"],
  tv: ["assistir", "jogar"],
  televisão: ["assistir", "jogar"],
  car: ["dirigir", "transportar"],
  carro: ["dirigir", "transportar"],
  knife: ["cortar", "preparar comida"],
  faca: ["cortar", "preparar comida"],
  bed: ["dormir", "descansar"],
  cama: ["dormir", "descansar"],
  couch: ["sentar", "descansar", "assistir TV"],
  sofá: ["sentar", "descansar", "assistir TV"],
};

function computeAffordances(objects: UnifiedDetection[]): ObjectAffordance[] {
  const seen = new Set<string>();
  const affordances: ObjectAffordance[] = [];

  for (const obj of objects) {
    const key = obj.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const aff = AFFORDANCE_MAP[key] || AFFORDANCE_MAP[obj.namePt.toLowerCase()];
    if (aff) {
      affordances.push({ object: obj.namePt, affordances: aff });
    }
  }
  return affordances;
}

// ═══════════════════════════════════════════
// 5. Scene Narrative Generator
// ═══════════════════════════════════════════

function inferSceneType(objects: UnifiedDetection[], actions: InferredAction[]): string {
  const names = new Set(objects.map((o) => o.name.toLowerCase()));

  if (names.has("laptop") || names.has("keyboard") || names.has("monitor")) return "escritório/trabalho";
  if (names.has("bed") || names.has("couch")) return "quarto/sala de estar";
  if (names.has("fork") || names.has("knife") || names.has("bowl") || names.has("cup")) return "cozinha/refeição";
  if (names.has("car") || names.has("truck") || names.has("bus")) return "rua/trânsito";
  if (names.has("dog") || names.has("cat") || names.has("bird")) return "ambiente com animais";
  if (names.has("book")) return "estudo/leitura";
  if (names.has("sports ball") || names.has("tennis racket")) return "atividade esportiva";

  const hasWork = actions.some((a) => a.intent?.includes("trabalho"));
  if (hasWork) return "ambiente de trabalho";

  return "ambiente geral";
}

function inferAtmosphere(faceAttrs: FaceAttributes[], actions: InferredAction[]): string {
  if (faceAttrs.length === 0) return "neutra";

  const emotions = faceAttrs.map((f) => f.emotion).filter(Boolean);
  if (emotions.includes("happy")) return "positiva/alegre";
  if (emotions.includes("sad")) return "melancólica";
  if (emotions.includes("angry")) return "tensa";
  if (emotions.includes("surprised")) return "surpresa/curiosidade";
  if (emotions.includes("fearful")) return "alerta/preocupação";
  return "calma/neutra";
}

function generateNarrative(
  objects: UnifiedDetection[],
  faces: RealTimeVisionResult["faces"],
  faceAttrs: FaceAttributes[],
  actions: InferredAction[],
  spatialGraph: SpatialRelationship[],
  affordances: ObjectAffordance[],
  sceneType: string,
  atmosphere: string
): string {
  const parts: string[] = [];

  // Scene opening
  const personCount = faces.length;
  const objCount = objects.length;

  if (personCount > 0) {
    parts.push(`Vejo ${personCount} pessoa(s) em um ambiente de ${sceneType}.`);
  } else if (objCount > 0) {
    parts.push(`Cena de ${sceneType} sem pessoas visíveis.`);
  } else {
    return "Cena vazia — nenhum elemento significativo detectado.";
  }

  // Actions — what's happening
  const significantActions = actions.filter((a) => a.confidence > 0.5);
  if (significantActions.length > 0) {
    const actionStr = significantActions
      .map((a) => {
        let s = `${a.actor} está ${a.action}`;
        if (a.target) s += ` ${a.target}`;
        if (a.intent) s += ` (intenção: ${a.intent})`;
        return s;
      })
      .join(". ");
    parts.push(actionStr + ".");
  }

  // Key spatial relationships
  const keyRelations = spatialGraph.filter((r) => r.confidence > 0.5).slice(0, 5);
  if (keyRelations.length > 0) {
    const relStr = keyRelations
      .map((r) => `${r.subject} ${formatRelation(r.relation)} ${r.object}`)
      .join(", ");
    parts.push(`Relações espaciais: ${relStr}.`);
  }

  // Atmosphere
  if (atmosphere !== "neutra" && atmosphere !== "calma/neutra") {
    parts.push(`Atmosfera: ${atmosphere}.`);
  }

  return parts.join(" ");
}

function formatRelation(rel: SpatialRelation): string {
  const map: Record<SpatialRelation, string> = {
    em_cima_de: "está em cima de",
    embaixo_de: "está embaixo de",
    à_esquerda_de: "está à esquerda de",
    à_direita_de: "está à direita de",
    perto_de: "está perto de",
    longe_de: "está longe de",
    na_frente_de: "está na frente de",
    "atrás_de": "está atrás de",
    dentro_de: "está dentro de",
    ao_lado_de: "está ao lado de",
    segurando: "está segurando",
    tocando: "está tocando",
  };
  return map[rel] || rel;
}

// ═══════════════════════════════════════════
// Main Export: Analyze Scene Semantics
// ═══════════════════════════════════════════

export function analyzeSceneSemantics(result: RealTimeVisionResult): SemanticScene {
  // 1. Spatial graph
  const spatialGraph = computeSpatialRelationships(result.allObjects, result.depthResult);

  // 2. Action inference
  const actions = inferActions(
    result.allObjects,
    result.poses,
    result.hands,
    result.faces,
    result.faceAttributes,
    result.gazeResult,
    spatialGraph
  );

  // 3. Attention foci
  const attentionFoci = computeAttentionFoci(
    result.allObjects,
    result.faces,
    result.faceAttributes,
    actions,
    spatialGraph
  );

  // 4. Affordances
  const affordances = computeAffordances(result.allObjects);

  // 5. Scene classification
  const sceneType = inferSceneType(result.allObjects, actions);
  const atmosphere = inferAtmosphere(result.faceAttributes, actions);

  // 6. Narrative
  const narrative = generateNarrative(
    result.allObjects,
    result.faces,
    result.faceAttributes,
    actions,
    spatialGraph,
    affordances,
    sceneType,
    atmosphere
  );

  // Complexity score
  const complexity = Math.min(1,
    (result.allObjects.length * 0.1 +
      result.faces.length * 0.15 +
      actions.length * 0.1 +
      spatialGraph.length * 0.05) 
  );

  return {
    narrative,
    spatialGraph,
    actions,
    attentionFoci,
    affordances,
    sceneType,
    atmosphere,
    complexity,
  };
}

/**
 * Format semantic scene for AI prompt injection.
 */
export function formatSemanticForAI(scene: SemanticScene): string {
  const parts: string[] = [];

  parts.push(`\n═══ COMPREENSÃO SEMÂNTICA (Córtex Visual) ═══`);
  parts.push(`NARRATIVA: ${scene.narrative}`);
  parts.push(`TIPO DE CENA: ${scene.sceneType} | ATMOSFERA: ${scene.atmosphere} | COMPLEXIDADE: ${(scene.complexity * 100).toFixed(0)}%`);

  if (scene.actions.length > 0) {
    const actionStr = scene.actions
      .map((a) => `${a.actor}: ${a.action}${a.target ? ` (${a.target})` : ""}${a.intent ? ` → ${a.intent}` : ""} [${(a.confidence * 100).toFixed(0)}%]`)
      .join(" | ");
    parts.push(`AÇÕES INFERIDAS: ${actionStr}`);
  }

  if (scene.spatialGraph.length > 0) {
    const relStr = scene.spatialGraph
      .slice(0, 8)
      .map((r) => `${r.subject} ${formatRelation(r.relation)} ${r.object}`)
      .join("; ");
    parts.push(`MAPA ESPACIAL: ${relStr}`);
  }

  if (scene.attentionFoci.length > 0) {
    const focusStr = scene.attentionFoci
      .slice(0, 4)
      .map((f) => `${f.element} (${(f.priority * 100).toFixed(0)}%: ${f.reason})`)
      .join(" | ");
    parts.push(`FOCO DE ATENÇÃO: ${focusStr}`);
  }

  if (scene.affordances.length > 0) {
    const affStr = scene.affordances
      .slice(0, 5)
      .map((a) => `${a.object}: [${a.affordances.join(", ")}]`)
      .join(" | ");
    parts.push(`AFFORDANCES: ${affStr}`);
  }

  return parts.join("\n");
}
