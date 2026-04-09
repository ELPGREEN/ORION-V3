/**
 * SmolVLM — Small Vision-Language Model running in browser
 * Uses HuggingFaceTB/SmolVLM-256M-Instruct via Transformers.js
 * Answers questions about images without any cloud API calls.
 * Fallback: if WebGPU not available, uses WASM backend.
 */

let vlmPipeline: any = null;
let vlmLoading = false;
let vlmReady = false;

const SMOLVLM_MODEL = "HuggingFaceTB/SmolVLM-256M-Instruct";

export async function preloadSmolVLM(): Promise<boolean> {
  if (vlmReady) return true;
  if (vlmLoading) return false;
  vlmLoading = true;

  try {
    const transformers = await import("@huggingface/transformers");

    // Try WebGPU first, fall back to WASM
    let device: "webgpu" | "wasm" = "wasm";
    if (typeof navigator !== "undefined" && "gpu" in navigator) {
      try {
        const adapter = await (navigator as any).gpu?.requestAdapter();
        if (adapter) device = "webgpu";
      } catch {}
    }

    console.log(`[SmolVLM] Loading on ${device}...`);

    vlmPipeline = await transformers.pipeline(
      "image-text-to-text" as any,
      SMOLVLM_MODEL,
      { device, dtype: device === "webgpu" ? ("fp16" as any) : ("q4" as any) }
    );

    vlmReady = true;
    console.log(`[SmolVLM] ✅ Ready (${device})`);
    return true;
  } catch (e) {
    console.warn("[SmolVLM] Load failed:", e);
    return false;
  } finally {
    vlmLoading = false;
  }
}

export function isSmolVLMReady(): boolean {
  return vlmReady;
}

export interface VLMResult {
  answer: string;
  inferenceMs: number;
  source: "smolvlm";
}

/**
 * Ask a question about an image — runs 100% in browser, no API calls.
 */
export async function askAboutImage(
  imageSource: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  question: string
): Promise<VLMResult> {
  if (!vlmPipeline) {
    const ok = await preloadSmolVLM();
    if (!ok) return { answer: "", inferenceMs: 0, source: "smolvlm" };
  }

  const start = performance.now();

  try {
    const imgUrl = await toDataURL(imageSource);

    const messages = [
      {
        role: "user",
        content: [
          { type: "image", image: imgUrl },
          { type: "text", text: question },
        ],
      },
    ];

    const result = await vlmPipeline(messages, { max_new_tokens: 200 });
    const answer = (result as any)?.[0]?.generated_text?.trim()
      || (typeof result === "string" ? result : "");

    return {
      answer,
      inferenceMs: Math.round(performance.now() - start),
      source: "smolvlm",
    };
  } catch (e) {
    console.warn("[SmolVLM] Inference error:", e);
    return { answer: "", inferenceMs: Math.round(performance.now() - start), source: "smolvlm" };
  }
}

/**
 * Describe what's in the current video frame — zero cloud cost.
 */
export async function describeVideoFrame(
  video: HTMLVideoElement,
  prompt = "Descreva detalhadamente o que você vê nesta imagem."
): Promise<VLMResult> {
  return askAboutImage(video, prompt);
}

async function toDataURL(
  source: string | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<string> {
  if (typeof source === "string") return source;

  const canvas = document.createElement("canvas");
  if (source instanceof HTMLVideoElement) {
    canvas.width = source.videoWidth || 640;
    canvas.height = source.videoHeight || 480;
  } else if (source instanceof HTMLImageElement) {
    canvas.width = source.naturalWidth || source.width;
    canvas.height = source.naturalHeight || source.height;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}