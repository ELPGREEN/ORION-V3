import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Early-exit counter: skip heavy DB queries after consecutive empty runs
let consecutiveEmptyRuns = 0;
const MAX_SKIP_RUNS = 3; // After 3 empty runs, do a lightweight count-only check

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Early-exit: after consecutive empty runs, do a lightweight count check only
  if (consecutiveEmptyRuns >= MAX_SKIP_RUNS) {
    const { count } = await supabase
      .from("generation_queue")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);

    if (!count || count === 0) {
      consecutiveEmptyRuns++;
      return new Response(JSON.stringify({ processed: 0, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // There's work — reset counter and proceed normally
    consecutiveEmptyRuns = 0;
  }

  console.log("🔄 Queue Worker: Checking for pending jobs...");

  // Reset stale "processing" jobs — 10 min window para acomodar triple pipeline com timeout 6min
  const staleThreshold = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: staleJobs } = await supabase
    .from("generation_queue")
    .select("id, attempts, max_attempts")
    .eq("status", "processing")
    .lt("started_at", staleThreshold);

  if (staleJobs && staleJobs.length > 0) {
    for (const stale of staleJobs) {
      if (stale.attempts >= stale.max_attempts) {
        // Exceeded max attempts — permanently fail
        await supabase
          .from("generation_queue")
          .update({
            status: "failed",
            error_message: `Permanently failed: exceeded ${stale.max_attempts} attempts (stuck in processing)`,
            completed_at: new Date().toISOString(),
          })
          .eq("id", stale.id);
        console.log(`💀 Stale job ${stale.id} permanently failed (${stale.attempts}/${stale.max_attempts} attempts)`);
      } else {
        // Still has retries left — reset to pending
        await supabase
          .from("generation_queue")
          .update({ status: "pending", error_message: "Reset: stuck in processing" })
          .eq("id", stale.id);
        console.log(`🔁 Reset stale job ${stale.id} to pending (${stale.attempts}/${stale.max_attempts})`);
      }
    }
  }

  // Fetch up to 3 pending jobs, oldest first (with exponential backoff consideration)
  const { data: jobs, error: fetchError } = await supabase
    .from("generation_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(3);

  if (fetchError) {
    console.error("❌ Error fetching jobs:", fetchError);
    return new Response(JSON.stringify({ error: "Erro ao processar solicitação" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!jobs || jobs.length === 0) {
    console.log("✅ No pending jobs.");
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`📋 Found ${jobs.length} pending job(s)`);
  let processed = 0;

  for (const job of jobs) {
    // Guard: skip jobs that already exceeded max_attempts (shouldn't happen, but defensive)
    if (job.attempts >= job.max_attempts) {
      console.log(`⛔ Job ${job.id} already has ${job.attempts}/${job.max_attempts} attempts, marking as failed`);
      await supabase
        .from("generation_queue")
        .update({
          status: "failed",
          error_message: `Permanently failed: exceeded ${job.max_attempts} max attempts`,
          completed_at: new Date().toISOString(),
        })
        .eq("id", job.id);
      continue;
    }

    // Mark as processing
    await supabase
      .from("generation_queue")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id);

    try {
      if (job.job_type === "document") {
        // Call gerar-documento directly (internal call with service role)
        const response = await fetch(
          `${supabaseUrl}/functions/v1/gerar-documento`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(360000), // 6 min timeout
            body: JSON.stringify({
              ...job.params,
              userId: job.user_id, // Pass user_id for accurate logging
              jobId: job.id        // Pass job_id for metadata correlation
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`gerar-documento returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();

        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: result.content || "",
            result_metadata: {
              provider: result.modelo,
              fallback: result.fallback,
              neuralEnhanced: result.neuralEnhanced,
              sources: result.sources,
              metadata: result.metadata,
            },
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Job ${job.id} completed (${(result.content || "").length} chars)`);
        processed++;

        // ─── Doc→Neural Feedback Loop ───
        // OBS: O feedback principal agora é registrado diretamente dentro da função gerar-documento
        // para garantir acesso a metadados precisos (duration, provider, etc).
        // A função gerar-documento também já realiza a indexação no neural-search.
        // O queue-worker apenas orquestra e finaliza o job.

      } else if (job.job_type === "datajud_ingestion") {
        // Call datajud-ingestion
        const response = await fetch(
          `${supabaseUrl}/functions/v1/datajud-ingestion`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(120000),
            body: JSON.stringify(job.params),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`datajud-ingestion returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();

        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(result.stats || result),
            result_metadata: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Ingestion job ${job.id} completed`);
        processed++;

      } else if (job.job_type === "neural_learn") {
        // ─── Neural Auto-Learn Job ───
        // Dispara o pipeline completo de aprendizado neural
        const response = await fetch(
          `${supabaseUrl}/functions/v1/neural-auto-learn`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(180000), // 3 min
            body: JSON.stringify({ action: (job.params as any)?.action || "full" }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`neural-auto-learn returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();
        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(result),
            result_metadata: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Neural learn job ${job.id} completed`);
        processed++;

      } else if (job.job_type === "generate_embeddings") {
        // ─── Embedding Generation Job ───
        const response = await fetch(
          `${supabaseUrl}/functions/v1/generate-embeddings`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(120000),
            body: JSON.stringify({ target: (job.params as any)?.target || "both", batchSize: (job.params as any)?.batchSize || 50 }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`generate-embeddings returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();
        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(result),
            result_metadata: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Embeddings job ${job.id} completed`);
        processed++;

      } else if (job.job_type === "senado_ingest") {
        // ─── Senado Data Ingestion Job ───
        // Pode acionar: ingest-senado-api, ingest-senado-tables, ingest-catalogo-senado
        const subType = (job.params as any)?.subType || "tables";
        const functionMap: Record<string, string> = {
          api: "ingest-senado-api",
          tables: "ingest-senado-tables",
          catalogo: "ingest-catalogo-senado",
          bulk: "ingest-senado-bulk",
          dados: "ingest-senado-dados",
        };
        const targetFn = functionMap[subType] || "ingest-senado-tables";

        const response = await fetch(
          `${supabaseUrl}/functions/v1/${targetFn}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(240000), // 4 min
            body: JSON.stringify((job.params as any)?.payload || {}),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`${targetFn} returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();
        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(result),
            result_metadata: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Senado ingest job ${job.id} (${subType}) completed`);
        processed++;

      } else if (job.job_type === "senado_neural_sync") {
        // ─── Senado → Neural Full Sync Job ───
        // Executa pipeline completo: tables → embeddings → neural learn
        const supabaseUrlEnv = Deno.env.get("SUPABASE_URL")!;
        const serviceKeyEnv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // 1. Ingest tables
        const tablesResp = await fetch(`${supabaseUrlEnv}/functions/v1/ingest-senado-tables`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKeyEnv}` },
          body: JSON.stringify({ tables: ["contratos", "avencas", "empresas", "licitacoes"], batchSize: 200 }),
          signal: AbortSignal.timeout(180000),
        });
        const tablesResult = await tablesResp.json().catch(() => ({}));
        console.log(`📦 Senado tables synced:`, JSON.stringify(tablesResult).substring(0, 200));

        // 2. Generate embeddings for new records
        const embeddingsResp = await fetch(`${supabaseUrlEnv}/functions/v1/generate-embeddings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKeyEnv}` },
          body: JSON.stringify({ target: "legal_embeddings", batchSize: 100 }),
          signal: AbortSignal.timeout(180000),
        });
        const embResult = await embeddingsResp.json().catch(() => ({}));
        console.log(`🔢 Embeddings generated:`, JSON.stringify(embResult).substring(0, 200));

        // 3. Neural pipeline collect feedback
        const pipelineResp = await fetch(`${supabaseUrlEnv}/functions/v1/neural-pipeline-orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKeyEnv}` },
          body: JSON.stringify({ action: "collect_feedback" }),
          signal: AbortSignal.timeout(60000),
        });
        const pipelineResult = await pipelineResp.json().catch(() => ({}));

        const syncResult = { tables: tablesResult, embeddings: embResult, pipeline: pipelineResult };
        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(syncResult).substring(0, 10000),
            result_metadata: syncResult,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Senado→Neural full sync job ${job.id} completed`);
        processed++;

      } else if (job.job_type === "large_pdf_embed") {
        // ─── Large PDF Embedding Continuation Job ───
        // Processes remaining chunks from a large document upload
        const params = job.params as any;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/smart-ingest`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${supabaseKey}`,
            },
            signal: AbortSignal.timeout(55000), // 55s timeout
            body: JSON.stringify({
              continuationChunks: params.continuationChunks,
              continuationMeta: params.continuationMeta,
            }),
          }
        );

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`smart-ingest continuation returned ${response.status}: ${errText.substring(0, 200)}`);
        }

        const result = await response.json();

        await supabase
          .from("generation_queue")
          .update({
            status: "completed",
            result: JSON.stringify(result),
            result_metadata: result,
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        console.log(`✅ Large PDF embed job ${job.id} completed (${result.indexed || 0} chunks, ${result.remaining || 0} remaining)`);
        processed++;

      } else {
        // Unknown job type — mark as failed
        throw new Error(`Unknown job_type: ${job.job_type}`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ Job ${job.id} failed:`, errorMsg);

      const attemptsMade = job.attempts + 1;
      const newStatus = attemptsMade >= job.max_attempts ? "failed" : "pending";

      // Exponential backoff: delay retry by 2^attempt * 30s (30s, 60s, 120s)
      const backoffMs = Math.pow(2, attemptsMade) * 30000;
      const retryAfter = new Date(Date.now() + backoffMs).toISOString();

      await supabase
        .from("generation_queue")
        .update({
          status: newStatus,
          error_message: `[Attempt ${attemptsMade}/${job.max_attempts}] ${errorMsg}`,
          completed_at: newStatus === "failed" ? new Date().toISOString() : null,
          // Use updated_at as a "not before" marker for backoff
          updated_at: newStatus === "pending" ? retryAfter : new Date().toISOString(),
        })
        .eq("id", job.id);

      if (newStatus === "failed") {
        console.log(`💀 Job ${job.id} permanently failed after ${job.max_attempts} attempts`);
      } else {
        console.log(`🔄 Job ${job.id} will retry after ${backoffMs / 1000}s (attempt ${attemptsMade}/${job.max_attempts})`);
      }
    }
  }

  console.log(`🏁 Queue Worker done: ${processed}/${jobs.length} jobs processed`);

  return new Response(
    JSON.stringify({ processed, total: jobs.length }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});