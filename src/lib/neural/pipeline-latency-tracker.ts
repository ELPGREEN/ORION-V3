/**
 * Pipeline Latency Tracker v31
 * Tracks end-to-end STT → LLM → TTS latency for consciousness monitoring.
 */

export interface PipelineLatency {
  sttMs: number;
  llmMs: number;
  ttsMs: number;
  totalMs: number;
  visionMs: number;
}

const _latency: PipelineLatency = {
  sttMs: -1,
  llmMs: -1,
  ttsMs: -1,
  totalMs: -1,
  visionMs: -1,
};

let _sttStart = 0;
let _llmStart = 0;
let _ttsStart = 0;
let _visionStart = 0;
let _pipelineStart = 0;

export function markSTTStart(): void {
  _sttStart = performance.now();
  _pipelineStart = _sttStart;
}

export function markSTTEnd(): void {
  if (_sttStart > 0) {
    _latency.sttMs = performance.now() - _sttStart;
    _sttStart = 0;
  }
}

export function markLLMStart(): void {
  _llmStart = performance.now();
}

export function markLLMEnd(): void {
  if (_llmStart > 0) {
    _latency.llmMs = performance.now() - _llmStart;
    _llmStart = 0;
  }
}

export function markTTSStart(): void {
  _ttsStart = performance.now();
}

export function markTTSEnd(): void {
  if (_ttsStart > 0) {
    _latency.ttsMs = performance.now() - _ttsStart;
    _ttsStart = 0;
  }
  if (_pipelineStart > 0) {
    _latency.totalMs = performance.now() - _pipelineStart;
    _pipelineStart = 0;
  }
}

export function markVisionStart(): void {
  _visionStart = performance.now();
}

export function markVisionEnd(): void {
  if (_visionStart > 0) {
    _latency.visionMs = performance.now() - _visionStart;
    _visionStart = 0;
  }
}

let _cachedLatency: PipelineLatency | null = null;
let _cacheTime = 0;
const CACHE_TTL_MS = 1000;

export function getPipelineLatency(): PipelineLatency {
  const now = performance.now();
  if (_cachedLatency && now - _cacheTime < CACHE_TTL_MS) {
    return { ..._cachedLatency };
  }
  _cachedLatency = { ..._latency };
  _cacheTime = now;
  return _cachedLatency;
}
