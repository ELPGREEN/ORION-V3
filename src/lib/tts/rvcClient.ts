/**
 * RVC (Retrieval-based Voice Conversion) Client
 * 
 * Sends audio to HuggingFace Space Ericsonv12/adv for voice conversion
 * using the ToothBrushing RVC model (Orion voice clone).
 * 
 * Pipeline: Formant WAV → RVC Space → Converted WAV
 */

const RVC_SPACE_ID = "Ericsonv12/orion-voice";
const RVC_SPACE_URL = "https://ericsonv12-orion-voice.hf.space";
const RVC_TIMEOUT_MS = 30_000;

// Model files hosted in the Space
const RVC_MODEL_URL = "https://huggingface.co/spaces/Ericsonv12/adv/resolve/main/ToothBrushing.pth";
const RVC_INDEX_URL = "https://huggingface.co/spaces/Ericsonv12/adv/resolve/main/added_IVF120_Flat_nprobe_1_ToothBrushing_v2.index";

export interface RVCConvertOptions {
  pitchShift?: number;
  indexRate?: number;
}

const DEFAULT_OPTIONS: Required<RVCConvertOptions> = {
  pitchShift: 0,
  indexRate: 0.75,
};

/**
 * Convert audio blob through RVC via Gradio client (primary method)
 */
export async function convertWithRVC(
  audioBlob: Blob,
  options?: RVCConvertOptions,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const { Client } = await import("@gradio/client");
    if (signal?.aborted) return null;

    const client = await Client.connect(RVC_SPACE_ID);
    if (signal?.aborted) return null;

    console.log("[RVC] Connected to Space, sending audio for conversion...");

    // Call the api_convert endpoint (defined in app.py)
    const result = await (client as any).predict("/api_convert", [
      audioBlob,         // audio file
      opts.pitchShift,   // pitch shift
      opts.indexRate,     // index rate
    ]);

    if (signal?.aborted) return null;

    const data = result?.data?.[0];
    if (!data) {
      console.warn("[RVC] No data returned from Space");
      return null;
    }

    // Gradio may return a file URL or blob
    if (data instanceof Blob) return data;

    if (typeof data === "object" && data.url) {
      const resp = await fetch(data.url, { signal });
      return resp.ok ? resp.blob() : null;
    }

    if (typeof data === "string" && data.startsWith("http")) {
      const resp = await fetch(data, { signal });
      return resp.ok ? resp.blob() : null;
    }

    console.warn("[RVC] Unexpected response format:", typeof data);
    return null;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[RVC] Gradio conversion failed:", err?.message);
    }
    return null;
  }
}

/**
 * Fallback: direct HTTP POST to Space
 */
export async function convertWithRVCDirect(
  audioBlob: Blob,
  options?: RVCConvertOptions,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const formData = new FormData();
    formData.append("audio", audioBlob, "input.wav");
    formData.append("pitch_shift", String(opts.pitchShift));
    formData.append("index_rate", String(opts.indexRate));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RVC_TIMEOUT_MS);
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const response = await fetch(`${RVC_SPACE_URL}/api/predict`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[RVC Direct] ${response.status}: ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();
    return blob.size > 100 ? blob : null;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[RVC Direct] Failed:", err?.message);
    }
    return null;
  }
}

/**
 * Check if RVC endpoint is available on the Space
 */
export async function isRVCAvailable(): Promise<boolean> {
  try {
    const { Client } = await import("@gradio/client");
    const client = await Client.connect(RVC_SPACE_ID);
    const info = await (client as any).view_api();
    // Check if api_convert endpoint exists
    const endpoints = Object.keys(info?.named_endpoints || {});
    const hasRVC = endpoints.some(e => e.includes("convert") || e.includes("rvc"));
    console.log(`[RVC] Space endpoints: ${endpoints.join(", ")} → RVC: ${hasRVC}`);
    return hasRVC;
  } catch {
    return false;
  }
}
