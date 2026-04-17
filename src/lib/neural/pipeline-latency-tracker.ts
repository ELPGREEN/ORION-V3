/**
 * Pipeline Latency Tracker v32
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
  (window as any).__orion_stt_start = _sttStart;
}

export function markSTTEnd(): void {
  const now = performance.now();
  if (_sttStart > 0) {
    _latency.sttMs = now - _sttStart;
    _sttStart = 0;
  }
  const winStart = (window as any).__orion_stt_start;
  if (winStart) {
    console.log('[Latency] STT:', Math.round(now - winStart), 'ms');
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
  (window as any).__orion_tts_start = _ttsStart;
}

export function markTTSEnd(): void {
  const now = performance.now();
  if (_ttsStart > 0) {
    _latency.ttsMs = now - _ttsStart;
    _ttsStart = 0;
  }
  if (_pipelineStart > 0) {
    _latency.totalMs = now - _pipelineStart;
    _pipelineStart = 0;
  }
  const winStart = (window as any).__orion_tts_start;
  if (winStart) {
    console.log('[Latency] TTS:', Math.round(now - winStart), 'ms');
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

export function getPipelineLatency(): PipelineLatency {
  return { ..._latency };
}
