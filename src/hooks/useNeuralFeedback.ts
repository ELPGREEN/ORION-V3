/**
 * useNeuralFeedback v2 — Hook universal de integração neural
 * 
 * v2: Rota feedback via neural-feedback-receiver edge function
 * para que o A/B routing funcione automaticamente (o receiver
 * detecta experimentos em andamento e taga o prompt_version_id).
 * 
 * Fallback: se a edge function falhar, insere diretamente.
 */
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type NeuralInteractionType =
  | "avaliacao"
  | "crm_client_event"
  | "document_viewed"
  | "document_deleted"
  | "chat_humano"
  | "catalogo_query"
  | "search"
  | "document_generation"
  | "chat"
  | "processo_event"
  | "tarefa_event"
  | "assinatura_event"
  | "pagamento_event"
  | "pesquisa_unificada"
  | "webhook_event"
  | "configuracao_save"
  | "notificacao_read"
  | "consulta_agendada"
  | "neural_admin"
  | "metricas_viewed"
  | "ocr_result"
  | "traducao_result"
  | "contato_importado"
  | "document_feedback"
  | "multi_head_attention";

interface NeuralFeedbackPayload {
  interaction_type: NeuralInteractionType;
  input_text: string;
  output_text?: string;
  quality_score?: number; // 0..1 — se omitido, auto-calculado
  metadata?: Record<string, unknown>;
  user_id?: string;
}

/**
 * Calcula quality_score automático se não fornecido.
 */
function autoScore(payload: NeuralFeedbackPayload): number {
  if (payload.quality_score !== undefined) return payload.quality_score;

  const meta = payload.metadata || {};

  if (meta.nota && typeof meta.nota === "number") {
    return Math.min(meta.nota / 5, 1.0);
  }

  const len = (payload.output_text || "").length;
  let score = 0.5;
  if (len > 200) score += 0.1;
  if (len > 1000) score += 0.1;
  if (meta.tipo_caso) score += 0.05;
  if (meta.aprovado === true) score += 0.15;

  return Math.min(Math.max(score, 0.1), 1.0);
}

export function useNeuralFeedback() {
  const log = useCallback(async (payload: NeuralFeedbackPayload) => {
    // Resolve user_id eagerly so directInsert fallback has it
    if (!payload.user_id) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) payload.user_id = user.id;
      } catch { /* silent */ }
    }
    // Fire-and-forget: don't await, don't block rendering
    const doLog = async () => {
      try {
        const explicitScore = payload.quality_score !== undefined ? payload.quality_score : undefined;

        const { data, error: fnError } = await supabase.functions.invoke("neural-ops", {
          body: {
            interaction_type: payload.interaction_type,
            input_text: (payload.input_text || "").substring(0, 5000),
            output_text: (payload.output_text || "").substring(0, 5000),
            ...(explicitScore !== undefined ? { quality_score: explicitScore } : {}),
            user_id: payload.user_id || null,
            metadata: {
              ...(payload.metadata || {}),
              source: payload.interaction_type,
            },
          },
        });

        if (fnError) {
          console.debug("[NeuralFeedback] Edge fn error, using direct insert fallback");
          await directInsert(payload, autoScore(payload));
        } else {
          const abInfo = data?.ab_variant ? ` ab=${String(data.ab_variant).substring(0, 8)}` : "";
          const receiverScore = data?.quality_score ?? "?";
          console.debug(`[NeuralFeedback] Logged: ${payload.interaction_type} score=${receiverScore}${abInfo}`);
        }
      } catch (err) {
        try {
          await directInsert(payload, autoScore(payload));
        } catch { /* silent */ }
      }
    };

    // Schedule without blocking
    doLog();
  }, []);

  return { logNeural: log };
}

/** Fallback: direct DB insert without A/B routing */
async function directInsert(payload: NeuralFeedbackPayload, qualityScore: number) {
  const learned = qualityScore >= 0.65;

  const { error } = await supabase.from("neural_learning_data").insert({
    interaction_type: payload.interaction_type,
    input_text: (payload.input_text || "").substring(0, 5000),
    output_text: (payload.output_text || "").substring(0, 5000),
    quality_score: qualityScore,
    learned,
    user_id: payload.user_id || null,
    metadata: {
      ...(payload.metadata || {}),
      source: payload.interaction_type,
      autoScored: true,
      fallback_direct: true,
    },
  });

  if (error) {
    console.debug("[NeuralFeedback] Direct insert failed:", error.message);
  } else {
    console.debug("[NeuralFeedback] Direct insert OK, learned:", learned);

    // Auto-index na knowledge base se aprendido
    if (learned && (payload.output_text || "").length > 300) {
      // Use payload user_id (already resolved) instead of generic advogado lookup
      const targetUserId = payload.user_id;

      if (targetUserId) {
        const kbTitle = `[${payload.interaction_type}] ${(payload.input_text || "").substring(0, 80)}`;
        const kbSourceRef = `auto:fallback:${payload.interaction_type}:${Date.now()}`;
        await supabase.from("neural_knowledge_base").upsert({
          user_id: targetUserId,
          title: kbTitle,
          content: (payload.output_text || payload.input_text || "").substring(0, 5000),
          source_type: payload.interaction_type,
          source_reference: kbSourceRef,
          tags: [payload.interaction_type, "auto-indexed"].filter(Boolean),
          is_processed: false,
        }, { onConflict: "source_reference,user_id", ignoreDuplicates: true });
      }
    }
  }
}