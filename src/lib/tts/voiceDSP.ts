/**
 * Orion Voice DSP — Audio processing to match Iapetus voice signature
 * 
 * Extracted voice fingerprint from Chirp 3 HD Iapetus sample:
 * - Pitch F0: 113.7 Hz (masculine baritone)
 * - Spectral centroid: 2093 Hz (warm, rich timbre)
 * - Spectral rolloff: 8552 Hz (full bandwidth, not muffled)
 * - Dynamic range: 21.8 dB (natural variation)
 * - Dominant frequency band: 108-127 Hz
 * 
 * This DSP pipeline shapes raw TTS audio to sound like Iapetus.
 */

export interface VoiceProfile {
  pitchF0: number;
  spectralCentroid: number;
  spectralRolloff: number;
  dynamicRange: number;
  formants: number[];
  sampleRate: number;
}

// Iapetus voice fingerprint (extracted from sample)
export const IAPETUS_PROFILE: VoiceProfile = {
  pitchF0: 113.7,
  spectralCentroid: 2093.4,
  spectralRolloff: 8552.4,
  dynamicRange: 21.8,
  formants: [126.4, 126.7, 125.5, 125.6, 125.9, 127.3],
  sampleRate: 24000,
};

/**
 * Apply Iapetus voice signature DSP to raw audio
 * Uses Web Audio API for real-time processing
 */
export async function applyIapetusSignature(
  audioBlob: Blob,
  profile: VoiceProfile = IAPETUS_PROFILE,
): Promise<Blob> {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
    sampleRate: profile.sampleRate,
  });

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Create offline context for processing
    const offlineCtx = new OfflineAudioContext(
      1, // mono
      audioBuffer.length,
      profile.sampleRate,
    );

    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;

    // ── 1. Low-shelf boost for chest resonance (F0 ~114 Hz) ──
    const lowShelf = offlineCtx.createBiquadFilter();
    lowShelf.type = "lowshelf";
    lowShelf.frequency.value = profile.pitchF0 * 1.2; // ~136 Hz
    lowShelf.gain.value = 3.0; // Boost low fundamentals

    // ── 2. Peaking EQ for warmth at formant region ──
    const warmth = offlineCtx.createBiquadFilter();
    warmth.type = "peaking";
    warmth.frequency.value = 250; // Male chest resonance
    warmth.Q.value = 1.2;
    warmth.gain.value = 2.5;

    // ── 3. Presence peak at spectral centroid ──
    const presence = offlineCtx.createBiquadFilter();
    presence.type = "peaking";
    presence.frequency.value = profile.spectralCentroid; // ~2093 Hz
    presence.Q.value = 0.8;
    presence.gain.value = 1.5;

    // ── 4. High-shelf rolloff to match Iapetus timbre ──
    const highShelf = offlineCtx.createBiquadFilter();
    highShelf.type = "highshelf";
    highShelf.frequency.value = profile.spectralRolloff; // ~8552 Hz
    highShelf.gain.value = -2.0; // Gentle rolloff for warmth

    // ── 5. Gentle compression for natural dynamics ──
    const compressor = offlineCtx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.15;

    // ── 6. Output gain normalization ──
    const outputGain = offlineCtx.createGain();
    outputGain.gain.value = 1.1;

    // Chain: source → lowShelf → warmth → presence → highShelf → compressor → gain → dest
    source.connect(lowShelf);
    lowShelf.connect(warmth);
    warmth.connect(presence);
    presence.connect(highShelf);
    highShelf.connect(compressor);
    compressor.connect(outputGain);
    outputGain.connect(offlineCtx.destination);

    source.start(0);
    const renderedBuffer = await offlineCtx.startRendering();

    // Convert to WAV blob
    const wavBlob = audioBufferToWav(renderedBuffer);

    console.log(`[Voice DSP] ✅ Applied Iapetus signature (${(wavBlob.size / 1024).toFixed(1)}KB)`);
    return wavBlob;
  } finally {
    await audioContext.close();
  }
}

/**
 * Apply signature in real-time during playback
 */
export function createIapetusPlaybackChain(
  audioContext: AudioContext,
  source: AudioNode,
  profile: VoiceProfile = IAPETUS_PROFILE,
): AudioNode {
  const lowShelf = audioContext.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = profile.pitchF0 * 1.2;
  lowShelf.gain.value = 3.0;

  const warmth = audioContext.createBiquadFilter();
  warmth.type = "peaking";
  warmth.frequency.value = 250;
  warmth.Q.value = 1.2;
  warmth.gain.value = 2.5;

  const presence = audioContext.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = profile.spectralCentroid;
  presence.Q.value = 0.8;
  presence.gain.value = 1.5;

  const highShelf = audioContext.createBiquadFilter();
  highShelf.type = "highshelf";
  highShelf.frequency.value = profile.spectralRolloff;
  highShelf.gain.value = -2.0;

  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 12;
  compressor.ratio.value = 2.5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.15;

  source.connect(lowShelf);
  lowShelf.connect(warmth);
  warmth.connect(presence);
  presence.connect(highShelf);
  highShelf.connect(compressor);

  return compressor;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const bitsPerSample = 16;
  const samples = buffer.getChannelData(0);
  const dataLength = samples.length * 2;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, "RIFF");
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);

  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
