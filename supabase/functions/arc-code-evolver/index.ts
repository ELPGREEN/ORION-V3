/**
 * arc-code-evolver — Analyzes Orion's recent ARC failures and proposes
 * code improvements; opens PRs via Jules API when approved.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { searchLegal } from "../_shared/zilliz-collections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-pro";

interface Body {
  mode: "propose" | "submit_to_jules";
  proposal_id?: string;
  scorecard_id?: string;
}

async function ai(system: string, user: string, key: string): Promise<string> {
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.3,
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    const JULES_KEY = Deno.env.get("JULES_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = (await req.json().catch(() => ({}))) as Body;

    if (body.mode === "propose") {
      // Pull recent failed scorecards + their strategies
      const { data: cards } = await supa
        .from("arc_scorecards")
        .select("scorecard_id, game_id, won, score, strategy_summary, total_actions")
        .eq("status", "closed")
        .order("created_at", { ascending: false })
        .limit(10);

      const failures = (cards || []).filter((c) => !c.won);
      if (failures.length === 0) {
        return new Response(JSON.stringify({ message: "No recent failures to learn from" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Pull semantic lessons from Zilliz to enrich the proposal
      let zillizContext = "";
      try {
        const hits = await searchLegal("ARC-AGI failure patterns exploration exploitation world-model goal inference", 6);
        if (hits.length) {
          zillizContext = "\n\nSEMANTIC LESSONS (Zilliz):\n" +
            hits.map((h, i) => `${i + 1}. ${(h.text ?? h.content ?? "").toString().slice(0, 250)}`).join("\n");
        }
      } catch { /* optional */ }

      const systemPrompt = `You are Orion's self-improvement engine. ARC-AGI (versions 2 & 3) measures FLUID INTELLIGENCE — rapid skill acquisition on novel tasks (ref: ARC Prize, Decrypt 2024). Given recent failures + retrieved lessons, propose ONE concrete code improvement to Orion's neural agent. Target generalizable improvements (better world-modeling, exploration heuristics, goal inference) — NOT memorization. Output JSON ONLY:
{
  "title": "short title",
  "rationale": "why this helps fluid intelligence",
  "target_files": ["src/lib/neural/..."],
  "proposed_changes": "detailed natural-language description of the change"
}`;

      const userPrompt = `Recent ARC failures (versions 2 & 3):\n${JSON.stringify(failures, null, 2)}${zillizContext}\n\nWhat one improvement to Orion's reasoning/exploration code would most boost fluid intelligence?`;

      const raw = await ai(systemPrompt, userPrompt, LOVABLE_KEY);
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI returned no JSON proposal");
      const proposal = JSON.parse(match[0]) as { title: string; rationale: string; target_files: string[]; proposed_changes: string };

      const { data: inserted, error } = await supa.from("arc_evolution_proposals").insert({
        title: proposal.title,
        rationale: proposal.rationale,
        target_files: proposal.target_files || [],
        proposed_changes: proposal.proposed_changes,
        source_scorecard_id: failures[0].scorecard_id,
        source_game_id: failures[0].game_id,
        status: "pending",
      }).select().single();
      if (error) throw error;

      return new Response(JSON.stringify({ proposal: inserted }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (body.mode === "submit_to_jules") {
      if (!JULES_KEY) throw new Error("JULES_API_KEY missing");
      if (!body.proposal_id) throw new Error("proposal_id required");

      const { data: prop, error } = await supa.from("arc_evolution_proposals")
        .select("*").eq("id", body.proposal_id).single();
      if (error || !prop) throw new Error("Proposal not found");

      // Submit to Jules — create a session/task
      const julesRes = await fetch("https://jules.googleapis.com/v1alpha/sessions", {
        method: "POST",
        headers: { Authorization: `Bearer ${JULES_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Title: ${prop.title}\n\nRationale: ${prop.rationale}\n\nTarget files: ${(prop.target_files || []).join(", ")}\n\nChanges:\n${prop.proposed_changes}`,
          metadata: { source: "arc-code-evolver", proposal_id: prop.id },
        }),
      });
      const julesText = await julesRes.text();
      let julesData: Record<string, unknown> = {};
      try { julesData = JSON.parse(julesText); } catch { /* */ }

      if (!julesRes.ok) {
        await supa.from("arc_evolution_proposals").update({
          status: "jules_error",
          reviewer_notes: `Jules API ${julesRes.status}: ${julesText.slice(0, 500)}`,
        }).eq("id", body.proposal_id);
        throw new Error(`Jules API failed: ${julesRes.status}`);
      }

      const sessionId = (julesData.name || julesData.sessionId || julesData.id) as string | undefined;
      const prUrl = (julesData.pullRequestUrl || julesData.pr_url) as string | undefined;

      await supa.from("arc_evolution_proposals").update({
        status: "submitted_to_jules",
        jules_session_id: sessionId ?? null,
        jules_pr_url: prUrl ?? null,
      }).eq("id", body.proposal_id);

      return new Response(JSON.stringify({ jules: julesData, session_id: sessionId, pr_url: prUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error(`Unknown mode: ${body.mode}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[arc-code-evolver]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
