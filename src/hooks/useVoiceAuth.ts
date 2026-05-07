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

  const startRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 16000 }
      }).then(stream => {
        const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType: mime });
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mime });
          stream.getTracks().forEach(t => t.stop());
          resolve(blob);
        };
        recorder.onerror = (e) => reject(e);
        recorder.start();
        setMediaRecorder(recorder);
        setRecording(true);
      }).catch(reject);
    });
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  }, [mediaRecorder, recording]);

  const enroll = useCallback(async (phrase: string) => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const blob = await startRecording();
      // Record for 3 seconds
      await new Promise(r => setTimeout(r, 3000));
      stopRecording();
      
      const features = await extractVoiceFeaturesFromBlob(blob);
      const { error } = await supabase
        .from("voice_auth_enrollments")
        .upsert({
          user_id: user.id,
          phrase,
          voice_features: features as any,
          updated_at: new Date().toISOString()
        } as VoiceEnrollmentInsert);

      if (error) throw error;
      toast.success("Voz cadastrada com sucesso!");
      loadEnrollment();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao cadastrar voz.");
    } finally {
      setLoading(false);
    }
  }, [user?.id, startRecording, stopRecording, loadEnrollment]);

  const verify = useCallback(async (phrase: string): Promise<boolean> => {
    if (!user?.id || !enrollment) return false;
    setLoading(true);
    try {
      const blob = await startRecording();
      await new Promise(r => setTimeout(r, 3000));
      stopRecording();

      const features = await extractVoiceFeaturesFromBlob(blob);
      const enrolledFeatures = parseVoiceFeatures(enrollment.voice_features);

      const score = compareFeaturesStatic(features, enrolledFeatures);
      const success = score > 0.8;

      await supabase.from("voice_auth_log").insert({
        user_id: user.id,
        enrollment_id: enrollment.id,
        score,
        success,
        metadata: { phrase }
      } as VoiceAuthLogInsert);

      return success;
    } catch (err) {
      console.error(err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.id, enrollment, startRecording, stopRecording]);

  return {
    enrollment,
    loading,
    recording,
    loadEnrollment,
    enroll,
    verify,
    stopRecording
  };
}
