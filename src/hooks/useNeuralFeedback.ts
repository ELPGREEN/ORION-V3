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
 * Usa múltiplos sinais para inferir qualidade.
 */
function autoScore(payload: NeuralFeedbackPayload): number {
  if (payload.quality_score !== undefined) {
    return Math.max(0, Math.min(1, payload.quality_score));
  }

  const meta = payload.metadata || {};

  // Nota explícita do usuário (1-5)
  if (meta.nota && typeof meta.nota === "number") {
    return Math.max(0.1, Math.min(meta.nota / 5, 1.0));
  }

  const outputLen = (payload.output_text || "").length;
  const inputLen = (payload.input_text || "").length;
  
  let score = 0.5;
  
  // Penaliza respostas muito curtas
  if (outputLen < 50 && inputLen > 100) score -= 0.15;
  
  // Bonifica respostas mais completas
  if (outputLen > 200) score += 0.1;
  if (outputLen > 1000) score += 0.1;
  if (outputLen > 3000) score += 0.05;
  
  // Sinais de contexto
  if (meta.tipo_caso) score += 0.05;
  if (meta.aprovado === true) score += 0.15;
  if (meta.feedback_positivo === true) score += 0.1;
  if (meta.citacoes_encontradas && Number(meta.citacoes_encontradas) > 0) score += 0.05;
  
  // Penalidades
  if (meta.erro === true || meta.error === true) score -= 0.2;
  if (meta.timeout === true) score -= 0.1;
  if (meta.rejected === true) score -= 0.25;

  return Math.max(0.1, Math.min(1.0, score));
}

// Rate limiting para evitar spam de logs
const recentLogs = new Map<string, number>();
const LOG_DEBOUNCE_MS = 1000;
const MAX_LOGS_PER_MINUTE = 30;
let logsThisMinute = 0;
let lastMinuteReset = Date.now();

function shouldThrottle(key: string): boolean {
  const now = Date.now();
  
  // Reset contador a cada minuto
  if (now - lastMinuteReset > 60000) {
    logsThisMinute = 0;
    lastMinuteReset = now;
  }
  
  // Verifica limite por minuto
  if (logsThisMinute >= MAX_LOGS_PER_MINUTE) {
    return true;
  }
  
  // Verifica debounce por chave
  const lastLog = recentLogs.get(key);
  if (lastLog && now - lastLog < LOG_DEBOUNCE_MS) {
    return true;
  }
  
  return false;
}

export function useNeuralFeedback() {
  const log = useCallback(async (payload: NeuralFeedbackPayload) => {
    // Validação básica
    if (!payload.interaction_type || !payload.input_text) {
      console.debug("[NeuralFeedback] Payload inválido, ignorando");
      return;
    }

    // Gera chave única para debounce
    const dedupeKey = `${payload.interaction_type}:${payload.input_text.substring(0, 50)}`;
    
    if (shouldThrottle(dedupeKey)) {
      console.debug("[NeuralFeedback] Throttled:", payload.interaction_type);
      return;
    }
    
    // Registra log
    recentLogs.set(dedupeKey, Date.now());
    logsThisMinute++;
    
    // Limpa logs antigos do mapa (evita memory leak)
    if (recentLogs.size > 100) {
      const cutoff = Date.now() - LOG_DEBOUNCE_MS * 2;
      for (const [k, v] of recentLogs) {
        if (v < cutoff) recentLogs.delete(k);
      }
    }

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
        const sanitizedInput = (payload.input_text || "").trim().substring(0, 5000);
        const sanitizedOutput = (payload.output_text || "").trim().substring(0, 5000);
        const explicitScore = payload.quality_score !== undefined 
          ? Math.max(0, Math.min(1, payload.quality_score)) 
          : undefined;

        const { data, error: fnError } = await supabase.functions.invoke("neural-ops", {
          body: {
            interaction_type: payload.interaction_type,
            input_text: sanitizedInput,
            output_text: sanitizedOutput,
            ...(explicitScore !== undefined ? { quality_score: explicitScore } : {}),
            user_id: payload.user_id || null,
            metadata: {
              ...(payload.metadata || {}),
              source: payload.interaction_type,
              timestamp: Date.now(),
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
