/**
 * Voice Feature Engine — Shared spectral analysis for voice authentication.
 * 
 * Used by both useVoiceAuth (enrollment/verify) and useVoiceIdentityGuard.
 * Implements proper MFCC via mel filterbank + DCT, formant estimation,
 * spectral rolloff/flux, and normalized pitch detection.
 */

export interface VoiceFeatures {
  mfcc_mean: number[];
  pitch_mean: number;
  pitch_std: number;
  energy_mean: number;
  spectral_centroid: number;
  zero_crossing_rate: number;
  speaking_rate: number;
  formant_ratios: number[];
  spectral_rolloff: number;
  spectral_flux: number;
}

// ─── FFT ───
function fftReal(signal: Float32Array): { magnitudes: Float32Array } {
  const N = signal.length;
  const magnitudes = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += signal[n] * Math.cos(angle);
      imag -= signal[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(real * real + imag * imag);
  }
  return { magnitudes };
}

// ─── Mel filterbank ───
function hzToMel(hz: number): number { return 2595 * Math.log10(1 + hz / 700); }
function melToHz(mel: number): number { return 700 * (Math.pow(10, mel / 2595) - 1); }

function createMelFilterbank(numFilters: number, fftSize: number, sampleRate: number): Float32Array[] {
  const lowMel = hzToMel(80);
  const highMel = hzToMel(sampleRate / 2);
  const melPoints: number[] = [];
  for (let i = 0; i <= numFilters + 1; i++) {
    melPoints.push(lowMel + (i * (highMel - lowMel)) / (numFilters + 1));
  }
  const binPoints = melPoints.map(m => Math.floor(((fftSize + 1) * melToHz(m)) / sampleRate));
  const filters: Float32Array[] = [];
  for (let i = 1; i <= numFilters; i++) {
    const filter = new Float32Array(fftSize / 2);
    const left = binPoints[i - 1], center = binPoints[i], right = binPoints[i + 1];
    for (let k = left; k < center && k < filter.length; k++) filter[k] = (k - left) / Math.max(1, center - left);
    for (let k = center; k < right && k < filter.length; k++) filter[k] = (right - k) / Math.max(1, right - center);
    filters.push(filter);
  }
  return filters;
}

function dctType2(input: number[], numCoeffs: number): number[] {
  const N = input.length;
  const result: number[] = [];
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    result.push(sum);
  }
  return result;
}

function computeProperMFCC(channelData: Float32Array, sampleRate: number): number[] {
  const frameSize = 512, hopSize = 256, numMelFilters = 26, numMFCC = 13;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  if (numFrames < 1) return new Array(numMFCC).fill(0);

  const melBank = createMelFilterbank(numMelFilters, frameSize, sampleRate);
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));

  const mfccAccum = new Array(numMFCC).fill(0);
  let validFrames = 0;
  const maxFrames = Math.min(numFrames, 200);

  for (let f = 0; f < maxFrames; f++) {
    const start = f * hopSize;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (channelData[start + i] || 0) * window[i];

    let frameEnergy = 0;
    for (let i = 0; i < frameSize; i++) frameEnergy += frame[i] * frame[i];
    if (frameEnergy / frameSize < 1e-8) continue;

    const { magnitudes } = fftReal(frame);
    const melEnergies: number[] = [];
    for (let m = 0; m < numMelFilters; m++) {
      let energy = 0;
      for (let k = 0; k < magnitudes.length; k++) energy += magnitudes[k] * magnitudes[k] * melBank[m][k];
      melEnergies.push(Math.log(Math.max(energy, 1e-10)));
    }
    const frameMFCC = dctType2(melEnergies, numMFCC);
    for (let i = 0; i < numMFCC; i++) mfccAccum[i] += frameMFCC[i];
    validFrames++;
  }

  if (validFrames === 0) return new Array(numMFCC).fill(0);
  return mfccAccum.map(v => v / validFrames);
}

function estimateFormantRatios(channelData: Float32Array, sampleRate: number): number[] {
  const frameSize = 1024;
  if (channelData.length < frameSize) return [0, 0, 0];
  const midStart = Math.max(0, Math.floor(channelData.length / 2) - frameSize / 2);
  const frame = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) frame[i] = channelData[midStart + i] || 0;
  const { magnitudes } = fftReal(frame);
  const peaks: { freq: number; mag: number }[] = [];
  const freqPerBin = sampleRate / frameSize;
  for (let k = 2; k < magnitudes.length - 2; k++) {
    const freq = k * freqPerBin;
    if (freq < 200 || freq > 5000) continue;
    if (magnitudes[k] > magnitudes[k - 1] && magnitudes[k] > magnitudes[k + 1] &&
        magnitudes[k] > magnitudes[k - 2] && magnitudes[k] > magnitudes[k + 2]) {
      peaks.push({ freq, mag: magnitudes[k] });
    }
  }
  peaks.sort((a, b) => b.mag - a.mag);
  const formants = peaks.slice(0, 3).sort((a, b) => a.freq - b.freq);
  if (formants.length < 2) return [0, 0, 0];
  return [
    formants.length >= 2 ? formants[1].freq / formants[0].freq : 0,
    formants.length >= 3 ? formants[2].freq / formants[0].freq : 0,
    formants.length >= 3 ? formants[2].freq / formants[1].freq : 0,
  ];
}

function computeSpectralFlux(channelData: Float32Array, sampleRate: number): number {
  const frameSize = 512, hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  if (numFrames < 2) return 0;
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  let prevMags: Float32Array | null = null;
  let fluxSum = 0, fluxCount = 0;
  for (let f = 0; f < Math.min(numFrames, 100); f++) {
    const start = f * hopSize;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (channelData[start + i] || 0) * window[i];
    const { magnitudes } = fftReal(frame);
    if (prevMags) {
      let diff = 0;
      for (let k = 0; k < magnitudes.length; k++) { const d = magnitudes[k] - prevMags[k]; diff += d > 0 ? d : 0; }
      fluxSum += diff;
      fluxCount++;
    }
    prevMags = magnitudes;
  }
  return fluxCount > 0 ? fluxSum / fluxCount : 0;
}

function estimatePitch(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);
  let bestCorr = -1, bestLag = minLag;
  let frameEnergy = 0;
  for (let i = 0; i < frame.length; i++) frameEnergy += frame[i] * frame[i];
  if (frameEnergy < 1e-8) return 0;
  for (let lag = minLag; lag < Math.min(maxLag, frame.length); lag++) {
    let corr = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < frame.length - lag; i++) { corr += frame[i] * frame[i + lag]; e1 += frame[i] * frame[i]; e2 += frame[i + lag] * frame[i + lag]; }
    const norm = Math.sqrt(e1 * e2);
    const normCorr = norm > 0 ? corr / norm : 0;
    if (normCorr > bestCorr) { bestCorr = normCorr; bestLag = lag; }
  }
  return bestCorr > 0.3 ? sampleRate / bestLag : 0;
}

function estimateSpeakingRate(data: Float32Array, sampleRate: number): number {
  const windowSize = Math.floor(sampleRate * 0.02);
  const energies: number[] = [];
  for (let i = 0; i < data.length; i += windowSize) {
    let e = 0;
    for (let j = i; j < Math.min(i + windowSize, data.length); j++) e += data[j] * data[j];
    energies.push(e / windowSize);
  }
  const threshold = energies.reduce((a, b) => a + b, 0) / energies.length * 1.5;
  let peaks = 0, inPeak = false;
  for (const e of energies) {
    if (e > threshold && !inPeak) { peaks++; inPeak = true; }
    if (e < threshold) inPeak = false;
  }
  const durationSec = data.length / sampleRate;
  return durationSec > 0 ? peaks / durationSec : 0;
}

// ─── Public API ───

export async function extractVoiceFeaturesFromBlob(audioBlob: Blob): Promise<VoiceFeatures> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = 512, hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  const pitchValues: number[] = [];
  for (let i = 0; i < Math.min(numFrames, 150); i++) {
    const start = i * hopSize;
    const frame = channelData.slice(start, start + frameSize);
    const pitch = estimatePitch(frame, audioContext.sampleRate);
    if (pitch > 50 && pitch < 500) pitchValues.push(pitch);
  }

  let energySum = 0;
  for (let i = 0; i < channelData.length; i++) energySum += channelData[i] * channelData[i];

  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zeroCrossings++;
  }

  const centroidFrame = new Float32Array(1024);
  const midPoint = Math.max(0, Math.floor(channelData.length / 2) - 512);
  for (let i = 0; i < 1024 && midPoint + i < channelData.length; i++) centroidFrame[i] = channelData[midPoint + i];
  const { magnitudes: centroidMags } = fftReal(centroidFrame);
  let wSum = 0, mSum = 0;
  for (let k = 0; k < centroidMags.length; k++) {
    const freq = (k * audioContext.sampleRate) / 1024;
    wSum += freq * centroidMags[k];
    mSum += centroidMags[k];
  }

  // Spectral rolloff
  let totalE = 0;
  for (let k = 0; k < centroidMags.length; k++) totalE += centroidMags[k] * centroidMags[k];
  const rollThresh = totalE * 0.85;
  let cumE = 0, rolloff = audioContext.sampleRate / 2;
  for (let k = 0; k < centroidMags.length; k++) {
    cumE += centroidMags[k] * centroidMags[k];
    if (cumE >= rollThresh) { rolloff = (k * audioContext.sampleRate) / 1024; break; }
  }

  const pitchMean = pitchValues.length > 0 ? pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length : 0;

  audioContext.close();

  return {
    mfcc_mean: computeProperMFCC(channelData, 16000),
    pitch_mean: pitchMean,
    pitch_std: pitchValues.length > 1 ? Math.sqrt(pitchValues.reduce((s, v) => s + (v - pitchMean) ** 2, 0) / pitchValues.length) : 0,
    energy_mean: energySum / channelData.length,
    spectral_centroid: mSum > 0 ? wSum / mSum : 0,
    zero_crossing_rate: zeroCrossings / channelData.length,
    speaking_rate: estimateSpeakingRate(channelData, 16000),
    formant_ratios: estimateFormantRatios(channelData, 16000),
    spectral_rolloff: rolloff,
    spectral_flux: computeSpectralFlux(channelData, 16000),
  };
}

export function compareFeaturesStatic(a: VoiceFeatures, b: VoiceFeatures): number {
  let score = 0, weights = 0;

  // MFCC — cosine similarity (highest weight)
  if (a.mfcc_mean.length === b.mfcc_mean.length && a.mfcc_mean.length > 0) {
    let dot = 0, nA = 0, nB = 0;
    for (let i = 0; i < a.mfcc_mean.length; i++) { dot += a.mfcc_mean[i] * b.mfcc_mean[i]; nA += a.mfcc_mean[i] ** 2; nB += b.mfcc_mean[i] ** 2; }
    const cosine = (Math.sqrt(nA) > 0 && Math.sqrt(nB) > 0) ? dot / (Math.sqrt(nA) * Math.sqrt(nB)) : 0;
    score += Math.max(0, (cosine + 1) / 2) * 5;
    weights += 5;
  }

  // Pitch
  if (a.pitch_mean > 0 && b.pitch_mean > 0) {
    score += Math.max(0, 1 - Math.abs(a.pitch_mean - b.pitch_mean) / Math.max(a.pitch_mean, b.pitch_mean)) * 3;
    weights += 3;
    if (a.pitch_std > 0 && b.pitch_std > 0) {
      score += Math.max(0, 1 - Math.abs(a.pitch_std - b.pitch_std) / Math.max(a.pitch_std, b.pitch_std));
      weights += 1;
    }
  }

  // Formant ratios
  const aF = a.formant_ratios || [], bF = b.formant_ratios || [];
  if (aF.length >= 2 && bF.length >= 2 && aF[0] > 0 && bF[0] > 0) {
    let fSim = 0, fC = 0;
    for (let i = 0; i < Math.min(aF.length, bF.length); i++) {
      if (aF[i] > 0 && bF[i] > 0) { fSim += 1 - Math.abs(aF[i] - bF[i]) / Math.max(aF[i], bF[i]); fC++; }
    }
    if (fC > 0) { score += (fSim / fC) * 4; weights += 4; }
  }

  // Spectral rolloff
  if ((a.spectral_rolloff || 0) > 0 && (b.spectral_rolloff || 0) > 0) {
    score += Math.max(0, 1 - Math.abs(a.spectral_rolloff - b.spectral_rolloff) / Math.max(a.spectral_rolloff, b.spectral_rolloff)) * 2;
    weights += 2;
  }

  // Spectral centroid
  if (a.spectral_centroid > 0 && b.spectral_centroid > 0) {
    score += Math.max(0, 1 - Math.abs(a.spectral_centroid - b.spectral_centroid) / Math.max(a.spectral_centroid, b.spectral_centroid)) * 2;
    weights += 2;
  }

  // Spectral flux
  if ((a.spectral_flux || 0) > 0 && (b.spectral_flux || 0) > 0) {
    score += Math.max(0, 1 - Math.abs(a.spectral_flux - b.spectral_flux) / Math.max(a.spectral_flux, b.spectral_flux));
    weights += 1;
  }

  // ZCR
  if (a.zero_crossing_rate > 0 && b.zero_crossing_rate > 0) {
    score += Math.max(0, 1 - Math.abs(a.zero_crossing_rate - b.zero_crossing_rate) / Math.max(a.zero_crossing_rate, b.zero_crossing_rate));
    weights += 1;
  }

  // Speaking rate
  if (a.speaking_rate > 0 && b.speaking_rate > 0) {
    score += Math.max(0, 1 - Math.abs(a.speaking_rate - b.speaking_rate) / Math.max(a.speaking_rate, b.speaking_rate));
    weights += 1;
  }

  return weights > 0 ? score / weights : 0;
}

export function parseVoiceFeatures(json: unknown): VoiceFeatures {
  const obj = json as Record<string, unknown>;
  return {
    mfcc_mean: (obj.mfcc_mean as number[]) || [],
    pitch_mean: (obj.pitch_mean as number) || 0,
    pitch_std: (obj.pitch_std as number) || 0,
    energy_mean: (obj.energy_mean as number) || 0,
    spectral_centroid: (obj.spectral_centroid as number) || 0,
    zero_crossing_rate: (obj.zero_crossing_rate as number) || 0,
    speaking_rate: (obj.speaking_rate as number) || 0,
    formant_ratios: (obj.formant_ratios as number[]) || [],
    spectral_rolloff: (obj.spectral_rolloff as number) || 0,
    spectral_flux: (obj.spectral_flux as number) || 0,
  };
}
