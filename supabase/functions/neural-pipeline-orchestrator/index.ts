import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════
// NEURAL PIPELINE ORCHESTRATOR v1
// Coordena o ciclo completo de aprendizado da Rede Neural:
// 1. Coleta feedback de chat, documentos e pesquisa
// 2. Computa métricas de qualidade e confusion matrix
// 3. Atualiza pesos sinápticos via Adam Optimizer
// 4. Propõe evoluções via neural-evolution
// 5. Aciona generate-embeddings para novos itens
// 6. Registra estado do pipeline em ai_metrics
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // FIX: A2 — Validate authenticated user via getUser
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate token (unless it's a service-role call from cron)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ error: "Token inválido." }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || "full_cycle";

    console.log(`🧠 Neural Pipeline Orchestrator — action: ${action}`);

    const results: Record<string, unknown> = {};

    // ═══════════════════════════════════════════════════════
    // ETAPA 1: Coleta e Indexação de Feedback Recente
    // Processa interações do chat, documentos e pesquisas
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle" || action === "collect_feedback") {
      const windowMs = 4 * 60 * 60 * 1000; // últimas 4 horas
      const since = new Date(Date.now() - windowMs).toISOString();

      // Busca interações de chat não processadas
      const { data: chatMsgs } = await supabase
        .from("chat_ia_messages")
        .select("id, content, role, conversation_id, neural_enhanced, provider, created_at")
        .eq("role", "assistant")
        .gte("created_at", since)
        .limit(50);

      let chatFeedbackLogged = 0;
      for (const msg of chatMsgs || []) {
        const content = msg.content || "";
        let score = 0.5;
        if (content.length > 1500) score += 0.1;
        if (content.length > 3000) score += 0.1;
        if (msg.neural_enhanced) score += 0.1;
        if (/art\.\s*\d+|§\s*\d+|lei\s*n[°º]|súmula/i.test(content)) score += 0.1;
        if (msg.provider) score += 0.05;
        score = Math.min(Math.max(score, 0.1), 1.0);

        const ref = `chat_msg:${msg.id}`;
        const { count: exists } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .eq("interaction_type", "chat_response")
          .like("metadata->source_reference" as any, `%${msg.id}%`);

        if ((exists || 0) === 0) {
          await supabase.from("neural_learning_data").insert({
            interaction_type: "chat_response",
            input_text: msg.conversation_id,
            output_text: content.substring(0, 5000),
            quality_score: score,
            learned: score >= 0.7,
            metadata: {
              source_reference: ref,
              provider: msg.provider,
              neural_enhanced: msg.neural_enhanced,
              autoScored: true,
              source: "pipeline_orchestrator",
            },
          });
          chatFeedbackLogged++;
        }
      }

      // Busca documentos gerados recentemente não registrados
      const { data: recentDocs } = await supabase
        .from("documents")
        .select("id, title, content, document_type, created_at, metadata")
        .gte("created_at", since)
        .not("content", "eq", "")
        .limit(20);

      let docFeedbackLogged = 0;
      for (const doc of recentDocs || []) {
        const content = doc.content || "";
        if (content.length < 200) continue;

        const ref = `doc:${doc.id}`;
        const { count: exists } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .like("metadata->source_reference" as any, `%${doc.id}%`);

        if ((exists || 0) === 0) {
          let score = 0.5;
          if (content.length > 3000) score += 0.15;
          if (content.length > 8000) score += 0.10;
          if (/art\.\s*\d+|§\s*\d+|lei\s*n[°º]|constituição/i.test(content)) score += 0.15;
          score = Math.min(score, 1.0);

          await supabase.from("neural_learning_data").insert({
            interaction_type: "document_generation",
            input_text: `Tipo: ${doc.document_type} | Título: ${doc.title}`,
            output_text: content.substring(0, 8000),
            quality_score: score,
            learned: score >= 0.7,
            metadata: {
              source_reference: ref,
              document_type: doc.document_type,
              autoScored: true,
              source: "pipeline_orchestrator",
            },
          });
          docFeedbackLogged++;
        }
      }

      // ─── NOVO: Coletar feedbacks explícitos de avaliação de documentos ───
      // Integra com DocumentFeedback component (👍/👎 + 1-5 estrelas)
      const { data: feedbackRecords } = await supabase
        .from("neural_learning_data")
        .select("id, quality_score, metadata, interaction_type")
        .eq("interaction_type", "document_feedback")
        .gte("created_at", since)
        .is("learned", null)
        .limit(30);

      let userFeedbackProcessed = 0;
      for (const fb of feedbackRecords || []) {
        const meta = (fb.metadata as any) || {};
        const rating = (meta.rating as number) || 0;
        // rating 1-5 → score 0.2-1.0 | thumbs: up=0.9, down=0.3
        let finalScore = fb.quality_score || 0.5;
        if (rating >= 1 && rating <= 5) finalScore = Math.round((rating / 5) * 10) / 10;
        else if (meta.thumbs === "up") finalScore = 0.9;
        else if (meta.thumbs === "down") finalScore = 0.3;

        await supabase.from("neural_learning_data")
          .update({ quality_score: finalScore, learned: finalScore >= 0.7 })
          .eq("id", fb.id);
        userFeedbackProcessed++;
      }

      results.collect_feedback = {
        chatFeedbackLogged,
        docFeedbackLogged,
        userFeedbackProcessed,
        windowHours: 4,
      };
      console.log(`✅ Feedback coletado: ${chatFeedbackLogged} chat, ${docFeedbackLogged} docs, ${userFeedbackProcessed} ratings`);
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 2: Confusion Matrix + F1-Score por área jurídica
    // Atualiza métricas de qualidade por categoria
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle" || action === "compute_metrics") {
      const { data: learningData } = await supabase
        .from("neural_learning_data")
        .select("interaction_type, quality_score, learned, metadata")
        .not("quality_score", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);

      interface ConfusionMatrix {
        tp: number; fp: number; fn: number; tn: number;
      }
      const confusionByArea: Record<string, ConfusionMatrix> = {};
      const areaKeywords: Record<string, string[]> = {
        civil: ["contrato", "civil", "dano", "locação", "imóvel"],
        trabalhista: ["trabalhista", "clt", "rescisão", "fgts", "salário"],
        consumidor: ["consumidor", "cdc", "produto", "serviço", "recall"],
        penal: ["penal", "crime", "réu", "prisão", "furto"],
        tributario: ["tributário", "imposto", "tributo", "icms", "irpf"],
        previdenciario: ["aposentadoria", "inss", "previdência", "benefício"],
        familia: ["família", "divórcio", "guarda", "alimentos", "adoção"],
        administrativo: ["licitação", "servidor", "administrativo", "concurso"],
      };

      for (const item of learningData || []) {
        const text = ((item.metadata as any)?.document_type || item.interaction_type || "").toLowerCase();
        const score = (item.quality_score || 0) as number;
        const predicted = score >= 0.7;
        const actual = item.learned as boolean;

        let area = "geral";
        for (const [areaName, kws] of Object.entries(areaKeywords)) {
          if (kws.some(kw => text.includes(kw))) { area = areaName; break; }
        }

        if (!confusionByArea[area]) confusionByArea[area] = { tp: 0, fp: 0, fn: 0, tn: 0 };
        if (predicted && actual) confusionByArea[area].tp++;
        else if (predicted && !actual) confusionByArea[area].fp++;
        else if (!predicted && actual) confusionByArea[area].fn++;
        else confusionByArea[area].tn++;
      }

      // Compute F1 per area
      const f1ByArea: Record<string, number> = {};
      for (const [area, cm] of Object.entries(confusionByArea)) {
        const precision = cm.tp / Math.max(cm.tp + cm.fp, 1);
        const recall = cm.tp / Math.max(cm.tp + cm.fn, 1);
        f1ByArea[area] = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
      }

      const avgF1 = Object.values(f1ByArea).reduce((s, v) => s + v, 0) / Math.max(Object.keys(f1ByArea).length, 1);
      const sortedAreas = Object.entries(f1ByArea).sort((a, b) => b[1] - a[1]);

      // Persistir confusion matrix no estado Adam (para o NeuralHealthDashboard)
      try {
        const { data: adamRow } = await supabase
          .from("neural_specializations")
          .select("prompts, user_id")
          .eq("name", "Adam Optimizer State v11")
          .eq("is_active", true)
          .maybeSingle();

        if (adamRow) {
          const prompts = (adamRow.prompts as any) || {};
          const adam = prompts.adam || {};
          adam.confusion = confusionByArea;
          adam.f1_by_area = f1ByArea;
          adam.avg_f1 = avgF1;
          adam.metrics_updated_at = new Date().toISOString();

          await supabase
            .from("neural_specializations")
            .update({ prompts: { ...prompts, adam } })
            .eq("name", "Adam Optimizer State v11")
            .eq("is_active", true);
        } else {
          // Criar estado Adam inicial
          const { data: advogado } = await supabase
            .from("user_roles")
            .select("user_id")
            .eq("role", "advogado")
            .limit(1)
            .single();

          if (advogado) {
            await supabase.from("neural_specializations").upsert({
              user_id: advogado.user_id,
              name: "Adam Optimizer State v11",
              category: "custom",
              description: "Estado do Adam Optimizer (β1=0.9, β2=0.999) + Confusion Matrix",
              prompts: {
                adam: {
                  m: {}, v: {}, iteration: 0,
                  confusion: confusionByArea,
                  f1_by_area: f1ByArea,
                  avg_f1: avgF1,
                  metrics_updated_at: new Date().toISOString(),
                },
              },
              training_status: "completed",
              accuracy_score: avgF1,
              is_active: true,
            }, { onConflict: "user_id,name" });
          }
        }
      } catch (e) {
        console.warn("Confusion matrix save error:", e);
      }

      results.compute_metrics = {
        totalSamples: learningData?.length || 0,
        confusionByArea,
        f1ByArea,
        avgF1: Math.round(avgF1 * 1000) / 1000,
        bestArea: sortedAreas[0]?.[0] || "—",
        worstArea: sortedAreas[sortedAreas.length - 1]?.[0] || "—",
      };
      console.log(`✅ Confusion Matrix: avg F1=${avgF1.toFixed(3)}, melhor=${sortedAreas[0]?.[0]}`);
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 2.5: Senado Sync — vectorizar nós sem embeddings
    // Garante que os 1249 nós do Senado estejam todos indexados
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle" || action === "senado_sync") {
      const { count: senadoSemEmbedding } = await supabase
        .from("legal_embeddings")
        .select("id", { count: "exact", head: true })
        .like("source", "senado%")
        .is("embedding", null);

      const { count: kbSemEmbedding } = await supabase
        .from("neural_knowledge_base")
        .select("id", { count: "exact", head: true })
        .is("embedding", null);

      // Itens com is_processed=false (independente de embedding) — precisam ser processados
      const { count: kbNaoProcessados } = await supabase
        .from("neural_knowledge_base")
        .select("id", { count: "exact", head: true })
        .eq("is_processed", false);

      const totalSemEmbedding = (senadoSemEmbedding || 0) + (kbSemEmbedding || 0);
      const totalNaoProcessados = kbNaoProcessados || 0;

      // Marcar itens sem embedding que já existem como is_processed=false para reprocessamento
      if (totalNaoProcessados > 0 || totalSemEmbedding > 0) {
        console.log(`🏛️ Senado Sync: ${totalSemEmbedding} sem embedding, ${totalNaoProcessados} não processados — trigando vectorização`);
        (globalThis as any).EdgeRuntime?.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
            body: JSON.stringify({ target: "both", batchSize: Math.min((totalSemEmbedding || 0) + (totalNaoProcessados || 0) + 10, 200) }),
            signal: AbortSignal.timeout(120000),
          })
          .then(() => console.log(`✅ generate-embeddings triggered for ${totalSemEmbedding + totalNaoProcessados} nodes`))
          .catch(e => console.warn("Senado embed trigger failed:", e))
        );
      }

      results.senado_sync = {
        senadoLegalSemEmbedding: senadoSemEmbedding || 0,
        kbSemEmbedding: kbSemEmbedding || 0,
        kbNaoProcessados: totalNaoProcessados,
        total: totalSemEmbedding + totalNaoProcessados,
        triggered: (totalSemEmbedding + totalNaoProcessados) > 0,
      };
      console.log(`✅ Senado Sync: ${totalSemEmbedding} sem embedding, ${totalNaoProcessados} não processados ${(totalSemEmbedding + totalNaoProcessados) > 0 ? "→ vectorização trigada" : "→ todos indexados"}`);
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 3: Trigger cadeia de funções neurais
    // Dispara backfill, embeddings e evolução em sequência
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle" || action === "trigger_chain") {
      const triggerResults: Record<string, string> = {};

      // 3a. neural-auto-learn (backfill + promote + specializations)
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/neural-auto-learn`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ action: "full" }),
          signal: AbortSignal.timeout(120000),
        })
        .then(() => console.log("✅ neural-auto-learn triggered"))
        .catch(e => console.warn("neural-auto-learn trigger failed:", e))
      );
      triggerResults.neural_auto_learn = "triggered";

      // 3b. generate-embeddings para itens novos
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({ target: "both", batchSize: 50 }),
          signal: AbortSignal.timeout(90000),
        })
        .then(() => console.log("✅ generate-embeddings triggered"))
        .catch(e => console.warn("generate-embeddings trigger failed:", e))
      );
      triggerResults.generate_embeddings = "triggered";

      // 3c. neural-evolution: analizar e propor após 30s (para ter dados frescos)
      (globalThis as any).EdgeRuntime?.waitUntil(
        new Promise(resolve => setTimeout(resolve, 30000)).then(() =>
          fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: "evolve", subAction: "analyze_and_propose" }),
            signal: AbortSignal.timeout(60000),
          })
        )
        .then(() => console.log("✅ neural-evolution triggered"))
        .catch(e => console.warn("neural-evolution trigger failed:", e))
      );
      triggerResults.neural_evolution = "queued_30s";

      // 3d. queue-worker para limpar pendentes
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/queue-worker`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(60000),
        })
        .then(() => console.log("✅ queue-worker triggered"))
        .catch(e => console.warn("queue-worker trigger failed:", e))
      );
      triggerResults.queue_worker = "triggered";

      // 3e. AUTO-APPROVE pending proposals (LACUNA FIX: proposals ficavam em pending indefinidamente)
      (globalThis as any).EdgeRuntime?.waitUntil(
        new Promise(resolve => setTimeout(resolve, 45000)).then(() =>
          fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: "evolve", subAction: "auto_approve_pending" }),
            signal: AbortSignal.timeout(60000),
          })
        )
        .then(() => console.log("✅ auto_approve_pending triggered"))
        .catch(e => console.warn("auto_approve_pending trigger failed:", e))
      );
      triggerResults.auto_approve_pending = "queued_45s";

      // 3f. AUTO-APPLY approved proposals (LACUNA FIX: approved proposals never applied automatically)
      (globalThis as any).EdgeRuntime?.waitUntil(
        new Promise(resolve => setTimeout(resolve, 60000)).then(() =>
          fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify({ action: "evolve", subAction: "auto_apply_approved" }),
            signal: AbortSignal.timeout(60000),
          })
        )
        .then(() => console.log("✅ auto_apply_approved triggered"))
        .catch(e => console.warn("auto_apply_approved trigger failed:", e))
      );
      triggerResults.auto_apply_approved = "queued_60s";

      results.trigger_chain = triggerResults;
      console.log(`✅ Cadeia de triggers disparada: ${Object.keys(triggerResults).join(", ")}`);
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 3.5: Embedding Watchdog — re-enfileira itens sem embedding >1h
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle" || action === "watchdog") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { data: staleKB } = await supabase
        .from("neural_knowledge_base")
        .select("id")
        .is("embedding", null)
        .eq("is_processed", false)
        .lte("created_at", oneHourAgo)
        .limit(100);

      const { data: staleLegal } = await supabase
        .from("legal_embeddings")
        .select("id")
        .is("embedding", null)
        .lte("created_at", oneHourAgo)
        .limit(100);

      const staleCount = (staleKB?.length || 0) + (staleLegal?.length || 0);

      if (staleCount > 0) {
        console.log(`🔍 Watchdog: ${staleCount} itens sem embedding há >1h — re-enfileirando`);
        (globalThis as any).EdgeRuntime?.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/generate-embeddings`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
            body: JSON.stringify({ target: "both", batchSize: Math.min(staleCount + 10, 200) }),
            signal: AbortSignal.timeout(120000),
          })
          .then(() => console.log(`✅ Watchdog: re-trigou embeddings para ${staleCount} itens`))
          .catch(e => console.warn("Watchdog embed trigger failed:", e))
        );
      }

      results.watchdog = { staleKB: staleKB?.length || 0, staleLegal: staleLegal?.length || 0, requeued: staleCount > 0 };
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 3.6: Cleanup stale proposals + reset stale A/B experiments
    // Fecha lacuna: proposals e experimentos ficavam pendentes indefinidamente
    // ═══════════════════════════════════════════════════════
    if (action === "full_cycle") {
      // Cleanup stale proposals (>30 days pending → rejected)
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ action: "evolve", subAction: "cleanup_stale" }),
          signal: AbortSignal.timeout(30000),
        })
        .then(() => console.log("✅ cleanup_stale triggered"))
        .catch(e => console.warn("cleanup_stale trigger failed:", e))
      );

      // Reset stale A/B experiments (>48h with 0 samples)
      (globalThis as any).EdgeRuntime?.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/ai-orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
          body: JSON.stringify({ action: "evolve", subAction: "reset_stale_ab" }),
          signal: AbortSignal.timeout(30000),
        })
        .then(() => console.log("✅ reset_stale_ab triggered"))
        .catch(e => console.warn("reset_stale_ab trigger failed:", e))
      );

      // DPO optimization after full cycle
      (globalThis as any).EdgeRuntime?.waitUntil(
        new Promise(resolve => setTimeout(resolve, 75000)).then(() =>
          fetch(`${supabaseUrl}/functions/v1/neural-training`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseKey}` },
            body: JSON.stringify({ action: "dpo_optimize" }),
            signal: AbortSignal.timeout(120000),
          })
        )
        .then(() => console.log("✅ DPO optimization triggered after full cycle"))
        .catch(e => console.warn("DPO trigger failed:", e))
      );

      results.cleanup = { cleanup_stale: "triggered", reset_stale_ab: "triggered", dpo_optimize: "queued_75s" };
    }

    // ═══════════════════════════════════════════════════════
    // ETAPA 4: Registrar métricas do pipeline no ai_metrics
    // ═══════════════════════════════════════════════════════
    const elapsed = Date.now() - startTime;
    try {
      await supabase.from("ai_metrics").insert({
        query: `neural_pipeline_orchestrator:${action}`,
        provider: "orchestrator",
        total_duration_ms: elapsed,
        complexity: "pipeline",
        cost_tier: 0,
        success: true,
        response_length: JSON.stringify(results).length,
        tools_used: ["neural-auto-learn", "generate-embeddings", "ai-orchestrator", "queue-worker"],
        data_sources_used: ["neural_learning_data", "documents", "chat_ia_messages"],
      });
    } catch (e) {
      console.warn("Metrics save error:", e);
    }

    console.log(`🏁 Pipeline Orchestrator: ${elapsed}ms`);

    return new Response(
      JSON.stringify({ success: true, action, elapsed, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Pipeline Orchestrator error:", msg);
    return new Response(
      JSON.stringify({ error: "Erro ao processar solicitação", details: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
