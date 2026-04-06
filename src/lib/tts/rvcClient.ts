/**
 * RVC Client with Load Balancing across 4 HuggingFace Spaces
 * 
 * Spaces: Ericsonv12/orion-voice-1 through orion-voice-4
 * Strategy: Round-robin with health-aware failover
 * 
 * Pipeline: Formant WAV → RVC Space → Orion Voice WAV
 */

// ═══════════════════════════════════════════════════════════
// SPACE POOL (4 identical instances)
// ═══════════════════════════════════════════════════════════

interface SpaceNode {
  id: string;
  url: string;
  healthy: boolean;
  lastCheck: number;
  latency: number;
  failures: number;
}

const SPACES: SpaceNode[] = [
  { id: "Ericsonv12/orion-voice-1", url: "https://ericsonv12-orion-voice-1.hf.space", healthy: true, lastCheck: 0, latency: 0, failures: 0 },
  { id: "Ericsonv12/orion-voice-2", url: "https://ericsonv12-orion-voice-2.hf.space", healthy: true, lastCheck: 0, latency: 0, failures: 0 },
  { id: "Ericsonv12/orion-voice-3", url: "https://ericsonv12-orion-voice-3.hf.space", healthy: true, lastCheck: 0, latency: 0, failures: 0 },
  { id: "Ericsonv12/orion-voice-4", url: "https://ericsonv12-orion-voice-4.hf.space", healthy: true, lastCheck: 0, latency: 0, failures: 0 },
];

const RVC_TIMEOUT_MS = 30_000;
const HEALTH_CHECK_INTERVAL = 60_000; // 1 min
const MAX_FAILURES = 3;

let _roundRobinIndex = 0;

// ═══════════════════════════════════════════════════════════
// LOAD BALANCER
// ═══════════════════════════════════════════════════════════

function getNextSpace(): SpaceNode | null {
  // Try round-robin among healthy spaces
  const healthySpaces = SPACES.filter(s => s.healthy || Date.now() - s.lastCheck > HEALTH_CHECK_INTERVAL * 5);
  if (healthySpaces.length === 0) {
    // Reset all and try again
    SPACES.forEach(s => { s.healthy = true; s.failures = 0; });
    return SPACES[0];
  }

  // Sort by latency (fastest first), then round-robin
  const sorted = [...healthySpaces].sort((a, b) => a.latency - b.latency);
  const idx = _roundRobinIndex % sorted.length;
  _roundRobinIndex++;
  return sorted[idx];
}

function markSuccess(space: SpaceNode, latency: number) {
  space.healthy = true;
  space.failures = 0;
  space.latency = latency;
  space.lastCheck = Date.now();
}

function markFailure(space: SpaceNode) {
  space.failures++;
  if (space.failures >= MAX_FAILURES) {
    space.healthy = false;
    console.warn(`[RVC LB] Space ${space.id} marked unhealthy after ${MAX_FAILURES} failures`);
  }
  space.lastCheck = Date.now();
}

// ═══════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════

export interface RVCConvertOptions {
  pitchShift?: number;
  indexRate?: number;
}

const DEFAULT_OPTIONS: Required<RVCConvertOptions> = {
  pitchShift: 0,
  indexRate: 0.75,
};

/**
 * Convert audio through RVC with automatic load balancing
 * Tries up to 4 Spaces until one succeeds
 */
export async function convertWithRVC(
  audioBlob: Blob,
  options?: RVCConvertOptions,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const tried = new Set<string>();

  for (let attempt = 0; attempt < SPACES.length; attempt++) {
    if (signal?.aborted) return null;

    const space = getNextSpace();
    if (!space || tried.has(space.id)) continue;
    tried.add(space.id);

    console.log(`[RVC LB] Trying ${space.id} (attempt ${attempt + 1}/${SPACES.length})`);
    const start = Date.now();

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

      const response = await fetch(`${space.url}/rvc_convert`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[RVC LB] ${space.id} returned ${response.status}`);
        markFailure(space);
        continue;
      }

      const blob = await response.blob();
      if (blob.size < 100) {
        markFailure(space);
        continue;
      }

      markSuccess(space, Date.now() - start);
      console.log(`[RVC LB] ✅ ${space.id} succeeded in ${Date.now() - start}ms (${blob.size} bytes)`);
      return blob;

    } catch (err: any) {
      if (err?.name === "AbortError" && signal?.aborted) return null;
      console.warn(`[RVC LB] ${space.id} error:`, err?.message);
      markFailure(space);
    }
  }

  console.warn("[RVC LB] All 4 Spaces failed");
  return null;
}

/**
 * Fallback: try via Gradio client
 */
export async function convertWithRVCDirect(
  audioBlob: Blob,
  options?: RVCConvertOptions,
  signal?: AbortSignal,
): Promise<Blob | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const space = getNextSpace();
  if (!space) return null;

  try {
    const { Client } = await import("@gradio/client");
    if (signal?.aborted) return null;

    const client = await Client.connect(space.id);
    if (signal?.aborted) return null;

    const result = await (client as any).predict("/rvc_convert", [
      audioBlob,
      opts.pitchShift,
      opts.indexRate,
    ]);

    if (signal?.aborted) return null;

    const data = result?.data?.[0];
    if (!data) return null;
    if (data instanceof Blob) return data;
    if (typeof data === "object" && data.url) {
      const resp = await fetch(data.url, { signal });
      return resp.ok ? resp.blob() : null;
    }
    return null;
  } catch (err: any) {
    if (err?.name !== "AbortError") {
      console.warn("[RVC Gradio] Failed:", err?.message);
    }
    return null;
  }
}

/**
 * Check if any RVC Space is available
 */
export async function isRVCAvailable(): Promise<boolean> {
  const checks = SPACES.map(async (space) => {
    try {
      const resp = await fetch(`${space.url}/rvc_health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const data = await resp.json();
        space.healthy = data.status === "ok";
        space.lastCheck = Date.now();
        return space.healthy;
      }
      return false;
    } catch {
      return false;
    }
  });

  const results = await Promise.allSettled(checks);
  const anyAvailable = results.some(r => r.status === "fulfilled" && r.value);
  console.log(`[RVC LB] Health check: ${results.filter(r => r.status === "fulfilled" && (r as any).value).length}/4 Spaces available`);
  return anyAvailable;
}

/**
 * Get status of all Spaces
 */
export function getSpaceStatus(): Array<{ id: string; healthy: boolean; latency: number; failures: number }> {
  return SPACES.map(s => ({
    id: s.id,
    healthy: s.healthy,
    latency: s.latency,
    failures: s.failures,
  }));
}
