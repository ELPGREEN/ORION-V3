/**
 * RVC (Retrieval-based Voice Conversion) Client
 * 
 * Sends audio to HuggingFace Space Ericsonv12/adv for voice conversion
 * using the ToothBrushing RVC model (Orion voice clone).
 * 
 * Pipeline: Formant WAV → RVC Space → Converted WAV
 */

const RVC_SPACE_URL = "https://ericsonv12-adv.hf.space";
const RVC_ENDPOINT = "/rvc_convert";
const RVC_TIMEOUT_MS = 30_000;

export interface RVCConvertOptions {
  /** Pitch shift in semitones (default: 0) */
  pitchShift?: number;
  /** Index rate 0-1 (default: 0.75) */
  indexRate?: number;
  /** Filter radius 0-7 (default: 3) */
  filterRadius?: number;
  /** Volume envelope mix 0-1 (default: 0.25) */
  volumeEnvelope?: number;
  /** Protect voiceless consonants 0-0.5 (default: 0.33) */
  protect?: number;
}

const DEFAULT_OPTIONS: Required<RVCConvertOptions> = {
  pitchShift: 0,
  indexRate: 0.75,
  filterRadius: 3,
  volumeEnvelope: 0.25,
  protect: 0.33,
};

/**
 * Convert audio blob through RVC model on HF Space
 */
export async function convertWithRVC(
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
    formData.append("filter_radius", String(opts.filterRadius));
    formData.append("volume_envelope", String(opts.volumeEnvelope));
    formData.append("protect", String(opts.protect));

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RVC_TIMEOUT_MS);

    // Chain abort signals
    if (signal) {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    const response = await fetch(`${RVC_SPACE_URL}${RVC_ENDPOINT}`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`[RVC] Space returned ${response.status}: ${response.statusText}`);
      return null;
    }

    const blob = await response.blob();
    if (blob.size < 100) {
      console.warn(`[RVC] Converted audio too small: ${blob.size} bytes`);
      return null;
    }

    console.log(`[RVC] Conversion successful: ${blob.size} bytes`);
    return blob;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[RVC] Conversion failed:", err?.message);
    }
    return null;
  }
}

/**
 * Try Gradio client for RVC conversion (fallback)
 */
export async function convertWithRVCGradio(
  audioBlob: Blob,
  options?: RVCConvertOptions,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  try {
    const { Client } = await import("@gradio/client");
    const client = await Client.connect("Ericsonv12/adv");

    if (signal?.aborted) return null;

    const result = await (client as any).predict("/rvc_convert", [
      audioBlob,           // audio file
      opts.pitchShift,     // pitch shift
      opts.indexRate,       // index rate
      opts.filterRadius,   // filter radius  
      opts.volumeEnvelope, // volume envelope
      opts.protect,        // protect
    ]);

    if (signal?.aborted) return null;

    // Gradio returns file URL or blob
    const data = result.data?.[0];
    if (!data) return null;

    if (data instanceof Blob) return data;
    if (typeof data === "string" && data.startsWith("http")) {
      const resp = await fetch(data, { signal });
      return resp.ok ? resp.blob() : null;
    }

    return null;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[RVC Gradio] Conversion failed:", err?.message);
    }
    return null;
  }
}

/**
 * Check if RVC endpoint is available on the Space
 */
export async function isRVCAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${RVC_SPACE_URL}/rvc_health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
