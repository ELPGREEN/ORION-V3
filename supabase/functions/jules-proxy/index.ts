const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const JULES_API = "https://jules.googleapis.com/v1alpha";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const JULES_API_KEY = Deno.env.get("JULES_API_KEY");
  if (!JULES_API_KEY) {
    return new Response(JSON.stringify({ error: "JULES_API_KEY not configured" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { action, ...params } = body;

    const headers: Record<string, string> = {
      "x-goog-api-key": JULES_API_KEY,
      "Content-Type": "application/json",
    };

    let result: unknown;

    switch (action) {
      case "list_sources": {
        let url = `${JULES_API}/sources`;
        if (params.page_token) url += `?pageToken=${params.page_token}`;
        const resp = await fetch(url, { headers });
        result = await resp.json();
        break;
      }

      case "create_session": {
        const resp = await fetch(`${JULES_API}/sessions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            prompt: params.prompt,
            sourceContext: {
              source: params.source,
              githubRepoContext: {
                startingBranch: params.branch || "main",
              },
            },
            automationMode: params.auto_pr ? "AUTO_CREATE_PR" : undefined,
            title: params.title || "Orion Self-Improvement",
            requirePlanApproval: params.require_approval ?? false,
          }),
        });
        result = await resp.json();
        break;
      }

      case "get_session": {
        const resp = await fetch(`${JULES_API}/sessions/${params.session_id}`, { headers });
        result = await resp.json();
        break;
      }

      case "list_sessions": {
        let url = `${JULES_API}/sessions?pageSize=${params.page_size || 10}`;
        if (params.page_token) url += `&pageToken=${params.page_token}`;
        const resp = await fetch(url, { headers });
        result = await resp.json();
        break;
      }

      case "approve_plan": {
        const resp = await fetch(`${JULES_API}/sessions/${params.session_id}:approvePlan`, {
          method: "POST", headers,
        });
        result = await resp.json();
        break;
      }

      case "send_message": {
        const resp = await fetch(`${JULES_API}/sessions/${params.session_id}:sendMessage`, {
          method: "POST", headers,
          body: JSON.stringify({ prompt: params.prompt }),
        });
        result = await resp.json();
        break;
      }

      case "list_activities": {
        const resp = await fetch(
          `${JULES_API}/sessions/${params.session_id}/activities?pageSize=${params.page_size || 30}`,
          { headers },
        );
        result = await resp.json();
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[jules-proxy] Error:", msg);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
