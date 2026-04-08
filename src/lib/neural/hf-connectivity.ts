/**
 * HuggingFace Connectivity Gate
 * Prevents repeated failed model downloads by checking connectivity once
 * and caching the result. Avoids wasting bandwidth and console errors.
 * 
 * NOTE: CSP blocks in Lovable preview don't mean HF models are unavailable —
 * @huggingface/transformers uses a different CDN than the API endpoint.
 * We treat CSP/TypeError failures as "available" to avoid false negatives.
 */

let _hfAvailable: boolean | null = null;
let _lastCheck = 0;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Re-check every 5 minutes
const CHECK_TIMEOUT_MS = 4000;

/**
 * Returns true if HuggingFace CDN is reachable.
 * Caches result for 5 minutes to avoid repeated HEAD requests.
 * Returns true on CSP/network errors (models use different CDN).
 */
export async function isHuggingFaceAvailable(): Promise<boolean> {
  const now = Date.now();
  if (_hfAvailable !== null && now - _lastCheck < CHECK_INTERVAL_MS) {
    return _hfAvailable;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
    
    const res = await fetch(
      "https://huggingface.co/api/models?limit=1",
      { method: "HEAD", signal: controller.signal, mode: "cors" }
    );
    clearTimeout(timer);
    
    _hfAvailable = res.ok;
  } catch (err: any) {
    // CSP blocks and TypeError (failed to fetch) mean the API endpoint is blocked,
    // but HF model CDN (cdn-lfs.huggingface.co) may still work.
    // Treat these as "available" to allow @huggingface/transformers to try loading.
    const msg = String(err?.message || "").toLowerCase();
    const isCSPorNetwork = msg.includes("content security policy") ||
      msg.includes("failed to fetch") ||
      msg.includes("refused to connect") ||
      err?.name === "TypeError";
    
    _hfAvailable = isCSPorNetwork ? true : false;
  }

  _lastCheck = now;
  console.log(`[HFConnectivity] HuggingFace CDN ${_hfAvailable ? "✅ reachable" : "❌ unreachable — skipping HF model downloads"}`);
  return _hfAvailable;
}

/** Force a re-check on next call */
export function resetHFConnectivityCache(): void {
  _hfAvailable = null;
  _lastCheck = 0;
}
