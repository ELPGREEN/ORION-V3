/**
 * ─── usePentagonChat Hook ───
 * Bridges the Pentagon orchestrator with DocumentAIChatPanel.
 *
 * Features:
 * - Uses PentagonPizzaOrchestrator for cognitive processing
 * - Supports structured output with full metadata
 * - Integrates with existing chat persistence and feedback
 * - Tracks cycle performance metrics
 * - Supports vision input through PentagonVisionAdapter
 */
import { useState, useCallback, useRef } from "react";
import { getPentagonOrchestrator, PentagonStructuredOutput } from "@/core/pentagon";
import { useAuth } from "@/contexts/AuthContext";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useChatIAPersistence } from "@/hooks/useChatIAPersistence";
import { supabase } from "@/integrations/supabase/client";

export interface PentagonChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  /** Pentagon cycle metadata (if processed through Pentagon) */
  pentagonMetadata?: PentagonStructuredOutput["metadata"];
  /** Tool calls made during this cycle */
  toolCalls?: PentagonStructuredOutput["toolCalls"];
  /** Confidence score from reasoning */
  pentagonConfidence?: number;
  /** Sources used (RAG snippets) */
  pentagonSourcesUsed?: string[];
  /** Whether neural search was used */
  neuralUsed?: boolean;
  /** User feedback */
  feedback?: "up" | "down";
}

export interface PentagonChatOptions {
  /** Maximum steps before forced stop */
  maxSteps?: number;
  /** Maximum cost before forced stop */
  maxCost?: number;
  /** Maximum duration in ms */
  maxDurationMs?: number;
  /** Domain context */
  domain?: string;
  /** Force tool usage */
  forceTool?: boolean;
  /** Force RAG usage */
  forceRag?: boolean;
  /** Skip Feynman refinement */
  skipFeynman?: boolean;
  /** Whether to use structured output */
  structured?: boolean;
}

export function usePentagonChat(options: PentagonChatOptions = {}) {
  const [messages, setMessages] = useState<PentagonChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentCycleId, setCurrentCycleId] = useState<string | null>(null);
  const [lastPerformance, setLastPerformance] = useState<{
    steps: number;
    cost: number;
    durationMs: number;
    earlyExit?: boolean;
  } | null>(null);

  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const {
    conversations,
    activeConversationId,
    loadingConversations,
    createConversation,
    saveMessage,
    deleteConversation,
    switchConversation,
    messages: persistedMessages,
  } = useChatIAPersistence();

  const orchestratorRef = useRef(getPentagonOrchestrator());

  /**
   * Send a message through the Pentagon cognitive loop
   */
  const sendMessage = useCallback(
    async (userMessage: string, context: Record<string, unknown> = {}) => {
      if (!userMessage.trim() || loading) return;

      const userMsg: PentagonChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: userMessage.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);

      // Create conversation if needed
      let convId = activeConversationId;
      if (!convId) {
        convId = await createConversation(userMessage.substring(0, 80));
      }
      if (convId) {
        saveMessage(convId, { role: "user", content: userMessage.trim() }).catch(() => {});
      }

      try {
        const pentagonOptions = {
          maxSteps: options.maxSteps ?? 10,
          maxCost: options.maxCost ?? 5.0,
          maxDurationMs: options.maxDurationMs ?? 30000,
          domain: options.domain,
          forceTool: options.forceTool,
          forceRag: options.forceRag,
          skipFeynman: options.skipFeynman,
          sharedState: { userId: user?.id, ...context },
        };

        const result = options.structured
          ? await orchestratorRef.current.runCycleStructured(userMessage, pentagonOptions)
          : await orchestratorRef.current.runCycle(userMessage, pentagonOptions);

        // Extract response from result
        let responseText = result.output || "Processado com sucesso.";
        let pentagonMeta: PentagonStructuredOutput["metadata"] | undefined;
        let toolCalls: PentagonStructuredOutput["toolCalls"] | undefined;
        let pentagonConfidence: number | undefined;
        let pentagonSourcesUsed: string[] | undefined;

        if (options.structured && "metadata" in result) {
          const structured = result as PentagonStructuredOutput;
          pentagonMeta = structured.metadata;
          toolCalls = structured.toolCalls;
          pentagonConfidence = structured.confidence;
          pentagonSourcesUsed = structured.sourcesUsed;
          setCurrentCycleId(structured.metadata.cycleId);
          setLastPerformance({
            steps: structured.metadata.stepsTaken,
            cost: structured.metadata.totalCost,
            durationMs: structured.metadata.durationMs,
            earlyExit: structured.metadata.earlyExit,
          });
        }

        // Fallback: if Pentagon didn't generate a response, use edge function
        if (!result.output || result.output === "") {
          const { data } = await supabase.functions.invoke("aprimorar-documento", {
            body: {
              currentText: (context.documentContent as string) || "",
              documentType: (context.documentType as string) || "geral",
              query: userMessage,
              mode: "chat",
              chatHistory: messages.slice(-6).map((m) => ({
                role: m.role,
                content: m.content.substring(0, 500),
              })),
            },
          });
          responseText =
            data?.enrichedText || data?.content || data?.chatResponse || responseText;
        }

        const assistantMsg: PentagonChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: responseText,
          timestamp: new Date(),
          pentagonMetadata: pentagonMeta,
          toolCalls,
          pentagonConfidence,
          pentagonSourcesUsed,
          neuralUsed: !!pentagonMeta?.earlyExit,
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // Fire-and-forget: persistence
        if (convId) {
          saveMessage(convId, {
            role: "assistant",
            content: responseText,
            neuralEnhanced: !!pentagonMeta?.earlyExit,
          }).catch(() => {});
        }

        // Fire-and-forget: logging
        logNeural({
          interaction_type: "chat" as const,
          input_text: userMessage,
          output_text: responseText.substring(0, 1000),
          metadata: {
            cycleId: pentagonMeta?.cycleId,
            steps: pentagonMeta?.stepsTaken,
            cost: pentagonMeta?.totalCost,
            durationMs: pentagonMeta?.durationMs,
            earlyExit: pentagonMeta?.earlyExit,
            pentagonConfidence,
          },
        }).catch(() => {});
      } catch (err) {
        console.error("[PentagonChat] Error:", err);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "❌ Erro ao processar. Verifique sua conexão e tente novamente.",
            timestamp: new Date(),
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [
      loading,
      options,
      activeConversationId,
      createConversation,
      saveMessage,
      messages,
      user?.id,
      logNeural,
    ]
  );

  /**
   * Add a system message
   */
  const addSystemMessage = useCallback((content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "system", content, timestamp: new Date() },
    ]);
  }, []);

  /**
   * Handle user feedback
   */
  const handleFeedback = useCallback(
    (msgId: string, type: "up" | "down") => {
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, feedback: type } : m))
      );
      const msg = messages.find((m) => m.id === msgId);
      if (msg) {
        logNeural({
          interaction_type: "avaliacao" as const,
          input_text: msg.content.substring(0, 500),
          output_text: type,
          quality_score: type === "up" ? 0.9 : 0.2,
          metadata: { messageId: msgId, cycleId: msg.pentagonMetadata?.cycleId },
        }).catch(() => {});
      }
    },
    [messages, logNeural]
  );

  /**
   * Start a new conversation
   */
  const handleNewConversation = useCallback(async () => {
    await createConversation("Nova conversa");
    setMessages([]);
    setCurrentCycleId(null);
    setLastPerformance(null);
  }, [createConversation]);

  /**
   * Get current Pentagon state
   */
  const getPentagonState = useCallback(() => {
    return orchestratorRef.current.getState();
  }, []);

  return {
    messages,
    loading,
    currentCycleId,
    lastPerformance,
    sendMessage,
    addSystemMessage,
    handleFeedback,
    handleNewConversation,
    getPentagonState,
    // Persistence
    conversations,
    activeConversationId,
    loadingConversations,
    deleteConversation,
    switchConversation,
    persistedMessages,
  };
}
