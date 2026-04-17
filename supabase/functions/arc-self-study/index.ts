/**
 * arc-self-study — Plays ARC-AGI-2 and ARC-AGI-3 games using Lovable AI Gateway (Gemini).
 * Strategies persisted to Zilliz (orion_legal vector store) for scalable RAG recall + Postgres mirror.
 *
 * Key principles (from ARC Prize philosophy, Decrypt 2024):
 *  - ARC measures FLUID INTELLIGENCE: rapid skill acquisition on novel tasks, not memorization.
 *  - Agent must EXPLORE first (build a world model), then EXPLOIT (act on inferred goal).
 *  - Past lessons are retrieved semantically via Zilliz before each game.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { insertLegalText, searchLegal } from "../_shared/zilliz-collections.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const MAX_STEPS_PER_GAME = 40;

// ARC-AGI-2 and ARC-AGI-3 share the same API key & similar endpoints.
const ARC_BASES: Record<string, string> = {
  "3": "https://three.arcprize.org/api",
  "2": "https://two.arcprize.org/api",
};

async function arcFetch(base: string, path: string, apiKey: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const r = await fetch(`${base}${path}`, {
    ...init,
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json", Accept: "application/json", ...(init.headers || {}) },
  });
  const text = await r.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* */ }
  if (!r.ok) throw new Error(`ARC ${r.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  return data as Record<string, unknown>;
}

async function askAI(systemPrompt: string, userPrompt: string, apiKey: string, temperature = 0.4): Promise<string> {
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      temperature,
    }),
  });
  if (!r.ok) throw new Error(`AI ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content ?? "";
}

const SYSTEM = `You are Orion, an ARC-AGI player (versions 2 and 3). 
ARC measures FLUID INTELLIGENCE — your ability to rapidly acquire NEW skills on tasks you have never seen, NOT memorization.
Strategy: EXPLORE early to build a world-model, then EXPLOIT once you infer the goal pattern.
Use prior LESSONS (provided when available) only as priors — adapt, do not blindly repeat.

Respond with ONLY a JSON object: {"action":"ACTION1|ACTION2|ACTION3|ACTION4|ACTION5|ACTION6","reasoning":"short why"}.
ACTION1-4 = directional moves, ACTION5 = interact, ACTION6 = special.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ARC_KEY = Deno.env.get("ARC_AGI_API_KEY");
    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!ARC_KEY) throw new Error("ARC_AGI_API_KEY missing");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY missing");

    const supa = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { game_id, max_games = 1, version = "3" } = (await req.json().catch(() => ({}))) as {
      game_id?: string; max_games?: number; version?: "2" | "3";
    };
    const ARC_BASE = ARC_BASES[version] ?? ARC_BASES["3"];

    let gamesToPlay: string[] = [];
    if (game_id) {
      gamesToPlay = [game_id];
    } else {
      const games = await arcFetch(ARC_BASE, "/games", ARC_KEY) as unknown as Array<{ game_id: string }>;
      const arr = Array.isArray(games) ? games : [];
      gamesToPlay = arr.slice(0, max_games).map((g) => g.game_id);
    }

    const results: Record<string, unknown>[] = [];

    for (const gid of gamesToPlay) {
      // ─── Phase 0: recall prior lessons via Zilliz semantic search ───
      let priorLessons = "";
      try {
        const hits = await searchLegal(`ARC-AGI v${version} game ${gid} strategy lessons exploration exploitation`, 5);
        if (hits.length) {
          priorLessons = "\n\nPRIOR LESSONS (semantic recall, adapt as needed):\n" +
            hits.map((h, i) => `${i + 1}. ${(h.text ?? h.content ?? JSON.stringify(h)).toString().slice(0, 300)}`).join("\n");
        }
      } catch { /* RAG optional */ }

      const card = await arcFetch(ARC_BASE, "/scorecard/open", ARC_KEY, { method: "POST", body: JSON.stringify({}) });
      const cardId = (card.card_id || card.scorecard_id) as string;
      await supa.from("arc_scorecards").insert({ scorecard_id: cardId, game_id: gid, status: "open", raw_payload: { ...card, arc_version: version } });

      let obs = await arcFetch(ARC_BASE, `/cmd/RESET`, ARC_KEY, {
        method: "POST", body: JSON.stringify({ game_id: gid, card_id: cardId }),
      });
      let guid = obs.guid as string | undefined;

      const trace: Array<{ step: number; action: string; reasoning: string; reward: number }> = [];

      for (let step = 0; step < MAX_STEPS_PER_GAME; step++) {
        // Epsilon-greedy: high exploration early, exploit later
        const epsilon = Math.max(0.1, 1 - step / MAX_STEPS_PER_GAME);
        const temperature = 0.2 + 0.6 * epsilon;

        const obsSummary = JSON.stringify({
          frame: obs.frame, score: obs.score, state: obs.state, level: obs.level,
        }).slice(0, 4000);

        let action = "ACTION1";
        let reasoning = "default";
        try {
          const aiResp = await askAI(
            SYSTEM,
            `Game ${gid} (ARC-AGI-${version}) step ${step}/${MAX_STEPS_PER_GAME} — exploration=${epsilon.toFixed(2)}\nObservation:\n${obsSummary}${priorLessons}`,
            LOVABLE_KEY,
            temperature,
          );
          const m = aiResp.match(/\{[^{}]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            if (typeof parsed.action === "string") action = parsed.action;
            if (typeof parsed.reasoning === "string") reasoning = parsed.reasoning;
          }
        } catch (e) {
          console.warn("AI parse fail:", e);
        }

        try {
          obs = await arcFetch(ARC_BASE, `/cmd/${action}`, ARC_KEY, {
            method: "POST", body: JSON.stringify({ game_id: gid, card_id: cardId, guid }),
          });
          guid = (obs.guid as string | undefined) ?? guid;
        } catch (e) {
          console.warn(`Action ${action} failed:`, e);
          break;
        }

        const reward = typeof obs.score === "number" ? obs.score : 0;
        trace.push({ step, action, reasoning, reward });
        await supa.from("arc_actions_log").insert({
          scorecard_id: cardId, game_id: gid, step, action_type: action, reasoning, observation: obs, reward,
        });

        if (obs.state === "WIN" || obs.state === "GAME_OVER" || obs.done === true) break;
      }

      const closed = await arcFetch(ARC_BASE, "/scorecard/close", ARC_KEY, {
        method: "POST", body: JSON.stringify({ card_id: cardId }),
      });
      const won = closed.won === true || obs.state === "WIN";
      const finalScore = typeof closed.score === "number" ? closed.score : (typeof obs.score === "number" ? obs.score : 0);

      // Distill strategy
      const strategyText = await askAI(
        "You distill ARC-AGI game strategies into transferable lessons. Output a 2-3 sentence lesson focused on the GENERAL skill acquired (pattern recognition, exploration heuristic, goal inference) — not game-specific moves. This will be retrieved for future novel tasks.",
        `Game: ${gid} (ARC-AGI-${version})\nWon: ${won}\nFinal score: ${finalScore}\nTrace tail (last 10): ${JSON.stringify(trace.slice(-10))}`,
        LOVABLE_KEY,
        0.3,
      ).catch(() => "");

      await supa.from("arc_scorecards").update({
        status: "closed", won, score: finalScore, total_actions: trace.length,
        strategy_summary: strategyText, closed_at: new Date().toISOString(), raw_payload: closed,
      }).eq("scorecard_id", cardId);

      await supa.rpc("increment_arc_game_stats", { p_game_id: gid, p_won: won, p_score: finalScore }).catch(async () => {
        const { data: g } = await supa.from("arc_games").select("total_attempts, wins, best_score").eq("game_id", gid).maybeSingle();
        await supa.from("arc_games").upsert({
          game_id: gid,
          total_attempts: (g?.total_attempts ?? 0) + 1,
          wins: (g?.wins ?? 0) + (won ? 1 : 0),
          best_score: Math.max(g?.best_score ?? 0, finalScore),
          last_played_at: new Date().toISOString(),
        }, { onConflict: "game_id" });
      });

      if (strategyText) {
        await supa.from("arc_strategies").insert({
          game_id: gid,
          strategy_name: `lesson-v${version}-${cardId.slice(0, 8)}`,
          description: strategyText,
          pattern: { trace_tail: trace.slice(-5), arc_version: version },
          success_rate: won ? 1 : 0,
          uses: 1,
          wins: won ? 1 : 0,
          derived_from_scorecard: cardId,
        });

        // ─── Offload to Zilliz for scalable semantic recall (Postgres-light) ───
        insertLegalText([{
          id: `arc-${version}-${cardId}`,
          text: `[ARC-AGI-${version} ${won ? "WIN" : "LOSS"} score=${finalScore} game=${gid}] ${strategyText}`,
          metadata: { source: "arc_strategy", arc_version: version, game_id: gid, won, score: finalScore },
        }]);

        // Mirror into neural KB (lightweight pointer; Zilliz is the heavy index)
        await supa.from("neural_knowledge_base").insert({
          title: `ARC-AGI-${version} strategy ${gid}`,
          content: strategyText,
          source_type: "arc_strategy",
          source_reference: cardId,
          category: `arc_agi_${version}`,
          tags: ["arc", `v${version}`, gid, won ? "win" : "loss"],
          is_processed: false,
        }).select().maybeSingle().catch(() => null);
      }

      results.push({ game_id: gid, scorecard_id: cardId, version, won, score: finalScore, steps: trace.length });
    }

    return new Response(JSON.stringify({ results, version }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[arc-self-study]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
