/**
 * useVoiceIdentityGuard — Voice identity verification for Orion sessions.
 * 
 * When someone interacts with Orion, this hook checks if the voice matches
 * the enrolled owner. If not, it triggers a guest flow where the person
 * identifies themselves and their interactions are logged for the owner.
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface VoiceFeatures {
  mfcc_mean: number[];
  pitch_mean: number;
  pitch_std: number;
  energy_mean: number;
  spectral_centroid: number;
  zero_crossing_rate: number;
  speaking_rate: number;
}

export type IdentityStatus = "unknown" | "verifying" | "owner" | "guest" | "no_enrollment";

export interface GuestSession {
  id?: string;
  guestName: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  startedAt: string;
}

export function useVoiceIdentityGuard() {
  const { user } = useAuth();
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>("unknown");
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isCheckingVoice, setIsCheckingVoice] = useState(false);
  const guestSessionIdRef = useRef<string | null>(null);

  /** Extract voice features from audio blob (mirrors useVoiceAuth logic) */
  const extractFeatures = useCallback(async (audioBlob: Blob): Promise<VoiceFeatures> => {
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    const channelData = audioBuffer.getChannelData(0);

    const frameSize = 512;
    const hopSize = 256;
    const numFrames = Math.floor((channelData.length - frameSize) / hopSize);

    // Pitch
    let pitchValues: number[] = [];
    for (let i = 0; i < Math.min(numFrames, 100); i++) {
      const start = i * hopSize;
      const frame = channelData.slice(start, start + frameSize);
      const pitch = estimatePitch(frame, 16000);
      if (pitch > 50 && pitch < 500) pitchValues.push(pitch);
    }

    // Energy
    let energySum = 0;
    for (let i = 0; i < channelData.length; i++) energySum += channelData[i] ** 2;

    // ZCR
    let zc = 0;
    for (let i = 1; i < channelData.length; i++) {
      if ((channelData[i] >= 0) !== (channelData[i - 1] >= 0)) zc++;
    }

    // MFCC proxy
    const mfcc: number[] = [];
    const bandSize = Math.floor(channelData.length / 13);
    for (let i = 0; i < 13; i++) {
      let sum = 0;
      for (let j = i * bandSize; j < (i + 1) * bandSize && j < channelData.length; j++) sum += Math.abs(channelData[j]);
      mfcc.push(sum / bandSize);
    }

    // Speaking rate
    const windowSize = Math.floor(16000 * 0.02);
    const energies: number[] = [];
    for (let i = 0; i < channelData.length; i += windowSize) {
      let e = 0;
      for (let j = i; j < Math.min(i + windowSize, channelData.length); j++) e += channelData[j] ** 2;
      energies.push(e / windowSize);
    }
    const threshold = (energies.reduce((a, b) => a + b, 0) / energies.length) * 1.5;
    let peaks = 0, inPeak = false;
    for (const e of energies) {
      if (e > threshold && !inPeak) { peaks++; inPeak = true; }
      if (e < threshold) inPeak = false;
    }

    audioContext.close();

    return {
      mfcc_mean: mfcc,
      pitch_mean: pitchValues.length > 0 ? pitchValues.reduce((a, b) => a + b, 0) / pitchValues.length : 0,
      pitch_std: pitchValues.length > 1 ? Math.sqrt(pitchValues.reduce((s, v, _, a) => s + (v - a.reduce((x, y) => x + y, 0) / a.length) ** 2, 0) / pitchValues.length) : 0,
      energy_mean: energySum / channelData.length,
      spectral_centroid: 0,
      zero_crossing_rate: zc / channelData.length,
      speaking_rate: channelData.length / 16000 > 0 ? peaks / (channelData.length / 16000) : 0,
    };
  }, []);

  /** Compare features — returns similarity 0-1 */
  const compareFeatures = useCallback((a: VoiceFeatures, b: VoiceFeatures): number => {
    let score = 0, weights = 0;

    if (a.mfcc_mean.length === b.mfcc_mean.length && a.mfcc_mean.length > 0) {
      let dist = 0;
      for (let i = 0; i < a.mfcc_mean.length; i++) dist += Math.abs(a.mfcc_mean[i] - b.mfcc_mean[i]);
      score += Math.max(0, 1 - dist / a.mfcc_mean.length) * 4;
      weights += 4;
    }
    if (a.pitch_mean > 0 && b.pitch_mean > 0) {
      score += Math.max(0, 1 - Math.abs(a.pitch_mean - b.pitch_mean) / Math.max(a.pitch_mean, b.pitch_mean)) * 3;
      weights += 3;
    }
    if (a.energy_mean > 0 && b.energy_mean > 0) {
      score += Math.max(0, 1 - Math.abs(a.energy_mean - b.energy_mean) / Math.max(a.energy_mean, b.energy_mean));
      weights += 1;
    }
    score += Math.max(0, 1 - Math.abs(a.zero_crossing_rate - b.zero_crossing_rate) / Math.max(a.zero_crossing_rate, b.zero_crossing_rate, 0.001));
    weights += 1;
    if (a.speaking_rate > 0 && b.speaking_rate > 0) {
      score += Math.max(0, 1 - Math.abs(a.speaking_rate - b.speaking_rate) / Math.max(a.speaking_rate, b.speaking_rate));
      weights += 1;
    }
    return weights > 0 ? score / weights : 0;
  }, []);

  /** Check if voice matches owner enrollment */
  const verifyVoiceIdentity = useCallback(async (audioBlob: Blob): Promise<IdentityStatus> => {
    if (!user?.id) return "unknown";
    setIsCheckingVoice(true);

    try {
      // Load owner's enrollment
      const { data: enrollment } = await supabase
        .from("voice_auth_enrollments")
        .select("voice_features")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!enrollment?.voice_features) {
        setIdentityStatus("no_enrollment");
        setIsCheckingVoice(false);
        return "no_enrollment";
      }

      const features = await extractFeatures(audioBlob);
      const enrolledFeatures = enrollment.voice_features as unknown as VoiceFeatures;
      const similarity = compareFeatures(features, enrolledFeatures);

      const threshold = 0.60;
      if (similarity >= threshold) {
        setIdentityStatus("owner");
        setIsCheckingVoice(false);
        return "owner";
      }

      setIdentityStatus("guest");
      setIsCheckingVoice(false);
      return "guest";
    } catch (e) {
      console.error("[VoiceGuard] Error:", e);
      setIdentityStatus("unknown");
      setIsCheckingVoice(false);
      return "unknown";
    }
  }, [user?.id, extractFeatures, compareFeatures]);

  /** Register a guest session */
  const startGuestSession = useCallback(async (guestName: string, voiceBlob?: Blob) => {
    if (!user?.id) return;

    let voiceFeatures = null;
    if (voiceBlob) {
      try {
        voiceFeatures = await extractFeatures(voiceBlob);
      } catch { /* ignore */ }
    }

    const session: GuestSession = {
      guestName,
      messages: [],
      startedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("voice_guest_sessions")
      .insert({
        owner_user_id: user.id,
        guest_name: guestName,
        voice_features: voiceFeatures as any,
        messages: [] as any,
        device_info: { userAgent: navigator.userAgent } as any,
        is_active: true,
      })
      .select("id")
      .single();

    if (!error && data) {
      session.id = data.id;
      guestSessionIdRef.current = data.id;
    }

    setGuestSession(session);
    toast.info(`Sessão de visitante iniciada: ${guestName}`);
  }, [user?.id, extractFeatures]);

  /** Add a message to the current guest session */
  const addGuestMessage = useCallback(async (role: string, content: string) => {
    if (!guestSession || !guestSessionIdRef.current) return;

    const msg = { role, content, timestamp: new Date().toISOString() };
    const updatedMessages = [...guestSession.messages, msg];

    setGuestSession(prev => prev ? { ...prev, messages: updatedMessages } : null);

    await supabase
      .from("voice_guest_sessions")
      .update({ messages: updatedMessages as any })
      .eq("id", guestSessionIdRef.current);
  }, [guestSession]);

  /** End guest session */
  const endGuestSession = useCallback(async () => {
    if (guestSessionIdRef.current) {
      await supabase
        .from("voice_guest_sessions")
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq("id", guestSessionIdRef.current);
    }
    guestSessionIdRef.current = null;
    setGuestSession(null);
    setIdentityStatus("unknown");
  }, []);

  /** Owner: fetch all guest sessions */
  const fetchGuestSessions = useCallback(async () => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from("voice_guest_sessions")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  }, [user?.id]);

  /** Reset to allow re-verification */
  const resetIdentity = useCallback(() => {
    setIdentityStatus("unknown");
    setGuestSession(null);
    guestSessionIdRef.current = null;
  }, []);

  return {
    identityStatus,
    guestSession,
    isCheckingVoice,
    verifyVoiceIdentity,
    startGuestSession,
    addGuestMessage,
    endGuestSession,
    fetchGuestSessions,
    resetIdentity,
    setIdentityStatus,
  };
}

function estimatePitch(frame: Float32Array, sampleRate: number): number {
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 50);
  let bestCorr = -1, bestLag = minLag;
  for (let lag = minLag; lag < Math.min(maxLag, frame.length); lag++) {
    let corr = 0;
    for (let i = 0; i < frame.length - lag; i++) corr += frame[i] * frame[i + lag];
    if (corr > bestCorr) { bestCorr = corr; bestLag = lag; }
  }
  return sampleRate / bestLag;
}
