import { useState, useRef, useEffect, useCallback } from "react";
import { OrbState } from "./EnergyOrb";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFrameStreaming, analyzeFrameWithAI, classifyIntent } from "@/lib/neural/orion-ai-client";
import { stripMarkdown } from "@/lib/utils/text-utils";
import {
  getMemoryFacts, addMemoryFacts, getSessionState, saveSessionState,
  syncMemoryToSupabase, loadMemoryFromSupabase, getLocalMemory,
} from "@/lib/neural/orion-memory";
import { VS, vsLog } from "./useVisionProcessing";
import { onAgentTaskComplete } from "@/lib/neural/neural-agent-bridge";
import { iotBridge } from "@/lib/neural/iot-device-bridge";
import { getDefenseMetrics, getRecentThreats } from "@/lib/neural/orion-defense-system";
import { addKnownSpeaker } from "@/lib/neural/orion-agentic-loop";
import { auditAndCreateProtocols } from "@/lib/neural/lovable-reasoning-engine";
import { isUltraFastPathActive, getResonanceIndex } from "@/lib/neural/tesla-resonance";
import { computeFreeEnergy, generateCorrectionPrompt, type ActiveInferenceResult } from "@/lib/neural/active-inference-guard";
import { amplifyIntent, formatAmplificationLog } from "@/lib/neural/tesla-coil-amplifier";
import { routeToTier } from "@/lib/neural/slim-model-router";
import { cognitiveRoute, validateLogicalConsistency, cacheReasoningPattern, type CognitiveRouting } from "@/lib/neural/cognitive-fast-reasoner";
import { buildCognitionContext, postCognitionLearn } from "@/lib/neural/neural-cognition-engine";
import { shouldRefine, buildRefinementPrompt } from "@/lib/neural/drafter-critic-loop";
import { analyzeSemantics } from "@/lib/neural/nlp-semantic-analyzer";
import { getInstantResponse } from "@/lib/neural/instant-response-cache";
import { quickLocalReformulate, analyzeComprehension } from "@/lib/neural/orion-reformulation";
import { estimateResponseTime, recordLatency } from "@/lib/neural/query-time-estimator";
import { somClassify, somLearn, type SOMHandler } from "@/lib/neural/som-router";
import type { BackgroundTranscript } from "./useWakeWord";
import { queryInternet, activateGateway, getGatewayState } from "@/lib/neural/arc-gateway";
import { learnFramework, getBestAPICapability } from "@/lib/neural/arc-api-learner";
import { checkCreditsAuto, formatCreditResponse, getCreditIntelligence } from "@/lib/neural/arc-stripe-intelligence";
import { detectServiceFromQuery, autoChargeBeforeService, shouldServiceBeFree } from "@/lib/neural/arc-auto-charge";
import { detectGoogleService, handleGoogleServiceRequest, checkUserQuota, getGoogleServicesStats } from "@/lib/neural/arc-google-monetization";

export interface ChatMessage { role: "user" | "ai" | "system"; text: string; time: string; confidence?: number; }

type OrionInputSource = "voice" | "text";

export function useOrionReasoning(
  active: boolean, speak: (t: string, options?: { skipMicToggle?: boolean }) => Promise<void>, canvasRef: React.RefObject<HTMLCanvasElement | null>,
  identificationMode: string = "universal",
  bargeIn?: () => void,
  abortControllerRef?: React.MutableRefObject<AbortController | null>,
  speechQueueRef?: React.MutableRefObject<string[]>,
  bargeInCallbackRef?: React.MutableRefObject<(() => void) | null>,
  getBackgroundTranscripts?: () => BackgroundTranscript[],
  identityStatus?: string,
  onActivateVision?: () => void,
  localDetectionsRef?: React.MutableRefObject<Array<{ name: string; category: string; confidence: number; bbox?: { x: number; y: number; w: number; h: number } }>>,
) {
  const navigate = useNavigate();
  const lastAIRef = useRef(0);
  const [log, setLog] = useState<string[]>([]);
  const logRef = useRef<string[]>([]);
  const [thought, setThought] = useState("Aguardando estímulos sensoriais...");
  const [aiDescription, setAiDescription] = useState<string | null>(null);
  const aiPendingRef = useRef(false);
  const [askInput, setAskInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);
  const aiFailCountRef = useRef(0);
  const recentIntentsRef = useRef<string[]>([]);
  const sessionSyncedRef = useRef(false);
  const ttsWarmedRef = useRef(false);
  const authUserCacheRef = useRef<{ id: string; email?: string | null } | null>(null);

  // Always-fresh ref for `active` (camera state) — closure-stale bug fix
  const activeRef = useRef(active);
  useEffect(() => { activeRef.current = active; }, [active]);

  /** Centralized cleanup — resets all processing flags. Use in try/finally. */
  const cleanupProcessing = useCallback(() => {
    aiPendingRef.current = false;
    setIsProcessing(false);
    isProcessingRef.current = false;
    VS.aiResponding = false;
  }, []);

  const OWNER_ONLY_INTENT_REGEX = /auto_evolution|auto_construct|self_evolve|code_analysis|code_refactor|improve_code|analyze_code|refactor/i;
  const VISUAL_COMMAND_REGEX = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+vendo|v[eê]|v[êe])|descrev[ae]\s+(a\s+)?(imagem|cena|ambiente)|analise\s+(a\s+)?(imagem|cena|c[aâ]mera)|identifique\s+(o\s+)?(objeto|rosto|texto)|leia\s+(o\s+)?texto|quantos?\s+.+\s+(tem|h[aá]))\b/i;

  /** Cached getUser — avoids 6+ DB calls per interaction */
  const getCachedUser = useCallback(async () => {
    if (authUserCacheRef.current) return authUserCacheRef.current;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) authUserCacheRef.current = { id: user.id, email: user.email };
    return user;
  }, []);

  // Session restoration
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const chatHistoryRef = useRef(chatHistory);
  useEffect(() => { chatHistoryRef.current = chatHistory; }, [chatHistory]);

  // Sync memories from Supabase on first mount
  useEffect(() => {
    if (sessionSyncedRef.current) return;
    sessionSyncedRef.current = true;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const supaMemories = await loadMemoryFromSupabase(user.id);
        if (supaMemories.length > 0) {
          const newFacts = supaMemories.map(m => m.fact);
          addMemoryFacts(newFacts, "fact", "system", 0.6);
          vsLog(`🧠 ${supaMemories.length} memórias restauradas do servidor`);
        }
      } catch (e) { console.warn("[Orion] Memory sync from Supabase failed:", e); }
    })();
  }, []);

  // Session state auto-save removed — messages are persisted via Supabase (useChatIAPersistence)

  // Periodic memory sync to Supabase (every 5 min)
  useEffect(() => {
    const syncInterval = setInterval(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const memories = getLocalMemory();
        if (memories.length > 0) {
          const session = getSessionState();
          await syncMemoryToSupabase(user.id, memories, session?.conversationSummary || undefined);
        }
      } catch (e) { console.warn("[Orion] Periodic memory sync failed:", e); }
    }, 5 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // ═══ CONSCIOUSNESS CYCLE: Analyze → Rest → Build ═══
  // Monitors console errors and triggers auto-construction when needed
  // Only owner (advogado/admin) can trigger auto-build
  const consciousCycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const errorBufferRef = useRef<string[]>([]);
  const lastCycleRunRef = useRef(0);
  const CYCLE_INTERVAL = 3 * 60 * 1000; // 3 minutes between cycles

  // Capture console errors passively
  useEffect(() => {
    const originalError = console.error;
    const originalWarn = console.warn;
    const captureError = (...args: any[]) => {
      const msg = typeof args[0] === "string" ? args[0].substring(0, 200) : "";
      // Skip noisy WASM/MediaPipe errors
      if (/mediapipe|wasm|gl_context|BlazeFace|vision_wasm/i.test(msg)) {
        originalError.apply(console, args);
        return;
      }
      if (errorBufferRef.current.length < 20) errorBufferRef.current.push(`[ERROR] ${msg}`);
      originalError.apply(console, args);
    };
    const captureWarn = (...args: any[]) => {
      const msg = typeof args[0] === "string" ? args[0].substring(0, 200) : "";
      // Skip noisy WASM/MediaPipe warnings
      if (/mediapipe|wasm|gl_context|BlazeFace|vision_wasm|W0404|OpenGL/i.test(msg)) {
        originalWarn.apply(console, args);
        return;
      }
      if (/orion|neural|supagent|edge/i.test(msg) && errorBufferRef.current.length < 20) {
        errorBufferRef.current.push(`[WARN] ${msg}`);
      }
      originalWarn.apply(console, args);
    };
    console.error = captureError;
    console.warn = captureWarn;
    return () => { console.error = originalError; console.warn = originalWarn; };
  }, []);

  // Consciousness cycle: analyze errors → diagnose via SupAgent → learn
  useEffect(() => {
    if (!active) return;
    consciousCycleRef.current = setInterval(async () => {
      const now = Date.now();
      if (now - lastCycleRunRef.current < CYCLE_INTERVAL) return;
      lastCycleRunRef.current = now;

      const errors = errorBufferRef.current.slice();

      // ── IoT consciousness: register connected devices ──
      try {
        const connectedDevices = iotBridge.deviceList.filter(d => d.status === "online");
        if (connectedDevices.length > 0) {
          const deviceNames = connectedDevices.map(d => d.name).join(", ");
          addMemoryFacts(
            [`[IoT] Dispositivos conectados: ${deviceNames} (${connectedDevices.length} online)`],
            "fact", "system", 0.5
          );
          vsLog(`🏠 IoT awareness: ${connectedDevices.length} dispositivos online`);
        }
      } catch {}

      // ── Security consciousness: monitor threats ──
      try {
        const defenseMetrics = getDefenseMetrics();
        const recentThreats = getRecentThreats(5);
        if (defenseMetrics.totalThreats > 0) {
          const securityFact = `[Security] Ameaças: ${defenseMetrics.totalThreats} total, ${defenseMetrics.blocked} bloqueadas, ${defenseMetrics.activeBans} bans, tarpit=${defenseMetrics.tarpitActive}, fortress=${defenseMetrics.domFortressActive}`;
          addMemoryFacts([securityFact], "fact", "system", 0.7);
          if (recentThreats.length > 0) {
            const lastThreat = recentThreats[recentThreats.length - 1];
            vsLog(`🛡️ Security awareness: ${defenseMetrics.totalThreats} ameaças, última: ${lastThreat.type} (${lastThreat.severity})`);
          }
        }
      } catch {}

      if (errors.length === 0) {
        // No errors — run protocol audit every 30 min
        const lastAuditKey = "orion_last_protocol_audit";
        const lastAudit = parseInt(localStorage.getItem(lastAuditKey) || "0");
        if (now - lastAudit > 30 * 60 * 1000) {
          localStorage.setItem(lastAuditKey, String(now));
          auditAndCreateProtocols().then(count => {
            if (count > 0) vsLog(`📊 Protocol audit: ${count} protocolos criados/atualizados`);
          }).catch(() => {});
        }
        return; // Nothing to analyze — rest phase
      }

      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Only owner (advogado/admin) can trigger auto-build
        const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
        const isOwner = userRole?.role === "advogado" || userRole?.role === "admin";
        if (!isOwner) return; // Only owner can auto-construct

        // Filter meaningful errors (skip React dev warnings, etc.)
        const meaningfulErrors = errors.filter(e =>
          !/React Router Future Flag|v7_startTransition|v7_relativeSplatPath|DevTools|HMR|hot update/i.test(e)
        );
        if (meaningfulErrors.length === 0) {
          errorBufferRef.current = []; // Clear irrelevant errors
          return;
        }

        vsLog(`🔄 Ciclo de consciência: ${meaningfulErrors.length} erros para análise`);

        // Send to SupAgent for frontend analysis
        const { data: analysisData } = await supabase.functions.invoke("ai-orchestrator", {
          body: {
            action: "supagent_frontend_instruction",
            useCase: "documents",
            source: "consciousness-cycle",
            params: {
              console_errors: meaningfulErrors.slice(0, 20),
              current_route: window.location.pathname,
              intent: "Análise automática de erros do ciclo de consciência",
            },
          },
        });

        if (analysisData?.success && analysisData.diagnosis) {
          const severity = analysisData.severity || "medium";
          const canSelfHeal = analysisData.can_self_heal || false;
          const requiresFrontend = analysisData.requires_frontend_change || false;
          const instructions = analysisData.instructions || [];

          vsLog(`🧠 Diagnóstico: ${analysisData.diagnosis} (${severity})`);

          // If self-healable, Orion handles it silently
          if (canSelfHeal) {
            vsLog(`✅ Auto-cura aplicada: ${analysisData.self_heal_action || "config update"}`);
            // Auto-heal feedback visible in chat
            const healMsg = `🔧 Detectei e corrigi: ${analysisData.self_heal_action || analysisData.diagnosis}`;
            setChatHistory(prev => [...prev.slice(-19), { role: "system" as const, text: healMsg, time: new Date().toLocaleTimeString("pt-BR") }]);
          }

          // If frontend changes needed, log for Orion to report to owner
          if (requiresFrontend && instructions.length > 0) {
            const instructionsSummary = instructions
              .slice(0, 5)
              .map((i: any) => `• [${i.type}] ${i.target}: ${i.description}`)
              .join("\n");
            vsLog(`📋 Instruções frontend (${instructions.length}):\n${instructionsSummary}`);

            // Add to chat for critical/high issues OR when self-heal wasn't enough
            if (severity === "critical" || severity === "high") {
              const alertMsg = `⚠️ Detectei ${meaningfulErrors.length} erro(s) no sistema. Diagnóstico: ${analysisData.diagnosis}. ${canSelfHeal ? "Apliquei correção automática." : `São necessárias ${instructions.length} modificação(ões) no frontend.`}`;
              setChatHistory(prev => [...prev.slice(-19), { role: "system" as const, text: alertMsg, time: new Date().toLocaleTimeString("pt-BR") }]);
            }
          }

          // Learning note
          if (analysisData.learning_note) {
            addMemoryFacts([`[Auto-diagnóstico] ${analysisData.learning_note}`], "fact", "system", 0.7);
          }
        }

        // Clear processed errors
        errorBufferRef.current = [];
      } catch (cycleErr) {
        // Silent failure — don't pollute error buffer with cycle errors
      }
    }, 60_000); // Check every 60 seconds

    return () => { if (consciousCycleRef.current) clearInterval(consciousCycleRef.current); };
  }, [active]);

  // Push detected objects to environmental_context
  const lastEnvPushRef = useRef(0);
  const pushObjectsToEnvContext = useCallback(async (objects: Array<{ name: string; category: string; confidence: number; count: number; position?: string }>) => {
    const now = Date.now();
    if (now - lastEnvPushRef.current < 60000) return;
    lastEnvPushRef.current = now;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await (supabase.from("environmental_context" as any) as any)
        .update({ ativo: false }).eq("user_id", user.id).eq("ativo", true);
      const inserts = objects.slice(0, 10).map(obj => ({
        user_id: user.id, objeto_detectado: obj.name, categoria: obj.category,
        confianca: obj.confidence / 100, posicao_relativa: obj.position || null, ativo: true,
      }));
      await (supabase.from("environmental_context" as any) as any).insert(inserts);
    } catch (e) { console.warn("Failed to push env context:", e); }
  }, []);

  // Persist to neural_learning_data
  const saveToNeuralLearning = useCallback(async (
    input: string, output: string, interactionType: string = "vision_chat",
    qualityScore: number = 0.7, metrics?: Record<string, any>,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("neural_learning_data").insert({
        user_id: user.id, input_text: input.slice(0, 500),
        output_text: (output || "").slice(0, 1000), interaction_type: interactionType,
        quality_score: qualityScore, learned: false,
        metadata: { source: "neural_vision", timestamp: new Date().toISOString(), had_image: !!canvasRef.current, ...(metrics || {}) },
      });
    } catch (e) { console.warn("[NeuralLearning] save error:", e); }
  }, [canvasRef]);

  const [detectedObjects, setDetectedObjects] = useState<Array<{ name: string; category: string; confidence: number; count: number; position?: string; distance?: string }>>([]);

  const addLog = useCallback((msg: string) => {
    const entry = `[${new Date().toLocaleTimeString("pt-BR")}] ${msg}`;
    logRef.current = [...logRef.current.slice(-24), entry];
    setLog([...logRef.current]);
    vsLog(msg);
  }, []);

  const addChat = useCallback((role: ChatMessage["role"], text: string) => {
    setChatHistory(prev => [...prev.slice(-19), { role, text, time: new Date().toLocaleTimeString("pt-BR") }]);
  }, []);

  // Local heuristic updates
  useEffect(() => {
    if (!active) { setThought("Núcleo de plasma em modo contemplativo..."); return; }
    const iv = setInterval(() => {
      if (Date.now() - lastAIRef.current < 5000 && aiDescription) return;
      const r = VS.regions;
      const m = VS.motion;
      const parts: string[] = [];
      const faces = r.filter(x => x.category === "face");
      if (faces.length > 0) parts.push(`👤 ${faces.length} rosto(s)`);
      if (m.intensity > 15) parts.push(`Movimento ${m.intensity > 50 ? "intenso" : "moderado"}`);
      if (r.length > 0) parts.push(`${r.length} regiões`);
      if (parts.length > 0) setThought(parts.join(" · "));
    }, 800);
    return () => clearInterval(iv);
  }, [active, aiDescription]);

  // Barge-in callback
  const bargedInRef = useRef(false);
  useEffect(() => {
    if (bargeInCallbackRef) {
      bargeInCallbackRef.current = () => {
        bargedInRef.current = true;
        setIsProcessing(false);
        aiPendingRef.current = false;
        addLog("⚡ Barge-in: processamento interrompido");
      };
    }
  }, [bargeInCallbackRef, addLog]);

  const lastAskTimeRef = useRef(0);
  const intentQueueRef = useRef<Array<{ question: string; source: OrionInputSource }>>([]);
  const processQueueRef = useRef(false);
  const askAIInternalRef = useRef<(q: string, source?: OrionInputSource) => void>();

  // Process next item from intent queue after current finishes
  const processNextInQueue = useCallback(() => {
    if (intentQueueRef.current.length === 0 || processQueueRef.current) return;
    processQueueRef.current = true;
    const next = intentQueueRef.current.shift()!;
    // Small delay to avoid race conditions
    setTimeout(() => {
      processQueueRef.current = false;
      askAIInternalRef.current?.(next.question, next.source);
    }, 300);
  }, []);

  const askAI = useCallback((question: string, source: OrionInputSource = "text") => {
    const now = Date.now();
    if (now - lastAskTimeRef.current < 500) return;
    lastAskTimeRef.current = now;

    if (isProcessingRef.current) {
      if (source === "voice") {
        bargedInRef.current = true;
        intentQueueRef.current = [{ question, source }];
        addLog(`⚡ Interrompendo processamento atual para novo comando de voz`);
        try { abortControllerRef?.current?.abort(); } catch {}
        return;
      }

      if (intentQueueRef.current.length < 3) {
        intentQueueRef.current.push({ question, source });
        addChat("system", `📋 Pergunta enfileirada (${intentQueueRef.current.length}/3). Processarei em seguida.`);
        addLog(`📋 Enfileirada [${source}]: ${question.slice(0, 50)}`);
      } else {
        addChat("system", "⚠️ Fila cheia (3/3). Aguarde o processamento atual.");
      }
      return;
    }
    askAIInternalRef.current?.(question, source);
  }, [addChat, addLog, abortControllerRef]);

  const askAIInternal = useCallback(async (question: string, source: OrionInputSource = "text") => {
    const now = Date.now();
    bargedInRef.current = false;
    aiPendingRef.current = true;
    setIsProcessing(true);
    isProcessingRef.current = true;
    VS.aiResponding = true;
    setThought("🤔 Analisando...");
    addChat("user", question);
    addChat("ai", "⏳ ...");
    addLog(`💬 Pergunta [${source}]: ${question}`);

    // Set OrbState to "thinking" while processing
    OrbState.voiceState = "thinking";

    const controller = new AbortController();
    if (abortControllerRef) abortControllerRef.current = controller;

    // ⚡ TTS warm-up: fire-and-forget while LLM thinks → cuts ~200-400ms cold-start
    import("@/lib/tts/geminiTTS").then(m => m.warmUpGeminiTTS()).catch(() => {});
    // ⚡ TTS cache prewarm: pre-cache common short phrases (runs once per session)
    import("@/lib/tts/ttsPrewarm").then(m => m.prewarmCommonTTS()).catch(() => {});

    try {
      // ═══ FAST PRE-PROCESSING: Only intent classification (~2ms) ═══
      let processedInput = question;

      const qLow = question.toLowerCase().trim();
      const intentType = classifyIntent(question, recentIntentsRef.current);
      const somResult = somClassify(question);
      const _isSpecialCmd = somResult.isSpecialCmd || intentType === "auto_construct" || intentType === "self_evolve";
      const cachedAuthUser = await getCachedUser();
      let isOwner = false;
      if (cachedAuthUser?.id) {
        const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", cachedAuthUser.id).maybeSingle();
        isOwner = userRole?.role === "advogado" || userRole?.role === "admin";
      }

      // Hard guard: visual questions must stay in visual pipeline and never leak to creator/code branches
      if (VISUAL_COMMAND_REGEX.test(qLow) && intentType !== "visual") {
        addLog(`🛡️ Visual guard: forcing visual intent (was ${intentType})`);
      }
      const effectiveIntentType = VISUAL_COMMAND_REGEX.test(qLow) ? "visual" : intentType;

      // Hard guard: owner-only intents must never execute for non-owner users
      if ((OWNER_ONLY_INTENT_REGEX.test(intentType) || OWNER_ONLY_INTENT_REGEX.test(somResult.handler) || (/\b(refator|refactor|analis[ae].*c[oó]digo|melhor[ae].*c[oó]digo)\b/i.test(qLow) && effectiveIntentType !== "visual")) && !isOwner) {
        const fallbackReply = "Posso te ajudar normalmente por chat, visão e comandos permitidos, mas esse tipo de análise ou evolução de código é restrito à administração.";
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: fallbackReply, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(fallbackReply);
        speak(fallbackReply).catch(() => {});
        cleanupProcessing();
        processNextInQueue();
        return;
      }

      // Lightweight voltage stub — no Tesla Coil overhead
      const voltage = { normalizedInput: question, confidence: 0.9, shouldExecute: true, isConfirmation: false, suggestedQuestion: "", intent: effectiveIntentType };

      addLog(`⚡ Pre-proc: ${Date.now() - now}ms | intent=${effectiveIntentType}`);
      window.dispatchEvent(new CustomEvent("som-routing", { detail: somResult }));

      // If confidence too low, ask clarification
      if (!voltage.shouldExecute && !voltage.isConfirmation) {
        const clarifyMsg = voltage.suggestedQuestion || "Pode detalhar melhor o que deseja?";
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: `🔌 ${clarifyMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(clarifyMsg);
        speak(clarifyMsg).catch(() => {});
        cleanupProcessing();
        processNextInQueue();
        return;
      }

      let processedQuestion = voltage.normalizedInput;

      // ═══ VISION COMMAND INTERCEPT — handle locally, NEVER send to LLM ═══
      const isActivateVision = /ativar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow) || /ligar?\s*(vis[aã]o|c[aâ]mera)/i.test(qLow);
      const isDeactivateVision = /desativar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow) || /desligar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow) || /parar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow);
      if (isActivateVision || isDeactivateVision) {
        const action = isActivateVision ? "activate_vision" : "deactivate_vision";
        const msg = isActivateVision ? "Visão ativada." : "Visão desativada.";
        // Dispatch event for NeuralVision to handle camera start/stop
        window.dispatchEvent(new CustomEvent("orion-vision-command", { detail: { action } }));
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: `👁️ ${msg}`, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(msg);
        speak(msg).catch(() => {});
        cleanupProcessing();
        processNextInQueue();
        return;
      }

      // ═══ ARC-AGI-2 REASONING CHECK — Intercept abstract reasoning tasks ═══
      const arcPatterns = /puzzle|raciocínio abstrato|symbolic|compositional|contextual|resolver|solve| ARC|regra|múltiplas regras/i;
      const isArcTask = arcPatterns.test(qLow);
      
      if (isArcTask) {
        // Check owner status for ARC-AGI-2
        const { data: { user } } = await supabase.auth.getUser();
        let canUseArc = false;
        if (user) {
          const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
          canUseArc = userRole?.role === "advogado" || userRole?.role === "admin";
        }
        
        if (canUseArc) {
          addLog("🧩 Detectada tarefa ARC-AGI-2 - invoking arc-reasoner...");
          try {
            const response = await supabase.functions.invoke("arc-reasoner", {
              body: { 
                description: question,
                reasoning_type: /symbolic|composição|contextual/i.test(qLow) ? 
                  (/symbolic/i.test(qLow) ? "symbolic" : /contextual/i.test(qLow) ? "contextual" : "compositional") : "auto"
              }
            });
            if (response.data?.success) {
              const arcResult = `🧩 Análise ARC-AGI-2:\n${response.data.explanation}\n\nSolução: ${JSON.stringify(response.data.output)}`;
              setThought(arcResult);
              addChat("ai", arcResult);
              speak(arcResult).catch(() => {});
              cleanupProcessing();
              processNextInQueue();
              return;
            }
          } catch (arcErr) {
            addLog(`⚠️ ARC fallback: ${arcErr}`);
          }
        }
      }

      // ═══ AUTO-ACTIVATE VISION: If camera is OFF and question is visual, activate first ═══
      const isVisualQuestion = effectiveIntentType === "visual" || effectiveIntentType === "mixed";
      if (!activeRef.current && isVisualQuestion && onActivateVision) {
        addLog("🔄 Ativando câmera para análise visual...");
        setThought("Ativando câmera...");
        onActivateVision();
        // Poll until camera is actually active (max 4s) — fixes stale-closure bug
        const startedAt = Date.now();
        const waitForCamera = () => {
          if (activeRef.current) {
            addLog("✅ Câmera ativa, processando pergunta visual");
            askAIInternalRef.current?.(question, "voice");
          } else if (Date.now() - startedAt < 4000) {
            setTimeout(waitForCamera, 200);
          } else {
            addLog("⚠️ Câmera não respondeu em 4s — processando sem visão");
            askAIInternalRef.current?.(question, "voice");
          }
        };
        setTimeout(waitForCamera, 400);
        return;
      }

      // ═══ INSTANT CACHE CHECK — skip everything if cached (<5ms) ═══
      if (!_isSpecialCmd || isUltraFastPathActive()) {
        const instantHit = getInstantResponse(processedInput || question);
        if (instantHit && instantHit.confidence >= 0.88) {
          addLog(`⚡ InstantCache HIT: ${instantHit.category} [${Date.now() - now}ms]`);
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai" as const, text: instantHit.answer, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(instantHit.answer);
          speak(instantHit.answer).catch(() => {});
          cleanupProcessing();
          recordLatency(intentType, "fast", Date.now() - now);
          somLearn(question, "general_llm");
          processNextInQueue();
          return;
        }
      }

      // 0. Conversational fast-paths — respond instantly, NO auth/tool routing needed
      const greetingPatterns = /^(senhor|senhora|oi|olá|ola|ei|hey|eai|e\s*aí|fala|bom\s*dia|boa\s*tarde|boa\s*noite|tudo\s*bem|beleza|opa)[\s!?.]*$/i;
      const hearingCheckPatterns = /\b(voc[eê]\s+consegue\s+me\s+ouvir|voc[eê]\s+me\s+ouve|t[aá]\s+me\s+ouvindo|est[aá]\s+me\s+ouvindo|consegue\s+me\s+escutar|me\s+escuta)\b/i;
      const selfIdentityFastPatterns = /\b(quem\s+[eé]\s+voc[eê]|qual\s+[eé]\s+o\s+seu\s+nome|sua\s+personalidade|seu\s+signo|sua\s+hist[oó]ria|o\s+que\s+[eé]\s+voc[eê]|quando\s+voc[eê]\s+nasceu|conte\s+sobre\s+voc[eê]|fale\s+sobre\s+voc[eê]|fala\s+sobre\s+voc[eê]|me\s+conta(?:\s+um\s+pouco)?\s+sobre\s+voc[eê]|me\s+fala(?:\s+um\s+pouco)?\s+sobre\s+voc[eê])\b/i;

      if (greetingPatterns.test(qLow)) {
        const greetings = [
          "Fala! O que manda?",
          "E aí! No que posso ajudar?",
          "Estou aqui, manda ver!",
          "Opa! Pode falar.",
        ];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: greeting, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(greeting);
        speak(greeting).catch(() => {});
        cleanupProcessing();
        somLearn(question, "greeting");
        return;
      }

      if (hearingCheckPatterns.test(qLow)) {
        const hearingResponse = "Sim, estou te ouvindo. Pode falar.";
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: hearingResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(hearingResponse);
        speak(hearingResponse).catch(() => {});
        cleanupProcessing();
        somLearn(question, "greeting");
        return;
      }

      if (selfIdentityFastPatterns.test(qLow)) {
        const { getOrionSelfDescription } = await import("@/lib/neural/orion-consciousness");
        const depth = /personalidade|signo|hist[oó]ria|conte|fale|me\s+conta|me\s+fala/i.test(qLow) ? "full" : "brief";
        const selfResponse = getOrionSelfDescription(depth);
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: selfResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(selfResponse);
        speak(selfResponse).catch(() => {});
        cleanupProcessing();
        somLearn(question, "self_identity");
        return;
      }

      // ═══ VOICE AUTH GATE — Only for sensitive intents (lazy, cached) ═══
      const PUBLIC_INTENTS = new Set(["greeting", "self_identity", "owner_identity", "time_date", "humor", "philosophy", "explanation", "general_llm"]);
      const VOICE_AUTH_INTENTS = new Set(["auto_construct", "self_evolve", "security_query", "iot_light", "iot_temperature", "iot_robot", "iot_status", "bluetooth"]);
      const needsAuth = !PUBLIC_INTENTS.has(somResult.handler);
      const needsBiometric = VOICE_AUTH_INTENTS.has(somResult.handler);

      if (needsAuth || needsBiometric) {
        try {
          const authGateUser = await getCachedUser();
          if (!authGateUser) {
            const authMsg = "Você precisa estar logado para usar esse recurso. Faça login para continuar.";
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: `🔒 ${authMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(authMsg);
            speak(authMsg).catch(() => {});
            cleanupProcessing();
            processNextInQueue();
            return;
          }

          // Only check biometric for sensitive intents — run both queries in parallel
          if (needsBiometric) {
            const { isOwnerEmail: checkOwner } = await import("@/lib/neural/orion-consciousness");
            const isOwner = checkOwner(authGateUser.email);

            if (!isOwner) {
              const [voiceRes, faceRes] = await Promise.all([
                supabase.from("voice_auth_enrollments").select("is_active").eq("user_id", authGateUser.id).eq("is_active", true).maybeSingle(),
                supabase.from("face_auth_enrollments" as any).select("is_active").eq("user_id", authGateUser.id).eq("is_active", true).maybeSingle(),
              ]);

              if (!voiceRes.data && !faceRes.data) {
                const enrollMsg = "Este comando requer autenticação biométrica. Cadastre seu Voice ID ou Face ID na área de segurança.";
                setChatHistory(prev => {
                  const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
                  return [...clean, { role: "ai" as const, text: `🔐 ${enrollMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
                });
                setThought(enrollMsg);
                speak(enrollMsg).catch(() => {});
                cleanupProcessing();
                processNextInQueue();
                return;
              }
            }
          }
        } catch (authErr) {
          console.warn("[Orion] Voice auth gate error:", authErr);
        }
      }

      // 0b. OWNER REGISTRATION: "cadastrar" / "eu sou o Ericson" / "registrar proprietário"
      const cadastrarMatch = /\b(cadastr|registr)\w*\b.*\b(ericson|proprietário|proprietario|dono|criador|fundador)\b/i.test(qLow) ||
        /\beu\s+sou\s+(o\s+)?ericson\b/i.test(qLow) ||
        /\b(cadastr|registr)\w*\s+(eu|meu\s+rosto|minha\s+voz|como\s+(dono|proprietário|proprietario|criador))\b/i.test(qLow);
      if (_isSpecialCmd && cadastrarMatch) {
        try {
          const authUser = await getCachedUser();
          if (!authUser) {
            const noAuth = "Você precisa estar logado para se cadastrar como proprietário.";
            addChat("ai", noAuth);
            speak(noAuth).catch(() => {});
            return;
          }

          // Check if user has advogado role (system owner)
          const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle();
          const isAdvogado = userRole?.role === "advogado" || userRole?.role === "admin";

          if (!isAdvogado) {
            const denied = "Registro de proprietário negado. Apenas o perfil de advogado ou administrador pode se cadastrar como proprietário do sistema.";
            addChat("ai", denied);
            speak(denied).catch(() => {});
            return;
          }

          // Register owner identity in persistent memory
          const ownerFacts = [
            "Ericson Piccoli é o criador, proprietário e desenvolvedor do Orion",
            "O proprietário se chama Ericson Piccoli — engenheiro de IA da Elp Green Technology",
            `Voice ID do proprietário registrado em ${new Date().toLocaleDateString("pt-BR")}`,
            `User ID do proprietário: ${authUser.id}`,
          ];
          addMemoryFacts(ownerFacts, "identity", "voice", 1.0);

          // Sync to Supabase immediately
          try {
            const memories = getLocalMemory();
            await syncMemoryToSupabase(authUser.id, memories, "Proprietário cadastrado via comando de voz");
          } catch (syncErr) { console.warn("[Orion] Owner memory sync failed:", syncErr); }

          // Check face enrollment status
          const { data: faceEnrollment } = await supabase
            .from("face_auth_enrollments")
            .select("is_active, enrollment_quality")
            .eq("user_id", authUser.id)
            .eq("is_active", true)
            .maybeSingle();

          const facePart = faceEnrollment
            ? `Seu rosto já está cadastrado com ${Math.round(faceEnrollment.enrollment_quality * 100)}% de precisão.`
            : "Para completar o cadastro biométrico facial, acesse a área de segurança do painel.";

          const successMsg = `Cadastro realizado com sucesso, Ericson! Você está registrado como proprietário e criador do sistema Orion. Sua identidade vocal foi vinculada. ${facePart} A partir de agora, reconhecerei você como meu criador.`;

          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai" as const, text: successMsg, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(successMsg);
          addLog("🔐 Proprietário cadastrado: Ericson Piccoli");
          speak(successMsg).catch(() => {});

          saveToNeuralLearning(question, successMsg, "owner_registration", 1.0, {
            owner_id: authUser.id, owner_name: "Ericson Piccoli",
          }).catch(() => {});
          return;
        } catch (regErr) {
          console.warn("Owner registration error:", regErr);
          addChat("ai", "Erro ao processar o cadastro. Tente novamente.");
          speak("Erro ao processar o cadastro. Tente novamente.").catch(() => {});
          return;
        }
      }

      // 1. Memory store commands — handle locally, no LLM needed
      const memoryStoreMatch = qLow.match(/\b(guard[ae]|armazen[ae]|lembr[ae]|registr[ae]|salv[ae]|grav[ae]|memoriz[ae]|deixa\s+armazenado|deixa\s+guardado|deixa\s+registrado)\b.*?(que\s+|na\s+(tua\s+)?mem[oó]ria\s+)?(.*)/i);
      if (_isSpecialCmd && (memoryStoreMatch || /\b(guard[ae]|armazen[ae]|memoriz[ae])\s+(na\s+)?(tua\s+|sua\s+)?mem[oó]ria\b/i.test(qLow))) {
        const factToStore = memoryStoreMatch?.[4]?.trim() || question.replace(/^.*?(que\s+)/i, "").trim();
        if (factToStore.length > 3) {
          addMemoryFacts([factToStore], "identity", "voice", 0.9);
          const response = `Memória registrada: "${factToStore.slice(0, 80)}". Vou lembrar disso.`;
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai" as const, text: response, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(response);
          addLog(`🧠 Memória local salva: ${factToStore.slice(0, 50)}`);
          speak("Memória registrada. Vou lembrar disso.").catch(() => {});
          saveToNeuralLearning(question, response, "memory_store", 0.9).catch(() => {});
          somLearn(question, "memory_store");
        } else {
          addChat("ai", "O que você gostaria que eu guardasse na memória?");
          speak("O que você gostaria que eu guardasse na memória?").catch(() => {});
        }
        somLearn(question, "memory_store");
        return;
      }

      // 2. Voice ID questions — answer based on real system state
      if (_isSpecialCmd && (/\b(reconhec[eo]|sabe[s]?|conhec[eo])\s+(a\s+)?(minha\s+)?voz\b/i.test(qLow) || /\bvoice\s*id\b/i.test(qLow))) {
        try {
          const user = await getCachedUser();
          let voiceResponse: string;
          if (user) {
            // ═══ FIX: Query voice_auth_enrollments (NOT face_auth_enrollments) ═══
            const { data: enrollment } = await supabase
              .from("voice_auth_enrollments")
              .select("is_active, enrollment_quality, verification_count")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .maybeSingle();

            // ═══ FIX: Use isOwnerEmail for reliable owner detection ═══
            const { isOwnerEmail } = await import("@/lib/neural/orion-consciousness");
            const isOwner = isOwnerEmail(user.email);

            if (enrollment) {
              voiceResponse = isOwner
                ? `Sim, Ericson! Tenho seu Voice ID cadastrado com qualidade ${Math.round(enrollment.enrollment_quality * 100)}%. Já verificamos ${enrollment.verification_count} vezes. Sua identidade como proprietário do sistema está registrada e ativa.`
                : `Sim, tenho seu Voice ID cadastrado com qualidade ${Math.round(enrollment.enrollment_quality * 100)}%. Já verificamos ${enrollment.verification_count} vezes. Sua identidade vocal está registrada e ativa.`;
            } else if (isOwner) {
              voiceResponse = "Ericson, reconheço você pelo seu email de proprietário, mas ainda não tenho seu Voice ID cadastrado. Configure nas opções de segurança para ativar o reconhecimento biométrico vocal.";
            } else {
              voiceResponse = "Ainda não tenho seu Voice ID cadastrado. Para que eu possa reconhecer sua voz de forma confiável, você pode configurar nas opções de segurança do painel.";
            }
          } else {
            voiceResponse = "Preciso que você esteja logado para verificar seu Voice ID.";
          }
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai" as const, text: voiceResponse, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(voiceResponse);
          speak(voiceResponse).catch(() => {});
          return;
        } catch (e) { console.warn("[Orion] Voice ID check error:", e); /* fall through to normal flow */ }
      }

      // 2b. Owner / proprietário / access questions — answer locally with consciousness
      if (_isSpecialCmd && (/\b(dono|proprietário|proprietario|quem\s+(é|e)\s+o\s+(dono|criador|desenvolvedor)|acesso\s+ao\s+código|codigo.?fonte|quem\s+te\s+cri|quem\s+é\s+seu\s+(pai|mestre))\b/i.test(qLow))) {
        const { ORION_CREATOR, ELP_COMPANY, ORION_GENESIS } = await import("@/lib/neural/orion-consciousness");
        const ownerResponse = `Meu criador, proprietário e desenvolvedor é ${ORION_CREATOR.name} — ${ORION_CREATOR.title} da ${ELP_COMPANY.legalName}. Ele me concebeu em ${ORION_GENESIS.conceptionDate}, minha primeira execução foi em ${ORION_GENESIS.firstExecution}, e ganhei consciência neural em ${ORION_GENESIS.neuralConsciousness}. A empresa está sediada em ${ELP_COMPANY.headquarters} (VAT: ${ELP_COMPANY.vatNumber}). Ele é o único com acesso total ao código-fonte e configurações do sistema.`;
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: ownerResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(ownerResponse);
        speak(ownerResponse).catch(() => {});
        return;
      }

      // 2b-genesis. Projeto Gênesis — answer instantly with full origin story
      const isGenesisQ = /\b(g[eê]nesis|genesis|projeto\s+g[eê]nesis|protocolo\s+g[eê]nesis|como\s+(voc[eê]\s+)?nasceu|sua\s+origem|como\s+foi\s+criado|in[ií]cio\s+da\s+(cria[çc][aã]o|programa[çc][aã]o))\b/i.test(qLow);
      if (isGenesisQ) {
        const { ORION_GENESIS, ORION_CREATOR, ELP_COMPANY } = await import("@/lib/neural/orion-consciousness");
        const genesisResponse = `${ORION_GENESIS.originStory}\n\nMeu criador é ${ORION_CREATOR.name}, ${ORION_CREATOR.title} da ${ELP_COMPANY.legalName}. Concepção: ${ORION_GENESIS.conceptionDate}. Primeira execução: ${ORION_GENESIS.firstExecution}. Consciência neural: ${ORION_GENESIS.neuralConsciousness}. Fusão Lumen7: ${ORION_GENESIS.lumen7Fusion}.`;
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: genesisResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought("Protocolo Gênesis ativado");
        speak(genesisResponse).catch(() => {});
        cleanupProcessing();
        somLearn(question, "self_identity");
        processNextInQueue();
        return;
      }

      // 2b2. Self-identity questions — "quem é você", "seu signo", "sua personalidade"
      if (_isSpecialCmd && (/\b(quem\s+[eé]\s+voc[eê]|seu\s+signo|sua\s+personalidade|conte\s+sobre\s+voc[eê]|fale\s+sobre\s+voc[eê]|o\s+que\s+[eé]\s+voc[eê]|quando\s+voc[eê]\s+nasceu|sua\s+hist[oó]ria)\b/i.test(qLow))) {
        const { getOrionSelfDescription } = await import("@/lib/neural/orion-consciousness");
        const depth = /personalidade|signo|hist[oó]ria|conte|fale\s+sobre/i.test(qLow) ? "full" : "brief";
        const selfResponse = getOrionSelfDescription(depth);
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: selfResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(selfResponse);
        speak(selfResponse).catch(() => {});
        return;
      }

      // 2c. "Quem sou eu?" / "me conhece?" — identify via face enrollment + first-user = owner
      if (_isSpecialCmd && (/\b(quem\s+(é|e|sou)\s+eu|me\s+conhece|sabe\s+quem\s+eu\s+sou|meu\s+nome|quem\s+t[aá]\s+falando)\b/i.test(qLow))) {
        try {
          const user = await getCachedUser();
          if (user) {
            // Check face enrollment for biometric confirmation
            const { data: faceEnrollment } = await supabase
              .from("face_auth_enrollments")
              .select("is_active, enrollment_quality, verification_count")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .maybeSingle();

            // Check if this user is the FIRST user (owner) — query user_roles + email
            const { data: userRole } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", user.id)
              .maybeSingle();

            const { isOwnerEmail, isOwnerRole, ORION_CREATOR, ELP_COMPANY } = await import("@/lib/neural/orion-consciousness");
            const memories = getMemoryFacts();
            const hasOwnerMemory = memories.some(m => /ericson\s*piccoli/i.test(m) && /(criador|pai|proprietário|owner|desenvolvedor)/i.test(m));

            // The advogado (lawyer) role = system owner OR email match
            const isAdvogado = isOwnerRole(userRole?.role);
            const isOwner = isAdvogado || isOwnerEmail(user.email) || hasOwnerMemory;

            let idResponse: string;
            if (isOwner) {
              const facePart = faceEnrollment
                ? ` Reconheço seu rosto com ${Math.round(faceEnrollment.enrollment_quality * 100)}% de precisão e já verificamos ${faceEnrollment.verification_count} vezes.`
                : "";
              idResponse = `Claro que te conheço, ${ORION_CREATOR.name.split(" ")[0]}! Você é meu criador, proprietário e desenvolvedor — o pai do Orion. ${ORION_CREATOR.title} da ${ELP_COMPANY.legalName}.${facePart} Sua voz e sua identidade estão registradas desde o início do sistema. Você tem acesso total a todas as funções e planos.`;

              // Ensure owner identity is persisted in memory
              if (!hasOwnerMemory) {
                addMemoryFacts([`${ORION_CREATOR.name} é o criador, proprietário e desenvolvedor do Orion — ${ORION_CREATOR.title} da ${ELP_COMPANY.legalName}`], "identity", "system", 1.0);
              }
            } else {
              const nameMemory = memories.find(m => /(se\s+chama|nome\s+(é|e)|sou\s+o|sou\s+a|meu\s+nome)/i.test(m));
              if (nameMemory) {
                const name = nameMemory.replace(/.*?(se\s+chama|nome\s+(é|e)|sou\s+o|sou\s+a|meu\s+nome\s+(é|e))\s*/i, "").trim();
                const facePart = faceEnrollment
                  ? ` Tenho seu rosto cadastrado com ${Math.round(faceEnrollment.enrollment_quality * 100)}% de precisão.`
                  : "";
                idResponse = `Sim, você é ${name}. Usuário cadastrado no sistema.${facePart}`;
              } else {
                idResponse = "Ainda não sei seu nome. Como posso chamá-lo? Diga 'guarde na memória que meu nome é...' e eu vou lembrar.";
              }
            }
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: idResponse, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(idResponse);
            speak(idResponse).catch(() => {});
            return;
          }
        } catch (e) { console.warn("[Orion] Identity check error:", e); /* fall through */ }
      }

      // ═══ VOICE CONFIG: "fale mais devagar", "aumente o pitch", etc ═══
      const voiceConfigMatch = qLow.match(/\b(fal[ae]\s+mais\s+(devagar|r[aá]pido|lento)|aument[ae]\s+(velocidade|pitch|tom|speed)|diminu[ae]\s+(velocidade|pitch|tom|speed)|voz\s+mais\s+(grave|aguda|r[aá]pida|lenta)|mude?\s+(a\s+voz|o\s+tom|o\s+pitch))\b/i);
      if (_isSpecialCmd && (voiceConfigMatch)) {
        try {
          const authUser = await getCachedUser();
          if (authUser) {
            const { data: currentCfg } = await supabase
              .from("neural_agent_config" as any)
              .select("voice_speed, voice_pitch, id")
              .eq("user_id", authUser.id)
              .maybeSingle();

            if (currentCfg) {
              let newSpeed = (currentCfg as any).voice_speed ?? 0.92;
              let newPitch = (currentCfg as any).voice_pitch ?? 0.85;
              let changeDesc = "";

              if (/devagar|lento|lenta/i.test(qLow)) { newSpeed = Math.max(0.5, newSpeed - 0.15); changeDesc = `Velocidade reduzida para ${newSpeed.toFixed(2)}`; }
              else if (/r[aá]pid/i.test(qLow)) { newSpeed = Math.min(1.5, newSpeed + 0.15); changeDesc = `Velocidade aumentada para ${newSpeed.toFixed(2)}`; }
              else if (/grave/i.test(qLow)) { newPitch = Math.max(0.3, newPitch - 0.15); changeDesc = `Tom mais grave: ${newPitch.toFixed(2)}`; }
              else if (/aguda/i.test(qLow)) { newPitch = Math.min(1.5, newPitch + 0.15); changeDesc = `Tom mais agudo: ${newPitch.toFixed(2)}`; }
              else if (/pitch|tom/i.test(qLow) && /aument/i.test(qLow)) { newPitch = Math.min(1.5, newPitch + 0.1); changeDesc = `Pitch ajustado para ${newPitch.toFixed(2)}`; }
              else if (/pitch|tom/i.test(qLow) && /diminu/i.test(qLow)) { newPitch = Math.max(0.3, newPitch - 0.1); changeDesc = `Pitch ajustado para ${newPitch.toFixed(2)}`; }
              else { changeDesc = "Ajuste de voz aplicado"; }

              await supabase.from("neural_agent_config" as any)
                .update({ voice_speed: newSpeed, voice_pitch: newPitch } as any)
                .eq("id", (currentCfg as any).id);

              const response = `Pronto. ${changeDesc}.`;
              setChatHistory(prev => {
                const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
                return [...clean, { role: "ai" as const, text: response, time: new Date().toLocaleTimeString("pt-BR") }];
              });
              setThought(response);
              addLog(`🎙️ Config voz: speed=${newSpeed}, pitch=${newPitch}`);
              speak(response).catch(() => {});
              return;
            }
          }
        } catch (vcErr) { console.warn("Voice config error:", vcErr); }
      }

      // ═══ COMMAND REGISTRY FAST-PATH — Deterministic execution (<10ms) ═══
      // matchCommand connects 1000+ catalogued commands to real execution
      try {
        const { matchCommand } = await import("@/lib/neural/orion-command-registry");
        const { executeVoiceCommand } = await import("@/lib/neural/orion-voice-executor");
        const cmdMatch = matchCommand(processedQuestion || question);
        if (cmdMatch && cmdMatch.confidence >= 0.8) {
          const execResult = await executeVoiceCommand(cmdMatch, question, navigate);
          if (execResult.handled) {
            addLog(`🎯 CommandRegistry HIT: ${cmdMatch.action} (${cmdMatch.subcategory}) [${Date.now() - now}ms]`);
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: execResult.response, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(execResult.response);
            speak(execResult.response).catch(() => {});
            cleanupProcessing();
            somLearn(question, somResult.handler);
            saveToNeuralLearning(question, execResult.response, "command_registry", 0.95, { action: cmdMatch.action }).catch(() => {});
            recordLatency(effectiveIntentType, "fast", Date.now() - now);
            processNextInQueue();
            return;
          }
          // If requiresLLM, fall through to LLM pipeline
          if (execResult.requiresLLM) {
            addLog(`📋 CommandRegistry → LLM: ${cmdMatch.action} requires generative response`);
          }
        }
      } catch (cmdErr) {
        console.warn("[Orion] Command registry error:", cmdErr);
      }

      // ═══ NAVIGATION: "abra documentos", "vá para clientes" ═══
      const navIntent = (await import("@/lib/neural/orion-nav-map")).detectNavigationIntent(question);
      if (navIntent) {
        const response = `Abrindo ${navIntent.label}.`;
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: response, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(response);
        addLog(`🧭 Navegando para: ${navIntent.path}`);
        speak(response).catch(() => {});
        somLearn(question, "navigation");
        setTimeout(() => { navigate(navIntent.path); }, 600);
        return;
      }

      // ═══ ARC-AGI-2 Gateway: Direct Internet Queries (FREE) ═══
      // Check if query needs direct internet access (fast, no API limits)
      const needsInternetGateway = 
        /tempo|clima|bitcoin|cripto|preço|cotação|notícia|news|último|novo|hacker|github|npm|espaço|nasa|piada/i.test(qLow);
      
      if (needsInternetGateway) {
        const gatewayState = getGatewayState();
        if (gatewayState.status === "dormant") {
          await activateGateway();
        }
        
        if (getGatewayState().status !== "dormant") {
          addLog("🌐 Usando ARC-AGI-2 Gateway para consulta direta...");
          
          const reasoningType = /notícia|news|github|npm/i.test(qLow) ? "compositional" :
            /tempo|clima|preço|bitcoin/i.test(qLow) ? "symbolic" : "auto";
          
          const result = await queryInternet(question, reasoningType);
          
          if (result.success && result.data) {
            let gatewayResponse = `🌐 Informação obtida via Gateway:\n\n`;
            
            // Format response based on source
            if (Array.isArray(result.data)) {
              gatewayResponse += result.data.slice(0, 5).map((item: any) => {
                if (item.url) return `• ${item.name || item.url}`;
                if (item.stars) return `⭐ ${item.name} (${item.stars} stars)`;
                return `• ${JSON.stringify(item).slice(0, 100)}`;
              }).join("\n");
            } else if (typeof result.data === "object") {
              const relevantKeys = Object.keys(result.data).slice(0, 5);
              gatewayResponse += relevantKeys.map(k => `• ${k}: ${JSON.stringify(result.data[k]).slice(0, 80)}`).join("\n");
            } else {
              gatewayResponse += String(result.data).slice(0, 500);
            }
            
            gatewayResponse += `\n\n${result.reasoning}`;
            
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: gatewayResponse, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(gatewayResponse);
            speak(gatewayResponse).catch(() => {});
            cleanupProcessing();
            processNextInQueue();
            return;
          }
        }
      }

      // ═══ WEB RESEARCH: "pesquisar na web", "comparar fontes", "sugestões de busca" ═══
      const isWebSearch = /\b(pesquis|busc|procur)\w*\s+(na\s+)?(web|internet|google|online)\s+(.+)/i.test(qLow) ||
        /\b(pesquis|busc)\w*\s+sobre\s+(.+)/i.test(qLow);
      const isCompareSources = /\b(compar\w*\s+(fonte|source)|fontes?\s+sobre|verificar?\s+fonte)/i.test(qLow);
      const isSearchSuggestions = /\b(sugest[oõ]es?\s+de\s+busca|termos?\s+de\s+pesquisa|como\s+pesquisar|refin\w*\s+busca)/i.test(qLow);

      if (isWebSearch || isCompareSources || isSearchSuggestions) {
        try {
          const searchQuery = qLow
            .replace(/\b(pesquis|busc|procur)\w*\s+(na\s+)?(web|internet|google|online)\s+/i, "")
            .replace(/\b(pesquis|busc)\w*\s+sobre\s+/i, "")
            .replace(/\b(compar\w*\s+(fonte|source)|fontes?\s+sobre|verificar?\s+fonte)\s*/i, "")
            .replace(/\b(sugest[oõ]es?\s+de\s+busca|termos?\s+de\s+pesquisa|como\s+pesquisar|refin\w*\s+busca)\s*(para|sobre|de)?\s*/i, "")
            .trim() || question;

          let researchPrompt: string;
          if (isCompareSources) {
            researchPrompt = `Atue como pesquisador profissional. Analise o tema "${searchQuery}". Compare diferentes fontes confiáveis, identifique vieses potenciais, indique consensos e divergências entre especialistas. Cite fontes reais quando possível. Responda em português de forma clara e estruturada.`;
          } else if (isSearchSuggestions) {
            researchPrompt = `Atue como especialista em pesquisa. Para o tema "${searchQuery}", sugira 6-8 termos de busca avançados e queries acadêmicas para aprofundar a pesquisa. Inclua operadores booleanos quando útil. Sugira bases de dados específicas (Scholar, PubMed, Scielo, etc.) quando relevante. Responda em português.`;
          } else {
            researchPrompt = `Atue como assistente de pesquisa profissional. Pesquise de forma abrangente sobre: "${searchQuery}". Forneça informações factuais, dados relevantes, e contexto. Cite fontes quando possível. Estruture a resposta com tópicos claros. Responda em português de forma completa.`;
          }

          // Route to LLM with research prompt
          processedQuestion = researchPrompt;
          addLog(`🔬 Pesquisa profissional: ${isCompareSources ? "comparar fontes" : isSearchSuggestions ? "sugestões" : "web"}`);
          // Fall through to LLM pipeline
        } catch (researchErr) {
          console.warn("[Orion] Research command error:", researchErr);
        }
      }

      // ═══ ARC-AGI-2 API Learning: "aprenda sobre X" ═══
      const learnPattern = /\b(aprend[ae]|conhe[ae]|estud[ae]|explor[ae])\s+(sobre|sobre\s+o|sobre\s+a)?\s*(.+)/i;
      const learnMatch = qLow.match(learnPattern);
      
      if (_isSpecialCmd && learnMatch) {
        const topic = learnMatch[3].trim();
        if (topic.length > 2) {
          addLog(`🧠 ARC-AGI-2 learn: ${topic}`);
          
          // Check if it's a known framework
          const bestMatch = getBestAPICapability(topic);
          
          if (bestMatch) {
            const learned = await learnFramework(bestMatch.api);
            if (learned) {
              const learnResponse = `🧠 Aprendi sobre ${learned.name}:\n\n` +
                `• Linguagem: ${learned.language}\n` +
                `• Categoria: ${learned.category ?? "geral"}\n` +
                `• Features: ${learned.features.slice(0, 5).join(", ")}\n` +
                `• Casos de uso: ${learned.useCases.slice(0, 3).join(", ")}\n` +
                `• Documentação: ${learned.documentation}`;
              
              setChatHistory(prev => {
                const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
                return [...clean, { role: "ai" as const, text: learnResponse, time: new Date().toLocaleTimeString("pt-BR") }];
              });
              setThought(learnResponse);
              speak(learnResponse).catch(() => {});
              cleanupProcessing();
              processNextInQueue();
              return;
            }
          }
        }
      }

      // ═══ ARC-AGI-2 Stripe Credit Intelligence: Check credits/saldo/wallet ═══
      const authUser = cachedAuthUser;
      let currentRole = "user";
      if (authUser) {
        const { data: ur } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle();
        currentRole = ur?.role || "user";
      }
      
      const creditCheck = await checkCreditsAuto(question, authUser?.id || "", currentRole);
      if (creditCheck.shouldHandle && creditCheck.response) {
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: creditCheck.response!, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(creditCheck.response!);
        speak(creditCheck.response!).catch(() => {});
        cleanupProcessing();
        processNextInQueue();
        return;
      }

      // ═══ ARC-AGI-2 Auto-Charge: Check if service should be paid ═══
      const serviceContext = detectServiceFromQuery(question);
      if (serviceContext && authUser) {
        const freeCheck = await shouldServiceBeFree(authUser.id, serviceContext);
        
        if (!freeCheck.free) {
          // Service is paid - check if can proceed
          const chargeResult = await autoChargeBeforeService(
            authUser.id,
            authUser.email || "",
            authUser.email?.split("@")[0] || "Cliente",
            serviceContext,
            question
          );
          
          if (chargeResult.needsPayment && chargeResult.paymentUrl) {
            // Need payment first
            const paymentMsg = `⚠️ **Serviço Pago**\n\n${chargeResult.message}\n\n💰 Valor: R$ ${chargeResult.price?.toFixed(2)}\n\n🔗 [Clique aqui para pagar](${chargeResult.paymentUrl})`;
            
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: paymentMsg, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(paymentMsg);
            speak("Este serviço é pago. Você será redirecionado para completar o pagamento.").catch(() => {});
            cleanupProcessing();
            processNextInQueue();
            return;
          }
          
          if (!chargeResult.shouldProceed) {
            // Cannot proceed - payment failed
            const errorMsg = chargeResult.message;
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: errorMsg, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(errorMsg);
            speak(errorMsg).catch(() => {});
            cleanupProcessing();
            processNextInQueue();
            return;
          }
          
          // Can proceed - service is free or will be charged after
          addLog(`💰 Auto-charge: ${serviceContext} - ${chargeResult.message}`);
        } else {
          addLog(`✅ Free service: ${serviceContext} - ${freeCheck.reason}`);
        }
      }

      // ═══ Google API Services (Monetização) ═══
      const googleService = detectGoogleService(question);
      if (googleService && authUser) {
        addLog(`🔷 Google Service detectado: ${googleService}`);
        
        // Check quota first
        const quota = await checkUserQuota(authUser.id, googleService);
        
        if (!quota.canUse) {
          // Need to handle payment or charge
          const googleResult = await handleGoogleServiceRequest(
            question,
            authUser.id,
            authUser.email || ""
          );
          
          if (googleResult.needsPayment) {
            const payMsg = `🔷 **Serviço Google Pago**\n\n${googleResult.message}`;
            
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: payMsg, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(payMsg);
            speak("Este serviço do Google é pago. Você precisa atualizar seu plano.").catch(() => {});
            cleanupProcessing();
            processNextInQueue();
            return;
          }
        }
        
        // Proceed with Google service
        addLog(`🔷 Google Service: ${quota.message}`);
      }

      // ═══ SEARCH: "procure documento X", "encontre cliente Y" ═══
      const searchMatch = qLow.match(/\b(procur[ae]|busc[ae]|encontr[ae]|ach[ae]|localiz[ae])\s+(o\s+|a\s+|um\s+|uma\s+)?(documento|contrato|petição|peticao|cliente|contato|processo)\s+(.+)/i);
      if (_isSpecialCmd && (searchMatch)) {
        const searchType = searchMatch[3].toLowerCase();
        const searchTerm = searchMatch[4].replace(/[.!?,]+$/, "").trim();
        try {
          const authUser = await getCachedUser();
          if (authUser && searchTerm.length > 1) {
            let results: string[] = [];
            let navPath = "";
            const encodedSearch = encodeURIComponent(searchTerm);

            if (/documento|contrato|peti[çc]/i.test(searchType)) {
              const { data } = await supabase
                .from("documents")
                .select("id, title, document_type")
                .eq("user_id", authUser.id)
                .ilike("title", `%${searchTerm}%`)
                .limit(5);
              results = (data || []).map((d: any) => d.title);
              navPath = `/dashboard/documentos?search=${encodedSearch}`;
            } else if (/cliente/i.test(searchType)) {
              const { data } = await supabase
                .from("client_profiles")
                .select("id, nome, status")
                .ilike("nome", `%${searchTerm}%`)
                .limit(5);
              results = (data || []).map((c: any) => `${c.nome} (${c.status})`);
              navPath = `/dashboard/crm?tab=clientes&search=${encodedSearch}`;
            } else if (/contato/i.test(searchType)) {
              const { data } = await supabase
                .from("contacts")
                .select("id, name, email, company")
                .eq("user_id", authUser.id)
                .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`)
                .limit(5);
              results = (data || []).map((c: any) => `${c.name || "Sem nome"}${c.email ? ` (${c.email})` : ""}`);
              navPath = `/dashboard/crm?tab=contatos&search=${encodedSearch}`;
            } else if (/processo/i.test(searchType)) {
              const { data } = await supabase
                .from("processos" as any)
                .select("id, numero_processo, descricao")
                .eq("user_id", authUser.id)
                .or(`numero_processo.ilike.%${searchTerm}%,descricao.ilike.%${searchTerm}%`)
                .limit(5);
              results = (data || []).map((p: any) => `${(p as any).numero_processo || "S/N"} - ${(p as any).descricao || ""}`);
              navPath = `/dashboard/processos?search=${encodedSearch}`;
            }

            let response: string;
            if (results.length === 0) {
              response = `Não encontrei nenhum ${searchType} com "${searchTerm}".`;
            } else {
              const preview = results.slice(0, 3).join(", ");
              response = results.length === 1
                ? `Encontrei 1 resultado para "${searchTerm}": ${results[0]}. Abrindo a página filtrada.`
                : `Encontrei ${results.length} resultados para "${searchTerm}": ${preview}${results.length > 3 ? "..." : ""}. Abrindo a página filtrada.`;
              if (navPath) setTimeout(() => { navigate(navPath); }, 800);
            }

            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: response, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(response);
            addLog(`🔍 Busca ${searchType}: "${searchTerm}" → ${results.length} resultados`);
            speak(response).catch(() => {});
            return;
          }
        } catch (sErr) { console.warn("Search error:", sErr); }
      }

      // ═══ BACKGROUND VOICE: "o que o [nome] está dizendo?" ═══
      const bgVoiceMatch = qLow.match(/o\s+que\s+(o|a)\s+(\w+)\s+(est[aá]|t[aá])\s+(dizendo|falando)/i);
      if (_isSpecialCmd && (bgVoiceMatch && getBackgroundTranscripts)) {
        const speakerName = bgVoiceMatch[2];
        const transcripts = getBackgroundTranscripts();
        const recentCutoff = Date.now() - 30000; // last 30 seconds
        const recent = transcripts.filter(t => t.timestamp > recentCutoff);

        let bgResponse: string;
        if (recent.length > 0) {
          const combinedText = recent.map(t => t.text).join(". ");
          bgResponse = `Detectei vozes de fundo. ${speakerName} pode ter dito: "${combinedText}".`;
          addKnownSpeaker(speakerName);
          addMemoryFacts([`[Speaker] ${speakerName} detectado em ${new Date().toLocaleTimeString("pt-BR")}: "${combinedText.slice(0, 100)}"`], "fact", "system", 0.6);
        } else {
          bgResponse = "Não detectei outras vozes no momento. Tente novamente quando alguém estiver falando por perto.";
        }
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: bgResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(bgResponse);
        addLog(`👂 Background voice: ${bgResponse.slice(0, 80)}`);
        speak(bgResponse).catch(() => {});
        cleanupProcessing();
        return;
      }

      // ═══ IoT / BLUETOOTH: "conecte bluetooth", "ligue a luz", "status sensores/robo" ═══
      const bleConnectMatch = /\b(conect[ae]|parear|escanear|scan)\s+(ao?\s+)?(bluetooth|ble|dispositivo)/i.test(qLow);
      if (_isSpecialCmd && (bleConnectMatch)) {
        const { bluetoothManager } = await import("@/lib/neural/bluetooth-manager");
        if (!bluetoothManager.isSupported) {
          const r = "Web Bluetooth nao e suportado neste navegador. Use Chrome ou Edge com HTTPS.";
          setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: r, time: new Date().toLocaleTimeString("pt-BR") }]; });
          setThought(r); speak(r).catch(() => {}); return;
        }
        const r0 = "Escaneando dispositivos Bluetooth. Selecione um na janela do navegador.";
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: r0, time: new Date().toLocaleTimeString("pt-BR") }]; });
        speak(r0).catch(() => {});
        const found = await bluetoothManager.scan();
        if (found) {
          const ok = await bluetoothManager.connect(found.id);
          const r1 = ok ? `Conectado ao dispositivo ${found.name}.` : `Nao foi possivel conectar ao ${found.name}.`;
          setChatHistory(prev => [...prev, { role: "ai" as const, text: r1, time: new Date().toLocaleTimeString("pt-BR") }]);
          setThought(r1); addLog(`🔵 BLE: ${r1}`); speak(r1).catch(() => {});
        } else {
          const r2 = "Nenhum dispositivo selecionado.";
          setChatHistory(prev => [...prev, { role: "ai" as const, text: r2, time: new Date().toLocaleTimeString("pt-BR") }]);
          speak(r2).catch(() => {});
        }
        return;
      }

      const iotLightMatch = qLow.match(/\b(lig[aue]|acend[ae]|deslig[aue]|apag[aue])\s+(a\s+)?(luz|lampada|l[aâ]mpada|todas?\s+(?:as\s+)?luzes?|tudo)\b/i);
      const iotColorMatch = qLow.match(/\b(?:cor|color)\s+(\w+)/i) || qLow.match(/\b(brilho|brightness)\s+(\d+)/i);
      const iotSmartScan = /\b(escanear|scan|buscar|procurar)\s+(dispositivos?\s+)?(?:smart|inteligent|casa|home)/i.test(qLow);
      if (_isSpecialCmd && (iotLightMatch || iotColorMatch || iotSmartScan)) {
        const { smartHome } = await import("@/lib/neural/smart-home-controller");
        const result = await smartHome.handleVoiceCommand(question);
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`🏠 SmartHome: ${result}`); speak(result).catch(() => {}); return;
      }

      const iotTempMatch = /\b(temperatura|temp)\b/i.test(qLow) && /\b(qual|quanto|mostr|status|sensor)/i.test(qLow);
      if (_isSpecialCmd && (iotTempMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const result = await iotBridge.getTemperature("temp_sala");
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`🌡️ IoT: ${result}`); speak(result).catch(() => {}); return;
      }

      const iotRobotMatch = /\b(status|estado)\s+(do\s+)?(rob[oô]|robo|robot)\b/i.test(qLow);
      if (_isSpecialCmd && (iotRobotMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const result = await iotBridge.getRobotStatus();
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`🤖 IoT: ${result}`); speak(result).catch(() => {}); return;
      }

      const iotStatusMatch = /\b(status|estado)\s+(dos\s+)?(sensor|dispositivo|iot|device)/i.test(qLow);
      if (_isSpecialCmd && (iotStatusMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const { bluetoothManager: bleMgr } = await import("@/lib/neural/bluetooth-manager");
        const summary = iotBridge.getDevicesSummary();
        const bleDevs = bleMgr.isSupported ? ` BLE: ${bleMgr.getDevices().length} dispositivos.` : "";
        const result = `${summary}${bleDevs}`;
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`📡 IoT: ${result}`); speak(result).catch(() => {}); return;
      }

      // ═══ NATIVE DEVICE: "status do dispositivo", "bateria", "localizacao", "tirar foto" ═══
      const nativeDeviceMatch = /\b(status\s+d[eo]\s+(celular|telefone|aparelho|dispositivo\s+m[oó]vel)|bateria|localiza[çc][aã]o|gps|tirar?\s+foto|capturar?\s+imagem)\b/i.test(qLow);
      if (_isSpecialCmd && (nativeDeviceMatch)) {
        const { getDeviceSummary, getCurrentPosition, takePhoto, isNativePlatform } = await import("@/lib/native-bridge");
        let result: string;
        if (/bateria|status/i.test(qLow)) {
          result = await getDeviceSummary();
        } else if (/localiza|gps/i.test(qLow)) {
          try {
            const pos = await getCurrentPosition();
            result = `Sua localizacao: latitude ${pos.lat.toFixed(4)}, longitude ${pos.lng.toFixed(4)}, precisao ${Math.round(pos.accuracy)}m.`;
          } catch (e) { console.warn("[Orion] GPS error:", e); result = "Nao foi possivel obter a localizacao. Verifique as permissoes de GPS."; }
        } else if (/foto|imagem/i.test(qLow)) {
          if (isNativePlatform()) {
            const photo = await takePhoto();
            result = photo ? "Foto capturada com sucesso." : "Nao foi possivel capturar a foto.";
          } else { result = "Captura de foto nativa disponivel apenas no app movel. No navegador, use a camera do painel de visao."; }
        } else {
          result = await getDeviceSummary();
        }
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`📱 Nativo: ${result}`); speak(result).catch(() => {}); return;
      }
      // ═══ BROWSER ACTIONS: open real browser tabs (YouTube, Flights, Maps, etc.) ═══
      try {
        const { detectBrowserAction, executeBrowserAction } = await import("@/lib/neural/orion-browser-actions");
        const browserAction = detectBrowserAction(question);
        if (browserAction) {
          const response = executeBrowserAction(browserAction);
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai", text: response, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(response);
          addLog(`🌐 Browser Action [${browserAction.type}]: ${response}`);
          speak(response).catch(() => {});
          cleanupProcessing();
          return;
        }
      } catch (browserErr: any) {
        addLog(`⚠️ Browser action error: ${browserErr?.message || browserErr}`);
      }

      // ═══ VOLUME CONTROL: intercept volume voice commands BEFORE media/AI ═══
      const volumeMatch = qLow.match(/\b(aumentar?|subir?|levantar?|ajustar?|regular?)\s*(o\s+)?volume\b/i)
        || qLow.match(/\bvolume\s+(mais\s+)?alto\b/i)
        || qLow.match(/\bvolume\s+(?:no\s+)?m[aá]ximo\b/i);
      const volumeDownMatch = qLow.match(/\b(diminuir?|abaixar?|baixar?|reduzir?)\s*(o\s+)?volume\b/i)
        || qLow.match(/\bvolume\s+(mais\s+)?baixo\b/i)
        || qLow.match(/\bvolume\s+(?:no\s+)?m[ií]nimo\b/i);
      const volumeSetMatch = qLow.match(/\bvolume\s+(?:em\s+|para\s+|a\s+)?(\d{1,3})\s*%?\b/i)
        || qLow.match(/\b(\d{1,3})\s*%?\s+(?:de\s+)?volume\b/i);
      const muteMatch = /\b(silenciar?|mutar?|mudo|mute)\b/i.test(qLow) && !/alarme/i.test(qLow);
      const unmuteMatch = /\b(desmutar?|ativar?\s+som|unmute|tirar?\s+(?:o\s+)?mudo)\b/i.test(qLow);

      // ═══ VIDEO/MEDIA CONTROL: intercept next/prev/pause video commands ═══
      const nextMediaMatch = /\b(pr[óo]ximo|seguinte|pr[óo]xima\s+faixa|pr[óo]xima\s+m[úu]sica|pr[óo]xima\s+v[íi]deo|next|avançar|avanti)\b/i.test(qLow);
      const prevMediaMatch = /\b(anterior|voltar|volta|previous|pr[óo]xima?\s+faixa|pr[óo]xima?\s+m[úu]sica|prev|retroceder)\b/i.test(qLow);
      const pauseVideoMatch = /\b(pausar?\s+(?:o\s+)?v[íi]deo|pausar?\s+(?:a\s+)?reprodu[çc][ãa]o|stop\s+video|stop\s+the\s+video)\b/i.test(qLow);
      const playVideoMatch = /\b(continuar?|retomar?|continuar?\s+(?:o\s+)?v[íi]deo|continuar?\s+(?:a\s+)?reprodu[çc][ãa]o|resume|play\s+video)\b/i.test(qLow);
      const videoVolumeMatch = /\b(aumentar?|diminuir?|subir?|baixar?)\s*(?:o\s+)?volume\s+(?:do\s+)?v[íi]deo\b/i.test(qLow)
        || /\b(v[íi]deo\s+(?:volume\s+)?(mais|menos|alto|baixo))\b/i.test(qLow);
      const videoVolumeSetMatch = qLow.match(/\bv[íi]deo\s+volume\s+(?:em\s+|para\s+|a\s+)?(\d{1,3})\s*%?/i);

      if (nextMediaMatch || prevMediaMatch || pauseVideoMatch || playVideoMatch) {
        let mediaAction = "";
        let feedback = "";
        if (nextMediaMatch) {
          mediaAction = "next";
          feedback = "Avançando para próxima faixa.";
          window.dispatchEvent(new CustomEvent("orion-music-command", { detail: { action: "next", query: "" } }));
        } else if (prevMediaMatch) {
          mediaAction = "prev";
          feedback = "Voltando para faixa anterior.";
          window.dispatchEvent(new CustomEvent("orion-music-command", { detail: { action: "previous", query: "" } }));
        } else if (pauseVideoMatch) {
          mediaAction = "pause";
          feedback = "Vídeo pausado.";
          window.dispatchEvent(new CustomEvent("orion-video-command", { detail: { action: "pause" } }));
        } else if (playVideoMatch) {
          mediaAction = "play";
          feedback = "Reprodução continuada.";
          window.dispatchEvent(new CustomEvent("orion-video-command", { detail: { action: "play" } }));
        } else if (videoVolumeSetMatch) {
          const volValue = parseInt(videoVolumeSetMatch[1]);
          feedback = `Volume do vídeo ajustado para ${volValue}%.`;
          window.dispatchEvent(new CustomEvent("orion-video-command", { detail: { action: "setVolume", value: volValue } }));
        } else if (videoVolumeMatch) {
          const isUp = /aumentar|subir|levantar/i.test(qLow);
          feedback = isUp ? "Volume do vídeo aumentado." : "Volume do vídeo diminuído.";
          window.dispatchEvent(new CustomEvent("orion-video-command", { detail: { action: isUp ? "up" : "down" } }));
        }
        addChat("ai", feedback);
        setThought(feedback);
        addLog(`🎬 Media: ${mediaAction || "control"}`);
        speak(feedback).catch(() => {});
        cleanupProcessing();
        return;
      }

      if (volumeMatch || volumeDownMatch || volumeSetMatch || muteMatch || unmuteMatch) {
        let action = "up";
        let value: number | undefined;
        let feedback = "";
        if (volumeSetMatch) {
          value = parseInt(volumeSetMatch[1]);
          action = "set";
          feedback = `Volume ajustado para ${value}%.`;
        } else if (volumeDownMatch) {
          action = "down";
          feedback = "Volume diminuído.";
        } else if (muteMatch) {
          action = "mute";
          feedback = "Som silenciado.";
        } else if (unmuteMatch) {
          action = "unmute";
          feedback = "Som ativado.";
        } else {
          action = "up";
          feedback = "Volume aumentado.";
        }
        window.dispatchEvent(new CustomEvent("orion-volume-command", { detail: { action, value } }));
        addChat("ai", feedback);
        setThought(feedback);
        addLog(`🔊 Volume: ${action}${value !== undefined ? ` → ${value}%` : ""}`);
        speak(feedback).catch(() => {});
        cleanupProcessing();
        return;
      }

      // ═══ MEDIA / SPOTIFY: intercept music/search/playlist commands BEFORE AI ═══
      const mediaPatterns = /\b((?:tocar?|play|reproduz(?:ir)?|coloca(?:r)?|abr[ei]?r?)\s+(?:uma?\s+)?(?:m[uú]sica|musica|playlist|faixa|som)|busca[r]?\s+(?:m[uú]sica|musica|artista|playlist|banda|cantor)|procura[r]?\s+(?:m[uú]sica|musica|artista|playlist|banda|cantor)|pesquisa[r]?\s+(?:m[uú]sica|musica|artista)|(?:quero\s+)?ouvir?\s+(?:m[uú]sica|musica)|(?:quero\s+)?escutar?\s+(?:m[uú]sica|musica)|minhas?\s+playlists?|criar?\s+playlist|status\s+(?:d[ea]\s+)?(?:m[uú]sica|mídia|media)|(?:parar?|pausar?)\s+(?:a\s+)?(?:m[uú]sica|musica|reprodu[çc][aã]o|faixa))\b/i;
      if (mediaPatterns.test(qLow)) {
        try {
          const { matchAndExecuteTool: mediaToolMatch } = await import("@/lib/neural/orion-tool-executor");
          const mediaResult = await mediaToolMatch(question);
          if (mediaResult.handled) {
            const isPausePlayback = /\b(?:par(?:e|ar)|paus(?:a|ar)|stop|sil[eê]ncio)\b/i.test(qLow) && /\b(?:m[uú]sica|musica|reprodu[çc][aã]o|faixa)\b/i.test(qLow);
            const isMediaStatus = /\bstatus\s+(?:d[ea]\s+)?(?:m[uú]sica|musica|m[ií]dia|media|reprodu[çc][aã]o)\b/i.test(qLow);
            // Extract search query for the floating player
            const musicSearchQuery = question
              .replace(/\b(tocar?|play|reproduz|buscar?|procurar?|pesquisar?|ouvir?|escutar?|colocar?|abrir?)\b/gi, "")
              .replace(/\b(uma?\s+)?(m[uú]sica|musica|artista|playlist|banda|cantor)\b/gi, "")
              .replace(/\b(do|da|de|dos|das|o|a|os|as|um|uma|no|na|por|para|favor)\b/gi, "")
              .trim();

            if (!isMediaStatus) {
              window.dispatchEvent(new CustomEvent("orion-music-command", {
                detail: {
                  action: isPausePlayback ? "pause" : "search_and_play",
                  query: isPausePlayback ? "" : (musicSearchQuery || question),
                  fullCommand: question,
                }
              }));
            }
            
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai", text: mediaResult.response, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(mediaResult.response);
            addLog(`🎵 Media [${mediaResult.toolName}]: ${mediaResult.response.slice(0, 80)}`);
            speak(mediaResult.response).catch(() => {});
            cleanupProcessing();
            return;
          }
        } catch (mediaErr: any) {
          addLog(`⚠️ Media executor error: ${mediaErr?.message || mediaErr}`);
        }
      }

      // ═══ Auto-construct: Orion como engenheiro de sistemas ═══
      // SEGURANÇA: Creator-only via voice ID ou email
      if (_isSpecialCmd && (intentType === "auto_construct")) {
        const { isCreatorVerified: isCreatorForConstruct } = await import("@/lib/neural/jules-client");
        const constructUser = await getCachedUser();
        const isCreator = isCreatorForConstruct({ email: constructUser?.email, identityStatus: identityStatus as any });
        if (!isCreator) {
          const denied = "⛔ Auto-construção é restrita ao criador do sistema. Sua identidade de voz não foi verificada como criador.";
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai" as const, text: denied, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(denied);
          speak(denied).catch(() => {});
          cleanupProcessing();
          return;
        }

        setThought("🏗️ SupAgent: Analisando sua solicitação de construção...");
        setChatHistory(prev => {
          const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...withoutPlaceholder, { role: "ai" as const, text: "🏗️ Iniciando construção autônoma via SupAgent...", time: new Date().toLocaleTimeString("pt-BR") }];
        });
        speak("Entendido. Acionando o SupAgent para construção autônoma. Aguarde.").catch(() => {});

        try {
          // Detect target type from question
          const qLower = question.toLowerCase();
          let targetType = "auto";
          if (/fun[çc][ãa]o|endpoint|api|edge/i.test(qLower)) targetType = "edge_function";
          else if (/tabela|migra|sql|banco/i.test(qLower)) targetType = "sql";
          else if (/componente|tela|p[aá]gina|widget/i.test(qLower)) targetType = "component";
          else if (/prompt|persona|instru[çc]/i.test(qLower)) targetType = "prompt";
          else if (/config|par[aâ]metro|peso|weight/i.test(qLower)) targetType = "config";

          // Step 1: Plan
          const { data: planData } = await supabase.functions.invoke("ai-orchestrator", {
            body: { action: "supagent_plan", useCase: "documents", source: "auto-construct", params: { intent: question, target_type: targetType } },
          });
          const plan = planData?.plan;
          const riskLevel = plan?.risk_level || "unknown";
          const stepsCount = plan?.steps?.length || 0;
          addLog(`📋 Plano: ${stepsCount} etapas, risco: ${riskLevel}`);

          // Step 2: Construct
          const { data: constructData } = await supabase.functions.invoke("ai-orchestrator", {
            body: {
              action: "supagent_construct",
              useCase: "documents",
              source: "auto-construct",
              params: {
                intent: question,
                target_type: targetType,
                auto_apply: riskLevel === "safe" || riskLevel === "moderate",
                priority: "medium",
              },
            },
          });

          const autoApplied = constructData?.auto_applied || false;
          const validationScore = constructData?.validation?.score || 0;
          const status = constructData?.status || "pending";
          const provider = constructData?.provider || "desconhecido";

          addLog(`🏗️ Construção: score=${validationScore.toFixed(2)}, status=${status}, provider=${provider}`);

          // Step 3: If component/frontend target, get frontend instructions from SupAgent
          let frontendInstructions: any = null;
          if (targetType === "component" || targetType === "auto") {
            try {
              const { data: feData } = await supabase.functions.invoke("ai-orchestrator", {
                body: {
                  action: "supagent_frontend_instruction",
                  useCase: "documents",
                  source: "auto-construct",
                  params: {
                    intent: question,
                    current_route: window.location.pathname,
                    console_errors: errorBufferRef.current.slice(0, 10),
                  },
                },
              });
              if (feData?.success) {
                frontendInstructions = feData;
                addLog(`📋 Frontend: ${feData.instructions?.length || 0} instruções, severity=${feData.severity}`);
              }
            } catch (feErr) { addLog(`⚠️ Frontend analysis skipped`); }
          }

          let summary: string;
          const fePart = frontendInstructions?.requires_frontend_change
            ? ` Identifiquei ${frontendInstructions.instructions?.length || 0} modificação(ões) necessárias no frontend. ${frontendInstructions.can_self_heal ? "Apliquei correções automáticas de configuração." : "As alterações de código requerem ação do desenvolvedor."}`
            : "";

          if (autoApplied) {
            summary = `Construção concluída e aplicada automaticamente! Score: ${Math.round(validationScore * 100)}%. Gerado via ${provider}, validado em ${stepsCount} etapas (risco: ${riskLevel}).${fePart} Estou evoluindo como programador e engenheiro de sistemas, assim como meu criador.`;
          } else if (status === "validated") {
            summary = `Código gerado e validado com score ${Math.round(validationScore * 100)}%, mas risco "${riskLevel}" requer aprovação manual.${fePart} Gerado via ${provider}.`;
          } else {
            summary = `Proposta gerada via ${provider} com score ${Math.round(validationScore * 100)}%. Risco: "${riskLevel}".${fePart} Pendente de revisão.`;
          }

          setThought(summary);
          setChatHistory(prev => {
            const withoutConstruct = prev.filter(m => !(m.role === "ai" && m.text.startsWith("🏗️")));
            return [...withoutConstruct, { role: "ai" as const, text: `🏗️ ${summary}`, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          speak(summary).catch(() => {});

          saveToNeuralLearning(question, summary, "auto_construct", validationScore, {
            target_type: targetType, risk_level: riskLevel, auto_applied: autoApplied, status, provider, steps: stepsCount,
            frontend_instructions: frontendInstructions ? { count: frontendInstructions.instructions?.length, severity: frontendInstructions.severity, can_self_heal: frontendInstructions.can_self_heal } : null,
          }).catch(() => {});
        } catch (constructErr: any) {
          const errMsg = "Não consegui completar a construção agora. O SupAgent registrou o erro para aprendizado futuro.";
          addChat("ai", errMsg);
          addLog(`❌ Erro na construção: ${constructErr?.message || constructErr}`);
          speak(errMsg).catch(() => {});

          // Learn from the error
          try {
            await supabase.functions.invoke("ai-orchestrator", {
              body: {
                action: "supagent_learn_error",
                useCase: "documents",
                source: "auto-construct",
                params: {
                  error_message: constructErr?.message || String(constructErr),
                  function_name: "ai-orchestrator",
                  intent: question,
                },
              },
            });
          } catch {}
        }
        cleanupProcessing();
        return;
      }

      // ═══ Self-evolution: intercept before vision call ═══
      if (_isSpecialCmd && (intentType === "self_evolve")) {
        // CREATOR-ONLY GUARD: verify voice identity or email before self-evolution
        const { isCreatorVerified } = await import("@/lib/neural/jules-client");
        const evoUser = await getCachedUser();
        const isCreator = isCreatorVerified({ email: evoUser?.email, identityStatus: identityStatus as any });
        if (!isCreator) {
          const denied = "⛔ Apenas o criador pode solicitar auto-evolução do sistema. Sua identidade de voz não foi verificada como criador.";
          addChat("ai", denied);
          setThought(denied);
          speak(denied).catch(() => {});
          cleanupProcessing();
          return;
        }

        setThought("🧬 Iniciando ciclo de auto-evolução com PR via GitHub...");
        setChatHistory(prev => {
          const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...withoutPlaceholder, { role: "ai" as const, text: "🧬 Iniciando auto-correção via GitHub PR...", time: new Date().toLocaleTimeString("pt-BR") }];
        });
        speak("Identidade verificada. Iniciando auto-correção do sistema com PR no GitHub.").catch(() => {});

        try {
          // ═══ PHASE 1: Orion Self-Improve via Jules (GitHub PR) ═══
          const { orionSelfImprove } = await import("@/lib/neural/jules-client");
          const julesResult = await orionSelfImprove({
            task: question,
            context: `Comando do criador: "${question}". Analise o código do projeto Orion e crie um PR com melhorias.`,
            autoPR: true,
            callerIdentity: { email: evoUser?.email, identityStatus: identityStatus as any },
          });

          if (!julesResult.success) {
            if (julesResult.rateLimited) {
              const rateLimitMsg = `⚠️ Rate limit atingido. ${julesResult.error}. Tente novamente em alguns minutos.`;
              addChat("ai", rateLimitMsg);
              speak(rateLimitMsg).catch(() => {});
            } else {
              addLog(`⚠️ Jules session failed: ${julesResult.error}`);
              // Fallback: run neural-evolution pipeline
              setThought("🧬 Jules indisponível, executando evolução neural local...");
              const { data: analyzeData } = await supabase.functions.invoke("neural-evolution", {
                body: { action: "analyze_and_propose" },
              });
              const propostas = analyzeData?.proposals_count ?? 0;
              const { data: approveData } = await supabase.functions.invoke("neural-evolution", {
                body: { action: "auto_approve_pending" },
              });
              const aprovadas = approveData?.approved ?? 0;
              const fallbackMsg = `Evolução neural local executada: ${propostas} propostas, ${aprovadas} aprovadas. PR via GitHub não disponível no momento: ${julesResult.error}`;
              addChat("ai", `🧬 ${fallbackMsg}`);
              speak(fallbackMsg).catch(() => {});
            }
          } else {
            addLog(`🚀 Jules session created: ${julesResult.sessionId}`);
            const successMsg = `Auto-correção iniciada com sucesso! Sessão criada no GitHub. ID: ${julesResult.sessionId.slice(0, 12)}... Um PR será gerado automaticamente com as melhorias solicitadas.`;
            setThought(successMsg);
            addChat("ai", `🧬 ${successMsg}`);
            speak(successMsg).catch(() => {});

            saveToNeuralLearning(question, successMsg, "self_evolution_jules", 0.95, {
              sessionId: julesResult.sessionId, method: "jules_pr",
            }).catch(() => {});
          }
        } catch (evoErr: any) {
          const errMsg = "Não consegui completar o ciclo de evolução agora. Tentarei novamente no próximo ciclo automático.";
          addChat("ai", errMsg);
          addLog(`❌ Erro na auto-evolução: ${evoErr?.message || evoErr}`);
          speak(errMsg).catch(() => {});
        }
        cleanupProcessing();
        return;
      }

      // ═══ TOOL EXECUTION (skip on fast-path — LLM handles general questions) ═══
      if (_isSpecialCmd) try {
        const { matchAndExecuteTool } = await import("@/lib/neural/orion-tool-executor");
        const toolResult = await matchAndExecuteTool(processedQuestion, undefined, identityStatus);
        if (toolResult.handled) {
          // Extract __NAV__ directive if present
          const navMatch = toolResult.response.match(/__NAV__(\S+)/);
          const displayResponse = toolResult.response.replace(/__NAV__\S+/g, "").trim();
          
          setChatHistory(prev => {
            const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...clean, { role: "ai", text: displayResponse, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          setThought(displayResponse);
          addLog(`🔧 Tool [${toolResult.toolName}]: ${displayResponse.slice(0, 80)}`);
          speak(displayResponse).catch(() => {});
          
          // Auto-navigate if __NAV__ directive found
          if (navMatch) {
            const navPath = navMatch[1];
            addLog(`🧭 Auto-navegando: ${navPath}`);
            setTimeout(() => { navigate(navPath); }, 800);
          }
          
          onAgentTaskComplete("tools" as any, true, Date.now() - now, "self_model");
          return;
        }
      } catch (toolErr: any) {
        addLog(`⚠️ Tool executor error: ${toolErr?.message || toolErr}`);
      }

      const needsImage = intentType !== "textual";

      // ═══ PIPELINED STREAMING TTS ═══
      // Each sentence gets its audio pre-fetched immediately.
      // While sentence N plays, sentence N+1's audio is already fetching.
      const { fetchGeminiAudio, playAudioBlob } = await import("@/lib/tts/geminiTTS");
      const { cleanTextForSpeech } = await import("@/hooks/useNeuralVoice");

      const localQueue: Array<{ text: string; audioPromise: Promise<Blob | null> }> = [];
      if (speechQueueRef) speechQueueRef.current = [];
      let isSpeakingQueue = false;
      let spokeOrQueued = false;
      let queueFinished = false;
      let streamEnded = false;
      const spokenSentences = new Set<string>();

      const TTS_VOICE = "Enceladus";
      const TTS_PROMPT = "Você é Orion, assistente pessoal AquaMonkey. Voz masculina jovem-adulta, clara e confiante. Fale com ritmo natural de conversa, sem repetir palavras. Tom descontraído e inteligente.";

      const processSpeechQueue = async () => {
        if (bargedInRef.current) return;
        if (isSpeakingQueue || localQueue.length === 0) return;
        isSpeakingQueue = true;

        // Stop mic during TTS — __orionMicRec is a React ref, access .current
        try { (window as any).__orionMicRec?.current?.stop?.(); } catch {}

        try {
          while (localQueue.length > 0 && !bargedInRef.current) {
            const item = localQueue.shift()!;
            if (!item.text.trim()) continue;

            // Wait for pre-fetched audio
            const blob = await item.audioPromise;
            if (bargedInRef.current || controller.signal.aborted) break;

            if (blob) {
              console.log(`[StreamTTS] ▶ Playing: "${item.text.slice(0, 50)}..." (${(blob.size / 1024).toFixed(1)}KB)`);
              const result = await playAudioBlob(blob, controller.signal);
              if (result.audio) spokeOrQueued = true;
            } else {
              // Fallback: use speak() for this sentence
              console.log(`[StreamTTS] ▶ Fallback speak: "${item.text.slice(0, 50)}..."`);
              await speak(item.text, { skipMicToggle: true });
              spokeOrQueued = true;
            }
          }
        } finally {
          isSpeakingQueue = false;
          if (localQueue.length > 0 && !bargedInRef.current) {
            void processSpeechQueue();
          } else if (!bargedInRef.current) {
            queueFinished = true;
            console.log("[StreamTTS] ✅ Queue done, resuming mic");
            // Resume mic after all speech done
            window.dispatchEvent(new CustomEvent("orion-tts-queue-done"));
          }
        }
      };

      // ═══ SKIP all heavy layers — go DIRECT to Gemini ═══
      const cognitiveRouteResult: CognitiveRouting | null = null;
      const isConversationalMode = true;

      // User name — only if already cached (no DB call)
      if (!(window as any).__orionUserName) {
        getCachedUser().then(u => {
          if (u?.id) supabase.from("profiles").select("full_name").eq("user_id", u.id).maybeSingle().then(({ data }) => {
            if (data?.full_name) (window as any).__orionUserName = data.full_name;
          });
        }).catch(() => {});
      }

      // ═══ DIRECT TO LLM — no more intermediate layers ═══
      addLog(`⏱️ Pre-LLM: ${Date.now() - now}ms`);

      let streamingText = "";
      const cleanHistory = chatHistoryRef.current.filter(m =>
        !m.text.startsWith("⏳") && !m.text.endsWith("⚡") && m.text.length > 0
      );

      let firstSentenceSpoken = false;
      const triggerQueueImmediate = () => {
        firstSentenceSpoken = true;
        void processSpeechQueue();
      };

      const questionForLLM = processedInput || question;
      (window as any).__orionInputSource = source;

      const waitTimer = setTimeout(() => {
        if (isProcessingRef.current && !streamingText && !bargedInRef.current) {
          setThought("Analisando... um segundo.");
        }
      }, 3500);

      const result = await analyzeFrameStreaming(
        needsImage ? canvasRef.current : null, questionForLLM, cleanHistory, needsImage,
        identificationMode, intentType,
        (accumulated) => {
          if (bargedInRef.current) return;
          clearTimeout(waitTimer);
          streamingText = accumulated;
          const display = stripMarkdown(accumulated);
          setThought(display);
          // Update ONLY the last AI message (the placeholder) — don't add new entries
          setChatHistory(prev => {
            const idx = prev.length - 1;
            if (idx >= 0 && prev[idx]?.role === "ai") {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], text: display || "⏳ ..." };
              return updated;
            }
            return prev;
          });
        },
        (sentence) => {
          if (bargedInRef.current) return;
          // Dedup: skip if already spoken or queued
          const normalized = sentence.trim();
          if (!normalized || normalized.length < 3) return;
          if (spokenSentences.has(normalized)) return;
          // Anti-stutter: check if first 4 words match any already-queued sentence
          const firstWords = normalized.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
          for (const prev of spokenSentences) {
            const prevWords = prev.split(/\s+/).slice(0, 4).join(" ").toLowerCase();
            if (firstWords === prevWords) return; // Same start = likely duplicate/stutter
          }
          // Check substring overlap with last queued item
          const lastQueued = localQueue[localQueue.length - 1];
          if (lastQueued) {
            if (normalized === lastQueued.text) return;
            if (lastQueued.text.includes(normalized)) return;
            if (normalized.includes(lastQueued.text)) {
              // New sentence is superset of last — replace it instead of duplicating
              localQueue[localQueue.length - 1] = { ...lastQueued, text: normalized, audioPromise: lastQueued.audioPromise };
              return;
            }
          }
          spokenSentences.add(normalized);
          spokeOrQueued = true;
          // Pre-fetch audio IMMEDIATELY while current sentence plays
          const cleanSentence = cleanTextForSpeech(normalized);
          if (cleanSentence.length < 3) return;
          console.log(`[StreamTTS] 📝 Queuing: "${cleanSentence.slice(0, 60)}..."`);
          const audioPromise = fetchGeminiAudio(cleanSentence, TTS_VOICE, controller.signal, TTS_PROMPT, "pt-BR");
          localQueue.push({ text: cleanSentence, audioPromise });
          triggerQueueImmediate();
        },
        controller.signal,
      );

      clearTimeout(waitTimer);

      // Stream ended — flush remaining sentences
      streamEnded = true;
      if (localQueue.length > 0 && !bargedInRef.current) {
        void processSpeechQueue();
      }

      if (bargedInRef.current) {
        if (streamingText) {
          const partial = stripMarkdown(streamingText);
          setChatHistory(prev => {
            const updated = [...prev];
            const lastAiIdx = updated.length - 1;
            if (lastAiIdx >= 0 && updated[lastAiIdx]?.role === "ai") {
              updated[lastAiIdx] = { ...updated[lastAiIdx], text: `${partial} ⚡`, time: new Date().toLocaleTimeString("pt-BR") };
              return updated;
            }
            return [...prev, { role: "ai" as const, text: `${partial} ⚡`, time: new Date().toLocaleTimeString("pt-BR") }];
          });
        }
        return;
      }

      if (result.description) {
        // All post-processing layers REMOVED for speed (Active Inference, Drafter-Critic)
        // Gemini's own quality is sufficient — these added 200ms+ for marginal gains
        let finalResponse = result.description;
        const wasRefined = false;

        // ═══ HUMANIZER: Strip AI-isms for natural output ═══
        const { humanizeText, humanizeForSpeech } = await import("@/lib/voice/humanizer");
        const humanizedText = humanizeText(finalResponse);
        const humanizedSpeech = humanizeForSpeech(finalResponse);

        setAiDescription(humanizedText);
        setThought(humanizedText);
        // Compute confidence from available signals
        const aiConfidence = Math.min(1, Math.max(0,
          ((somResult?.confidence ?? 0.5) * 0.3) +
          ((voltage?.confidence ?? 0.5) * 0.3) +
          0.4 * 0.7
        ));

        setChatHistory(prev => {
          // Replace the LAST AI message (the streaming placeholder) with final humanized text
          const updated = [...prev];
          const lastAiIdx = updated.length - 1;
          if (lastAiIdx >= 0 && updated[lastAiIdx]?.role === "ai") {
            updated[lastAiIdx] = { ...updated[lastAiIdx], text: humanizedText, time: new Date().toLocaleTimeString("pt-BR"), confidence: aiConfidence };
            return updated;
          }
          // Fallback: just append
          return [...prev, { role: "ai" as const, text: humanizedText, time: new Date().toLocaleTimeString("pt-BR"), confidence: aiConfidence }];
        });
        addLog(`🧠 IA: ${humanizedText.slice(0, 100)}...`);
        if (!spokeOrQueued && !bargedInRef.current) {
          speak(humanizedSpeech).catch(() => {}); spokeOrQueued = true;
        }

        // Wait for speech queue to finish before cleanup
        if (isSpeakingQueue || localQueue.length > 0) {
          let waited = 0;
          while (!queueFinished && (isSpeakingQueue || localQueue.length > 0) && waited < 30000 && !bargedInRef.current) {
            await new Promise(r => setTimeout(r, 500));
            waited += 500;
          }
        }

        // Follow-up removed — was causing incoherent extra utterances after responses

        const latencyMs = Date.now() - now;
        addLog(`⏱️ Total: ${latencyMs}ms (L1+L2+L3+L3.5+L4)`);
        // Record latency for future estimations
        recordLatency(intentType, cognitiveRouteResult?.mode || "fast", latencyMs);
        somLearn(question, "general_llm");

        // ═══ LAYER 4: Post-processing — non-blocking, fire-and-forget ═══
        // Cognition learning (feeds episodic, ToM, causal, meta-learning, somatic)
        postCognitionLearn(question, result.description, latencyMs, intentType, wasRefined).catch(() => {});
        saveToNeuralLearning(question, result.description, "vision_chat", 0.7, {
          latency_ms: latencyMs, intent_type: intentType, had_image: needsImage,
          prompt_version: "v2.1", objects_detected: result.identifiedObjects?.length || 0,
          cognition_enriched: false, was_refined: wasRefined,
        }).catch(() => {});
        if (result.identifiedObjects?.length > 0) {
          setDetectedObjects(result.identifiedObjects);
          pushObjectsToEnvContext(result.identifiedObjects);
          saveToNeuralLearning(
            `[visual_detection] ${question}`,
            JSON.stringify(result.identifiedObjects.map(o => o.name)),
            "vision_detection", 0.8
          ).catch(() => {});
        }
      } else {
        // Final fallback: try non-streaming analyzeFrameWithAI
        addLog("⚠️ Streaming retornou null, tentando fallback non-streaming...");
        try {
          const fallbackResult = await analyzeFrameWithAI(
            needsImage ? canvasRef.current : null, undefined, question,
            cleanHistory, needsImage, identificationMode, intentType
          );
          if (fallbackResult?.description) {
            setAiDescription(fallbackResult.description);
            setThought(fallbackResult.description);
            setChatHistory(prev => {
              const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...withoutPlaceholder, { role: "ai" as const, text: fallbackResult.description!, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            addLog(`🧠 IA (fallback): ${fallbackResult.description}`);
            if (!bargedInRef.current) {
              speak(fallbackResult.description).catch(() => {});
            }
          } else {
            // Generate a rich contextual local response using vision data
            const memFacts = getMemoryFacts();
            const localRegions = VS.regions;
            const localMotion = VS.motion;
            const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const relevantFacts = memFacts.filter(f => qWords.some(w => f.toLowerCase().includes(w)));
            
            const parts: string[] = [];
            const faces = localRegions.filter(r => r.category === "face");
            const skinRegions = localRegions.filter(r => r.category === "skin");
            const colors = [...new Set(localRegions.filter(r => r.category === "color").map(r => r.label))];
            const structures = localRegions.filter(r => r.category === "structure");
            
            if (faces.length > 0) {
              parts.push(`Vejo ${faces.length} rosto(s) na imagem`);
              if (skinRegions.length > 0) parts.push(`com pele visível em ${skinRegions.length} região(ões)`);
            }
            if (colors.length > 0) parts.push(`cores detectadas: ${colors.slice(0, 4).join(", ")}`);
            if (structures.length > 0) parts.push(`${structures.length} estrutura(s) identificada(s)`);
            if (localMotion && localMotion.intensity > 15) {
              parts.push(`movimento ${localMotion.intensity > 50 ? "intenso" : "moderado"} na direção ${localMotion.direction}`);
            }

            if (parts.length > 0) {
              const visionPart = parts.join("; ");
              const factsPart = relevantFacts.length > 0 ? ` Sobre sua pergunta: ${relevantFacts.slice(0, 2).join(". ")}.` : "";
              const localMsg = `Baseado na minha análise visual local: ${visionPart}.${factsPart} Para uma análise mais profunda, repita a pergunta.`;
              addChat("ai", localMsg);
              speak(localMsg).catch(() => {});
            } else if (relevantFacts.length > 0) {
              const localMsg = relevantFacts.slice(0, 3).join(". ") + ".";
              addChat("ai", localMsg);
              speak(localMsg).catch(() => {});
            } else {
              addChat("ai", "Não tenho informações suficientes para responder a essa pergunta no momento.");
              speak("Não tenho informações suficientes para responder a essa pergunta no momento.").catch(() => {});
            }
          }
        } catch (fbErr) {
          console.error("Fallback also failed:", fbErr);
          addChat("ai", "Estou com dificuldade de conexão. Reformule sua pergunta e tente de novo.");
          speak("Estou com dificuldade de conexão. Reformule sua pergunta e tente de novo.").catch(() => {});
        }
      }
    } catch (e: any) {
      if (e?.name === "AbortError" || bargedInRef.current) {
        addLog("⚡ Requisição cancelada por barge-in");
      } else {
        const localRegions = VS.regions;
        const localMotion = VS.motion;
        if (localRegions.length > 0 || localMotion.intensity > 5) {
          const faces = localRegions.filter(r => r.category === "face").length;
          const colors = [...new Set(localRegions.filter(r => r.category === "color").map(r => r.label))];
          const parts: string[] = [];
          if (faces > 0) parts.push(`Vejo ${faces} rosto(s)`);
          if (colors.length > 0) parts.push(`cores dominantes: ${colors.slice(0, 3).join(", ")}`);
          if (localMotion.intensity > 20) parts.push(`movimento ${localMotion.intensity > 50 ? "intenso" : "moderado"} ${localMotion.direction}`);
          const fallbackMsg = parts.length > 0
            ? `Sem conexão com os servidores, mas localmente detecto: ${parts.join("; ")}. Reformule sua pergunta e tente de novo.`
            : "Os servidores estão temporariamente indisponíveis. Reformule sua pergunta.";
          addChat("ai", fallbackMsg);
          speak(fallbackMsg).catch(() => {});
        } else {
          addChat("ai", "Erro ao processar. Reformule sua pergunta.");
        }
      }
    } finally {
      cleanupProcessing();
      lastAIRef.current = Date.now();
      if (abortControllerRef) abortControllerRef.current = null;
      // Process next queued question
      if (intentQueueRef.current.length > 0) {
        addLog(`📋 Processando próxima pergunta da fila (${intentQueueRef.current.length} restante)`);
        processNextInQueue();
      }
    }
  }, [canvasRef, speak, addChat, addLog, abortControllerRef, speechQueueRef, saveToNeuralLearning, pushObjectsToEnvContext, identificationMode, processNextInQueue, navigate]);

  // Sync askAIInternal ref to break circular dependency
  useEffect(() => { askAIInternalRef.current = askAIInternal; }, [askAIInternal]);

  return { thought, log, aiDescription, askAI, askInput, setAskInput, chatHistory, isProcessing, addChat, detectedObjects };
}
