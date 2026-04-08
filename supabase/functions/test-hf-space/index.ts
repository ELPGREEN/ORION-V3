const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const hfToken = Deno.env.get("HF_TOKEN_ORION_LLM")
  if (!hfToken) {
    return new Response(JSON.stringify({ error: "HF_TOKEN_ORION_LLM not configured" }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const authHeaders = {
    Authorization: `Bearer ${hfToken}`,
    "Content-Type": "application/json"
  }

  const results: Record<string, unknown> = {}

  try {
    // 1. Runtime status
    const rtRes = await fetch("https://huggingface.co/api/spaces/Ericsonv12/llm-orion/runtime", {
      headers: { Authorization: `Bearer ${hfToken}` }
    })
    results.runtime = await rtRes.json()

    // 2. Test root (GET)
    const rootRes = await fetch("https://ericsonv12-llm-orion.hf.space/", {
      headers: { Authorization: `Bearer ${hfToken}` }
    })
    results.root_status = rootRes.status
    await rootRes.text()

    // 3. Test /info
    const infoRes = await fetch("https://ericsonv12-llm-orion.hf.space/info", {
      headers: { Authorization: `Bearer ${hfToken}` }
    })
    results.info_status = infoRes.status
    try { results.info_data = await infoRes.json() } catch { results.info_data = await infoRes.text() }

    // 4. Test /run/predict (POST)
    const predictRes = await fetch("https://ericsonv12-llm-orion.hf.space/run/predict", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ data: ["Olá", 0.7, 200, 40] })
    })
    results.predict_status = predictRes.status
    const predictBody = await predictRes.text()
    try { results.predict_data = JSON.parse(predictBody) } catch { results.predict_data = predictBody.substring(0, 500) }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, partial: results }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
