/**
 * Orion GPU Detector
 * Checks for WebGPU support to enable hardware acceleration.
 */

export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    console.log("[Orion GPU] WebGPU not supported in this browser.");
    return false;
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      console.log("[Orion GPU] WebGPU supported but no adapter found.");
      return false;
    }
    const info = await adapter.requestAdapterInfo();
    console.log(`[Orion GPU] WebGPU Active: ${info.device} (${info.vendor})`);
    return true;
  } catch (e) {
    console.warn("[Orion GPU] Error checking WebGPU:", e);
    return false;
  }
}
