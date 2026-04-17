/**
 * arc-agent — ARC-AGI-3 API client
 * Actions: list_games | open_scorecard | reset | action | close_scorecard | get_scorecard
 * Docs: https://docs.arcprize.org/toolkit/overview
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ARC_BASE = "https://three.arcprize.org/api";

interface Body {
  action: "list_games" | "open_scorecard" | "reset" | "act" | "close_scorecard" | "get_scorecard";
  game_id?: string;
  scorecard_id?: string;
  guid?: string;
  action_type?: string; // ACTION1..ACTION6 / RESET
  action_data?: Record<string, unknown>;
}

async function arcFetch(path: string, apiKey: string, init: RequestInit = {}): Promise<unknown> {
  const r = await fetch(`${ARC_BASE}${path}`, {
    ...init,
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let data: unknown = text;
  try { data = JSON.parse(text); } catch { /* keep text */ }
  if (!r.ok) {
    throw new Error(`ARC API ${r.status}: ${typeof data === "string" ? data : JSON.stringify(data)}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ARC_KEY = Deno.env.get("ARC_AGI_API_KEY");
    if (!ARC_KEY) throw new Error("ARC_AGI_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supa = createClient(SUPABASE_URL, SERVICE_KEY);

    const body = (await req.json()) as Body;

    switch (body.action) {
      case "list_games": {
        const games = await arcFetch("/games", ARC_KEY) as Array<{ game_id: string; title?: string; description?: string }>;
        // Upsert into arc_games
        if (Array.isArray(games)) {
          for (const g of games) {
            await supa.from("arc_games").upsert(
              { game_id: g.game_id, title: g.title ?? null, description: g.description ?? null, metadata: g as unknown as Record<string, unknown> },
              { onConflict: "game_id" }
            );
          }
        }
        return new Response(JSON.stringify({ games }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "open_scorecard": {
        const card = await arcFetch("/scorecard/open", ARC_KEY, { method: "POST", body: JSON.stringify({}) }) as { card_id?: string; scorecard_id?: string };
        const sid = card.card_id || card.scorecard_id || "";
        await supa.from("arc_scorecards").insert({
          scorecard_id: sid, game_id: body.game_id || "n/a", status: "open", raw_payload: card as unknown as Record<string, unknown>,
        });
        return new Response(JSON.stringify(card), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "reset": {
        if (!body.game_id || !body.scorecard_id) throw new Error("game_id and scorecard_id required");
        const out = await arcFetch(`/cmd/RESET`, ARC_KEY, {
          method: "POST",
          body: JSON.stringify({ game_id: body.game_id, card_id: body.scorecard_id }),
        });
        return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "act": {
        if (!body.game_id || !body.action_type) throw new Error("game_id and action_type required");
        const out = await arcFetch(`/cmd/${body.action_type}`, ARC_KEY, {
          method: "POST",
          body: JSON.stringify({ game_id: body.game_id, card_id: body.scorecard_id, guid: body.guid, ...(body.action_data || {}) }),
        }) as Record<string, unknown>;
        // Log step
        if (body.scorecard_id) {
          await supa.from("arc_actions_log").insert({
            scorecard_id: body.scorecard_id,
            game_id: body.game_id,
            step: (typeof out.step === "number" ? out.step : 0),
            action_type: body.action_type,
            action_payload: body.action_data || {},
            observation: out,
            reward: typeof out.score === "number" ? out.score : null,
          });
        }
        return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "close_scorecard": {
        if (!body.scorecard_id) throw new Error("scorecard_id required");
        const out = await arcFetch(`/scorecard/close`, ARC_KEY, {
          method: "POST",
          body: JSON.stringify({ card_id: body.scorecard_id }),
        }) as Record<string, unknown>;
        await supa.from("arc_scorecards").update({
          status: "closed",
          score: typeof out.score === "number" ? out.score : 0,
          level_reached: typeof out.level === "number" ? out.level : 0,
          won: out.won === true,
          closed_at: new Date().toISOString(),
          raw_payload: out,
        }).eq("scorecard_id", body.scorecard_id);
        return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "get_scorecard": {
        if (!body.scorecard_id) throw new Error("scorecard_id required");
        const out = await arcFetch(`/scorecard/${body.scorecard_id}`, ARC_KEY);
        return new Response(JSON.stringify(out), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        throw new Error(`Unknown action: ${(body as { action: string }).action}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[arc-agent]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
