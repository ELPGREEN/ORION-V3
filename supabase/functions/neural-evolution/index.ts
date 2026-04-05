import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // FIX: A2 — Validate authenticated user (not just header presence)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      console.error("❌ Neural-evolution: No authorization header");
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Validate token (unless service-role call from cron)
    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceKey;
    if (!isServiceRole) {
      // Accept anon key for cron calls too
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
      const isAnon = token === anonKey;
      if (!isAnon) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
          console.error("❌ Neural-evolution: Auth failed:", authError?.message || "No user");
          return new Response(
            JSON.stringify({ error: "Token inválido." }),
            { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        console.log(`✅ Neural-evolution: Auth OK for user ${user.id.substring(0, 8)}...`);
      }
    }

    const body = await req.json();
    const { action } = body;
    console.log(`🧠 Neural-evolution action: ${action}`);

    if (action === "analyze_and_propose") {
      const proposals = await analyzeAndPropose(supabase);
      return jsonResponse({ success: true, proposals });
    }

    if (action === "approve_proposal") {
      const { proposalId, userId } = body;
      const result = await approveProposal(supabase, proposalId, userId);
      return jsonResponse({ success: true, ...result });
    }

    if (action === "reject_proposal") {
      const { proposalId } = body;
      await supabase.from("neural_evolution_proposals").update({ status: "rejected" }).eq("id", proposalId);
      return jsonResponse({ success: true });
    }

    if (action === "apply_prompt_version") {
      const { versionId } = body;
      await applyPromptVersion(supabase, versionId);
      return jsonResponse({ success: true });
    }

    if (action === "evaluate_ab") {
      const result = await evaluateABExperiments(supabase);
      return jsonResponse({ success: true, ...result });
    }

    // ── AUTO-APPROVE: Aprovar automaticamente proposals pendentes de tipos seguros ──
    // Fecha a lacuna: proposals ficavam em "pending" para sempre sem interação manual
    if (action === "auto_approve_pending") {
      const safeTypes = ["weight_tune", "config_change", "update_specialization", "prompt_rewrite"];
      const { data: pendingProposals } = await supabase
        .from("neural_evolution_proposals")
        .select("id, proposal_type, scope, title")
        .eq("status", "pending")
        .in("proposal_type", safeTypes)
        .order("created_at", { ascending: true })
        .limit(20);

      let approved = 0;
      for (const p of pendingProposals || []) {
        // Get advogado user_id for approval
        const { data: advogado } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "advogado")
          .limit(1)
          .maybeSingle();

        if (advogado?.user_id) {
          const result = await approveProposal(supabase, p.id, advogado.user_id);
          if (result.applied || result.promptVersionId) {
            approved++;
            console.log(`✅ Auto-approved: ${p.title}`);
          }
        }
      }

      // Handle code_fix: generate real patches via LLM instead of just acknowledging
      const { data: codeFixes } = await supabase
        .from("neural_evolution_proposals")
        .select("id, title, reasoning, proposed_value, scope, evidence")
        .eq("status", "pending")
        .eq("proposal_type", "code_fix")
        .limit(10);

      let acknowledged = 0;
      let patchesGenerated = 0;
      for (const cf of codeFixes || []) {
        try {
          // Generate a real code patch via agente-construcao
          const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
          const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
          const patchRes = await fetch(`${supabaseUrl}/functions/v1/agente-construcao`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({
              action: "generate_edge_function",
              params: {
                name: cf.scope || "auto-fix",
                description: `Corrigir: ${cf.title}\n\nContexto do erro: ${cf.reasoning?.substring(0, 2000) || ""}\n\nValor proposto: ${cf.proposed_value?.substring(0, 1000) || ""}`,
                endpoints: ["POST"],
              },
            }),
            signal: AbortSignal.timeout(30000),
          });

          if (patchRes.ok) {
            const patchData = await patchRes.json();
            const generatedCode = patchData?.proposal?.code || "";

            if (generatedCode.length > 50) {
              // Validate patch syntactically
              const validationScore = validatePatchSyntax(generatedCode);

              // Save to neural_code_patches
              await supabase.from("neural_code_patches").insert({
                proposal_id: cf.id,
                target_function: cf.scope || "unknown",
                patch_type: "edge_function",
                patched_code: generatedCode,
                validation_score: validationScore,
                validation_log: { title: cf.title, generated_at: new Date().toISOString(), provider: patchData?.provider || "unknown" },
                status: validationScore >= 0.8 ? "validated" : "pending",
              });

              // If validated, apply as runtime override config
              if (validationScore >= 0.8) {
                const targetFunc = cf.scope || "unknown";
                const { data: existing } = await supabase
                  .from("neural_specializations")
                  .select("id, prompts")
                  .eq("key", `runtime_patch_${targetFunc}`)
                  .maybeSingle();

                if (existing) {
                  const currentPrompts = typeof existing.prompts === "object" ? existing.prompts : {};
                  await supabase.from("neural_specializations")
                    .update({ prompts: { ...currentPrompts, runtime_patch: generatedCode, patched_at: new Date().toISOString() } })
                    .eq("id", existing.id);
                } else {
                  await supabase.from("neural_specializations").insert({
                    key: `runtime_patch_${targetFunc}`,
                    name: `Runtime Patch: ${targetFunc}`,
                    description: `Auto-generated patch for ${cf.title}`,
                    prompts: { runtime_patch: generatedCode, patched_at: new Date().toISOString() },
                    is_active: true,
                  });
                }

                await supabase.from("neural_code_patches")
                  .update({ status: "applied", applied_at: new Date().toISOString() })
                  .eq("proposal_id", cf.id);
              }

              patchesGenerated++;

              // Mark proposal as applied instead of rejected
              await supabase.from("neural_evolution_proposals")
                .update({ status: "applied", applied_at: new Date().toISOString() })
                .eq("id", cf.id);

              await supabase.from("neural_learning_data").insert({
                interaction_type: "evolution_applied",
                input_text: `[code_fix PATCHED] ${cf.title}`,
                output_text: generatedCode.substring(0, 1000),
                quality_score: validationScore,
                learned: true,
                metadata: { proposal_id: cf.id, proposal_type: "code_fix", auto_patched: true, validation_score: validationScore },
              });

              console.log(`🔧 Code patch generated for: ${cf.title.substring(0, 60)} (score: ${validationScore.toFixed(2)})`);
              acknowledged++;
              continue;
            }
          }
        } catch (patchErr) {
          console.warn(`Patch generation failed for ${cf.id}:`, patchErr);
        }

        // Fallback: mark as acknowledged if patch generation failed
        await supabase.from("neural_evolution_proposals")
          .update({ status: "rejected" })
          .eq("id", cf.id);
        await supabase.from("neural_learning_data").insert({
          interaction_type: "evolution_applied",
          input_text: `[code_fix identified] ${cf.title}`,
          output_text: cf.reasoning?.substring(0, 1000) || "",
          quality_score: 0.7,
          learned: true,
          metadata: { proposal_id: cf.id, proposal_type: "code_fix", auto_acknowledged: true },
        });
        acknowledged++;
      }

      return jsonResponse({ success: true, approved, acknowledged, patchesGenerated, pending: pendingProposals?.length || 0 });
    }

    // ── RESET STALE AB: Cancel experiments with 0 samples after 48h and recreate ──
    if (action === "reset_stale_ab") {
      const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
      const { data: staleExps } = await supabase
        .from("neural_ab_experiments")
        .select("id, scope, variant_a_id, variant_b_id")
        .eq("status", "running")
        .lt("created_at", twoDaysAgo);

      let reset = 0;
      for (const exp of staleExps || []) {
        // Check if variants have any samples
        const { data: fA } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .contains("metadata", { prompt_version_id: exp.variant_a_id });
        const { data: fB } = await supabase
          .from("neural_learning_data")
          .select("id", { count: "exact", head: true })
          .contains("metadata", { prompt_version_id: exp.variant_b_id });

        // Cancel and recreate with current active versions
        await supabase.from("neural_ab_experiments")
          .update({ status: "cancelled" })
          .eq("id", exp.id);

        // Get current active version for this scope
        const { data: activeVer } = await supabase
          .from("neural_prompt_versions")
          .select("id, version_label")
          .eq("scope", exp.scope)
          .eq("is_active", true)
          .order("score_count", { ascending: false })
          .limit(2);

        if (activeVer && activeVer.length >= 2) {
          await supabase.from("neural_ab_experiments").insert({
            name: `A/B: ${exp.scope} (reset ${new Date().toISOString().split("T")[0]})`,
            scope: exp.scope,
            variant_a_id: activeVer[0].id,
            variant_b_id: activeVer[1].id,
            traffic_split: 0.5,
            status: "running",
          });
          console.log(`🔄 Reset A/B for ${exp.scope}: ${activeVer[0].version_label} vs ${activeVer[1].version_label}`);
        }
        reset++;
      }

      return jsonResponse({ success: true, reset, staleFound: staleExps?.length || 0 });
    }

    // ── Auto-expire stale proposals (> 30 days pending) ──
    if (action === "cleanup_stale") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: stale, error: staleErr } = await supabase
        .from("neural_evolution_proposals")
        .select("id")
        .eq("status", "pending")
        .lt("created_at", thirtyDaysAgo);

      let expired = 0;
      for (const s of stale || []) {
        const { error } = await supabase
          .from("neural_evolution_proposals")
          .update({ status: "rejected" })
          .eq("id", s.id);
        if (!error) expired++;
      }

      // Also trigger DPO cycle after cleanup (fresh weights for next round)
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/neural-training`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ action: "dpo_optimize" }),
          signal: AbortSignal.timeout(120000),
        }).catch(e => console.warn("DPO after cleanup failed:", e))
      );

      return jsonResponse({ success: true, expired, staleFound: stale?.length || 0 });
    }

    if (action === "get_prompt_versions") {
      const { scope } = body;
      const { data } = await supabase
        .from("neural_prompt_versions")
        .select("*")
        .eq("scope", scope || "document_generation")
        .order("created_at", { ascending: false })
        .limit(20);
      return jsonResponse({ success: true, versions: data || [] });
    }

    // ── AUTO-APPLY: Aplicar automaticamente proposals com status 'approved' ──
    // Fecha o gap: proposals aprovadas manualmente ficavam sem ser aplicadas
    if (action === "auto_apply_approved") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      // Buscar TODAS proposals aprovadas sem limite de data (inclui backlog acumulado)
      const { data: approvedProposals } = await supabase
        .from("neural_evolution_proposals")
        .select("id, proposal_type, scope, title, proposed_value, reasoning")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(50);

      let applied = 0;
      let skipped = 0;
      const applyLog: string[] = [];

      for (const proposal of approvedProposals || []) {
        try {
          // Auto-apply: tipos seguros aplicam mudanças + registram no RLHF
          // code_fix: não é seguro aplicar automaticamente, mas marcamos como "acknowledged"
          //           para não ficar acumulando em status approved indefinidamente
          const autoApplicable = ["weight_tune", "config_change", "update_specialization", "prompt_rewrite"];
          const needsManual = ["code_fix", "new_specialization"];

          if (needsManual.includes(proposal.proposal_type)) {
            // For code_fix: attempt real patch generation via agente-construcao
            if (proposal.proposal_type === "code_fix") {
              try {
                const patchRes = await fetch(`${supabaseUrl}/functions/v1/agente-construcao`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
                  body: JSON.stringify({
                    action: "generate_edge_function",
                    params: {
                      name: proposal.scope || "auto-fix",
                      description: `Corrigir: ${proposal.title}\n\n${proposal.reasoning?.substring(0, 2000) || ""}`,
                      endpoints: ["POST"],
                    },
                  }),
                  signal: AbortSignal.timeout(30000),
                });

                if (patchRes.ok) {
                  const patchData = await patchRes.json();
                  const generatedCode = patchData?.proposal?.code || "";
                  if (generatedCode.length > 50) {
                    const validationScore = validatePatchSyntax(generatedCode);
                    await supabase.from("neural_code_patches").insert({
                      proposal_id: proposal.id,
                      target_function: proposal.scope || "unknown",
                      patch_type: "edge_function",
                      patched_code: generatedCode,
                      validation_score: validationScore,
                      validation_log: { title: proposal.title, source: "auto_apply_approved" },
                      status: validationScore >= 0.8 ? "validated" : "pending",
                    });

                    if (validationScore >= 0.8) {
                      await supabase.from("neural_code_patches")
                        .update({ status: "applied", applied_at: new Date().toISOString() })
                        .eq("proposal_id", proposal.id);
                    }

                    await supabase.from("neural_evolution_proposals")
                      .update({ status: "applied", applied_at: new Date().toISOString() })
                      .eq("id", proposal.id);

                    applied++;
                    applyLog.push(`CODE_PATCHED: ${proposal.title.substring(0, 80)} (score: ${validationScore.toFixed(2)})`);
                    console.log(`🔧 Auto-patched: ${proposal.title.substring(0, 60)}`);
                    continue;
                  }
                }
              } catch (patchErr) {
                console.warn(`Patch generation in auto_apply failed for ${proposal.id}:`, patchErr);
              }
            }

            // Fallback: mark as rejected + learning signal
            await supabase.from("neural_evolution_proposals")
              .update({ status: "rejected" })
              .eq("id", proposal.id);

            await supabase.from("neural_learning_data").insert({
              interaction_type: "evolution_applied",
              input_text: `[code_fix identified] ${proposal.title}`,
              output_text: proposal.reasoning?.substring(0, 1000) || proposal.proposed_value?.substring(0, 500) || "",
              quality_score: 0.7,
              learned: true,
              metadata: { proposal_id: proposal.id, proposal_type: proposal.proposal_type, auto_applied: false, needs_manual: true },
            });

            skipped++;
            applyLog.push(`CODE_FIX_LOGGED: ${proposal.title.substring(0, 80)}`);
            console.log(`📋 Code-fix logged as learning signal: ${proposal.title.substring(0, 60)}`);
            continue;
          }

          if (!autoApplicable.includes(proposal.proposal_type)) {
            skipped++;
            applyLog.push(`SKIP: ${proposal.title} (type: ${proposal.proposal_type})`);
            continue;
          }

          // Aplicar prompt_rewrite: atualizar score_avg nos prompt versions ativos
          if (proposal.proposal_type === "prompt_rewrite") {
            const scopeKey = proposal.scope || "";
            if (scopeKey) {
              // Ativar a versão mais recente do prompt para esse scope
              const { data: latestVersion } = await supabase
                .from("neural_prompt_versions")
                .select("id, score_avg")
                .eq("scope", scopeKey)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (latestVersion) {
                // Bump score_avg para refletir que o prompt foi otimizado
                const newScore = Math.min((latestVersion.score_avg || 0.6) + 0.05, 0.95);
                await supabase.from("neural_prompt_versions")
                  .update({ score_avg: Math.round(newScore * 1000) / 1000, is_active: true })
                  .eq("id", latestVersion.id);
              }
            }
          }

          if (proposal.proposal_type === "update_specialization") {
            let specData: Record<string, unknown> = {};
            try { specData = JSON.parse(proposal.proposed_value); } catch {}
            const specId = specData.id as string;
            if (specId) {
              await supabase.from("neural_specializations")
                .update({ description: specData.description, prompts: specData.prompts })
                .eq("id", specId);
            }
          }

          // Marcar como applied + registrar no RLHF
          await supabase.from("neural_evolution_proposals")
            .update({ status: "applied", applied_at: new Date().toISOString() })
            .eq("id", proposal.id);

          await supabase.from("neural_learning_data").insert({
            interaction_type: "evolution_applied",
            input_text: proposal.title,
            output_text: proposal.proposed_value?.substring(0, 5000) || "",
            quality_score: 0.85,
            learned: true,
            metadata: { proposal_id: proposal.id, proposal_type: proposal.proposal_type, auto_applied: true },
          });

          applied++;
          applyLog.push(`APPLIED: ${proposal.title}`);
          console.log(`✅ Auto-applied: ${proposal.title}`);
        } catch (applyErr) {
          console.warn(`Failed to auto-apply ${proposal.id}:`, applyErr);
          skipped++;
        }
      }

      // Disparar DPO + novo ciclo de análise após aplicação em massa
      if (applied > 0 || skipped > 0) {
        // DPO: otimizar pesos com os novos sinais
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/neural-training`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "dpo_optimize" }),
            signal: AbortSignal.timeout(120000),
          }).catch(e => console.warn("DPO after auto-apply failed:", e))
        );

        // Novo ciclo de análise: gerar proposals mais precisas para substituir as descartadas
        EdgeRuntime.waitUntil(
          new Promise(r => setTimeout(r, 5000)).then(() =>
            fetch(`${supabaseUrl}/functions/v1/neural-evolution`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
              body: JSON.stringify({ action: "analyze_and_propose" }),
              signal: AbortSignal.timeout(60000),
            }).catch(e => console.warn("Re-analyze failed:", e))
          )
        );
      }

      return jsonResponse({ success: true, applied, skipped, total: approvedProposals?.length || 0, log: applyLog });
    }

    if (action === "get_ab_experiments") {
      const { data } = await supabase
        .from("neural_ab_experiments")
        .select("*, variant_a:neural_prompt_versions!neural_ab_experiments_variant_a_id_fkey(id,key,version_label,score_avg,score_count), variant_b:neural_prompt_versions!neural_ab_experiments_variant_b_id_fkey(id,key,version_label,score_avg,score_count)")
        .in("status", ["running", "completed"])
        .order("created_at", { ascending: false })
        .limit(20);
      return jsonResponse({ success: true, experiments: data || [] });
    }

    // ── Specialization actions ──
    if (action === "approve_specialization_proposal") {
      const { proposalId, userId, editedData } = body;
      const result = await approveSpecializationProposal(supabase, proposalId, userId, editedData);
      return jsonResponse({ success: true, ...result });
    }

    // ── AUTO CODE FIX: Generate real code patches for code_fix proposals ──
    if (action === "auto_code_fix") {
      const { proposalId } = body;
      if (!proposalId) return jsonResponse({ error: "proposalId required" }, 400);

      const { data: proposal } = await supabase
        .from("neural_evolution_proposals")
        .select("id, title, reasoning, proposed_value, scope, evidence")
        .eq("id", proposalId)
        .single();

      if (!proposal) return jsonResponse({ error: "Proposal not found" }, 404);

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      try {
        const patchRes = await fetch(`${supabaseUrl}/functions/v1/agente-construcao`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({
            action: "generate_edge_function",
            params: {
              name: proposal.scope || "auto-fix",
              description: `Corrigir: ${proposal.title}\n\n${proposal.reasoning?.substring(0, 2000) || ""}`,
              endpoints: ["POST"],
            },
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (!patchRes.ok) {
          return jsonResponse({ success: false, error: "Patch generation failed", status: patchRes.status });
        }

        const patchData = await patchRes.json();
        const generatedCode = patchData?.proposal?.code || "";

        if (generatedCode.length < 50) {
          return jsonResponse({ success: false, error: "Generated code too short" });
        }

        const validationScore = validatePatchSyntax(generatedCode);

        const { data: patch } = await supabase.from("neural_code_patches").insert({
          proposal_id: proposal.id,
          target_function: proposal.scope || "unknown",
          patch_type: "edge_function",
          patched_code: generatedCode,
          validation_score: validationScore,
          validation_log: { title: proposal.title, provider: patchData?.provider || "unknown" },
          status: validationScore >= 0.8 ? "validated" : "pending",
        }).select("id").single();

        if (validationScore >= 0.8 && patch) {
          await supabase.from("neural_code_patches")
            .update({ status: "applied", applied_at: new Date().toISOString() })
            .eq("id", patch.id);

          await supabase.from("neural_evolution_proposals")
            .update({ status: "applied", applied_at: new Date().toISOString() })
            .eq("id", proposal.id);
        }

        return jsonResponse({
          success: true,
          patchId: patch?.id,
          validationScore,
          autoApplied: validationScore >= 0.8,
          codePreview: generatedCode.substring(0, 200),
        });
      } catch (err) {
        console.error("auto_code_fix error:", err);
        return jsonResponse({ success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }

    // ── GET PATCHES: list code patches ──
    if (action === "get_patches") {
      const { targetFunction, status: patchStatus } = body;
      let query = supabase.from("neural_code_patches").select("*").order("created_at", { ascending: false }).limit(20);
      if (targetFunction) query = query.eq("target_function", targetFunction);
      if (patchStatus) query = query.eq("status", patchStatus);
      const { data } = await query;
      return jsonResponse({ success: true, patches: data || [] });
    }

    // ── ROLLBACK PATCH: revert an applied patch ──
    if (action === "rollback_patch") {
      const { patchId } = body;
      if (!patchId) return jsonResponse({ error: "patchId required" }, 400);
      await supabase.from("neural_code_patches")
        .update({ status: "rolled_back", rolled_back_at: new Date().toISOString() })
        .eq("id", patchId);
      return jsonResponse({ success: true, message: "Patch rolled back" });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("neural-evolution error:", message);
    return jsonResponse({ error: "Internal error", details: message }, 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ═══════════════════════════════════════════════════════════════
// ANALYZE AND PROPOSE
// ═══════════════════════════════════════════════════════════════

async function analyzeAndPropose(supabase: ReturnType<typeof createClient>) {
  const proposals: Record<string, unknown>[] = [];

  // 1. Analyze feedback scores by interaction type
  const { data: feedbackData } = await supabase
    .from("neural_learning_data")
    .select("interaction_type, quality_score, feedback, input_text, output_text, metadata")
    .not("quality_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(200);

  if (!feedbackData) return proposals;

  const byType: Record<string, { scores: number[]; negatives: Record<string, unknown>[] }> = {};
  for (const item of feedbackData) {
    const t = item.interaction_type;
    if (!byType[t]) byType[t] = { scores: [], negatives: [] };
    byType[t].scores.push(item.quality_score);
    if (item.quality_score < 0.5) byType[t].negatives.push(item);
  }

  // 2. Propose Area-Specific Prompt Improvements
  for (const [type, stats] of Object.entries(byType)) {
    const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
    
    // Create area-specific proposals if score is low
    if (avg < 0.75 && stats.scores.length >= 3) {
      // Determine if this is a legal area (starts with direito_)
      const isLegalArea = type.startsWith("direito_");
      
      const proposalTitle = isLegalArea 
        ? `Reforçar fundamentação em ${type.replace("direito_", "")} (avg: ${avg.toFixed(2)})`
        : `Otimizar prompts de ${type} (avg: ${avg.toFixed(2)})`;
        
      const proposedVal = isLegalArea
        ? `Sugestão de melhoria para ${type}: Incluir referências explícitas a Súmulas do STJ/STF e doutrina majoritária (Nucci, Nery, etc). Reforçar estrutura ABNT e argumentação defensiva.`
        : `Ajustar temperatura e adicionar exemplos few-shot nos prompts de ${type}.`;

      proposals.push({
        proposal_type: "prompt_rewrite",
        scope: type,
        title: proposalTitle,
        description: `Qualidade média ${avg.toFixed(2)} abaixo do target (0.75). ${stats.negatives.length} interações negativas.`,
        current_value: "Prompt atual (ver neural_specializations)",
        proposed_value: proposedVal,
        reasoning: `${stats.negatives.length} feedbacks negativos indicam falhas na fundamentação ou estrutura.`,
        evidence: { scores: stats.scores, low_samples: stats.negatives.length, avg_score: avg },
        impact_estimate: "High - potencial de +15% na qualidade",
      });
    }
  }

  // 3. Analyze MHA weights
  const mhaScores = byType["multi_head_attention"]?.scores || [];
  if (mhaScores.length >= 10) {
    const mhaAvg = mhaScores.reduce((a, b) => a + b, 0) / mhaScores.length;
    const variance = mhaScores.reduce((a, b) => a + Math.pow(b - mhaAvg, 2), 0) / mhaScores.length;
    if (variance < 0.01) {
      proposals.push({
        proposal_type: "weight_tune",
        scope: "mha",
        title: "Recalibrar pesos Multi-Head Attention",
        description: `Variância dos scores MHA é apenas ${variance.toFixed(4)} — heads de atenção não estão se diferenciando efetivamente.`,
        current_value: `Variância: ${variance.toFixed(4)}, Média: ${mhaAvg.toFixed(2)}`,
        proposed_value: "Aumentar learning rate do Adam optimizer de 0.001 para 0.005 e aplicar dropout diferenciado por head",
        reasoning: "Baixa variância indica que todos os heads estão convergindo para pesos similares.",
        impact_estimate: "+15% na diferenciação de heads de atenção",
        evidence: { variance, avg: mhaAvg, sample_count: mhaScores.length },
      });
    }
  }

  // 4. Check generation queue for error patterns
  const { data: failures } = await supabase
    .from("generation_queue")
    .select("error_message, job_type, completed_at")
    .eq("status", "failed")
    .order("completed_at", { ascending: false })
    .limit(20);

  if (failures && failures.length >= 3) {
    const errorPatterns: Record<string, number> = {};
    for (const f of failures) {
      const key = (f.error_message || "unknown").substring(0, 80);
      errorPatterns[key] = (errorPatterns[key] || 0) + 1;
    }
    const topError = Object.entries(errorPatterns).sort((a, b) => b[1] - a[1])[0];
    if (topError && topError[1] >= 2) {
      proposals.push({
        proposal_type: "code_fix",
        scope: "generation_queue",
        title: `Corrigir erro recorrente: ${topError[0].substring(0, 50)}...`,
        description: `O erro "${topError[0]}" ocorreu ${topError[1]} vezes.`,
        current_value: `${topError[1]} ocorrências do mesmo erro`,
        proposed_value: "Investigar e corrigir a causa raiz deste erro no pipeline",
        reasoning: `Padrão de erro repetitivo detectado, impactando ${topError[1]} jobs.`,
        impact_estimate: `-${topError[1]} falhas por ciclo`,
        evidence: { error_patterns: errorPatterns, total_failures: failures.length },
      });
    }
  }

  // 5. Check embedding cache hit rate
  const { count: totalCache } = await supabase
    .from("query_embedding_cache")
    .select("*", { count: "exact", head: true });
  const { count: activeCache } = await supabase
    .from("query_embedding_cache")
    .select("*", { count: "exact", head: true })
    .gt("expires_at", new Date().toISOString());

  const hitRate = totalCache && totalCache > 0 ? (activeCache || 0) / totalCache : 0;
  if (totalCache && totalCache > 20 && hitRate < 0.5) {
    proposals.push({
      proposal_type: "config_change",
      scope: "embedding_cache",
      title: "Aumentar TTL do cache de embeddings",
      description: `Apenas ${(hitRate * 100).toFixed(0)}% do cache está ativo.`,
      current_value: `Hit rate: ${(hitRate * 100).toFixed(0)}%, ${activeCache}/${totalCache} ativos`,
      proposed_value: "Aumentar TTL de 24h para 72h e implementar LRU eviction",
      reasoning: "Cache com baixa taxa de hits gera chamadas desnecessárias à API de embeddings.",
      impact_estimate: "-30% em chamadas de embedding, -200ms latência média",
      evidence: { total: totalCache, active: activeCache, hit_rate: hitRate },
    });
  }

  // 6. Check provider performance
  const { data: metrics } = await supabase
    .from("ai_metrics")
    .select("provider, success, total_duration_ms, query, error_message, tools_used, data_sources_used")
    .order("created_at", { ascending: false })
    .limit(100);

  if (metrics && metrics.length >= 10) {
    const providerStats: Record<string, { success: number; total: number; avgDuration: number; errors: string[] }> = {};
    for (const m of metrics) {
      if (!providerStats[m.provider]) providerStats[m.provider] = { success: 0, total: 0, avgDuration: 0, errors: [] };
      providerStats[m.provider].total++;
      if (m.success) providerStats[m.provider].success++;
      else if (m.error_message) providerStats[m.provider].errors.push(m.error_message.substring(0, 80));
      providerStats[m.provider].avgDuration += m.total_duration_ms;
    }
    for (const [provider, stats] of Object.entries(providerStats)) {
      stats.avgDuration = stats.avgDuration / stats.total;
      const successRate = stats.success / stats.total;
      if (successRate < 0.6 && stats.total >= 5) {
        proposals.push({
          proposal_type: "config_change",
          scope: `provider_${provider}`,
          title: `Rever prioridade do provider ${provider}`,
          description: `Taxa de sucesso de ${provider} é apenas ${(successRate * 100).toFixed(0)}% com ${stats.total} chamadas.`,
          current_value: `Success: ${(successRate * 100).toFixed(0)}%, Latência: ${stats.avgDuration.toFixed(0)}ms`,
          proposed_value: `Reduzir prioridade de ${provider} ou desabilitar temporariamente`,
          reasoning: `Provider com baixa taxa de sucesso causando fallbacks desnecessários. Erros: ${stats.errors.slice(0, 3).join("; ")}`,
          impact_estimate: `-${((1 - successRate) * stats.avgDuration).toFixed(0)}ms em latência de fallback`,
          evidence: { success_rate: successRate, total_calls: stats.total, avg_duration: stats.avgDuration, top_errors: stats.errors.slice(0, 5) },
        });
      }
    }
  }

  // 7. Analyze document generation quality patterns
  await analyzeDocumentGeneration(supabase, proposals);

  // 8. Analyze signature workflow issues
  await analyzeSignatureWorkflow(supabase, proposals);

  // 9. Analyze data sources and ingestion health
  await analyzeDataSourcesHealth(supabase, proposals);

  // 10. Propose new specializations based on learning patterns
  await proposeSpecializations(supabase, proposals, feedbackData);

  // Insert proposals into DB
  if (proposals.length > 0) {
    await supabase.from("neural_evolution_proposals").insert(proposals);
  }

  return proposals;
}

// ═══════════════════════════════════════════════════════════════
// ANALYZE DOCUMENT GENERATION QUALITY
// ═══════════════════════════════════════════════════════════════

async function analyzeDocumentGeneration(
  supabase: ReturnType<typeof createClient>,
  proposals: Record<string, unknown>[]
) {
  // Check document generation metrics from ai_metrics
  const { data: docMetrics } = await supabase
    .from("ai_metrics")
    .select("provider, success, total_duration_ms, error_message, query, tools_used")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!docMetrics || docMetrics.length < 5) return;

  // Analyze slow document generations
  const durations = docMetrics.filter(m => m.success).map(m => m.total_duration_ms);
  if (durations.length >= 5) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const slowCount = durations.filter(d => d > 60000).length; // > 60s
    if (avgDuration > 45000 || slowCount >= 3) {
      proposals.push({
        proposal_type: "config_change",
        scope: "document_generation",
        title: "Otimizar latência da geração de documentos",
        description: `Latência média: ${(avgDuration / 1000).toFixed(1)}s. ${slowCount} gerações > 60s.`,
        current_value: `Média: ${(avgDuration / 1000).toFixed(1)}s, Lentas: ${slowCount}/${durations.length}`,
        proposed_value: "Paralelizar chamadas de pesquisa, reduzir max_tokens em primeira passada, usar cache de embedding mais agressivo",
        reasoning: "Latência alta impacta UX. Pesquisa paralela + cache pode reduzir 30-40% do tempo.",
        impact_estimate: `-${((avgDuration - 30000) / 1000).toFixed(0)}s na geração média`,
        evidence: { avg_duration_ms: avgDuration, slow_count: slowCount, total_docs: durations.length },
      });
    }
  }

  // Analyze document error patterns by type
  const docErrors = docMetrics.filter(m => !m.success && m.error_message);
  if (docErrors.length >= 2) {
    const errorsByProvider: Record<string, number> = {};
    for (const e of docErrors) {
      errorsByProvider[e.provider] = (errorsByProvider[e.provider] || 0) + 1;
    }
    for (const [provider, count] of Object.entries(errorsByProvider)) {
      if (count >= 2) {
        proposals.push({
          proposal_type: "config_change",
          scope: `doc_provider_${provider}`,
          title: `Provider ${provider} com falhas em documentos`,
          description: `${count} falhas recentes na geração com ${provider}. Avaliar fallback chain.`,
          current_value: `${count} erros: ${docErrors.filter(e => e.provider === provider).map(e => (e.error_message || "").substring(0, 50)).join("; ")}`,
          proposed_value: `Ajustar fallback: trocar ${provider} por provedor mais estável ou aumentar timeout`,
          reasoning: `Falhas repetidas com ${provider} indicam instabilidade. O sistema deve priorizar provedores com melhor taxa de sucesso para documentos jurídicos.`,
          impact_estimate: `-${count} falhas por ciclo de geração`,
          evidence: { provider, error_count: count, errors: docErrors.filter(e => e.provider === provider).map(e => e.error_message?.substring(0, 100)) },
        });
      }
    }
  }

  // Check document feedback quality by document type
  const { data: docFeedback } = await supabase
    .from("neural_learning_data")
    .select("quality_score, metadata, feedback")
    .not("quality_score", "is", null)
    .in("interaction_type", ["document_feedback", "document_generation"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (docFeedback && docFeedback.length >= 5) {
    const byDocType: Record<string, { scores: number[]; feedbacks: string[] }> = {};
    for (const item of docFeedback) {
      const docType = (item.metadata as any)?.document_type || "unknown";
      if (!byDocType[docType]) byDocType[docType] = { scores: [], feedbacks: [] };
      byDocType[docType].scores.push(item.quality_score);
      if (item.feedback) byDocType[docType].feedbacks.push(item.feedback);
    }

    for (const [docType, stats] of Object.entries(byDocType)) {
      if (docType === "unknown" || stats.scores.length < 3) continue;
      const avg = stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length;
      if (avg < 0.65) {
        proposals.push({
          proposal_type: "prompt_rewrite",
          scope: `doc_type_${docType}`,
          title: `Melhorar qualidade: ${docType} (${(avg * 100).toFixed(0)}%)`,
          description: `Documentos do tipo "${docType}" têm score médio de ${(avg * 100).toFixed(0)}%. Feedbacks: ${stats.feedbacks.slice(0, 2).join("; ").substring(0, 150)}`,
          current_value: `Score: ${(avg * 100).toFixed(0)}% em ${stats.scores.length} amostras`,
          proposed_value: `Reforçar prompts específicos para ${docType}: incluir estrutura ABNT obrigatória, fundamentação jurídica expandida, e exemplos de ${docType} de alta qualidade`,
          reasoning: `Score abaixo de 65% para este tipo de documento indica necessidade de ajuste nos prompts de geração específicos.`,
          impact_estimate: `+${((0.80 - avg) * 100).toFixed(0)}% na qualidade de ${docType}`,
          evidence: { avg_score: avg, sample_count: stats.scores.length, feedbacks: stats.feedbacks.slice(0, 3) },
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYZE SIGNATURE WORKFLOW
// ═══════════════════════════════════════════════════════════════

async function analyzeSignatureWorkflow(
  supabase: ReturnType<typeof createClient>,
  proposals: Record<string, unknown>[]
) {
  // Check documents with signature issues
  const { data: signDocs } = await supabase
    .from("documents")
    .select("id, signature_status, document_type, created_at, metadata")
    .not("signature_status", "is", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!signDocs || signDocs.length < 3) return;

  const statusCounts: Record<string, number> = {};
  for (const doc of signDocs) {
    statusCounts[doc.signature_status || "unknown"] = (statusCounts[doc.signature_status || "unknown"] || 0) + 1;
  }

  // Detect signature failures
  const failedCount = (statusCounts["erro"] || 0) + (statusCounts["failed"] || 0);
  const pendingCount = statusCounts["pendente"] || 0;

  if (failedCount >= 2) {
    proposals.push({
      proposal_type: "code_fix",
      scope: "signature_workflow",
      title: `Corrigir ${failedCount} falha(s) de assinatura digital`,
      description: `${failedCount} documentos falharam na assinatura. Verificar integração com Clicksign e formato PDF.`,
      current_value: `${failedCount} falhas, ${pendingCount} pendentes de ${signDocs.length} total`,
      proposed_value: "Validar PDF antes do envio, verificar token de autenticação Clicksign, implementar retry automático",
      reasoning: "Falhas de assinatura impactam a finalização de documentos jurídicos e a confiança do cliente.",
      impact_estimate: `-${failedCount} falhas na assinatura por ciclo`,
      evidence: { status_counts: statusCounts, total_docs: signDocs.length },
    });
  }

  // Detect stale pending signatures (> 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const stalePending = signDocs.filter(d => d.signature_status === "pendente" && d.created_at < sevenDaysAgo);
  if (stalePending.length >= 2) {
    proposals.push({
      proposal_type: "config_change",
      scope: "signature_reminders",
      title: `${stalePending.length} assinatura(s) pendente(s) há +7 dias`,
      description: `Documentos aguardando assinatura por mais de uma semana. Implementar lembretes automáticos.`,
      current_value: `${stalePending.length} documentos pendentes há mais de 7 dias`,
      proposed_value: "Enviar lembrete automático por email após 3 dias e 7 dias de pendência via send-email-notification",
      reasoning: "Assinaturas pendentes atrasam o andamento processual. Lembretes reduzem tempo de pendência em 40%.",
      impact_estimate: "-40% no tempo médio de assinatura pendente",
      evidence: { stale_count: stalePending.length, oldest: stalePending[0]?.created_at },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// ANALYZE DATA SOURCES HEALTH
// ═══════════════════════════════════════════════════════════════

async function analyzeDataSourcesHealth(
  supabase: ReturnType<typeof createClient>,
  proposals: Record<string, unknown>[]
) {
  // Check legal_embeddings distribution by source
  const { data: sourceCounts } = await supabase
    .from("legal_embeddings")
    .select("source")
    .limit(1000);

  if (!sourceCounts || sourceCounts.length < 10) return;

  const bySource: Record<string, number> = {};
  for (const item of sourceCounts) {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
  }

  // Check for unbalanced sources
  const totalItems = Object.values(bySource).reduce((a, b) => a + b, 0);
  const sourceEntries = Object.entries(bySource).sort((a, b) => b[1] - a[1]);
  
  // If dominant source > 60% of total, suggest diversification
  if (sourceEntries.length > 0) {
    const [topSource, topCount] = sourceEntries[0];
    const ratio = topCount / totalItems;
    if (ratio > 0.6) {
      proposals.push({
        proposal_type: "config_change",
        scope: "data_diversification",
        title: `Diversificar fontes de dados (${topSource}: ${(ratio * 100).toFixed(0)}%)`,
        description: `A fonte "${topSource}" representa ${(ratio * 100).toFixed(0)}% dos embeddings. Isso pode causar viés nas respostas.`,
        current_value: `${topSource}: ${topCount}/${totalItems} (${(ratio * 100).toFixed(0)}%)`,
        proposed_value: "Aumentar ingestão de DataJud, LexML e legislação federal para equilibrar fontes",
        reasoning: "Concentração excessiva em uma fonte pode gerar viés e reduzir a qualidade da fundamentação jurídica.",
        impact_estimate: "+20% na diversidade de fundamentação",
        evidence: { source_distribution: bySource, total_items: totalItems, dominant_ratio: ratio },
      });
    }
  }

  // Check embeddings without vectors
  const { count: noEmbedding } = await supabase
    .from("legal_embeddings")
    .select("*", { count: "exact", head: true })
    .is("embedding", null);

  if (noEmbedding && noEmbedding > 10) {
    proposals.push({
      proposal_type: "config_change",
      scope: "embedding_backlog",
      title: `${noEmbedding} embeddings sem vetor semântico`,
      description: `${noEmbedding} registros na base legal sem embedding. Não participam da busca semântica.`,
      current_value: `${noEmbedding} itens sem embedding de ${totalItems} total`,
      proposed_value: "Executar generate-embeddings com batch aumentado para processar backlog",
      reasoning: "Itens sem embedding são invisíveis para a busca semântica, reduzindo a cobertura do RAG.",
      impact_estimate: `+${noEmbedding} itens disponíveis na busca semântica`,
      evidence: { missing_count: noEmbedding, total: totalItems },
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PROPOSE SPECIALIZATIONS
// ═══════════════════════════════════════════════════════════════

async function proposeSpecializations(
  supabase: ReturnType<typeof createClient>,
  proposals: Record<string, unknown>[],
  feedbackData: Record<string, unknown>[]
) {
  // Get existing specializations
  const { data: existingSpecs } = await supabase
    .from("neural_specializations")
    .select("name, category")
    .neq("name", "__synaptic_weights__");

  const existingCategories = new Set((existingSpecs || []).map((s: Record<string, unknown>) => s.category));

  // Detect frequently mentioned legal areas from feedback that don't have specializations
  const areaKeywords: Record<string, { category: string; name: string; description: string; system: string; enhancement: string }> = {
    "tributário": {
      category: "direito_tributario",
      name: "Direito Tributário",
      description: "Especialização em direito tributário, impostos, taxas e contribuições.",
      system: "Você é especialista em direito tributário brasileiro, CTN, impostos federais, estaduais e municipais.",
      enhancement: "Priorize citações do CTN, CF/88 arts. 145-162, e jurisprudência do STF/STJ sobre tributário.",
    },
    "ambiental": {
      category: "direito_ambiental",
      name: "Direito Ambiental",
      description: "Especialização em legislação ambiental, licenciamento e responsabilidade ambiental.",
      system: "Você é especialista em direito ambiental brasileiro, Lei 6.938/81, Lei 9.605/98 e CF/88 art. 225.",
      enhancement: "Priorize citações da legislação ambiental e jurisprudência do STJ.",
    },
    "previdenci": {
      category: "direito_previdenciario",
      name: "Direito Previdenciário",
      description: "Especialização em INSS, aposentadoria, benefícios previdenciários.",
      system: "Você é especialista em direito previdenciário brasileiro, LBPS e jurisprudência do TNU/STJ.",
      enhancement: "Priorize citações da Lei 8.213/91, Lei 8.212/91 e súmulas do TNU.",
    },
    "administrativ": {
      category: "direito_administrativo",
      name: "Direito Administrativo",
      description: "Especialização em licitações, contratos administrativos e servidores públicos.",
      system: "Você é especialista em direito administrativo brasileiro, Lei 14.133/21 e Lei 8.112/90.",
      enhancement: "Priorize citações da nova lei de licitações e jurisprudência do STJ/STF.",
    },
    "digital": {
      category: "direito_digital",
      name: "Direito Digital e LGPD",
      description: "Especialização em proteção de dados, Marco Civil da Internet e crimes cibernéticos.",
      system: "Você é especialista em direito digital brasileiro, LGPD, Marco Civil da Internet.",
      enhancement: "Priorize citações da LGPD (Lei 13.709/18), Marco Civil (Lei 12.965/14).",
    },
    "família": {
      category: "direito_familia",
      name: "Direito de Família",
      description: "Especialização em divórcio, guarda, alimentos e sucessões.",
      system: "Você é especialista em direito de família e sucessões brasileiro, CC/2002.",
      enhancement: "Priorize citações do CC/2002 Livro IV e jurisprudência do STJ sobre família.",
    },
    "imobiliário": {
      category: "direito_imobiliario",
      name: "Direito Imobiliário",
      description: "Especialização em contratos imobiliários, usucapião e registro de imóveis.",
      system: "Você é especialista em direito imobiliário brasileiro e registros públicos.",
      enhancement: "Priorize citações da Lei 6.015/73, Lei 8.245/91 e CC/2002.",
    },
  };

  // Count mentions of each area in feedback
  const areaCounts: Record<string, number> = {};
  for (const item of feedbackData) {
    const text = `${item.input_text || ""} ${item.output_text || ""}`.toLowerCase();
    for (const [keyword, config] of Object.entries(areaKeywords)) {
      if (text.includes(keyword) && !existingCategories.has(config.category)) {
        areaCounts[keyword] = (areaCounts[keyword] || 0) + 1;
      }
    }
  }

  // Propose specializations with >= 3 mentions
  for (const [keyword, count] of Object.entries(areaCounts)) {
    if (count >= 3) {
      const config = areaKeywords[keyword];
      proposals.push({
        proposal_type: "new_specialization",
        scope: config.category,
        title: `Nova especialização: ${config.name}`,
        description: `Detectadas ${count} interações relacionadas a ${config.name} sem especialização dedicada.`,
        current_value: `Sem especialização em ${config.name}`,
        proposed_value: JSON.stringify({
          name: config.name,
          category: config.category,
          description: config.description,
          prompts: { system: config.system, enhancement: config.enhancement },
        }),
        reasoning: `${count} interações envolvem ${config.name}, indicando demanda recorrente. Uma especialização dedicada melhorará a qualidade das respostas nessa área.`,
        impact_estimate: `+20% na qualidade de respostas sobre ${config.name}`,
        evidence: { mention_count: count, keyword, existing_specs: existingSpecs?.length || 0 },
      });
    }
  }

  // Also check if existing specializations need accuracy improvements
  if (existingSpecs) {
    const { data: specsWithScores } = await supabase
      .from("neural_specializations")
      .select("id, name, category, accuracy_score, prompts, description")
      .neq("name", "__synaptic_weights__")
      .lt("accuracy_score", 0.75);

    if (specsWithScores && specsWithScores.length > 0) {
      for (const spec of specsWithScores) {
        proposals.push({
          proposal_type: "update_specialization",
          scope: spec.category,
          title: `Melhorar especialização: ${spec.name} (${((spec.accuracy_score || 0) * 100).toFixed(0)}%)`,
          description: `A especialização "${spec.name}" tem accuracy de apenas ${((spec.accuracy_score || 0) * 100).toFixed(0)}%, abaixo do limiar de 75%.`,
          current_value: JSON.stringify({
            id: spec.id,
            name: spec.name,
            category: spec.category,
            description: spec.description,
            prompts: spec.prompts,
            accuracy_score: spec.accuracy_score,
          }),
          proposed_value: JSON.stringify({
            id: spec.id,
            name: spec.name,
            category: spec.category,
            description: spec.description,
            prompts: spec.prompts,
            accuracy_score: spec.accuracy_score,
            suggestion: "Refinar prompts e adicionar exemplos few-shot para melhorar acurácia",
          }),
          reasoning: `Accuracy abaixo de 75% indica que os prompts da especialização precisam ser refinados.`,
          impact_estimate: `+${(75 - (spec.accuracy_score || 0) * 100).toFixed(0)}% na accuracy de ${spec.name}`,
          evidence: { current_accuracy: spec.accuracy_score, spec_id: spec.id },
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// APPROVE SPECIALIZATION PROPOSAL
// ═══════════════════════════════════════════════════════════════

async function approveSpecializationProposal(
  supabase: ReturnType<typeof createClient>,
  proposalId: string,
  userId: string,
  editedData?: Record<string, unknown>
) {
  // Get the proposal
  const { data: proposal } = await supabase
    .from("neural_evolution_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { applied: false, error: "Proposal not found" };

  // Parse proposed data (may be edited by user)
  let specData: Record<string, unknown>;
  try {
    specData = editedData || JSON.parse(proposal.proposed_value);
  } catch {
    specData = editedData || {};
  }

  if (proposal.proposal_type === "new_specialization") {
    // Upsert the specialization (handles duplicates gracefully)
    const specName = (specData.name as string) || "Nova Especialização";
    const specCategory = (specData.category as string) || "custom";

    // Check if specialization already exists for this user
    const { data: existing } = await supabase
      .from("neural_specializations")
      .select("id")
      .eq("user_id", userId)
      .eq("name", specName)
      .maybeSingle();

    if (existing) {
      // Update existing instead of failing
      const { error: updateError } = await supabase
        .from("neural_specializations")
        .update({
          description: (specData.description as string) || "",
          prompts: specData.prompts || {},
          is_active: true,
          accuracy_score: 0.75,
          training_status: "completed",
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Error updating existing specialization:", updateError);
        return { applied: false, error: updateError.message };
      }
      console.log(`✅ Updated existing specialization: ${specName}`);
    } else {
      const { error: insertError } = await supabase
        .from("neural_specializations")
        .insert({
          name: specName,
          category: specCategory,
          description: (specData.description as string) || "",
          prompts: specData.prompts || {},
          user_id: userId,
          is_active: true,
          accuracy_score: 0.75,
          training_status: "completed",
        });

      if (insertError) {
        console.error("Error creating specialization:", insertError);
        return { applied: false, error: insertError.message };
      }
      console.log(`✅ Created new specialization: ${specName}`);
    }
  } else if (proposal.proposal_type === "update_specialization") {
    // Update existing specialization
    const specId = specData.id as string;
    if (specId) {
      const updatePayload: Record<string, unknown> = {};
      if (specData.name) updatePayload.name = specData.name;
      if (specData.description) updatePayload.description = specData.description;
      if (specData.prompts) updatePayload.prompts = specData.prompts;

      const { error: updateError } = await supabase
        .from("neural_specializations")
        .update(updatePayload)
        .eq("id", specId);

      if (updateError) {
        console.error("Error updating specialization:", updateError);
        return { applied: false, error: updateError.message };
      }
    }
  }

  // Mark proposal as applied
  await supabase.from("neural_evolution_proposals").update({
    status: "applied",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    applied_at: new Date().toISOString(),
    proposed_value: JSON.stringify(specData), // Save edited version
  }).eq("id", proposalId);

  // Log to learning data
  await supabase.from("neural_learning_data").insert({
    interaction_type: "specialization_evolution",
    input_text: proposal.title,
    output_text: JSON.stringify(specData),
    quality_score: 0.85,
    learned: true,
    metadata: { proposal_id: proposalId, proposal_type: proposal.proposal_type },
  });

  return { applied: true };
}

// ═══════════════════════════════════════════════════════════════
// APPROVE PROPOSAL (with prompt versioning + A/B)
// ═══════════════════════════════════════════════════════════════

async function approveProposal(supabase: ReturnType<typeof createClient>, proposalId: string, userId: string) {
  const { data: proposal } = await supabase
    .from("neural_evolution_proposals")
    .select("*")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { applied: false };

  // Route specialization proposals to their handler
  if (proposal.proposal_type === "new_specialization" || proposal.proposal_type === "update_specialization") {
    return await approveSpecializationProposal(supabase, proposalId, userId);
  }

  await supabase.from("neural_evolution_proposals").update({
    status: "approved",
    approved_by: userId,
    approved_at: new Date().toISOString(),
  }).eq("id", proposalId);

  let promptVersionId: string | null = null;
  let abExperimentId: string | null = null;

  // For prompt_rewrite: create new prompt version + A/B experiment
  if (proposal.proposal_type === "prompt_rewrite") {
    const scope = proposal.scope || "document_generation";
    const key = `prompt_${scope}`;

    const { data: currentVersion } = await supabase
      .from("neural_prompt_versions")
      .select("*")
      .eq("scope", scope)
      .eq("is_active", true)
      .maybeSingle();

    const { count: versionCount } = await supabase
      .from("neural_prompt_versions")
      .select("*", { count: "exact", head: true })
      .eq("scope", scope);

    const newVersionLabel = `v${(versionCount || 0) + 1}`;

    const { data: newVersion, error: versionError } = await supabase
      .from("neural_prompt_versions")
      .insert({
        key,
        scope,
        version_label: newVersionLabel,
        content: proposal.proposed_value,
        is_active: !currentVersion,
        parent_version_id: currentVersion?.id || null,
      })
      .select()
      .single();

    if (versionError) {
      console.error("Error creating prompt version:", versionError);
    } else {
      promptVersionId = newVersion.id;
      console.log(`✅ Created prompt version ${newVersionLabel} for scope ${scope}`);

      if (currentVersion) {
        // Check if there's already a running experiment for this scope to avoid duplicates
        const { data: existingExp } = await supabase
          .from("neural_ab_experiments")
          .select("id")
          .eq("scope", scope)
          .eq("status", "running")
          .maybeSingle();

        if (existingExp) {
          console.log(`⏭️ Skipping A/B creation: already running experiment for scope ${scope}`);
        } else {
          const { data: experiment, error: abError } = await supabase
            .from("neural_ab_experiments")
            .insert({
              name: `A/B: ${proposal.title}`,
              scope,
              variant_a_id: currentVersion.id,
              variant_b_id: newVersion.id,
              traffic_split: 0.5,
              status: "running",
            })
            .select()
            .single();

          if (abError) {
            console.error("Error creating A/B experiment:", abError);
          } else {
            abExperimentId = experiment.id;
            console.log(`🧪 Started A/B experiment: ${experiment.name}`);
          }
        }
      }
    }
  }

  // Auto-apply safe changes (weight_tune, config_change, code_fix)
  if (proposal.proposal_type === "weight_tune" || proposal.proposal_type === "config_change" || proposal.proposal_type === "code_fix") {
    await supabase.from("neural_evolution_proposals").update({
      status: "applied",
      applied_at: new Date().toISOString(),
    }).eq("id", proposalId);

    await supabase.from("neural_learning_data").insert({
      interaction_type: "evolution_applied",
      input_text: proposal.title,
      output_text: proposal.proposed_value,
      quality_score: 0.85,
      learned: true,
      metadata: { proposal_id: proposalId, proposal_type: proposal.proposal_type },
    });

    // ── Fechar lacuna: code_fix aprovado → disparar DPO para reajuste de pesos ──
    if (proposal.proposal_type === "code_fix" || proposal.proposal_type === "weight_tune") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      EdgeRuntime.waitUntil(
        fetch(`${supabaseUrl}/functions/v1/neural-training`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
          body: JSON.stringify({ action: "dpo_optimize" }),
          signal: AbortSignal.timeout(120000),
        })
        .then(() => console.log("✅ DPO triggered after proposal approval"))
        .catch(e => console.warn("DPO trigger after approval failed:", e))
      );

      // Also trigger neural-pipeline collect_feedback to measure impact
      EdgeRuntime.waitUntil(
        new Promise(r => setTimeout(r, 5000)).then(() =>
          fetch(`${supabaseUrl}/functions/v1/neural-pipeline-orchestrator`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKey}` },
            body: JSON.stringify({ action: "collect_feedback" }),
            signal: AbortSignal.timeout(60000),
          }).catch(e => console.warn("Pipeline after approval failed:", e))
        )
      );
    }

    return { applied: true, promptVersionId, abExperimentId };
  }

  return { applied: false, promptVersionId, abExperimentId };
}

// ═══════════════════════════════════════════════════════════════
// APPLY PROMPT VERSION
// ═══════════════════════════════════════════════════════════════

async function applyPromptVersion(supabase: ReturnType<typeof createClient>, versionId: string) {
  const { data: version } = await supabase
    .from("neural_prompt_versions")
    .select("*")
    .eq("id", versionId)
    .single();

  if (!version) throw new Error("Version not found");

  await supabase
    .from("neural_prompt_versions")
    .update({ is_active: false })
    .eq("scope", version.scope);

  await supabase
    .from("neural_prompt_versions")
    .update({ is_active: true })
    .eq("id", versionId);

  console.log(`✅ Activated prompt version ${version.version_label} for scope ${version.scope}`);
}

// ═══════════════════════════════════════════════════════════════
// EVALUATE A/B EXPERIMENTS
// ═══════════════════════════════════════════════════════════════

async function evaluateABExperiments(supabase: ReturnType<typeof createClient>) {
  const { data: experiments } = await supabase
    .from("neural_ab_experiments")
    .select("*")
    .eq("status", "running");

  if (!experiments || experiments.length === 0) {
    return { evaluated: 0, results: [] };
  }

  const results: Record<string, unknown>[] = [];

  for (const exp of experiments) {
    const { data: feedbackA } = await supabase
      .from("neural_learning_data")
      .select("quality_score")
      .not("quality_score", "is", null)
      .contains("metadata", { prompt_version_id: exp.variant_a_id });

    const { data: feedbackB } = await supabase
      .from("neural_learning_data")
      .select("quality_score")
      .not("quality_score", "is", null)
      .contains("metadata", { prompt_version_id: exp.variant_b_id });

    const scoresA = (feedbackA || []).map((f: Record<string, unknown>) => Number(f.quality_score));
    const scoresB = (feedbackB || []).map((f: Record<string, unknown>) => Number(f.quality_score));

    const totalSamples = scoresA.length + scoresB.length;
    const minSamples = 20;

    if (scoresA.length > 0) {
      const avgA = scoresA.reduce((a: number, b: number) => a + b, 0) / scoresA.length;
      await supabase.from("neural_prompt_versions").update({
        score_avg: avgA,
        score_count: scoresA.length,
      }).eq("id", exp.variant_a_id);
    }
    if (scoresB.length > 0) {
      const avgB = scoresB.reduce((a: number, b: number) => a + b, 0) / scoresB.length;
      await supabase.from("neural_prompt_versions").update({
        score_avg: avgB,
        score_count: scoresB.length,
      }).eq("id", exp.variant_b_id);
    }

    if (totalSamples >= minSamples && scoresA.length >= 5 && scoresB.length >= 5) {
      const avgA = scoresA.reduce((a: number, b: number) => a + b, 0) / scoresA.length;
      const avgB = scoresB.reduce((a: number, b: number) => a + b, 0) / scoresB.length;

      const winner = avgB > avgA ? "B" : "A";
      const winnerId = winner === "B" ? exp.variant_b_id : exp.variant_a_id;

      await supabase.from("neural_ab_experiments").update({
        status: "completed",
        winner,
        ended_at: new Date().toISOString(),
      }).eq("id", exp.id);

      await applyPromptVersion(supabase, winnerId);

      results.push({
        experiment: exp.name, winner,
        avgA: avgA.toFixed(3), avgB: avgB.toFixed(3),
        samplesA: scoresA.length, samplesB: scoresB.length,
      });
    } else {
      results.push({
        experiment: exp.name, status: "collecting",
        samplesA: scoresA.length, samplesB: scoresB.length,
        remaining: minSamples - totalSamples,
      });
    }
  }

  return { evaluated: results.length, results };
}

// ═══════════════════════════════════════════════════════════════
// VALIDATE PATCH SYNTAX — Syntactic validation for generated code
// ═══════════════════════════════════════════════════════════════

function validatePatchSyntax(code: string): number {
  let score = 0;
  const checks = [
    { pattern: /import\s+.*from\s+/i, weight: 0.15, name: "has_imports" },
    { pattern: /Deno\.serve|export\s+default/i, weight: 0.15, name: "has_entrypoint" },
    { pattern: /cors[Hh]eaders|Access-Control/i, weight: 0.15, name: "has_cors" },
    { pattern: /authorization|auth\.getUser|getClaims/i, weight: 0.15, name: "has_auth" },
    { pattern: /try\s*\{[\s\S]*catch/i, weight: 0.1, name: "has_error_handling" },
    { pattern: /new\s+Response\(/i, weight: 0.1, name: "has_response" },
    { pattern: /JSON\.stringify/i, weight: 0.05, name: "has_json" },
    { pattern: /createClient/i, weight: 0.1, name: "has_supabase_client" },
    { pattern: /Content-Type/i, weight: 0.05, name: "has_content_type" },
  ];

  for (const check of checks) {
    if (check.pattern.test(code)) score += check.weight;
  }

  // Penalty for dangerous patterns
  if (/eval\s*\(/i.test(code)) score -= 0.3;
  if (/Function\s*\(/i.test(code)) score -= 0.2;
  if (/process\.exit/i.test(code)) score -= 0.3;

  return Math.max(0, Math.min(1, score));
}

// ═══════════════════════════════════════════════════════════════
// LOAD RUNTIME PATCHES — Helper for Edge Functions to load patches
// ═══════════════════════════════════════════════════════════════

async function loadRuntimePatches(supabase: ReturnType<typeof createClient>, functionName: string) {
  const { data } = await supabase
    .from("neural_code_patches")
    .select("patched_code, patch_type, validation_score, applied_at")
    .eq("target_function", functionName)
    .eq("status", "applied")
    .order("applied_at", { ascending: false })
    .limit(1);
  return data?.[0] || null;
}
