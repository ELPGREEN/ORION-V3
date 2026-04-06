import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import {
  extractVoiceFeaturesFromBlob,
  compareFeaturesStatic,
  parseVoiceFeatures,
  type VoiceFeatures,
} from "@/lib/voice/voiceFeatureEngine";

type VoiceEnrollmentRow = Database["public"]["Tables"]["voice_auth_enrollments"]["Row"];
type VoiceEnrollmentInsert = Database["public"]["Tables"]["voice_auth_enrollments"]["Insert"];
type VoiceEnrollmentUpdate = Database["public"]["Tables"]["voice_auth_enrollments"]["Update"];
type VoiceAuthLogInsert = Database["public"]["Tables"]["voice_auth_log"]["Insert"];

export type VoiceEnrollment = VoiceEnrollmentRow;
export type { VoiceFeatures };

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

      const allFeatures = await Promise.all(audioBlobs.map(extractVoiceFeaturesFromBlob));
      
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

      let totalSim = 0, pairs = 0;
      for (let i = 0; i < allFeatures.length; i++) {
        for (let j = i + 1; j < allFeatures.length; j++) {
          totalSim += compareFeaturesStatic(allFeatures[i], allFeatures[j]);
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
      const features = await extractVoiceFeaturesFromBlob(audioBlob);
      const enrolledFeatures = parseVoiceFeatures(enrollment.voice_features);
      const similarity = compareFeaturesStatic(features, enrolledFeatures);
      const threshold = 0.78;
      const match = similarity >= threshold;

      const logEntry: VoiceAuthLogInsert = {
        user_id: user?.id,
        action: match ? "verification_success" : "verification_failed",
        confidence: similarity,
        device_info: { userAgent: navigator.userAgent },
      };
      await supabase.from("voice_auth_log").insert(logEntry);

      if (match) {
        const matchUpdate: VoiceEnrollmentUpdate = {
          verification_count: (enrollment.verification_count || 0) + 1,
          last_verified_at: new Date().toISOString(),
          failed_attempts: 0,
        };
        await supabase.from("voice_auth_enrollments").update(matchUpdate).eq("id", enrollment.id);
      } else {
        const newFailed = (enrollment.failed_attempts || 0) + 1;
        const failUpdate: VoiceEnrollmentUpdate = { failed_attempts: newFailed };
        if (newFailed >= 5) failUpdate.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await supabase.from("voice_auth_enrollments").update(failUpdate).eq("id", enrollment.id);
      }

      return { match, confidence: similarity };
    } catch (e) {
      console.error("Voice verification error:", e);
      return { match: false, confidence: 0 };
    }
  }, [enrollment, user?.id]);

  const deleteEnrollment = useCallback(async () => {
    if (!user?.id) return;
    await supabase.from("voice_auth_enrollments").delete().eq("user_id", user.id);
    setEnrollment(null);
    toast.success("Voice ID removido");
  }, [user?.id]);

  return {
    enrollment, loading, recording,
    loadEnrollment, startRecording, stopRecording,
    enroll, verify, deleteEnrollment,
  };
}
