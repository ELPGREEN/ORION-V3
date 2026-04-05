import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HF_API_BASE = "https://api-inference.huggingface.co/models";

function getHFToken(): string {
  const token = Deno.env.get("HF_TOKEN") || Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_WRITE_TOKEN");
  if (!token) throw new Error("No HuggingFace API token configured");
  return token;
}

interface HFRequest {
  task: "text-generation" | "text-classification" | "summarization" | "translation" |
        "fill-mask" | "question-answering" | "feature-extraction" | "sentence-similarity" |
        "image-classification" | "object-detection" | "image-segmentation" |
        "text-to-image" | "image-to-text" |
        "automatic-speech-recognition" | "text-to-speech" |
        "zero-shot-classification" | "token-classification" | "table-question-answering" |
        "document-question-answering";
  model?: string;
  inputs: unknown;
  parameters?: Record<string, unknown>;
  options?: { wait_for_model?: boolean; use_cache?: boolean };
}

// Default models per task
const DEFAULT_MODELS: Record<string, string> = {
  "text-generation": "mistralai/Mixtral-8x7B-Instruct-v0.1",
  "text-classification": "cardiffnlp/twitter-roberta-base-sentiment-latest",
  "summarization": "facebook/bart-large-cnn",
  "translation": "Helsinki-NLP/opus-mt-en-pt",
  "fill-mask": "bert-base-uncased",
  "question-answering": "deepset/roberta-base-squad2",
  "feature-extraction": "sentence-transformers/all-MiniLM-L6-v2",
  "sentence-similarity": "sentence-transformers/all-MiniLM-L6-v2",
  "image-classification": "google/vit-base-patch16-224",
  "object-detection": "facebook/detr-resnet-50",
  "image-segmentation": "facebook/detr-resnet-50-panoptic",
  "text-to-image": "stabilityai/stable-diffusion-xl-base-1.0",
  "image-to-text": "Salesforce/blip-image-captioning-large",
  "automatic-speech-recognition": "openai/whisper-large-v3",
  "text-to-speech": "facebook/mms-tts-por",
  "zero-shot-classification": "facebook/bart-large-mnli",
  "token-classification": "dslim/bert-base-NER",
  "table-question-answering": "google/tapas-base-finetuned-wtq",
  "document-question-answering": "impira/layoutlm-document-qa",
};

async function callHFInference(request: HFRequest): Promise<Response> {
  const token = getHFToken();
  const model = request.model || DEFAULT_MODELS[request.task] || request.task;
  const url = `${HF_API_BASE}/${model}`;

  const body: Record<string, unknown> = { inputs: request.inputs };
  if (request.parameters) body.parameters = request.parameters;
  if (request.options) body.options = request.options;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Check if model is loading
    if (response.status === 503 && errorText.includes("loading")) {
      const parsed = JSON.parse(errorText);
      return new Response(JSON.stringify({
        status: "loading",
        estimated_time: parsed.estimated_time || 30,
        message: `Model ${model} is loading, retry in ${parsed.estimated_time || 30}s`,
      }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    throw new Error(`HF API error [${response.status}]: ${errorText}`);
  }

  // For binary responses (images, audio)
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/") || contentType.startsWith("audio/")) {
    const arrayBuffer = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
    return new Response(JSON.stringify({
      data: base64,
      content_type: contentType,
      model,
      task: request.task,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  return new Response(JSON.stringify({
    data,
    model,
    task: request.task,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// List available models for a task
async function listModels(task: string, limit = 10): Promise<unknown[]> {
  const token = getHFToken();
  const url = `https://huggingface.co/api/models?pipeline_tag=${task}&sort=downloads&direction=-1&limit=${limit}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Failed to list models: ${resp.status}`);
  return resp.json();
}

// Search datasets
async function searchDatasets(query: string, limit = 10): Promise<unknown[]> {
  const token = getHFToken();
  const url = `https://huggingface.co/api/datasets?search=${encodeURIComponent(query)}&sort=downloads&direction=-1&limit=${limit}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) throw new Error(`Failed to search datasets: ${resp.status}`);
  return resp.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: try to validate user, but allow unauthenticated for basic inference
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: userData } = await supabase.auth.getUser();
        userId = userData?.user?.id ?? null;
      } catch (e) {
        console.warn("[hf-inference] Auth check failed, proceeding without user:", e);
      }
    }

    // Log usage
    console.log(`[hf-inference] user=${userId ?? "anonymous"}`);


    const body = await req.json();
    const { action } = body;

    // Route by action
    switch (action) {
      case "inference": {
        const { task, model, inputs, parameters, options } = body;
        if (!task || !inputs) {
          return new Response(JSON.stringify({ error: "task and inputs are required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return callHFInference({ task, model, inputs, parameters, options: { wait_for_model: true, ...options } });
      }

      case "list-models": {
        const { task: modelTask, limit } = body;
        if (!modelTask) {
          return new Response(JSON.stringify({ error: "task is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const models = await listModels(modelTask, limit);
        return new Response(JSON.stringify({ data: models }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "search-datasets": {
        const { query, limit } = body;
        if (!query) {
          return new Response(JSON.stringify({ error: "query is required" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const datasets = await searchDatasets(query, limit);
        return new Response(JSON.stringify({ data: datasets }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "list-tasks": {
        return new Response(JSON.stringify({
          data: Object.entries(DEFAULT_MODELS).map(([task, model]) => ({ task, default_model: model })),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({
          error: "Unknown action",
          available_actions: ["inference", "list-models", "search-datasets", "list-tasks"],
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("[hf-inference]", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
