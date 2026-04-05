/**
 * ─── Vision Agent Presets ───
 * Pre-configured goal sets for common agentic vision scenarios.
 * Based on E-R-C-A framework + AWS Agentic AI Foundations.
 */

import type { VisionGoal, AgentGoalType } from "./agentic-vision-agent";
import { setVisionGoals } from "./agentic-vision-agent";

export interface AgentPreset {
  id: string;
  name: string;
  namePt: string;
  description: string;
  descriptionPt: string;
  goals: VisionGoal[];
  autonomyLevel: number;
  ercaSpec: {
    specialize: string;    // Agent role
    neuralNetwork: string; // Which models to use
    context: string;       // What constitutes success/failure
    action: string;        // Expected output
  };
}

const now = () => Date.now();

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: "safety_inspector",
    name: "Industrial Safety Inspector",
    namePt: "Inspetor de Segurança Industrial",
    description: "Monitors PPE compliance, distance violations, and hazardous conditions",
    descriptionPt: "Monitora conformidade de EPIs, violações de distância e condições perigosas",
    autonomyLevel: 0.9,
    ercaSpec: {
      specialize: "Agente Autônomo de Inspeção de Segurança Industrial",
      neuralNetwork: "YOLO-PPE + MediaPipe Pose + Depth Estimation",
      context: "Violação = ausência de capacete/colete/bota OU distância < 2m de equipamento pesado",
      action: "Alerta sonoro + log JSON com timestamp, local e tipo de violação",
    },
    goals: [
      { type: "monitor_safety", priority: 1.0, description: "Detectar ausência de EPIs", successCriteria: "0 violações ativas", delegatedBy: "system", createdAt: now() },
      { type: "detect_objects", priority: 0.9, description: "Detectar equipamentos e operários", successCriteria: ">= 90% precision", delegatedBy: "system", createdAt: now() },
      { type: "measure_distance", priority: 0.85, description: "Medir distância a zonas de risco", successCriteria: "Alertar se < 2m", delegatedBy: "system", createdAt: now() },
      { type: "detect_anomaly", priority: 0.7, description: "Detectar comportamento anômalo", successCriteria: "Identificar desvios > 30%", delegatedBy: "system", createdAt: now() },
    ],
  },
  {
    id: "quality_control",
    name: "Quality Control Agent",
    namePt: "Agente de Controle de Qualidade",
    description: "Inspects products for defects, measures dimensions, reads labels",
    descriptionPt: "Inspeciona produtos por defeitos, mede dimensões, lê etiquetas",
    autonomyLevel: 0.85,
    ercaSpec: {
      specialize: "Inspetor de Qualidade Visual Automatizado",
      neuralNetwork: "YOLO + OCR (DBNet+CRNN) + Depth Estimation",
      context: "Sucesso = produto aprovado sem defeitos visíveis. Falha = defeito detectado com confiança > 80%",
      action: "Classificar: APROVADO/REPROVADO + gerar relatório com evidências visuais",
    },
    goals: [
      { type: "quality_inspect", priority: 1.0, description: "Inspecionar qualidade do produto", successCriteria: "Detecção de defeitos > 95%", delegatedBy: "system", createdAt: now() },
      { type: "read_text", priority: 0.85, description: "Ler etiquetas e códigos", successCriteria: "OCR accuracy > 90%", delegatedBy: "system", createdAt: now() },
      { type: "measure_distance", priority: 0.8, description: "Verificar dimensões do produto", successCriteria: "Precisão ± 5mm", delegatedBy: "system", createdAt: now() },
    ],
  },
  {
    id: "emotion_monitor",
    name: "Emotion & Engagement Monitor",
    namePt: "Monitor de Emoções e Engajamento",
    description: "Tracks facial expressions, attention levels, and engagement patterns",
    descriptionPt: "Rastreia expressões faciais, níveis de atenção e padrões de engajamento",
    autonomyLevel: 0.7,
    ercaSpec: {
      specialize: "Analista de Expressões Faciais e Engajamento",
      neuralNetwork: "Face-API + MediaPipe FaceMesh + Face Attributes ONNX",
      context: "Sucesso = relatório contínuo de emoções. Alerta se desengajamento > 30s",
      action: "Stream de emoções + alerta de desengajamento + relatório de sessão",
    },
    goals: [
      { type: "analyze_emotion", priority: 1.0, description: "Analisar expressões faciais em tempo real", successCriteria: "Detecção contínua de emoções", delegatedBy: "system", createdAt: now() },
      { type: "track_person", priority: 0.8, description: "Rastrear identidade entre frames", successCriteria: "Manter tracking > 5s", delegatedBy: "system", createdAt: now() },
    ],
  },
  {
    id: "scene_analyst",
    name: "Scene Intelligence Analyst",
    namePt: "Analista de Inteligência de Cena",
    description: "Full scene understanding with 3D reconstruction and anomaly detection",
    descriptionPt: "Compreensão completa de cena com reconstrução 3D e detecção de anomalias",
    autonomyLevel: 0.8,
    ercaSpec: {
      specialize: "Analista de Cena com Reconstrução 3D",
      neuralNetwork: "YOLO + MediaPipe + DPT-MiDaS (depth) + FrameX (multi-task)",
      context: "Sucesso = descrição semântica rica da cena. Falha = latência > 500ms",
      action: "Descrição JSON da cena + mapa 3D + alerta de anomalias",
    },
    goals: [
      { type: "recognize_scene", priority: 1.0, description: "Classificar tipo de cena", successCriteria: "Confiança > 80%", delegatedBy: "system", createdAt: now() },
      { type: "detect_objects", priority: 0.95, description: "Detectar todos os objetos", successCriteria: "Recall > 85%", delegatedBy: "system", createdAt: now() },
      { type: "measure_distance", priority: 0.8, description: "Estimar profundidade e distâncias", successCriteria: "Mapa de profundidade disponível", delegatedBy: "system", createdAt: now() },
      { type: "detect_anomaly", priority: 0.7, description: "Identificar anomalias na cena", successCriteria: "Desvio > 30% do baseline", delegatedBy: "system", createdAt: now() },
      { type: "read_text", priority: 0.6, description: "Extrair texto visível", successCriteria: "OCR quando texto detectado", delegatedBy: "system", createdAt: now() },
    ],
  },
  {
    id: "navigation_assist",
    name: "Navigation Assistant",
    namePt: "Assistente de Navegação",
    description: "Spatial awareness for autonomous navigation and obstacle avoidance",
    descriptionPt: "Consciência espacial para navegação autônoma e desvio de obstáculos",
    autonomyLevel: 0.95,
    ercaSpec: {
      specialize: "Agente de Navegação Autônoma com Percepção Espacial",
      neuralNetwork: "YOLO (obstacles) + DPT-MiDaS (depth) + MediaPipe Pose (humans)",
      context: "Sucesso = caminho livre identificado. Falha = colisão iminente não detectada",
      action: "Mapa de obstáculos + vetor de direção segura + alerta de proximidade",
    },
    goals: [
      { type: "navigate", priority: 1.0, description: "Identificar caminho seguro", successCriteria: "Caminho livre com margem > 1m", delegatedBy: "system", createdAt: now() },
      { type: "detect_objects", priority: 0.95, description: "Detectar obstáculos", successCriteria: "Todos obstáculos > 30cm detectados", delegatedBy: "system", createdAt: now() },
      { type: "measure_distance", priority: 0.9, description: "Estimar distância a obstáculos", successCriteria: "Precisão < 50cm", delegatedBy: "system", createdAt: now() },
      { type: "track_person", priority: 0.8, description: "Rastrear pedestres", successCriteria: "Prever trajetória de colisão", delegatedBy: "system", createdAt: now() },
    ],
  },
  // ═══ AVFI — Agente de Visão Facial Integrada ═══
  {
    id: "avfi_access_control",
    name: "Facial Vision Agent (AVFI)",
    namePt: "Agente de Visão Facial Integrada (AVFI)",
    description: "Integrated facial recognition for access control, secure identification and real-time monitoring using MTCNN alignment, CNN embeddings and cosine similarity",
    descriptionPt: "Reconhecimento facial integrado para controle de acesso, identificação segura e monitoramento em tempo real usando alinhamento MTCNN, embeddings CNN e similaridade cosseno",
    autonomyLevel: 0.92,
    ercaSpec: {
      specialize: "Agente Neuronal de Visão Facial Integrada (AVFI) — Especialista em pipelines de reconhecimento facial com >99% de precisão, tratando oclusões, variações de iluminação e rotação de pose",
      neuralNetwork: "Face-API.js (detecção/landmarks 68pts) + BlazeFace (detecção rápida) + FaceMesh 478pts (alinhamento preciso) + ResNet/MobileNetV2 via ONNX (extração de embeddings 128/512D) + Cosine Similarity (comparação)",
      context: "Sucesso = identificação positiva com confiança > 0.95. Se confiança < 0.8 → classificar 'Desconhecido' e acionar log de auditoria. Oclusão parcial (máscara) → focar em pontos oculares (landmarks periorbital). Edge computing → priorizar MobileNet para inferência < 100ms",
      action: "Retornar: {id_usuario, nome, nivel_confianca, status_mascara, embedding_hash, distancia_euclidiana, similaridade_cosseno, acao: 'permitir'|'negar'|'alerta_seguranca'}. Se desconhecido: gravar face_crop + alertar segurança + registrar no audit_log",
    },
    goals: [
      { type: "facial_recognition", priority: 1.0, description: "Detectar, alinhar e extrair embedding facial", successCriteria: "Embedding extraído com confiança > 0.95", delegatedBy: "system", createdAt: now() },
      { type: "access_control", priority: 0.95, description: "Validar identidade contra banco de dados", successCriteria: "Decisão permitir/negar em < 500ms", delegatedBy: "system", createdAt: now() },
      { type: "analyze_emotion", priority: 0.7, description: "Analisar expressão facial para liveness detection", successCriteria: "Detectar tentativa de spoofing > 90%", delegatedBy: "system", createdAt: now() },
      { type: "detect_anomaly", priority: 0.6, description: "Detectar tentativas de fraude (foto/vídeo)", successCriteria: "Anti-spoofing via análise de textura e blinking", delegatedBy: "system", createdAt: now() },
      { type: "track_person", priority: 0.5, description: "Rastrear indivíduo entre frames para consistência", successCriteria: "Manter tracking ID estável > 10s", delegatedBy: "system", createdAt: now() },
    ],
  },
  {
    id: "avfi_monitoring",
    name: "Facial Surveillance Monitor (AVFI)",
    namePt: "Monitor de Vigilância Facial (AVFI)",
    description: "Continuous facial monitoring for security environments with real-time alerts and audit logging",
    descriptionPt: "Monitoramento facial contínuo para ambientes de segurança com alertas em tempo real e log de auditoria",
    autonomyLevel: 0.85,
    ercaSpec: {
      specialize: "Monitor de Vigilância Facial em Tempo Real — opera continuamente detectando rostos desconhecidos e pessoas de interesse",
      neuralNetwork: "MTCNN (detecção multi-escala) + HOG+SVM (alinhamento rápido) + Face-API.js (landmarks 68pts) + CNN embeddings (ResNet) + Base de Dados Staff com Cosine Similarity",
      context: "Fluxo: Captura → Detecção (MTCNN) → Alinhamento (olhos+boca em coords padrão) → Embedding (CNN 512D) → Comparação (Euclidean/Cosine vs Staff_DB). Threshold permitir > 0.95. Alertar se < 0.8. Monitorar entre 0.8-0.95",
      action: "Stream contínuo: {frame_id, rostos_detectados, matches: [{id, nome, confianca, status_mascara}], desconhecidos: [{face_crop_url, timestamp}], alertas: [{tipo, severidade}]}",
    },
    goals: [
      { type: "facial_recognition", priority: 1.0, description: "Detectar e identificar todos os rostos no campo de visão", successCriteria: "Recall > 95% em rostos frontais e ¾ perfil", delegatedBy: "system", createdAt: now() },
      { type: "detect_anomaly", priority: 0.9, description: "Detectar rostos em lista de alerta", successCriteria: "Alerta imediato se match > 0.85 com lista negra", delegatedBy: "system", createdAt: now() },
      { type: "track_person", priority: 0.85, description: "Rastrear trajetória de indivíduos", successCriteria: "Tracking contínuo sem fragmentação > 30s", delegatedBy: "system", createdAt: now() },
      { type: "analyze_emotion", priority: 0.6, description: "Classificar estado emocional dos detectados", successCriteria: "7 emoções básicas com confiança > 70%", delegatedBy: "system", createdAt: now() },
      { type: "recognize_scene", priority: 0.4, description: "Classificar ambiente para ajustar thresholds", successCriteria: "Indoor/outdoor + nível de iluminação", delegatedBy: "system", createdAt: now() },
    ],
  },
];

/**
 * Activate a preset by ID
 */
export function activatePreset(presetId: string): AgentPreset | null {
  const preset = AGENT_PRESETS.find(p => p.id === presetId);
  if (!preset) return null;
  
  // Refresh timestamps
  const goals = preset.goals.map(g => ({ ...g, createdAt: Date.now() }));
  setVisionGoals(goals);
  
  return preset;
}

/**
 * Get E-R-C-A system prompt for a preset
 */
export function getERCAPromptForPreset(preset: AgentPreset): string {
  const { ercaSpec } = preset;
  return [
    `[NÍVEL 1 — SISTEMA] Especialização: ${ercaSpec.specialize}`,
    `[NÍVEL 2 — OPERACIONAL] Rede Neural: ${ercaSpec.neuralNetwork}`,
    `Contexto: ${ercaSpec.context}`,
    `Ação: ${ercaSpec.action}`,
    `[NÍVEL 3 — AUTO-REFINAMENTO] Analise logs de erro e ajuste limiares automaticamente.`,
  ].join("\n");
}
