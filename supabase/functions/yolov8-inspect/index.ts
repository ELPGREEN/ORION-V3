const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { image, model } = await req.json();

    if (!image || typeof image !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'image' (base64 string)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const HF_TOKEN = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_TOKEN");
    if (!HF_TOKEN) {
      return new Response(
        JSON.stringify({ error: "HuggingFace API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const imageBytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));

    // Try multiple models/endpoints as fallback
    const models = [
      { id: "facebook/detr-resnet-50", url: "https://router.huggingface.co/hf-inference/models/facebook/detr-resnet-50" },
      { id: "hustvl/yolos-tiny", url: "https://router.huggingface.co/hf-inference/models/hustvl/yolos-tiny" },
      { id: "facebook/detr-resnet-50", url: "https://api-inference.huggingface.co/models/facebook/detr-resnet-50" }
    ];

    let lastError = "";
    for (const m of models) {
      try {
        const response = await fetch(m.url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${HF_TOKEN}`,
            "Content-Type": "application/octet-stream",
          },
          body: imageBytes,
        });

        if (!response.ok) {
          lastError = `${m.id}: ${response.status}`;
          await response.text(); // consume body
          continue;
        }

        const detections = await response.json();
        const normalized = (Array.isArray(detections) ? detections : []).map((d: any) => ({
          label: d.label || "unknown",
          confidence: d.score || 0,
          box: d.box || { xmin: 0, ymin: 0, xmax: 0, ymax: 0 },
        }));

        return new Response(
          JSON.stringify({ detections: normalized, model: m.id, count: normalized.length }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (e) {
        lastError = `${m.id}: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    // All models failed — return Gemini-based fallback via groq-vision-hybrid
    console.warn(`[YOLOv8] All HF models failed (${lastError}), falling back to Gemini`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const geminiResp = await fetch(`${supabaseUrl}/functions/v1/groq-vision-hybrid`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_base64: image,
        mime_type: "image/png",
        mode: "identify",
        local_detections: [],
        context: "yolov8-fallback: object detection",
      }),
    });

    if (!geminiResp.ok) {
      const errText = await geminiResp.text();
      return new Response(
        JSON.stringify({ error: "All detection models failed", hf_error: lastError, gemini_error: errText }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const geminiData = await geminiResp.json();
    const fallbackDetections = (geminiData.detections || []).map((d: any) => ({
      label: d.objeto || "unknown",
      confidence: (d.confianca || 0) / 100,
      box: { xmin: 0, ymin: 0, xmax: 0, ymax: 0 },
      source: d.source || "gemini_fallback",
    }));

    return new Response(
      JSON.stringify({ detections: fallbackDetections, model: "gemini-fallback", count: fallbackDetections.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[YOLOv8] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
