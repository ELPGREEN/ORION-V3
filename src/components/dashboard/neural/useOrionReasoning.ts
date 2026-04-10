import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFrameStreaming, analyzeFrameWithAI, classifyIntent } from "@/lib/neural/orion-ai-client";
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

export interface ChatMessage { role: "user" | "ai" | "system"; text: string; time: string; confidence?: number; }

export function useOrionReasoning(
  active: boolean, speak: (t: string, options?: { skipMicToggle?: boolean }) => Promise<void>, canvasRef: React.RefObject<HTMLCanvasElement | null>,
  identificationMode: string = "universal",
  bargeIn?: () => void,
  abortControllerRef?: React.MutableRefObject<AbortController | null>,
  speechQueueRef?: React.MutableRefObject<string[]>,
  bargeInCallbackRef?: React.MutableRefObject<(() => void) | null>,
  getBackgroundTranscripts?: () => BackgroundTranscript[],
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

  // Session restoration
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(() => {
    const session = getSessionState();
    if (session?.chatHistory && session.chatHistory.length > 0) {
      return [
        { role: "system" as const, text: `📝 Sessão anterior restaurada (${session.chatHistory.length} mensagens)`, time: new Date().toLocaleTimeString("pt-BR") },
        ...session.chatHistory.slice(-15),
      ];
    }
    return [];
  });
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

  // Auto-save session state
  useEffect(() => {
    if (chatHistory.length > 0) {
      const cleanHistory = chatHistory.filter(m => !m.text.startsWith("⏳") && m.role !== "system");
      saveSessionState({
        chatHistory: cleanHistory.slice(-20),
        totalInteractions: cleanHistory.filter(m => m.role === "user").length,
      });
    }
  }, [chatHistory]);

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
        const { data: analysisData } = await supabase.functions.invoke("agente-construcao", {
          body: {
            action: "supagent_frontend_instruction",
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
  const intentQueueRef = useRef<string[]>([]);
  const processQueueRef = useRef(false);
  const askAIInternalRef = useRef<(q: string) => void>();

  // Process next item from intent queue after current finishes
  const processNextInQueue = useCallback(() => {
    if (intentQueueRef.current.length === 0 || processQueueRef.current) return;
    processQueueRef.current = true;
    const next = intentQueueRef.current.shift()!;
    // Small delay to avoid race conditions
    setTimeout(() => {
      processQueueRef.current = false;
      askAIInternalRef.current?.(next);
    }, 300);
  }, []);

  const askAI = useCallback((question: string) => {
    const now = Date.now();
    if (now - lastAskTimeRef.current < 500) return;
    lastAskTimeRef.current = now;
    if (isProcessingRef.current) {
      if (intentQueueRef.current.length < 3) {
        intentQueueRef.current.push(question);
        addChat("system", `📋 Pergunta enfileirada (${intentQueueRef.current.length}/3). Processarei em seguida.`);
        addLog(`📋 Enfileirada: ${question.slice(0, 50)}`);
      } else {
        addChat("system", "⚠️ Fila cheia (3/3). Aguarde o processamento atual.");
      }
      return;
    }
    askAIInternalRef.current?.(question);
  }, [addChat, addLog]);

  const askAIInternal = useCallback(async (question: string) => {
    const now = Date.now();
    bargedInRef.current = false;
    aiPendingRef.current = true;
    setIsProcessing(true);
    isProcessingRef.current = true;
    VS.aiResponding = true;
    setThought("🤔 Analisando...");
    addChat("user", question);
    addChat("ai", "⏳ ...");
    addLog(`💬 Pergunta: ${question}`);

    const controller = new AbortController();
    if (abortControllerRef) abortControllerRef.current = controller;

    try {
      // ═══ FAST PRE-PROCESSING: Reformulation + Intent + SOM in parallel (~5ms total) ═══
      const comprehension = analyzeComprehension(question);
      let processedInput = question;
      if (comprehension.score < 0.85 || comprehension.isColloquial) {
        processedInput = quickLocalReformulate(question);
      }

      // Run Tesla Coil + SOM + Intent in parallel (all <5ms each)
      const voltage = amplifyIntent(processedInput, {
        hasWorkingMemory: true,
        recentHistory: chatHistoryRef.current.slice(-3).map(m => m.text),
      });
      window.dispatchEvent(new CustomEvent("tesla-coil-voltage", { detail: voltage }));

      const intentType = classifyIntent(voltage.normalizedInput);
      const somResult = somClassify(question);
      const _isSpecialCmd = somResult.isSpecialCmd || intentType === "auto_construct" || intentType === "self_evolve";

      addLog(`⚡ Pre-proc: ${Date.now() - now}ms | intent=${intentType} | SOM=${somResult.handler}(${(somResult.confidence * 100).toFixed(0)}%)`);
      window.dispatchEvent(new CustomEvent("som-routing", { detail: somResult }));

      // If confidence too low, ask clarification
      if (!voltage.shouldExecute && !voltage.isConfirmation) {
        const clarifyMsg = voltage.suggestedQuestion || "Pode detalhar melhor o que deseja?";
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: `🔌 ${clarifyMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(clarifyMsg);
        try { await speak(clarifyMsg); } catch {}
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        processNextInQueue();
        return;
      }

      let processedQuestion = voltage.normalizedInput;
      const qLow = (processedInput || question).toLowerCase().trim();

      // ═══ VISION COMMAND INTERCEPT — handle locally, NEVER send to LLM ═══
      const isActivateVision = /ativar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow) || /ligar?\s*(vis[aã]o|c[aâ]mera)/i.test(qLow);
      const isDeactivateVision = /desativar?\s*(vis[aã]o|c[aâ]mera|neural)/i.test(qLow) || /desligar?\s*(vis[aã]o|c[aâ]mera)/i.test(qLow) || /parar?\s*(vis[aã]o|c[aâ]mera)/i.test(qLow);
      if (isActivateVision || isDeactivateVision) {
        const action = isActivateVision ? "activate_vision" : "deactivate_vision";
        const msg = isActivateVision ? "Ativando visão neural." : "Desativando visão.";
        // Dispatch event for NeuralVision to handle camera start/stop
        window.dispatchEvent(new CustomEvent("orion-vision-command", { detail: { action } }));
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: `👁️ ${msg}`, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(msg);
        try { await speak(msg); } catch {}
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        processNextInQueue();
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
          try { await speak(instantHit.answer); } catch {}
          aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
          recordLatency(intentType, "fast", Date.now() - now);
          somLearn(question, "general_llm");
          processNextInQueue();
          return;
        }
      }

      // 0. Short greetings — respond instantly, NO auth check needed
      const greetingPatterns = /^(senhor|senhora|oi|olá|ola|ei|hey|eai|e\s*aí|fala|bom\s*dia|boa\s*tarde|boa\s*noite|tudo\s*bem|beleza|opa)[\s!?.]*$/i;
      if (greetingPatterns.test(qLow)) {
        const greetings = [
          "Estou ouvindo. O que precisa?",
          "Às ordens. Como posso ajudar?",
          "Estou aqui. Diga.",
          "Pode falar, estou atento.",
        ];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai" as const, text: greeting, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(greeting);
        try { await speak(greeting); } catch {}
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        somLearn(question, "greeting");
        return;
      }

      // ═══ VOICE AUTH GATE — Only for sensitive intents (lazy, cached) ═══
      const PUBLIC_INTENTS = new Set(["greeting", "self_identity", "owner_identity", "time_date", "humor", "philosophy", "explanation", "general_llm"]);
      const VOICE_AUTH_INTENTS = new Set(["auto_construct", "self_evolve", "security_query", "iot_light", "iot_temperature", "iot_robot", "iot_status", "bluetooth"]);
      const needsAuth = !PUBLIC_INTENTS.has(somResult.handler);
      const needsBiometric = VOICE_AUTH_INTENTS.has(somResult.handler);

      if (needsAuth || needsBiometric) {
        try {
          const { data: { user: authGateUser } } = await supabase.auth.getUser();
          if (!authGateUser) {
            const authMsg = "Você precisa estar logado para usar esse recurso. Faça login para continuar.";
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: `🔒 ${authMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(authMsg);
            try { await speak(authMsg); } catch {}
            aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
            processNextInQueue();
            return;
          }

          // Only check biometric for sensitive intents — run both queries in parallel
          if (needsBiometric) {
            const { isOwnerEmail: checkOwner } = await import("@/lib/neural/orion-consciousness");
            const isOwner = checkOwner(authGateUser.email);

            if (!isOwner) {
              const [voiceRes, faceRes] = await Promise.all([
                supabase.from("voice_auth_enrollments" as any).select("is_active").eq("user_id", authGateUser.id).eq("is_active", true).maybeSingle(),
                supabase.from("face_auth_enrollments").select("is_active").eq("user_id", authGateUser.id).eq("is_active", true).maybeSingle(),
              ]);

              if (!voiceRes.data && !faceRes.data) {
                const enrollMsg = "Este comando requer autenticação biométrica. Cadastre seu Voice ID ou Face ID na área de segurança.";
                setChatHistory(prev => {
                  const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
                  return [...clean, { role: "ai" as const, text: `🔐 ${enrollMsg}`, time: new Date().toLocaleTimeString("pt-BR") }];
                });
                setThought(enrollMsg);
                try { await speak(enrollMsg); } catch {}
                aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
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
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser) {
            const noAuth = "Você precisa estar logado para se cadastrar como proprietário.";
            addChat("ai", noAuth);
            try { await speak(noAuth); } catch {}
            return;
          }

          // Check if user has advogado role (system owner)
          const { data: userRole } = await supabase.from("user_roles").select("role").eq("user_id", authUser.id).maybeSingle();
          const isAdvogado = userRole?.role === "advogado" || userRole?.role === "admin";

          if (!isAdvogado) {
            const denied = "Registro de proprietário negado. Apenas o perfil de advogado ou administrador pode se cadastrar como proprietário do sistema.";
            addChat("ai", denied);
            try { await speak(denied); } catch {}
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
          try { await speak(successMsg); } catch {}

          saveToNeuralLearning(question, successMsg, "owner_registration", 1.0, {
            owner_id: authUser.id, owner_name: "Ericson Piccoli",
          }).catch(() => {});
          return;
        } catch (regErr) {
          console.warn("Owner registration error:", regErr);
          addChat("ai", "Erro ao processar o cadastro. Tente novamente.");
          try { await speak("Erro ao processar o cadastro. Tente novamente."); } catch {}
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
          try { await speak("Memória registrada. Vou lembrar disso."); } catch {}
          saveToNeuralLearning(question, response, "memory_store", 0.9).catch(() => {});
          somLearn(question, "memory_store");
        } else {
          addChat("ai", "O que você gostaria que eu guardasse na memória?");
          try { await speak("O que você gostaria que eu guardasse na memória?"); } catch {}
        }
        somLearn(question, "memory_store");
        return;
      }

      // 2. Voice ID questions — answer based on real system state
      if (_isSpecialCmd && (/\b(reconhec[eo]|sabe[s]?|conhec[eo])\s+(a\s+)?(minha\s+)?voz\b/i.test(qLow) || /\bvoice\s*id\b/i.test(qLow))) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          let voiceResponse: string;
          if (user) {
            const { data: enrollment } = await supabase
              .from("face_auth_enrollments")
              .select("is_active, enrollment_quality, verification_count")
              .eq("user_id", user.id)
              .eq("is_active", true)
              .maybeSingle();

            // Check if this is the owner (Ericson Piccoli)
            const memories = getMemoryFacts();
            const isOwner = memories.some(m => /ericson\s*piccoli/i.test(m) && /(criador|pai|proprietário|owner|desenvolvedor)/i.test(m));

            if (enrollment) {
              voiceResponse = isOwner
                ? `Sim, Ericson! Tenho seu Voice ID cadastrado com qualidade ${Math.round(enrollment.enrollment_quality * 100)}%. Já verificamos ${enrollment.verification_count} vezes. Sua identidade como proprietário do sistema está registrada e ativa.`
                : `Sim, tenho seu Voice ID cadastrado com qualidade ${Math.round(enrollment.enrollment_quality * 100)}%. Já verificamos ${enrollment.verification_count} vezes. Sua identidade vocal está registrada e ativa.`;
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
          try { await speak(voiceResponse); } catch (e) { console.warn("[Orion] Voice ID speak error:", e); }
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
        try { await speak(ownerResponse); } catch (e) { console.warn("[Orion] Owner speak error:", e); }
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
        try { await speak(selfResponse); } catch (e) { console.warn("[Orion] Self-identity speak error:", e); }
        return;
      }

      // 2c. "Quem sou eu?" / "me conhece?" — identify via face enrollment + first-user = owner
      if (_isSpecialCmd && (/\b(quem\s+(é|e|sou)\s+eu|me\s+conhece|sabe\s+quem\s+eu\s+sou|meu\s+nome|quem\s+t[aá]\s+falando)\b/i.test(qLow))) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
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
            try { await speak(idResponse); } catch (e) { console.warn("[Orion] Identity speak error:", e); }
            return;
          }
        } catch (e) { console.warn("[Orion] Identity check error:", e); /* fall through */ }
      }

      // ═══ VOICE CONFIG: "fale mais devagar", "aumente o pitch", etc ═══
      const voiceConfigMatch = qLow.match(/\b(fal[ae]\s+mais\s+(devagar|r[aá]pido|lento)|aument[ae]\s+(velocidade|pitch|tom|speed)|diminu[ae]\s+(velocidade|pitch|tom|speed)|voz\s+mais\s+(grave|aguda|r[aá]pida|lenta)|mude?\s+(a\s+voz|o\s+tom|o\s+pitch))\b/i);
      if (_isSpecialCmd && (voiceConfigMatch)) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
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
              try { await speak(response); } catch {}
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
            try { await speak(execResult.response); } catch {}
            aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
            somLearn(question, somResult.handler);
            saveToNeuralLearning(question, execResult.response, "command_registry", 0.95, { action: cmdMatch.action }).catch(() => {});
            recordLatency(intentType, "fast", Date.now() - now);
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
        try { await speak(response); } catch {}
        somLearn(question, "navigation");
        setTimeout(() => { navigate(navIntent.path); }, 600);
        return;
      }

      // ═══ SEARCH: "procure documento X", "encontre cliente Y" ═══
      const searchMatch = qLow.match(/\b(procur[ae]|busc[ae]|encontr[ae]|ach[ae]|localiz[ae])\s+(o\s+|a\s+|um\s+|uma\s+)?(documento|contrato|petição|peticao|cliente|contato|processo)\s+(.+)/i);
      if (_isSpecialCmd && (searchMatch)) {
        const searchType = searchMatch[3].toLowerCase();
        const searchTerm = searchMatch[4].replace(/[.!?,]+$/, "").trim();
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
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
            try { await speak(response); } catch {}
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
        try { await speak(bgResponse); } catch {}
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        return;
      }

      // ═══ IoT / BLUETOOTH: "conecte bluetooth", "ligue a luz", "status sensores/robo" ═══
      const bleConnectMatch = /\b(conect[ae]|parear|escanear|scan)\s+(ao?\s+)?(bluetooth|ble|dispositivo)/i.test(qLow);
      if (_isSpecialCmd && (bleConnectMatch)) {
        const { bluetoothManager } = await import("@/lib/neural/bluetooth-manager");
        if (!bluetoothManager.isSupported) {
          const r = "Web Bluetooth nao e suportado neste navegador. Use Chrome ou Edge com HTTPS.";
          setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: r, time: new Date().toLocaleTimeString("pt-BR") }]; });
          setThought(r); try { await speak(r); } catch {} return;
        }
        const r0 = "Escaneando dispositivos Bluetooth. Selecione um na janela do navegador.";
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: r0, time: new Date().toLocaleTimeString("pt-BR") }]; });
        try { await speak(r0); } catch {}
        const found = await bluetoothManager.scan();
        if (found) {
          const ok = await bluetoothManager.connect(found.id);
          const r1 = ok ? `Conectado ao dispositivo ${found.name}.` : `Nao foi possivel conectar ao ${found.name}.`;
          setChatHistory(prev => [...prev, { role: "ai" as const, text: r1, time: new Date().toLocaleTimeString("pt-BR") }]);
          setThought(r1); addLog(`🔵 BLE: ${r1}`); try { await speak(r1); } catch {}
        } else {
          const r2 = "Nenhum dispositivo selecionado.";
          setChatHistory(prev => [...prev, { role: "ai" as const, text: r2, time: new Date().toLocaleTimeString("pt-BR") }]);
          try { await speak(r2); } catch {}
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
        setThought(result); addLog(`🏠 SmartHome: ${result}`); try { await speak(result); } catch {} return;
      }

      const iotTempMatch = /\b(temperatura|temp)\b/i.test(qLow) && /\b(qual|quanto|mostr|status|sensor)/i.test(qLow);
      if (_isSpecialCmd && (iotTempMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const result = await iotBridge.getTemperature("temp_sala");
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`🌡️ IoT: ${result}`); try { await speak(result); } catch {} return;
      }

      const iotRobotMatch = /\b(status|estado)\s+(do\s+)?(rob[oô]|robo|robot)\b/i.test(qLow);
      if (_isSpecialCmd && (iotRobotMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const result = await iotBridge.getRobotStatus();
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`🤖 IoT: ${result}`); try { await speak(result); } catch {} return;
      }

      const iotStatusMatch = /\b(status|estado)\s+(dos\s+)?(sensor|dispositivo|iot|device)/i.test(qLow);
      if (_isSpecialCmd && (iotStatusMatch)) {
        const { iotBridge } = await import("@/lib/neural/iot-device-bridge");
        const { bluetoothManager: bleMgr } = await import("@/lib/neural/bluetooth-manager");
        const summary = iotBridge.getDevicesSummary();
        const bleDevs = bleMgr.isSupported ? ` BLE: ${bleMgr.getDevices().length} dispositivos.` : "";
        const result = `${summary}${bleDevs}`;
        setChatHistory(prev => { const c = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳"))); return [...c, { role: "ai" as const, text: result, time: new Date().toLocaleTimeString("pt-BR") }]; });
        setThought(result); addLog(`📡 IoT: ${result}`); try { await speak(result); } catch {} return;
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
        setThought(result); addLog(`📱 Nativo: ${result}`); try { await speak(result); } catch {} return;
      }

      // ═══ MEDIA / SPOTIFY: intercept music/search/playlist commands BEFORE AI ═══
      const mediaPatterns = /\b(tocar?|play|reproduz|busca[r]?\s+(?:m[uú]sica|musica|artista|playlist|banda|cantor)|procura[r]?\s+(?:m[uú]sica|musica|artista|playlist|banda|cantor)|pesquisa[r]?\s+(?:m[uú]sica|musica|artista)|ouvir?\s+(?:m[uú]sica|musica)|escutar?\s+(?:m[uú]sica|musica)|coloca\s+(?:m[uú]sica|musica|uma?\s+m[uú]sica)|minhas?\s+playlists?|criar?\s+playlist|status\s+(?:d[ea]\s+)?(?:m[uú]sica|mídia|media)|parar?\s+(?:a\s+)?m[uú]sica|pausar?\s+(?:a\s+)?m[uú]sica)\b/i;
      if (_isSpecialCmd && (mediaPatterns.test(qLow))) {
        try {
          const { matchAndExecuteTool: mediaToolMatch } = await import("@/lib/neural/orion-tool-executor");
          const mediaResult = await mediaToolMatch(question);
          if (mediaResult.handled) {
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai", text: mediaResult.response, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(mediaResult.response);
            addLog(`🎵 Media [${mediaResult.toolName}]: ${mediaResult.response.slice(0, 80)}`);
            try { await speak(mediaResult.response); } catch {}
            aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
            return;
          }
        } catch (mediaErr: any) {
          addLog(`⚠️ Media executor error: ${mediaErr?.message || mediaErr}`);
        }
      }

      // ═══ Auto-construct: Orion como engenheiro de sistemas ═══
      // SEGURANÇA: Apenas o proprietário (advogado/admin) pode executar auto-construção
      if (_isSpecialCmd && (intentType === "auto_construct")) {
        // Verify owner identity before proceeding
        const { data: { user: constructUser } } = await supabase.auth.getUser();
        if (constructUser) {
          const { data: constructRole } = await supabase.from("user_roles").select("role").eq("user_id", constructUser.id).maybeSingle();
          const isOwnerOrAdmin = constructRole?.role === "advogado" || constructRole?.role === "admin";
          if (!isOwnerOrAdmin) {
            const denied = "Auto-construção é restrita ao proprietário do sistema. Apenas o criador do Orion e administradores podem executar comandos de construção autônoma.";
            setChatHistory(prev => {
              const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
              return [...clean, { role: "ai" as const, text: denied, time: new Date().toLocaleTimeString("pt-BR") }];
            });
            setThought(denied);
            try { await speak(denied); } catch {}
            aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
            return;
          }
        }

        setThought("🏗️ SupAgent: Analisando sua solicitação de construção...");
        setChatHistory(prev => {
          const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...withoutPlaceholder, { role: "ai" as const, text: "🏗️ Iniciando construção autônoma via SupAgent...", time: new Date().toLocaleTimeString("pt-BR") }];
        });
        try { await speak("Entendido. Acionando o SupAgent para construção autônoma. Aguarde."); } catch {}

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
          const { data: planData } = await supabase.functions.invoke("agente-construcao", {
            body: { action: "supagent_plan", params: { intent: question, target_type: targetType } },
          });
          const plan = planData?.plan;
          const riskLevel = plan?.risk_level || "unknown";
          const stepsCount = plan?.steps?.length || 0;
          addLog(`📋 Plano: ${stepsCount} etapas, risco: ${riskLevel}`);

          // Step 2: Construct
          const { data: constructData } = await supabase.functions.invoke("agente-construcao", {
            body: {
              action: "supagent_construct",
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
              const { data: feData } = await supabase.functions.invoke("agente-construcao", {
                body: {
                  action: "supagent_frontend_instruction",
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
          try { await speak(summary); } catch {}

          saveToNeuralLearning(question, summary, "auto_construct", validationScore, {
            target_type: targetType, risk_level: riskLevel, auto_applied: autoApplied, status, provider, steps: stepsCount,
            frontend_instructions: frontendInstructions ? { count: frontendInstructions.instructions?.length, severity: frontendInstructions.severity, can_self_heal: frontendInstructions.can_self_heal } : null,
          }).catch(() => {});
        } catch (constructErr: any) {
          const errMsg = "Não consegui completar a construção agora. O SupAgent registrou o erro para aprendizado futuro.";
          addChat("ai", errMsg);
          addLog(`❌ Erro na construção: ${constructErr?.message || constructErr}`);
          try { await speak(errMsg); } catch {}

          // Learn from the error
          try {
            await supabase.functions.invoke("agente-construcao", {
              body: {
                action: "supagent_learn_error",
                params: {
                  error_message: constructErr?.message || String(constructErr),
                  function_name: "agente-construcao",
                  intent: question,
                },
              },
            });
          } catch {}
        }
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        return;
      }

      // ═══ Self-evolution: intercept before vision call ═══
      if (_isSpecialCmd && (intentType === "self_evolve")) {
        setThought("🧬 Iniciando ciclo de auto-evolução...");
        setChatHistory(prev => {
          const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...withoutPlaceholder, { role: "ai" as const, text: "🧬 Iniciando ciclo de auto-evolução...", time: new Date().toLocaleTimeString("pt-BR") }];
        });
        try { await speak("Iniciando ciclo de auto-evolução. Aguarde alguns segundos."); } catch {}

        try {
          // ═══ PHASE 1: Neural Evolution (analyze → approve → apply) ═══
          const { data: analyzeData } = await supabase.functions.invoke("neural-evolution", {
            body: { action: "analyze_and_propose" },
          });
          const propostas = analyzeData?.proposals_count ?? analyzeData?.count ?? analyzeData?.proposals?.length ?? 0;
          addLog(`🧬 Propostas geradas: ${propostas}`);

          const { data: approveData } = await supabase.functions.invoke("neural-evolution", {
            body: { action: "auto_approve_pending" },
          });
          const aprovadas = approveData?.approved ?? approveData?.approved_count ?? 0;
          const patchesGerados = approveData?.patchesGenerated ?? 0;
          addLog(`✅ Propostas aprovadas: ${aprovadas} | Patches gerados: ${patchesGerados}`);

          const { data: applyData } = await supabase.functions.invoke("neural-evolution", {
            body: { action: "auto_apply_approved" },
          });
          const aplicadas = applyData?.applied ?? applyData?.applied_count ?? 0;
          addLog(`🚀 Melhorias aplicadas: ${aplicadas}`);

          // ═══ PHASE 2: Embedding batch loop (até zerar fila) ═══
          setThought("🧠 Vetorizando base neural...");
          let embeddingsProcessed = 0;
          let embeddingsRemaining = 1;
          let embeddingIterations = 0;
          while (embeddingsRemaining > 0 && embeddingIterations < 5) {
            try {
              const { data: embData } = await supabase.functions.invoke("generate-embeddings", {
                body: { target: "both", batchSize: 100 },
              });
              embeddingsProcessed += (embData?.neural?.processed ?? 0) + (embData?.legal?.processed ?? 0);
              embeddingsRemaining = (embData?.remaining?.neural ?? 0) + (embData?.remaining?.legal ?? 0);
              embeddingIterations++;
              addLog(`🧠 Embeddings batch ${embeddingIterations}: +${(embData?.neural?.processed ?? 0) + (embData?.legal?.processed ?? 0)}, restam ${embeddingsRemaining}`);
            } catch (embErr) {
              addLog(`⚠️ Embedding batch error: ${embErr}`);
              break;
            }
          }

          // ═══ PHASE 3: Pipeline completo + Queue worker ═══
          setThought("⚙️ Executando pipeline completo...");
          const [pipelineRes, queueRes] = await Promise.allSettled([
            supabase.functions.invoke("neural-pipeline-orchestrator", { body: { action: "full_cycle" } }),
            supabase.functions.invoke("queue-worker", { body: {} }),
          ]);
          const pipelineOk = pipelineRes.status === "fulfilled";
          const queueOk = queueRes.status === "fulfilled";
          addLog(`⚙️ Pipeline: ${pipelineOk ? "✅" : "❌"} | Queue: ${queueOk ? "✅" : "❌"}`);

          // ═══ PHASE 4: Auto-learn (specialize + DPO + knowledge gaps) ═══
          setThought("📚 Auto-aprendizagem e especialização...");
          const [specRes, dpoRes, gapsRes] = await Promise.allSettled([
            supabase.functions.invoke("neural-auto-learn", { body: { action: "auto_specialize" } }),
            supabase.functions.invoke("neural-auto-learn", { body: { action: "trigger_dpo" } }),
            supabase.functions.invoke("neural-auto-learn", { body: { action: "auto_fill_knowledge_gaps" } }),
          ]);
          addLog(`📚 Specialize: ${specRes.status === "fulfilled" ? "✅" : "❌"} | DPO: ${dpoRes.status === "fulfilled" ? "✅" : "❌"} | Gaps: ${gapsRes.status === "fulfilled" ? "✅" : "❌"}`);

          // ═══ PHASE 5: Atualizar protocolos (RLVR + DPO + Hebbian + CrossValidation) ═══
          setThought("🔄 Atualizando protocolos de conhecimento...");
          const { data: trainData } = await supabase.functions.invoke("neural-training", {
            body: {
              action: "neural_learn",
              data: {
                enable_rlvr: true, enable_dpo: true, enable_hebbian: true,
                enable_cross_validation: true, enable_distillation: false,
              },
            },
          });
          addLog(`🔄 Protocolos atualizados: ${trainData?.success ? "✅" : "⚠️"}`);

          // SupAgent status
          const { data: supagentData } = await supabase.functions.invoke("agente-construcao", {
            body: { action: "supagent_status", params: {} },
          });
          const supagentStats = supagentData?.stats || {};

          // ═══ SUMMARY ═══
          const patchPart = patchesGerados > 0
            ? ` Gerei ${patchesGerados} patch${patchesGerados > 1 ? "es" : ""} de código validados.`
            : "";
          const supagentPart = supagentStats.total_patches > 0
            ? ` SupAgent: ${supagentStats.applied || 0} ativas, ${supagentStats.pending || 0} pendentes.`
            : "";
          const embPart = embeddingsProcessed > 0
            ? ` Vetorizei ${embeddingsProcessed} itens (${embeddingsRemaining} restantes).`
            : " Base neural totalmente vetorizada.";

          const summary = `Evolução completa executada. ${propostas} propostas → ${aprovadas} aprovadas → ${aplicadas} aplicadas.${patchPart}${embPart} Pipeline, fila de jobs, DPO, especialização e protocolos atualizados.${supagentPart}`;

          setThought(summary);
          setChatHistory(prev => {
            const withoutEvo = prev.filter(m => !(m.role === "ai" && m.text.startsWith("🧬")));
            return [...withoutEvo, { role: "ai" as const, text: `🧬 ${summary}`, time: new Date().toLocaleTimeString("pt-BR") }];
          });
          try { await speak(summary); } catch {}

          saveToNeuralLearning(question, summary, "self_evolution", 0.95, {
            proposals: propostas, approved: aprovadas, applied: aplicadas, patchesGenerated: patchesGerados,
            embeddingsProcessed, embeddingsRemaining, pipelineOk, queueOk,
            autoLearn: { specialize: specRes.status, dpo: dpoRes.status, gaps: gapsRes.status },
            protocolsUpdated: trainData?.success ?? false,
            supagent: supagentStats,
          }).catch(() => {});
        } catch (evoErr: any) {
          const errMsg = "Não consegui completar o ciclo de evolução agora. Tentarei novamente no próximo ciclo automático.";
          addChat("ai", errMsg);
          addLog(`❌ Erro na auto-evolução: ${evoErr?.message || evoErr}`);
          try { await speak(errMsg); } catch {}
        }
        aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
        return;
      }

      // ═══ TOOL EXECUTION (skip on fast-path — LLM handles general questions) ═══
      if (_isSpecialCmd) try {
        const { matchAndExecuteTool } = await import("@/lib/neural/orion-tool-executor");
        const toolResult = await matchAndExecuteTool(processedQuestion);
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
          try { await speak(displayResponse); } catch {}
          
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

      const localQueue: string[] = [];
      if (speechQueueRef) speechQueueRef.current = localQueue;
      let isSpeakingQueue = false;
      let spokeOrQueued = false;
      let queueFinished = false;
      let batchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
      let streamEnded = false;

      const processSpeechQueue = async () => {
        if (bargedInRef.current) return;
        if (isSpeakingQueue || localQueue.length === 0) return;
        isSpeakingQueue = true;

        // Mic already stopped by previous speak() or AI flow — no toggle here

        try {
          while (localQueue.length > 0 && !bargedInRef.current) {
            // Batch all queued sentences into one speak() call to avoid pauses
            const batch = localQueue.splice(0, localQueue.length).join(" ");
            if (!batch.trim()) continue;
            // skipMicToggle: mic is managed here, not inside speak()
            await speak(batch, { skipMicToggle: true });
          }
        } finally {
          isSpeakingQueue = false;
          if (localQueue.length > 0 && !bargedInRef.current) {
            void processSpeechQueue();
          } else {
            queueFinished = true;
            // Resume mic ONCE after all speech is done
          }
        }
      };

      // Debounced queue trigger: wait 600ms for more sentences to accumulate
      // before starting TTS, so we send larger chunks = fewer HTTP calls = no pauses
      const triggerQueueDebounced = () => {
        if (batchDebounceTimer) clearTimeout(batchDebounceTimer);
        // If stream already ended, process immediately
        if (streamEnded) {
          void processSpeechQueue();
          return;
        }
        batchDebounceTimer = setTimeout(() => {
          void processSpeechQueue();
        }, 600);
      };

      let streamingText = "";
      const cleanHistory = chatHistoryRef.current.filter(m =>
        !m.text.startsWith("⏳") && !m.text.endsWith("⚡") && m.text.length > 0
      );

      // ═══ LAYER 1.5: Cognitive Routing — SLM + Reasoning Mode ═══
      let cognitiveRouteResult: CognitiveRouting | null = null;
      try {
        const slmDecision = routeToTier(question);
        cognitiveRouteResult = cognitiveRoute(question, slmDecision.tier, intentType);
        addLog(`🧭 CogRoute: tier=${cognitiveRouteResult.tier}, mode=${cognitiveRouteResult.mode}, ${cognitiveRouteResult.timestamp.toFixed(1)}ms`);
        window.dispatchEvent(new CustomEvent("cognitive-routing", { detail: cognitiveRouteResult }));
      } catch (e) {
        addLog(`⚠️ CogRoute fallback: ${e}`);
      }

      // Pass cognitive routing maxTokens to the AI client layer
      if (cognitiveRouteResult) {
        (window as any).__cognitiveMaxTokens = cognitiveRouteResult.maxTokens;
        (window as any).__cognitiveMode = cognitiveRouteResult.mode;
        (window as any).__cognitiveReasoningInstructions = cognitiveRouteResult.reasoningInstructions;
      }

      // ═══ LAYER 1.7: Deep Query Estimator — "Aguarde ~X segundos" ═══
      const timeEstimate = estimateResponseTime(
        question,
        cognitiveRouteResult?.mode || "fast",
        intentType,
      );
      if (timeEstimate.isDeep && timeEstimate.message) {
        addLog(`⏱️ DeepEstimate: ${timeEstimate.complexity}, ~${timeEstimate.estimatedMs}ms`);
        // Show estimation message to user
        setChatHistory(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === "ai" && last.text.startsWith("⏳")) {
            return [...prev.slice(0, -1), { ...last, text: timeEstimate.message }];
          }
          return prev;
        });
        setThought(timeEstimate.message);
        // Speak the estimation (non-blocking, short)
        try { await speak(timeEstimate.spokenMessage); } catch {}
      }

      // ═══ LAYER 2: NLP Semantics + Cognition Context ═══
      // Skip Layer 2 for fast mode queries (save ~50-100ms)
      let cognitionContextStr = "";
      if (cognitiveRouteResult?.mode === "deep") {
        try {
          const semantics = analyzeSemantics(processedQuestion, chatHistoryRef.current.slice(-3).map(m => m.text).join(" "));
          addLog(`🧬 NLP: domain=${semantics.domain}, discourse=${semantics.discourseType}, sentiment=${semantics.sentiment.primary}, entities=${semantics.entities.length}, complexity=${semantics.complexity} [${semantics.analysisTimeMs.toFixed(1)}ms]`);
          window.dispatchEvent(new CustomEvent("nlp-semantics", { detail: semantics }));

          // Use resolved text if coreferences were found
          if (semantics.resolvedText !== processedQuestion) {
            processedQuestion = semantics.resolvedText;
          }

          const cognition = await buildCognitionContext(processedQuestion, chatHistoryRef.current, intentType);
          cognitionContextStr = cognition.contextString;
          addLog(`🧠 Cognition: Φ=${cognition.consciousnessLevel.toFixed(2)}, episodic=${cognition.episodicHits}, CL=${cognition.cognitiveLoad.toFixed(2)}, SV=${cognition.somaticValence.toFixed(1)} [${cognition.buildTimeMs.toFixed(1)}ms]`);
          window.dispatchEvent(new CustomEvent("cognition-context", { detail: cognition }));
        } catch (cognErr) {
          addLog(`⚠️ Cognition/NLP: ${cognErr}`);
        }
      } else {
        addLog(`⚡ Layer 2 SKIPPED (fast mode) [${Date.now() - now}ms]`);
      }

      // Inject cognition context into cognitive routing window vars
      if (cognitionContextStr) {
        (window as any).__cognitionContext = cognitionContextStr;
      }

      // ═══ LAYER 3: LLM call (budget: ~2s to first token) ═══
      addLog(`⏱️ Pre-LLM: ${Date.now() - now}ms`);

      const questionForLLM = processedInput || question;
      const result = await analyzeFrameStreaming(
        needsImage ? canvasRef.current : null, questionForLLM, cleanHistory, needsImage,
        identificationMode, intentType,
        (accumulated) => {
          if (bargedInRef.current) return;
          streamingText = accumulated;
          const display = accumulated
            .replace(/```json[\s\S]*?```/g, "")
            .replace(/\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g, "")
            .replace(/\[LEARN:[^\]]+\]/g, "")
            .replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
            .replace(/#{1,6}\s*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/\/\/[^\n]*/g, "")
            .replace(/<[^>]*>/g, "")
            .replace(/[─═╔╗╚╝║]/g, "")
            .trim();
          setThought(display);
          setChatHistory(prev => {
            const last = prev[prev.length - 1];
            if (last?.role === "ai" && last.text.startsWith("⏳")) {
              return [...prev.slice(0, -1), { ...last, text: display || "⏳ ..." }];
            }
            return prev;
          });
        },
        (sentence) => {
          if (bargedInRef.current) return;
          spokeOrQueued = true;
          localQueue.push(sentence);
          triggerQueueDebounced();
        },
        controller.signal,
      );

      // Stream ended — flush remaining sentences immediately
      streamEnded = true;
      if (batchDebounceTimer) clearTimeout(batchDebounceTimer);
      if (localQueue.length > 0 && !bargedInRef.current) {
        void processSpeechQueue();
      }

      if (bargedInRef.current) {
        if (streamingText) {
          const partial = streamingText
            .replace(/```json[\s\S]*?```/g, "")
            .replace(/\{"identifiedObjects"\s*:\s*\[[\s\S]*?\]\s*\}/g, "")
            .replace(/\[LEARN:[^\]]+\]/g, "")
            .replace(/\*{1,3}/g, "").replace(/_{1,3}/g, "")
            .replace(/#{1,6}\s*/g, "")
            .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
            .replace(/https?:\/\/\S+/g, "")
            .replace(/\/\/[^\n]*/g, "")
            .replace(/<[^>]*>/g, "")
            .replace(/[─═╔╗╚╝║]/g, "")
            .trim();
          setChatHistory(prev => {
            const cleaned = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
            return [...cleaned, { role: "ai" as const, text: `${partial} ⚡`, time: new Date().toLocaleTimeString("pt-BR") }];
          });
        }
        return;
      }

      if (result.description) {
        // ═══ LAYER 3.5: Active Inference Guard — anti-hallucination + logical consistency ═══
        let finalResponse = result.description;
        let adjustedFE = 30; // default moderate confidence
        let wasRefined = false;
        try {
          const inferenceResult = computeFreeEnergy(
            question, result.description,
            (window as any).__lastTeslaIntent || question,
            (window as any).__lastTeslaConfidence
          );

          // Logical consistency check
          const logicCheck = validateLogicalConsistency(result.description);
          if (!logicCheck.consistent) {
            addLog(`⚠️ LogicCheck: ${logicCheck.contradictions.length} contradição(ões) — score=${logicCheck.score}`);
          }

          // Combine free energy with logic score
          adjustedFE = Math.min(100, inferenceResult.freeEnergy + (logicCheck.consistent ? 0 : 15));
          const adjustedSeverity = adjustedFE >= 60 ? "high" : adjustedFE >= 35 ? "low" : "none";

          addLog(`🛡️ ActiveInference: FE=${adjustedFE}(raw=${inferenceResult.freeEnergy}), logic=${logicCheck.score}, passed=${adjustedSeverity === "none"}, ${inferenceResult.timestamp.toFixed(1)}ms`);
          window.dispatchEvent(new CustomEvent("active-inference-check", {
            detail: { ...inferenceResult, freeEnergy: adjustedFE, severity: adjustedSeverity, passed: adjustedSeverity === "none" }
          }));

          if (adjustedSeverity === "high") {
            // Disclaimer only — NO re-call to LLM (saves 5-20s latency)
            finalResponse = `${result.description}\n\n${inferenceResult.disclaimer || "⚠️ Verifique as referências desta resposta."}`;
            addLog(`⚠️ ActiveInference: FE alto — disclaimer adicionado (sem re-chamada LLM)`);
          } else if (adjustedSeverity === "low" && inferenceResult.disclaimer) {
            finalResponse = `${result.description}\n\n${inferenceResult.disclaimer}`;
          }

          // Cache successful reasoning pattern
          if (adjustedSeverity === "none" && cognitiveRouteResult?.mode === "deep" && intentType) {
            cacheReasoningPattern(intentType, cognitiveRouteResult.reasoningInstructions, logicCheck.score);
          }

          // ═══ LAYER 3.7: Drafter-Critic (conditional refinement for deep mode) ═══
          
          try {
            const mode = cognitiveRouteResult?.mode || "fast";
            const { refine, critique } = shouldRefine(question, finalResponse, intentType, mode);
            addLog(`📝 Critic: score=${critique.score.toFixed(2)}, refine=${refine}, dims=[C:${critique.dimensions.completeness.toFixed(1)},H:${critique.dimensions.coherence.toFixed(1)},R:${critique.dimensions.relevance.toFixed(1)}]`);
            window.dispatchEvent(new CustomEvent("drafter-critic", { detail: critique }));

            if (refine && critique.critique) {
              addLog(`🔄 Refinement triggered: ${critique.critique.slice(0, 100)}`);
              // Instead of re-calling LLM (expensive), append critique as a note
              finalResponse = `${finalResponse}\n\n📋 *Nota de qualidade*: ${critique.critique}`;
              wasRefined = true;
            }
          } catch (criticErr) {
            addLog(`⚠️ Critic: ${criticErr}`);
          }
        } catch (e) {
          addLog(`⚠️ ActiveInference: erro na verificação — ${e}`);
        }

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
          ((1 - (adjustedFE ?? 30) / 100) * 0.4)
        ));

        setChatHistory(prev => {
          const withoutPlaceholder = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...withoutPlaceholder, { role: "ai" as const, text: humanizedText, time: new Date().toLocaleTimeString("pt-BR"), confidence: aiConfidence }];
        });
        addLog(`🧠 IA: ${humanizedText.slice(0, 100)}...`);
        if (!spokeOrQueued && !bargedInRef.current) {
          try { await speak(humanizedSpeech); spokeOrQueued = true; } catch {}
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
          cognition_enriched: !!cognitionContextStr, was_refined: wasRefined,
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
              try { await speak(fallbackResult.description); } catch {}
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
              try { await speak(localMsg); } catch {}
            } else if (relevantFacts.length > 0) {
              const localMsg = relevantFacts.slice(0, 3).join(". ") + ".";
              addChat("ai", localMsg);
              try { await speak(localMsg); } catch {}
            } else {
              addChat("ai", "Não tenho informações suficientes para responder a essa pergunta no momento.");
              try { await speak("Não tenho informações suficientes para responder a essa pergunta no momento."); } catch {}
            }
          }
        } catch (fbErr) {
          console.error("Fallback also failed:", fbErr);
          addChat("ai", "Estou com dificuldade de conexão. Reformule sua pergunta e tente de novo.");
          try { await speak("Estou com dificuldade de conexão. Reformule sua pergunta e tente de novo."); } catch {}
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
      aiPendingRef.current = false; setIsProcessing(false); isProcessingRef.current = false; VS.aiResponding = false;
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
