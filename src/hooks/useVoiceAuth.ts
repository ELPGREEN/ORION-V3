import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type VoiceEnrollmentRow = Database["public"]["Tables"]["voice_auth_enrollments"]["Row"];
type VoiceEnrollmentInsert = Database["public"]["Tables"]["voice_auth_enrollments"]["Insert"];
type VoiceEnrollmentUpdate = Database["public"]["Tables"]["voice_auth_enrollments"]["Update"];
type VoiceAuthLogInsert = Database["public"]["Tables"]["voice_auth_log"]["Insert"];

export type VoiceEnrollment = VoiceEnrollmentRow;

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

// ─── FFT Implementation ───
function fftReal(signal: Float32Array): { magnitudes: Float32Array; phases: Float32Array } {
  const N = signal.length;
  const magnitudes = new Float32Array(N / 2);
  const phases = new Float32Array(N / 2);

  for (let k = 0; k < N / 2; k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      real += signal[n] * Math.cos(angle);
      imag -= signal[n] * Math.sin(angle);
    }
    magnitudes[k] = Math.sqrt(real * real + imag * imag);
    phases[k] = Math.atan2(imag, real);
  }
  return { magnitudes, phases };
}

// ─── Mel filterbank ───
function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

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
    const left = binPoints[i - 1];
    const center = binPoints[i];
    const right = binPoints[i + 1];
    for (let k = left; k < center && k < filter.length; k++) {
      filter[k] = (k - left) / Math.max(1, center - left);
    }
    for (let k = center; k < right && k < filter.length; k++) {
      filter[k] = (right - k) / Math.max(1, right - center);
    }
    filters.push(filter);
  }
  return filters;
}

// ─── DCT for MFCC ───
function dctType2(input: number[], numCoeffs: number): number[] {
  const N = input.length;
  const result: number[] = [];
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos((Math.PI * k * (2 * n + 1)) / (2 * N));
    }
    result.push(sum);
  }
  return result;
}

// ─── Proper MFCC computation using spectral analysis ───
function computeProperMFCC(channelData: Float32Array, sampleRate: number): number[] {
  const frameSize = 512;
  const hopSize = 256;
  const numMelFilters = 26;
  const numMFCC = 13;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  
  if (numFrames < 1) return new Array(numMFCC).fill(0);

  const melBank = createMelFilterbank(numMelFilters, frameSize, sampleRate);
  
  // Hamming window
  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  }

  const mfccAccum = new Array(numMFCC).fill(0);
  let validFrames = 0;

  // Process up to 200 frames for efficiency
  const maxFrames = Math.min(numFrames, 200);
  for (let f = 0; f < maxFrames; f++) {
    const start = f * hopSize;
    const frame = new Float32Array(frameSize);
    
    // Apply window
    for (let i = 0; i < frameSize; i++) {
      frame[i] = (channelData[start + i] || 0) * window[i];
    }

    // Skip silent frames
    let frameEnergy = 0;
    for (let i = 0; i < frameSize; i++) frameEnergy += frame[i] * frame[i];
    if (frameEnergy / frameSize < 1e-8) continue;

    // FFT
    const { magnitudes } = fftReal(frame);

    // Apply mel filterbank
    const melEnergies: number[] = [];
    for (let m = 0; m < numMelFilters; m++) {
      let energy = 0;
      for (let k = 0; k < magnitudes.length; k++) {
        energy += magnitudes[k] * magnitudes[k] * melBank[m][k];
      }
      melEnergies.push(Math.log(Math.max(energy, 1e-10)));
    }

    // DCT to get MFCCs
    const frameMFCC = dctType2(melEnergies, numMFCC);
    for (let i = 0; i < numMFCC; i++) {
      mfccAccum[i] += frameMFCC[i];
    }
    validFrames++;
  }

  if (validFrames === 0) return new Array(numMFCC).fill(0);
  return mfccAccum.map(v => v / validFrames);
}

// ─── Formant estimation via LPC-like peak finding ───
function estimateFormantRatios(channelData: Float32Array, sampleRate: number): number[] {
  const frameSize = 1024;
  if (channelData.length < frameSize) return [0, 0, 0];

  // Take a frame from the middle of the audio (likely speech)
  const midStart = Math.max(0, Math.floor(channelData.length / 2) - frameSize / 2);
  const frame = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    frame[i] = channelData[midStart + i] || 0;
  }

  const { magnitudes } = fftReal(frame);
  
  // Find spectral peaks (formant candidates)
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

  // Sort by magnitude and take top 3 as formants
  peaks.sort((a, b) => b.mag - a.mag);
  const formants = peaks.slice(0, 3).sort((a, b) => a.freq - b.freq);

  if (formants.length < 2) return [0, 0, 0];

  // Return ratios between formants (speaker-characteristic)
  return [
    formants.length >= 2 ? formants[1].freq / formants[0].freq : 0,
    formants.length >= 3 ? formants[2].freq / formants[0].freq : 0,
    formants.length >= 3 ? formants[2].freq / formants[1].freq : 0,
  ];
}

// ─── Spectral rolloff (frequency below which 85% of energy is concentrated) ───
function computeSpectralRolloff(magnitudes: Float32Array, sampleRate: number, fftSize: number): number {
  let totalEnergy = 0;
  for (let k = 0; k < magnitudes.length; k++) {
    totalEnergy += magnitudes[k] * magnitudes[k];
  }
  const threshold = totalEnergy * 0.85;
  let cumEnergy = 0;
  for (let k = 0; k < magnitudes.length; k++) {
    cumEnergy += magnitudes[k] * magnitudes[k];
    if (cumEnergy >= threshold) {
      return (k * sampleRate) / fftSize;
    }
  }
  return sampleRate / 2;
}

// ─── Spectral flux (rate of spectral change — unique per speaker) ───
function computeSpectralFlux(channelData: Float32Array, sampleRate: number): number {
  const frameSize = 512;
  const hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);
  if (numFrames < 2) return 0;

  const window = new Float32Array(frameSize);
  for (let i = 0; i < frameSize; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (frameSize - 1));
  }

  let prevMags: Float32Array | null = null;
  let fluxSum = 0;
  let fluxCount = 0;
  const maxFrames = Math.min(numFrames, 100);

  for (let f = 0; f < maxFrames; f++) {
    const start = f * hopSize;
    const frame = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) frame[i] = (channelData[start + i] || 0) * window[i];
    
    const { magnitudes } = fftReal(frame);
    
    if (prevMags) {
      let diff = 0;
      for (let k = 0; k < magnitudes.length; k++) {
        const d = magnitudes[k] - prevMags[k];
        diff += d > 0 ? d : 0; // Half-wave rectification
      }
      fluxSum += diff;
      fluxCount++;
    }
    prevMags = magnitudes;
  }

  return fluxCount > 0 ? fluxSum / fluxCount : 0;
}

// ─── Main feature extraction ───
async function extractVoiceFeatures(audioBlob: Blob): Promise<VoiceFeatures> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  
  const frameSize = 512;
  const hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  // ── Pitch estimation via autocorrelation ──
  const pitchValues: number[] = [];
  for (let i = 0; i < Math.min(numFrames, 150); i++) {
    const start = i * hopSize;
    const frame = channelData.slice(start, start + frameSize);
    const pitch = estimatePitch(frame, audioContext.sampleRate);
    if (pitch > 50 && pitch < 500) pitchValues.push(pitch);
  }

  // ── Energy ──
  let energySum = 0;
  for (let i = 0; i < channelData.length; i++) {
    energySum += channelData[i] * channelData[i];
  }
  const energyMean = energySum / channelData.length;

  // ── Zero crossing rate ──
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zeroCrossings++;
  }
  const zcr = zeroCrossings / channelData.length;

  // ── Spectral centroid (proper) ──
  const centroidFrame = new Float32Array(1024);
  const midPoint = Math.max(0, Math.floor(channelData.length / 2) - 512);
  for (let i = 0; i < 1024 && midPoint + i < channelData.length; i++) {
    centroidFrame[i] = channelData[midPoint + i];
  }
  const { magnitudes: centroidMags } = fftReal(centroidFrame);
  let weightedSum = 0, magSum = 0;
  for (let k = 0; k < centroidMags.length; k++) {
    const freq = (k * audioContext.sampleRate) / 1024;
    weightedSum += freq * centroidMags[k];
    magSum += centroidMags[k];
  }
  const spectralCentroid = magSum > 0 ? weightedSum / magSum : 0;

  // ── Proper MFCC ──
  const mfcc = computeProperMFCC(channelData, audioContext.sampleRate);

  // ── Formant ratios (speaker-discriminative) ──
  const formantRatios = estimateFormantRatios(channelData, audioContext.sampleRate);

  // ── Spectral rolloff ──
  const spectralRolloff = computeSpectralRolloff(centroidMags, audioContext.sampleRate, 1024);

  // ── Spectral flux ──
  const spectralFlux = computeSpectralFlux(channelData, audioContext.sampleRate);

  // ── Speaking rate ──
  const speakingRate = estimateSpeakingRate(channelData, audioContext.sampleRate);

  audioContext.close();

  const pitchMean = pitchValues.length > 0 
    ? pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length 
    : 0;
  const pitchStd = pitchValues.length > 1 
    ? Math.sqrt(pitchValues.reduce((s, v) => s + (v - pitchMean) ** 2, 0) / pitchValues.length) 
    : 0;

  return {
    mfcc_mean: mfcc,
    pitch_mean: pitchMean,
    pitch_std: pitchStd,
    energy_mean: energyMean,
    spectral_centroid: spectralCentroid,
    zero_crossing_rate: zcr,
    speaking_rate: speakingRate,
    formant_ratios: formantRatios,
    spectral_rolloff: spectralRolloff,
    spectral_flux: spectralFlux,
  };
}

function estimatePitch(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);
  let bestCorr = -1, bestLag = minLag;
  
  // Normalize frame energy for better correlation
  let frameEnergy = 0;
  for (let i = 0; i < frame.length; i++) frameEnergy += frame[i] * frame[i];
  if (frameEnergy < 1e-8) return 0;

  for (let lag = minLag; lag < Math.min(maxLag, frame.length); lag++) {
    let corr = 0, e1 = 0, e2 = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag];
      e1 += frame[i] * frame[i];
      e2 += frame[i + lag] * frame[i + lag];
    }
    // Normalized cross-correlation
    const norm = Math.sqrt(e1 * e2);
    const normCorr = norm > 0 ? corr / norm : 0;
    if (normCorr > bestCorr) {
      bestCorr = normCorr;
      bestLag = lag;
    }
  }
  // Only return pitch if correlation is strong enough
  return bestCorr > 0.3 ? sampleRate / bestLag : 0;
}

function estimateSpeakingRate(data: Float32Array, sampleRate: number): number {
  const windowMs = 20;
  const windowSize = Math.floor(sampleRate * windowMs / 1000);
  const energies: number[] = [];
  for (let i = 0; i < data.length; i += windowSize) {
    let e = 0;
    for (let j = i; j < Math.min(i + windowSize, data.length); j++) e += data[j] * data[j];
    energies.push(e / windowSize);
  }
  const threshold = energies.reduce((a, b) => a + b, 0) / energies.length * 1.5;
  let peaks = 0;
  let inPeak = false;
  for (const e of energies) {
    if (e > threshold && !inPeak) { peaks++; inPeak = true; }
    if (e < threshold) inPeak = false;
  }
  const durationSec = data.length / sampleRate;
  return durationSec > 0 ? peaks / durationSec : 0;
}

// ─── Compare two feature sets — returns similarity 0-1 ───
function compareFeatures(a: VoiceFeatures, b: VoiceFeatures): number {
  let score = 0;
  let weights = 0;

  // MFCC similarity (highest weight — most speaker-discriminative)
  if (a.mfcc_mean.length === b.mfcc_mean.length && a.mfcc_mean.length > 0) {
    // Cosine similarity for MFCC vectors
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.mfcc_mean.length; i++) {
      dotProduct += a.mfcc_mean[i] * b.mfcc_mean[i];
      normA += a.mfcc_mean[i] * a.mfcc_mean[i];
      normB += b.mfcc_mean[i] * b.mfcc_mean[i];
    }
    const cosine = (Math.sqrt(normA) > 0 && Math.sqrt(normB) > 0)
      ? dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
      : 0;
    const mfccSim = Math.max(0, (cosine + 1) / 2); // Normalize to 0-1
    score += mfccSim * 5;
    weights += 5;
  }

  // Pitch similarity
  if (a.pitch_mean > 0 && b.pitch_mean > 0) {
    const pitchSim = 1 - Math.abs(a.pitch_mean - b.pitch_mean) / Math.max(a.pitch_mean, b.pitch_mean);
    score += Math.max(0, pitchSim) * 3;
    weights += 3;

    // Pitch variability similarity
    if (a.pitch_std > 0 && b.pitch_std > 0) {
      const stdSim = 1 - Math.abs(a.pitch_std - b.pitch_std) / Math.max(a.pitch_std, b.pitch_std);
      score += Math.max(0, stdSim) * 1;
      weights += 1;
    }
  }

  // Formant ratio similarity (very speaker-specific)
  const aFormants = a.formant_ratios || [];
  const bFormants = b.formant_ratios || [];
  if (aFormants.length >= 2 && bFormants.length >= 2 && aFormants[0] > 0 && bFormants[0] > 0) {
    let formantSim = 0;
    let formantCount = 0;
    for (let i = 0; i < Math.min(aFormants.length, bFormants.length); i++) {
      if (aFormants[i] > 0 && bFormants[i] > 0) {
        formantSim += 1 - Math.abs(aFormants[i] - bFormants[i]) / Math.max(aFormants[i], bFormants[i]);
        formantCount++;
      }
    }
    if (formantCount > 0) {
      score += (formantSim / formantCount) * 4;
      weights += 4;
    }
  }

  // Spectral rolloff similarity
  if ((a.spectral_rolloff || 0) > 0 && (b.spectral_rolloff || 0) > 0) {
    const rollSim = 1 - Math.abs(a.spectral_rolloff - b.spectral_rolloff) / Math.max(a.spectral_rolloff, b.spectral_rolloff);
    score += Math.max(0, rollSim) * 2;
    weights += 2;
  }

  // Spectral flux similarity
  if ((a.spectral_flux || 0) > 0 && (b.spectral_flux || 0) > 0) {
    const fluxSim = 1 - Math.abs(a.spectral_flux - b.spectral_flux) / Math.max(a.spectral_flux, b.spectral_flux);
    score += Math.max(0, fluxSim) * 1;
    weights += 1;
  }

  // Spectral centroid
  if (a.spectral_centroid > 0 && b.spectral_centroid > 0) {
    const centSim = 1 - Math.abs(a.spectral_centroid - b.spectral_centroid) / Math.max(a.spectral_centroid, b.spectral_centroid);
    score += Math.max(0, centSim) * 2;
    weights += 2;
  }

  // ZCR similarity
  if (a.zero_crossing_rate > 0 && b.zero_crossing_rate > 0) {
    const zcrSim = 1 - Math.abs(a.zero_crossing_rate - b.zero_crossing_rate) / Math.max(a.zero_crossing_rate, b.zero_crossing_rate);
    score += Math.max(0, zcrSim) * 1;
    weights += 1;
  }

  // Speaking rate similarity
  if (a.speaking_rate > 0 && b.speaking_rate > 0) {
    const rateSim = 1 - Math.abs(a.speaking_rate - b.speaking_rate) / Math.max(a.speaking_rate, b.speaking_rate);
    score += Math.max(0, rateSim) * 1;
    weights += 1;
  }

  return weights > 0 ? score / weights : 0;
}

function parseVoiceFeatures(json: unknown): VoiceFeatures {
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

export function useVoiceAuth() {
  const { user } = useAuth();
  const [enrollment, setEnrollment] = useState<VoiceEnrollmentRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const loadEnrollment = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("voice_auth_enrollments")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setEnrollment(data);
  }, [user?.id]);

  const startRecording = useCallback(async (): Promise<Blob> => {
    return new Promise(async (resolve, reject) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 }
        });
        const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
        const chunks: Blob[] = [];
        
        recorder.ondataavailable = (e) => chunks.push(e.data);
        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          resolve(new Blob(chunks, { type: "audio/webm" }));
        };
        recorder.onerror = reject;
        
        setMediaRecorder(recorder);
        setRecording(true);
        recorder.start();
        
        // Auto-stop after 5 seconds
        setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
            setRecording(false);
          }
        }, 5000);
      } catch (e) {
        reject(e);
      }
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      setRecording(false);
    }
  }, [mediaRecorder]);

  const enroll = useCallback(async (audioBlobs: Blob[]) => {
    if (!user?.id) return false;
    setLoading(true);
    try {
      if (audioBlobs.length < 2) {
        toast.error("Grave pelo menos 2 amostras de voz para melhor precisão");
        return false;
      }

      // Extract features from all samples
      const allFeatures = await Promise.all(audioBlobs.map(extractVoiceFeatures));
      
      // Average the features
      const avgFeatures: VoiceFeatures = {
        mfcc_mean: allFeatures[0].mfcc_mean.map((_, i) =>
          allFeatures.reduce((s, f) => s + f.mfcc_mean[i], 0) / allFeatures.length
        ),
        pitch_mean: allFeatures.reduce((s, f) => s + f.pitch_mean, 0) / allFeatures.length,
        pitch_std: allFeatures.reduce((s, f) => s + f.pitch_std, 0) / allFeatures.length,
        energy_mean: allFeatures.reduce((s, f) => s + f.energy_mean, 0) / allFeatures.length,
        spectral_centroid: allFeatures.reduce((s, f) => s + f.spectral_centroid, 0) / allFeatures.length,
        zero_crossing_rate: allFeatures.reduce((s, f) => s + f.zero_crossing_rate, 0) / allFeatures.length,
        speaking_rate: allFeatures.reduce((s, f) => s + f.speaking_rate, 0) / allFeatures.length,
        formant_ratios: allFeatures[0].formant_ratios.map((_, i) =>
          allFeatures.reduce((s, f) => s + (f.formant_ratios[i] || 0), 0) / allFeatures.length
        ),
        spectral_rolloff: allFeatures.reduce((s, f) => s + f.spectral_rolloff, 0) / allFeatures.length,
        spectral_flux: allFeatures.reduce((s, f) => s + f.spectral_flux, 0) / allFeatures.length,
      };

      // Calculate enrollment quality (consistency between samples)
      let totalSim = 0;
      let pairs = 0;
      for (let i = 0; i < allFeatures.length; i++) {
        for (let j = i + 1; j < allFeatures.length; j++) {
          totalSim += compareFeatures(allFeatures[i], allFeatures[j]);
          pairs++;
        }
      }
      const quality = pairs > 0 ? totalSim / pairs : 0;

      if (quality < 0.5) {
        toast.warning("Amostras de voz muito inconsistentes. Tente gravar em um ambiente mais silencioso.");
      }

      const upsertData: VoiceEnrollmentInsert = {
        user_id: user.id,
        voice_features: avgFeatures as unknown as Database["public"]["Tables"]["voice_auth_enrollments"]["Insert"]["voice_features"],
        enrollment_quality: quality,
        sample_count: audioBlobs.length,
        is_active: true,
      };

      const { data, error } = await supabase
        .from("voice_auth_enrollments")
        .upsert(upsertData, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      
      setEnrollment(data);
      
      // Log enrollment
      const logEntry: VoiceAuthLogInsert = {
        user_id: user.id,
        action: "enrollment",
        confidence: quality,
        device_info: { userAgent: navigator.userAgent },
      };
      await supabase.from("voice_auth_log").insert(logEntry);

      toast.success(`Voice ID cadastrado! Qualidade: ${Math.round(quality * 100)}%`);
      return true;
    } catch (e) {
      console.error("Voice enrollment error:", e);
      toast.error("Erro ao cadastrar Voice ID");
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const verify = useCallback(async (audioBlob: Blob): Promise<{ match: boolean; confidence: number }> => {
    if (!enrollment?.voice_features) return { match: false, confidence: 0 };

    try {
      const features = await extractVoiceFeatures(audioBlob);
      const enrolledFeatures = parseVoiceFeatures(enrollment.voice_features);
      const similarity = compareFeatures(features, enrolledFeatures);
      
      // Threshold raised from 0.65 to 0.78 to prevent false positives
      const threshold = 0.78;
      const match = similarity >= threshold;

      // Log verification
      const logEntry: VoiceAuthLogInsert = {
        user_id: user?.id,
        action: match ? "verification_success" : "verification_failed",
        confidence: similarity,
        device_info: { userAgent: navigator.userAgent },
      };
      await supabase.from("voice_auth_log").insert(logEntry);

      // Update enrollment stats
      if (match) {
        const matchUpdate: VoiceEnrollmentUpdate = {
          verification_count: (enrollment.verification_count || 0) + 1,
          last_verified_at: new Date().toISOString(),
          failed_attempts: 0,
        };
        await supabase.from("voice_auth_enrollments")
          .update(matchUpdate)
          .eq("id", enrollment.id);
      } else {
        const newFailed = (enrollment.failed_attempts || 0) + 1;
        const failUpdate: VoiceEnrollmentUpdate = { failed_attempts: newFailed };
        if (newFailed >= 5) {
          failUpdate.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        }
        await supabase.from("voice_auth_enrollments")
          .update(failUpdate)
          .eq("id", enrollment.id);
      }

      return { match, confidence: similarity };
    } catch (e) {
      console.error("Voice verification error:", e);
      return { match: false, confidence: 0 };
    }
  }, [enrollment, user?.id]);

  const deleteEnrollment = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from("voice_auth_enrollments")
      .delete()
      .eq("user_id", user.id);
    setEnrollment(null);
    toast.success("Voice ID removido");
  }, [user?.id]);

  return {
    enrollment,
    loading,
    recording,
    loadEnrollment,
    startRecording,
    stopRecording,
    enroll,
    verify,
    deleteEnrollment,
  };
}
