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
}

// Extract audio features locally using Web Audio API
async function extractVoiceFeatures(audioBlob: Blob): Promise<VoiceFeatures> {
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  
  const frameSize = 512;
  const hopSize = 256;
  const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

  // Simple pitch estimation via autocorrelation
  let pitchValues: number[] = [];
  for (let i = 0; i < Math.min(numFrames, 100); i++) {
    const start = i * hopSize;
    const frame = channelData.slice(start, start + frameSize);
    const pitch = estimatePitch(frame, audioContext.sampleRate);
    if (pitch > 50 && pitch < 500) pitchValues.push(pitch);
  }

  // Energy
  let energySum = 0;
  for (let i = 0; i < channelData.length; i++) {
    energySum += channelData[i] * channelData[i];
  }
  const energyMean = energySum / channelData.length;

  // Zero crossing rate
  let zeroCrossings = 0;
  for (let i = 1; i < channelData.length; i++) {
    if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zeroCrossings++;
  }
  const zcr = zeroCrossings / channelData.length;

  // Spectral centroid (simplified)
  const fftSize = 2048;
  
  // Manual DFT approximation for spectral centroid
  let weightedSum = 0, magSum = 0;
  for (let k = 0; k < Math.min(256, channelData.length); k++) {
    let real = 0, imag = 0;
    for (let n = 0; n < Math.min(fftSize, channelData.length); n++) {
      const angle = (2 * Math.PI * k * n) / fftSize;
      real += channelData[n] * Math.cos(angle);
      imag -= channelData[n] * Math.sin(angle);
    }
    const mag = Math.sqrt(real * real + imag * imag);
    const freq = (k * audioContext.sampleRate) / fftSize;
    weightedSum += freq * mag;
    magSum += mag;
  }
  const spectralCentroid = magSum > 0 ? weightedSum / magSum : 0;

  // Simple MFCC approximation (13 coefficients)
  const mfcc = computeSimpleMFCC(channelData, audioContext.sampleRate);

  // Speaking rate estimation (syllables per second approximation)
  const speakingRate = estimateSpeakingRate(channelData, audioContext.sampleRate);

  audioContext.close();

  return {
    mfcc_mean: mfcc,
    pitch_mean: pitchValues.length > 0 ? pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length : 0,
    pitch_std: pitchValues.length > 1 ? Math.sqrt(pitchValues.reduce((s, v) => s + (v - (pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length)) ** 2, 0) / pitchValues.length) : 0,
    energy_mean: energyMean,
    spectral_centroid: spectralCentroid,
    zero_crossing_rate: zcr,
    speaking_rate: speakingRate,
  };
}

function estimatePitch(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);
  let bestCorr = -1, bestLag = minLag;
  
  for (let lag = minLag; lag < Math.min(maxLag, frame.length); lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) {
      corr += frame[i] * frame[i + lag];
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }
  return sampleRate / bestLag;
}

function computeSimpleMFCC(data: Float32Array, sampleRate: number): number[] {
  // Simplified: compute 13 spectral band energies as proxy for MFCC
  const coefficients: number[] = [];
  const bandSize = Math.floor(data.length / 13);
  for (let i = 0; i < 13; i++) {
    let sum = 0;
    for (let j = i * bandSize; j < (i + 1) * bandSize && j < data.length; j++) {
      sum += Math.abs(data[j]);
    }
    coefficients.push(sum / bandSize);
  }
  return coefficients;
}

function estimateSpeakingRate(data: Float32Array, sampleRate: number): number {
  // Count energy peaks as syllable proxy
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

// Compare two feature sets — returns similarity 0-1
function compareFeatures(a: VoiceFeatures, b: VoiceFeatures): number {
  let score = 0;
  let weights = 0;

  // MFCC similarity (highest weight)
  if (a.mfcc_mean.length === b.mfcc_mean.length && a.mfcc_mean.length > 0) {
    let mfccDist = 0;
    for (let i = 0; i < a.mfcc_mean.length; i++) {
      mfccDist += Math.abs(a.mfcc_mean[i] - b.mfcc_mean[i]);
    }
    const mfccSim = Math.max(0, 1 - mfccDist / a.mfcc_mean.length);
    score += mfccSim * 4;
    weights += 4;
  }

  // Pitch similarity
  if (a.pitch_mean > 0 && b.pitch_mean > 0) {
    const pitchSim = 1 - Math.abs(a.pitch_mean - b.pitch_mean) / Math.max(a.pitch_mean, b.pitch_mean);
    score += Math.max(0, pitchSim) * 3;
    weights += 3;
  }

  // Energy similarity
  if (a.energy_mean > 0 && b.energy_mean > 0) {
    const energySim = 1 - Math.abs(a.energy_mean - b.energy_mean) / Math.max(a.energy_mean, b.energy_mean);
    score += Math.max(0, energySim) * 1;
    weights += 1;
  }

  // ZCR similarity
  const zcrSim = 1 - Math.abs(a.zero_crossing_rate - b.zero_crossing_rate) / Math.max(a.zero_crossing_rate, b.zero_crossing_rate, 0.001);
  score += Math.max(0, zcrSim) * 1;
  weights += 1;

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
      const threshold = 0.65;
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
