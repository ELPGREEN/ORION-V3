import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNeuralConfig } from "@/hooks/useNeuralConfig";
import { isOwnerEmail } from "@/lib/neural/orion-consciousness";
import { toast } from "sonner";

export interface VoiceSample {
  id: string;
  blob: Blob | null;
  url: string;
  duration: number;
  storagePath?: string;
  persisted: boolean;
}

const GUIDE_PHRASES = [
  "Olá, eu sou o Orion, seu assistente inteligente. Estou aqui para te ajudar.",
  "O direito é a arte do bom e do justo, como dizia Celso na Roma antiga.",
  "Vamos analisar os documentos do processo e preparar a petição inicial.",
  "A inteligência artificial está transformando a forma como trabalhamos.",
  "Bom dia! Como posso te ajudar hoje? Estou pronto para qualquer tarefa.",
];

export function useOrionVoiceClone() {
  const { user } = useAuth();
  const { config, updateConfig } = useNeuralConfig();
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const isCreator = isOwnerEmail(user?.email);
  const currentPhrase = GUIDE_PHRASES[Math.min(samples.length, GUIDE_PHRASES.length - 1)];
  const hasClonedVoice = !!(config as any)?.orion_voice_id;
  const clonedVoiceId = (config as any)?.orion_voice_id as string | undefined;

  // Load persisted samples from DB on mount
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadSamples = async () => {
      setIsLoadingSamples(true);
      try {
        const { data, error } = await supabase
          .from("orion_voice_samples")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error || !data || cancelled) return;

        const loaded: VoiceSample[] = data.map((row: any) => ({
          id: row.id,
          blob: null,
          url: "",
          duration: row.duration_ms || 0,
          storagePath: row.sample_url,
          persisted: true,
        }));

        setSamples((prev) => {
          // Merge: keep in-memory samples not yet persisted, add DB ones
          const inMemory = prev.filter((s) => !s.persisted);
          const dbIds = new Set(loaded.map((s) => s.id));
          const unique = inMemory.filter((s) => !dbIds.has(s.id));
          return [...loaded, ...unique];
        });
      } catch (err) {
        console.error("Load samples error:", err);
      } finally {
        if (!cancelled) setIsLoadingSamples(false);
      }
    };

    loadSamples();
    return () => { cancelled = true; };
  }, [user?.id]);

  const uploadSampleToStorage = useCallback(async (blob: Blob, sampleId: string, duration: number) => {
    if (!user?.id) return null;
    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const path = `${user.id}/sample_${timestamp}.webm`;

      const { error: uploadError } = await supabase.storage
        .from("orion-voice-samples")
        .upload(path, blob, { contentType: "audio/webm", upsert: false });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        toast.error("Erro ao salvar amostra no Storage");
        return null;
      }

      // Register in DB
      const { error: dbError } = await supabase
        .from("orion_voice_samples")
        .insert({
          id: sampleId,
          user_id: user.id,
          sample_url: path,
          duration_ms: duration,
        });

      if (dbError) {
        console.error("DB insert error:", dbError);
      }

      return path;
    } catch (err) {
      console.error("Upload error:", err);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [user?.id]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      startTimeRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const duration = Date.now() - startTimeRef.current;
        const url = URL.createObjectURL(blob);
        const id = crypto.randomUUID();

        const newSample: VoiceSample = { id, blob, url, duration, persisted: false };
        setSamples((prev) => [...prev, newSample]);
        stream.getTracks().forEach((t) => t.stop());

        // Auto-upload to Storage
        const storagePath = await uploadSampleToStorage(blob, id, duration);
        if (storagePath) {
          setSamples((prev) =>
            prev.map((s) => s.id === id ? { ...s, storagePath, persisted: true } : s)
          );
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Não foi possível acessar o microfone");
    }
  }, [uploadSampleToStorage]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  const removeSample = useCallback(async (id: string) => {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;

    // Revoke object URL
    if (sample.url) URL.revokeObjectURL(sample.url);

    // Delete from Storage
    if (sample.storagePath) {
      await supabase.storage
        .from("orion-voice-samples")
        .remove([sample.storagePath]);
    }

    // Delete from DB
    await supabase.from("orion_voice_samples").delete().eq("id", id);

    setSamples((prev) => prev.filter((s) => s.id !== id));
  }, [samples]);

  const cloneVoice = useCallback(async () => {
    if (!user?.id || samples.length < 1) {
      toast.error("Grave pelo menos 1 amostra de voz");
      return;
    }

    setIsCloning(true);
    try {
      // Voice samples are saved in Supabase Storage for voice profile reference.
      // TTS uses Google Gemini 2.5 Flash Preview TTS (100% gratuito, 7-key rotation).
      // Available voices: Zephyr, Puck, Charon, Kore, Fenrir, Leda, Orus, Aoede.
      const persistedCount = samples.filter((s) => s.persisted).length;
      
      if (persistedCount < 1) {
        toast.error("Aguarde o upload das amostras finalizar");
        return;
      }

      // Select voice based on user profile — creator gets special voice
      const selectedVoice = isCreator ? "Charon" : "Puck";
      const profileId = `gemini_${selectedVoice}_${user.id.slice(0, 8)}_${Date.now()}`;
      const saved = await updateConfig({ orion_voice_id: profileId } as any);
      
      if (saved) {
        toast.success(
          isCreator
            ? `Perfil vocal Gemini "${selectedVoice}" do criador registrado!`
            : `Perfil vocal Gemini "${selectedVoice}" registrado! Orion usará voz neural.`
        );
      }

      return profileId;
    } catch (err: any) {
      console.error("Clone error:", err);
      toast.error(err.message || "Erro ao registrar perfil vocal");
    } finally {
      setIsCloning(false);
    }
  }, [user?.id, samples, updateConfig, isCreator]);

  const testVoice = useCallback(async (text?: string) => {
    setIsTesting(true);
    try {
      // Extract Gemini voice from profile ID (e.g., "gemini_Charon_abc12345_...")
      const voiceFromProfile = clonedVoiceId?.startsWith("gemini_")
        ? clonedVoiceId.split("_")[1]
        : "Charon";

      // Primary: Gemini TTS (free, neural quality)
      let response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: text || "Olá! Eu sou o Orion, seu assistente neural. Minha voz é gerada pelo Google Gemini, totalmente gratuita.",
            voice: voiceFromProfile,
          }),
        }
      );

      // Check if Gemini returned audio or fallback signal
      const contentType = response.headers.get("Content-Type") || "";
      if (!response.ok || !contentType.includes("audio")) {
        console.warn("[TestVoice] Gemini TTS unavailable, falling back to Google Translate TTS");
        // Fallback: Google Translate TTS (always works)
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: text || "Olá! Eu sou o Orion, seu assistente neural.",
              lang: "pt-br",
            }),
          }
        );
      }

      const finalContentType = response.headers.get("Content-Type") || "";
      if (finalContentType.includes("audio")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
      } else {
        toast.error("Falha ao reproduzir voz");
      }
    } catch (err) {
      console.error("Test voice error:", err);
      toast.error("Erro ao testar voz");
    } finally {
      setIsTesting(false);
    }
  }, [clonedVoiceId]);

  const deleteClonedVoice = useCallback(async () => {
    if (!clonedVoiceId) return;

    try {
      // Clean up all samples from Storage and DB
      if (user?.id) {
        const { data: dbSamples } = await supabase
          .from("orion_voice_samples")
          .select("sample_url")
          .eq("user_id", user.id);

        if (dbSamples?.length) {
          const paths = dbSamples.map((s: any) => s.sample_url).filter(Boolean);
          if (paths.length) {
            await supabase.storage.from("orion-voice-samples").remove(paths);
          }
        }

        await supabase.from("orion_voice_samples").delete().eq("user_id", user.id);
      }

      await updateConfig({ orion_voice_id: null } as any);
      setSamples([]);
      toast.success("Perfil vocal removido");
    } catch (err) {
      console.error("Delete voice error:", err);
      toast.error("Erro ao remover perfil vocal");
    }
  }, [clonedVoiceId, updateConfig, user?.id]);

  return {
    samples,
    isRecording,
    isCloning,
    isTesting,
    isUploading,
    isLoadingSamples,
    isCreator,
    hasClonedVoice,
    clonedVoiceId,
    currentPhrase,
    guideTotal: GUIDE_PHRASES.length,
    startRecording,
    stopRecording,
    removeSample,
    cloneVoice,
    testVoice,
    deleteClonedVoice,
  };
}
