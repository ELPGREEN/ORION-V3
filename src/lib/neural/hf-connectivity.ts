/**
 * HuggingFace Connectivity Gate
 * Prevents repeated failed model downloads by checking connectivity once
 * and caching the result. Avoids wasting bandwidth and console errors.
 */

let _hfAvailable: boolean | null = null;
let _lastCheck = 0;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Re-check every 5 minutes
const CHECK_TIMEOUT_MS = 4000;

/**
 * Returns true if HuggingFace CDN is reachable.
 * Caches result for 5 minutes to avoid repeated HEAD requests.
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
  } catch {
    _hfAvailable = false;
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
