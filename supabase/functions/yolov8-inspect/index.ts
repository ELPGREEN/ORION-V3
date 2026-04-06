import { corsHeaders } from "@supabase/supabase-js/cors";

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

    // Use HuggingFace Inference API with YOLOv8 model
    const modelId = model === "yolov8s" 
      ? "hustvl/yolos-small" 
      : "hustvl/yolos-tiny";

    const imageBytes = Uint8Array.from(atob(image), (c) => c.charCodeAt(0));

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${modelId}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${HF_TOKEN}`,
          "Content-Type": "application/octet-stream",
        },
        body: imageBytes,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[YOLOv8] HuggingFace error [${response.status}]:`, errorText);
      return new Response(
        JSON.stringify({ error: `HuggingFace API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const detections = await response.json();

    // Normalize response format
    const normalized = (Array.isArray(detections) ? detections : []).map((d: any) => ({
      label: d.label || "unknown",
      confidence: d.score || 0,
      box: d.box || { xmin: 0, ymin: 0, xmax: 0, ymax: 0 },
    }));

    return new Response(
      JSON.stringify({ detections: normalized, model: modelId, count: normalized.length }),
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
