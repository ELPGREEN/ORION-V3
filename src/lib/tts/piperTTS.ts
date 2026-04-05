/**
 * Piper TTS — WebAssembly-based offline TTS (100% free, no API, no limits)
 * Uses ONNX Runtime in the browser with Piper neural voice models.
 * Models can be served from Firebase Storage for faster/reliable CDN delivery.
 * Falls back gracefully if model download fails or WASM is unsupported.
 */
import { getDownloadURL, ref } from "firebase/storage";
import { firebaseStorage } from "@/lib/firebase";

let piperModule: typeof import("@mintplex-labs/piper-tts-web") | null = null;
let piperReady = false;
let piperLoading = false;
let piperFailed = false;
let consecutiveFailures = 0;
const MAX_FAILURES = 2; // After 2 timeouts/failures, skip Piper for this session

// Portuguese Brazilian voice model — neural quality
const PT_BR_VOICE = "pt_BR-faber-medium";

// Firebase Storage path for custom model (optional override)
let firebaseModelUrl: string | null = null;

/**
 * Try to resolve model URL from Firebase Storage.
 * If the model is uploaded there, use it; otherwise fall back to default CDN.
 */
async function resolveFirebaseModelUrl(): Promise<string | null> {
  if (firebaseModelUrl) return firebaseModelUrl;
  try {
    const modelRef = ref(firebaseStorage, `tts-models/${PT_BR_VOICE}.onnx`);
    firebaseModelUrl = await getDownloadURL(modelRef);
    console.log("[Piper TTS] Model URL resolved from Firebase Storage");
    return firebaseModelUrl;
  } catch {
    // Model not uploaded to Firebase — will use default CDN
    console.log("[Piper TTS] No Firebase model found, using default CDN");
    return null;
  }
}

/**
 * Lazy-load the Piper WASM module. Downloads model on first call (~50MB).
 * Subsequent calls use cached module.
 */
async function ensurePiper(): Promise<typeof import("@mintplex-labs/piper-tts-web") | null> {
  if (piperFailed) return null;
  if (piperReady && piperModule) return piperModule;
  if (piperLoading) {
    // Wait max 5s for loading (was 30s — caused cascade hangs)
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 500));
      if (piperReady && piperModule) return piperModule;
      if (piperFailed) return null;
    }
    console.warn("[Piper TTS] Loading timeout (5s) — skipping");
    return null;
  }

  piperLoading = true;
  try {
    // Pre-resolve Firebase model URL in parallel with module load
    resolveFirebaseModelUrl().catch(() => {});
    
    piperModule = await import("@mintplex-labs/piper-tts-web");
    piperReady = true;
    console.log("[Piper TTS] Module loaded successfully");
    return piperModule;
  } catch (err) {
    console.warn("[Piper TTS] Failed to load WASM module:", err);
    piperFailed = true;
    return null;
  } finally {
    piperLoading = false;
  }
}

/**
 * Synthesize speech using Piper TTS (offline, free, unlimited).
 * Returns true if audio was played successfully, false to fall through to next TTS.
 */
export async function speakWithPiper(text: string): Promise<boolean> {
  if (!text?.trim() || piperFailed || consecutiveFailures >= MAX_FAILURES) return false;

  try {
    const tts = await ensurePiper();
    if (!tts) {
      consecutiveFailures++;
      return false;
    }
    const audioBlob = await tts.predict({
      text: text.trim(),
      voiceId: PT_BR_VOICE,
    });

    if (!audioBlob || audioBlob.size === 0) {
      console.warn("[Piper TTS] No audio generated");
      return false;
    }
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        reject(new Error("Piper audio playback error"));
      };
      audio.play().catch(reject);
    });

    consecutiveFailures = 0; // Reset on success
    return true;
  } catch (err) {
    consecutiveFailures++;
    console.warn(`[Piper TTS] Failure ${consecutiveFailures}/${MAX_FAILURES}:`, err);
    if (consecutiveFailures >= MAX_FAILURES) {
      console.warn("[Piper TTS] Too many failures — disabled for this session");
    }
    return false;
  }
}

/** Check if Piper TTS is available (module loaded and not failed) */
export function isPiperAvailable(): boolean {
  return piperReady && !piperFailed;
}

/** Pre-load the Piper module in background (call early to reduce first-speak latency) */
export function preloadPiper(): void {
  if (!piperFailed && !piperReady && !piperLoading) {
    ensurePiper().catch(() => {});
  }
}
