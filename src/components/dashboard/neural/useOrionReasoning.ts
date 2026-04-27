import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { VS } from "./useVisionProcessing";
import { PentagonPizzaOrchestrator } from "@/core/pentagon/orchestrator/PentagonPizzaOrchestrator";
import { PerceptionAdapter } from "@/core/pentagon/layers/perception/PerceptionAdapter";
import { MemoryAdapter } from "@/core/pentagon/layers/memory/MemoryAdapter";
import { ReasoningAdapter } from "@/core/pentagon/layers/reasoning/ReasoningAdapter";
import { ActionAdapter } from "@/core/pentagon/layers/action/ActionAdapter";
import { MetaAdapter } from "@/core/pentagon/layers/meta/MetaAdapter";
import type { BackgroundTranscript } from "./useWakeWord";
import { ActionResult } from "@/core/pentagon/layers/types";

export interface ChatMessage { role: "user" | "ai" | "system"; text: string; time: string; confidence?: number; }

type OrionInputSource = "voice" | "text";


const OWNER_ONLY_INTENT_REGEX = /auto_evolution|auto_construct|self_evolve|code_analysis|code_refactor|improve_code|analyze_code|refactor/i;
const VISUAL_COMMAND_REGEX = /\b(o\s+que\s+(voc[eê]\s+)?(est[aá]\s+vendo|v[eê]|v[êe])|descrev[ae]\s+(a\s+)?(imagem|cena|ambiente|isso|aqui|isto)|analise\s+(a\s+)?(imagem|cena|c[aâ]mera|isso|isto|aqui)|identifique\s+(o\s+)?(objeto|rosto|texto|isso|isto|aqui)|leia\s+(o\s+)?(texto|isso|isto|aqui)|quantos?\s+.+\s+(tem|h[aá])|olh[ae]\s*(a[ií]|aqui|agora|isso|isto|pra\s+(c[aá]|mim))?|v[eê]\s+(isso|isto|aqui|agora|a[ií])|que\s+(é\s+)?(isso|isto|aqui)|esse\s+aqui|essa\s+aqui|isso\s+aqui|isto\s+aqui|aqui\s+(na\s+(minha|sua)\s+(m[aã]o|frente)|do\s+lado)|t[aá]\s+vendo|consegue\s+ver|repara\s+(nisso|aqui|isso))\b/i;

export function useOrionReasoning(
  active: boolean, speak: (t: string, options?: { skipMicToggle?: boolean }) => Promise<void>, canvasRef: React.RefObject<HTMLCanvasElement | null>,
  identificationMode: string = "universal",
  bargeIn?: () => void,
  abortControllerRef?: React.MutableRefObject<AbortController | null>,
  speechQueueRef?: React.MutableRefObject<string[]>,
  bargeInCallbackRef?: React.MutableRefObject<(() => void) | null>,
  getBackgroundTranscripts?: () => BackgroundTranscript[],
  identityStatus?: "guest" | "authorized" | "creator" | "owner",
  onActivateVision?: (opts?: unknown) => void,
  localDetectionsRef?: React.MutableRefObject<Array<Record<string, any>>>,
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

  // 🧠 UNIFIED ORION CORTEX (Pentagon Pizza Architecture)
  const cortexRef = useRef<PentagonPizzaOrchestrator>(
    new PentagonPizzaOrchestrator(
      new PerceptionAdapter(),
      new MemoryAdapter(),
      new ReasoningAdapter(),
      new ActionAdapter(),
      new MetaAdapter()
    )
  );

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


  // Expanded — catches formal AND colloquial visual commands (olha, vê, esse aqui, isso aqui, aqui na minha mão, etc.)


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
    const captureError = (...args: unknown[]) => {
      const msg = typeof args[0] === "string" ? args[0].substring(0, 200) : "";
      // Skip noisy WASM/MediaPipe errors
      if (/mediapipe|wasm|gl_context|BlazeFace|vision_wasm/i.test(msg)) {
        originalError.apply(console, args);
        return;
      }
      if (errorBufferRef.current.length < 20) errorBufferRef.current.push(`[ERROR] ${msg}`);
      originalError.apply(console, args);
    };
    const captureWarn = (...args: unknown[]) => {
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
      } catch (e) { console.error("Silent error:", e); }

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
      } catch (e) { console.error("Silent error:", e); }

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
              .map((i: unknown) => `• [${i.type}] ${i.target}: ${i.description}`)
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
        try { abortControllerRef?.current?.abort(); } catch (e) { console.error("Silent error:", e); }
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
    if (!question || !question.trim()) return;
    const now = Date.now();
    bargedInRef.current = false;
    aiPendingRef.current = true;
    setIsProcessing(true);
    isProcessingRef.current = true;
    VS.aiResponding = true;
    const controller = new AbortController();
    if (abortControllerRef) abortControllerRef.current = controller;

    // ⚡ TTS warm-up
    import("@/lib/tts/geminiTTS").then(m => m.warmUpGeminiTTS()).catch(() => {});
    import("@/lib/tts/ttsPrewarm").then(m => m.prewarmCommonTTS()).catch(() => {});

    try {
      const cachedAuthUser = await getCachedUser();

      // 🧠 CORTEX UNIFIED COGNITION LOOP (Pentagon Pizza Architecture)
      const cortexResult: ActionResult = await cortexRef.current.runCycle(question, {
        userId: cachedAuthUser?.id,
        userEmail: cachedAuthUser?.email,
        identityStatus,
        visionDetections: localDetectionsRef?.current || (window as Record<string, any>).__orion_global_vision__
      });

      if (cortexResult.success) {
        const displayResponse = cortexResult.output;
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai", text: displayResponse, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(displayResponse);
        addLog(`🧠 [CORTEX] ${cortexResult.roiImpact || "Ação concluída"}`);
        speak(displayResponse).catch(() => {});
        cleanupProcessing();
        if (intentQueueRef.current.length > 0) processNextInQueue();
        return;
      }

      if (!cortexResult.success && cortexResult.data?.paymentUrl) {
        const msg = cortexResult.output;
        setChatHistory(prev => {
          const clean = prev.filter(m => !(m.role === "ai" && m.text.startsWith("⏳")));
          return [...clean, { role: "ai", text: msg, time: new Date().toLocaleTimeString("pt-BR") }];
        });
        setThought(msg);
        speak(msg).catch(() => {});
        addLog("💳 Redirecionando para pagamento...");
        setTimeout(() => window.open(cortexResult.data.paymentUrl, "_blank"), 2000);
        cleanupProcessing();
        if (intentQueueRef.current.length > 0) processNextInQueue();
        return;
      }

      const fallback = cortexResult.output || "Não consegui processar essa solicitação no momento.";
      addChat("ai", fallback);
      speak(fallback).catch(() => {});

    } catch (e: unknown) {
      if (e?.name === "AbortError" || bargedInRef.current) {
        addLog("⚡ Requisição cancelada por barge-in");
      } else {
        console.error("Cortex Error:", e);
        addChat("ai", "Erro ao processar. Reformule sua pergunta.");
      }
    } finally {
      cleanupProcessing();
      lastAIRef.current = Date.now();
      if (abortControllerRef) abortControllerRef.current = null;
    }
  }, [speak, addChat, addLog, abortControllerRef, processNextInQueue, cleanupProcessing, getCachedUser, identityStatus, localDetectionsRef]);

  // Sync askAIInternal ref to break circular dependency
  useEffect(() => { askAIInternalRef.current = askAIInternal; }, [askAIInternal]);

  return { thought, log, aiDescription, askAI, askInput, setAskInput, chatHistory, isProcessing, addChat, detectedObjects };
}
