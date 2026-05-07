// Video frame / metadata analysis via OpenRouter free VL models.
// Dedicated route — does NOT touch the general vision pipeline (Gemini GCP).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Cascade VL free (validados OpenRouter, todos com input image+video quando aplicável):
//  1) Nemotron Nano 12B VL — leve, Mamba-Transformer, ótimo p/ sequência de frames
//  2) Gemma 4 26B (MoE a4b) — rápido, suporta vídeo nativo, 262K ctx
//  3) Gemma 3 27B — fallback denso e estável, 131K ctx
const VL_CASCADE = [
  "nvidia/nemotron-nano-12b-v2-vl:free",
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-3-27b-it:free",
];

interface AnalyzeRequest {
  // One of the two must be provided
  frame_url?: string;          // public URL or data:image/...;base64,...
  frame_base64?: string;       // raw base64 (no prefix)
  metadata?: {
    title?: string;
    description?: string;
    duration_sec?: number;
    source?: string;
  };
  prompt?: string;             // user instruction (default: describe scene)
  model?: string;              // override cascade with a specific model
}

function buildImageUrl(req: AnalyzeRequest): string | null {
  if (req.frame_url) {
    if (req.frame_url.startsWith("data:")) return req.frame_url;
    if (/^https?:\/\//.test(req.frame_url)) return req.frame_url;
    return null;
  }
  if (req.frame_base64) {
    const clean = req.frame_base64.replace(/^data:image\/[^;]+;base64,/, "");
    return `data:image/jpeg;base64,${clean}`;
  }
  return null;
}

async function callOpenRouter(
  apiKey: string,
  model: string,
  imageUrl: string | null,
  textPrompt: string,
  metadata?: AnalyzeRequest["metadata"],
): Promise<{ ok: boolean; content?: string; status?: number; error?: string }> {
  const userContent: Array<Record<string, unknown>> = [];
  let intro = textPrompt;
  if (metadata) {
    const meta = [
      metadata.title && `Título: ${metadata.title}`,
      metadata.description && `Descrição: ${metadata.description}`,
      metadata.duration_sec && `Duração: ${metadata.duration_sec}s`,
      metadata.source && `Fonte: ${metadata.source}`,
    ].filter(Boolean).join("\n");
    if (meta) intro = `${textPrompt}\n\n[Metadados]\n${meta}`;
  }
  userContent.push({ type: "text", text: intro });
  if (imageUrl) {
    userContent.push({ type: "image_url", image_url: { url: imageUrl } });
  }

  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://orion-v3.lovable.app",
      "X-Title": "Orion-V3 Video Frame Analysis",
    },
    body: JSON.stringify({
      model,
      max_tokens: 600,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Você analisa frames de vídeo e metadados. Seja factual, conciso (3-6 frases), em PT-BR. " +
            "Nunca invente conteúdo que não esteja visível no frame ou nos metadados. " +
            "Se a imagem estiver ausente ou ilegível, diga claramente.",
        },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    return { ok: false, status: resp.status, error: errText.slice(0, 500) };
  }
  const json = await resp.json();
  const content = json?.choices?.[0]?.message?.content ?? "";
  return { ok: true, content };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = (await req.json().catch(() => null)) as AnalyzeRequest | null;
    if (!body || (typeof body !== "object")) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const imageUrl = buildImageUrl(body);
    if (!imageUrl && !body.metadata) {
      return new Response(
        JSON.stringify({ error: "Provide frame_url, frame_base64, or metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = body.prompt?.toString().slice(0, 4000) ||
      "Descreva objetivamente o que aparece neste frame de vídeo. " +
      "Liste objetos, pessoas, ações, texto visível e contexto geral.";

    const cascade = body.model ? [body.model] : VL_CASCADE;
    const attempts: Array<{ model: string; status?: number; error?: string }> = [];

    for (const model of cascade) {
      const result = await callOpenRouter(apiKey, model, imageUrl, prompt, body.metadata);
      if (result.ok && result.content) {
        return new Response(
          JSON.stringify({
            ok: true,
            model,
            analysis: result.content,
            attempts,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      attempts.push({ model, status: result.status, error: result.error });
      // 429 / 5xx: try next; 4xx other: also try next (might be model-specific)
    }

    return new Response(
      JSON.stringify({
        ok: false,
        error: "All VL models failed",
        attempts,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
