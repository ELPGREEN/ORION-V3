import { corsHeaders } from '@supabase/supabase-js/cors'

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

  try {
    // Test 1: Check space runtime status
    const runtimeRes = await fetch("https://huggingface.co/api/spaces/Ericsonv12/llm-orion/runtime", {
      headers: { Authorization: `Bearer ${hfToken}` }
    })
    const runtimeData = await runtimeRes.json()

    // Test 2: Try to reach the Gradio API
    let gradioStatus = "unknown"
    try {
      const gradioRes = await fetch("https://ericsonv12-llm-orion.hf.space/api/predict", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${hfToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ data: ["Olá", 0.7, 200, 40] })
      })
      gradioStatus = `${gradioRes.status} ${gradioRes.statusText}`
      await gradioRes.text() // consume body
    } catch (e) {
      gradioStatus = `error: ${e.message}`
    }

    return new Response(JSON.stringify({
      success: true,
      space: "Ericsonv12/llm-orion",
      runtime: runtimeData,
      gradio_test: gradioStatus,
      token_present: true
    }, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
