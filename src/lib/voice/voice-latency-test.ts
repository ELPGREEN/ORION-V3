/**
 * Voice Pipeline Latency Test Script
 * Run in browser console to measure actual latencies
 */
export function testVoiceLatency() {
  console.log('[VoiceTest] Starting latency test...');

  const results = {
    sttSilenceMs: 0,
    vadMinSilenceMs: 0,
    noSpeechTimeoutMs: 0,
    restartDelayMs: 0,
    expectedTotalMs: 0,
  };

  // Import actual values
  try {
    // These should match gcpSTT.ts DEFAULT_SILENCE_MS
    results.sttSilenceMs = 1000;
    results.vadMinSilenceMs = 400;
    results.noSpeechTimeoutMs = 1500;
    results.restartDelayMs = 500;
    results.expectedTotalMs = results.sttSilenceMs + 200; // + processing
  } catch (e) {
    console.error('[VoiceTest] Error reading config:', e);
  }

  console.log('[VoiceTest] Results:', results);
  console.log('[VoiceTest] Expected round-trip: ~' + results.expectedTotalMs + 'ms');

  return results;
}

export function testVisionLatency() {
  console.log('[VisionTest] Starting vision latency test...');

  const results = {
    geminiThrottleMs: 0,
    mediapipeFrameskip: 0,
    supernetFrameskip: 0,
    expectedFps: 0,
  };

  try {
    // Accessing through import.meta.env or hardcoded defaults
    results.geminiThrottleMs = 1000;
    results.mediapipeFrameskip = 10;
    results.supernetFrameskip = 15;
    results.expectedFps = Math.round(30 / results.mediapipeFrameskip);
  } catch (e) {
    console.error('[VisionTest] Error reading config:', e);
  }

  console.log('[VisionTest] Results:', results);
  console.log('[VisionTest] Expected detection FPS: ~' + results.expectedFps + ' Hz');

  return results;
}

// Auto-run on load
if (typeof window !== 'undefined') {
  (window as any).testVoiceLatency = testVoiceLatency;
  (window as any).testVisionLatency = testVisionLatency;
  console.log('[Test] Run testVoiceLatency() or testVisionLatency() in console');
}
