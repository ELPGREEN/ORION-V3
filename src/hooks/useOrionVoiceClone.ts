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

// Guided phrases for voice cloning — user reads these aloud
const GUIDE_PHRASES = [
  "Olá, eu sou o Orion, seu assistente inteligente. Estou aqui para te ajudar.",
  "O direito é a arte do bom e do justo, como dizia Celso na Roma antiga.",
  "Vamos analisar os documentos do processo e preparar a petição inicial.",
  "A inteligência artificial está transformando a forma como trabalhamos.",
  "Bom dia! Como posso te ajudar hoje? Estou pronto para qualquer tarefa.",
];

// Voice clone command patterns (detected by STT)
export const VOICE_CLONE_COMMANDS = [
  /clone?\s*(minha|a\s*minha)?\s*voz/i,
  /clon[ae]r?\s*(minha|a\s*minha)?\s*voz/i,
  /orion.*clone?\s*(minha)?\s*voz/i,
  /quero\s*(que\s*)?us[ae]\s*(minha|a\s*minha)\s*voz/i,
  /configur[ae]r?\s*(minha|a)?\s*voz/i,
  /gravar?\s*(minha|a)?\s*voz/i,
];

/**
 * Check if a text matches a voice clone command
 */
export function isVoiceCloneCommand(text: string): boolean {
  return VOICE_CLONE_COMMANDS.some((pattern) => pattern.test(text));
}

/**
 * Voice cloning states for the guided flow
 */
export type CloneFlowStep =
  | "idle"            // Not cloning
  | "intro"           // Orion explains the process
  | "recording"       // User is recording a sample
  | "reviewing"       // User reviews samples
  | "processing"      // Fish Speech is processing
  | "testing"         // Testing the cloned voice
  | "complete";       // Done!

export function useOrionVoiceClone() {
  const { user } = useAuth();
  const { config, updateConfig } = useNeuralConfig();
  const [samples, setSamples] = useState<VoiceSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingSamples, setIsLoadingSamples] = useState(false);
  const [cloneFlowStep, setCloneFlowStep] = useState<CloneFlowStep>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);

  const isCreator = isOwnerEmail(user?.email);
  const currentPhrase = GUIDE_PHRASES[Math.min(samples.length, GUIDE_PHRASES.length - 1)];
  const hasClonedVoice = !!(config as any)?.orion_voice_id;
  const clonedVoiceId = (config as any)?.orion_voice_id as string | undefined;
  
  // Check if current voice is a Fish Speech clone
  const isFishClone = clonedVoiceId?.startsWith("fish_clone_") ?? false;
  // Extract reference audio path from voice ID
  const cloneRefPath = isFishClone
    ? clonedVoiceId!.split("__path__")[1] || null
    : null;

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
      if (cloneFlowStep === "intro") setCloneFlowStep("recording");
    } catch (err) {
      console.error("Mic error:", err);
      toast.error("Não foi possível acessar o microfone");
    }
  }, [uploadSampleToStorage, cloneFlowStep]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (cloneFlowStep === "recording") setCloneFlowStep("reviewing");
    }
  }, [cloneFlowStep]);

  const removeSample = useCallback(async (id: string) => {
    const sample = samples.find((s) => s.id === id);
    if (!sample) return;

    if (sample.url) URL.revokeObjectURL(sample.url);

    if (sample.storagePath) {
      await supabase.storage
        .from("orion-voice-samples")
        .remove([sample.storagePath]);
    }

    await supabase.from("orion_voice_samples").delete().eq("id", id);
    setSamples((prev) => prev.filter((s) => s.id !== id));
  }, [samples]);

  /**
   * Start the voice clone flow — called when user says "Orion, clone minha voz"
   * Returns the intro message for Orion to speak
   */
  const startCloneFlow = useCallback((): string => {
    setCloneFlowStep("intro");
    return isCreator
      ? "Ericson! Vou configurar minha voz com a sua. Preciso que você leia algumas frases em voz alta. " +
        "Cada gravação deve ter entre 10 e 30 segundos. Quanto mais natural, melhor o resultado. " +
        `Quando estiver pronto, clique em gravar e leia: "${GUIDE_PHRASES[0]}"`
      : "Vamos clonar sua voz para que eu passe a usá-la! " +
        "Preciso de pelo menos uma gravação de 10 a 30 segundos. " +
        `Quando estiver pronto, clique em gravar e leia: "${GUIDE_PHRASES[0]}"`;
  }, [isCreator]);

  /**
   * Clone voice using Fish Speech — saves reference for zero-shot TTS
   */
  const cloneVoice = useCallback(async () => {
    if (!user?.id || samples.length < 1) {
      toast.error("Grave pelo menos 1 amostra de voz (10-30 segundos)");
      return;
    }

    setIsCloning(true);
    setCloneFlowStep("processing");
    try {
      // Find the best persisted sample (longest, for best cloning quality)
      const persistedSamples = samples
        .filter((s) => s.persisted && s.storagePath)
        .sort((a, b) => b.duration - a.duration);

      if (persistedSamples.length < 1) {
        toast.error("Aguarde o upload das amostras finalizar");
        setCloneFlowStep("reviewing");
        return;
      }

      const bestSample = persistedSamples[0];
      const refPath = bestSample.storagePath!;

      // Verify the clone works by doing a test synthesis
      toast.info("Processando sua voz com Fish Speech... Isso pode levar alguns segundos.");

      const testResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fish-speech-clone`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            text: "Clonagem de voz concluída com sucesso!",
            reference_storage_path: refPath,
            reference_text: GUIDE_PHRASES[0],
          }),
        }
      );

      const contentType = testResponse.headers.get("Content-Type") || "";
      const cloneWorked = contentType.includes("audio/");

      // Save voice profile with reference path encoded in the ID
      // Format: fish_clone_{userId8}_{timestamp}__path__{storagePath}
      const profileId = `fish_clone_${user.id.slice(0, 8)}_${Date.now()}__path__${refPath}`;
      const saved = await updateConfig({ orion_voice_id: profileId } as any);

      if (saved) {
        if (cloneWorked) {
          // Play the test audio
          const blob = await testResponse.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();

          toast.success(
            isCreator
              ? "🎙️ Voz do criador Ericson clonada! O Orion agora fala com sua voz."
              : "🎙️ Voz clonada com sucesso! O Orion agora fala com sua voz."
          );
          setCloneFlowStep("complete");
        } else {
          // Clone saved but Fish Speech wasn't available right now — will retry on TTS calls
          toast.success(
            "Perfil vocal salvo! O Fish Speech processará sua voz na próxima fala. " +
            "Enquanto isso, o Gemini TTS será usado como fallback."
          );
          setCloneFlowStep("complete");
        }
      }

      return profileId;
    } catch (err: any) {
      console.error("Clone error:", err);
      toast.error(err.message || "Erro ao clonar voz");
      setCloneFlowStep("reviewing");
    } finally {
      setIsCloning(false);
    }
  }, [user?.id, samples, updateConfig, isCreator]);

  /**
   * Test the cloned voice (or Gemini TTS fallback)
   */
  const testVoice = useCallback(async (text?: string) => {
    setIsTesting(true);
    setCloneFlowStep("testing");
    try {
      const testText = text || "Olá! Esta é a minha voz clonada pelo Fish Speech. Está natural?";

      // If we have a Fish Speech clone, use it
      if (isFishClone && cloneRefPath) {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fish-speech-clone`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              text: testText,
              reference_storage_path: cloneRefPath,
              reference_text: GUIDE_PHRASES[0],
            }),
          }
        );

        const contentType = response.headers.get("Content-Type") || "";
        if (contentType.includes("audio/")) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();
          return;
        }
        console.warn("[TestVoice] Fish clone unavailable, falling back to Gemini");
      }

      // Fallback: Gemini TTS
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
            text: testText,
            voice: "Charon",
          }),
        }
      );

      let contentType = response.headers.get("Content-Type") || "";
      if (!response.ok || !contentType.includes("audio")) {
        // Last fallback: Google Translate TTS
        response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-tts`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({ text: testText, lang: "pt-br" }),
          }
        );
        contentType = response.headers.get("Content-Type") || "";
      }

      if (contentType.includes("audio")) {
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
  }, [clonedVoiceId, isFishClone, cloneRefPath]);

  const deleteClonedVoice = useCallback(async () => {
    if (!clonedVoiceId) return;

    try {
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
      setCloneFlowStep("idle");
      toast.success("Voz clonada removida. Orion voltará a usar Gemini TTS.");
    } catch (err) {
      console.error("Delete voice error:", err);
      toast.error("Erro ao remover voz clonada");
    }
  }, [clonedVoiceId, updateConfig, user?.id]);

  /**
   * Get the next instruction for the guided clone flow
   */
  const getFlowInstruction = useCallback((): string => {
    switch (cloneFlowStep) {
      case "intro":
        return `Leia a frase a seguir em voz alta e natural: "${currentPhrase}"`;
      case "recording":
        return "Estou gravando... Continue lendo a frase naturalmente.";
      case "reviewing":
        if (samples.length < 1) return "Nenhuma gravação feita. Clique em gravar para começar.";
        if (samples.filter(s => s.persisted).length < 1) return "Aguardando upload...";
        return samples.length >= 3
          ? `Ótimo! Você tem ${samples.length} amostras. Clique em 'Clonar Voz' para finalizar, ou grave mais para melhor qualidade.`
          : `Você tem ${samples.length} amostra(s). Recomendo pelo menos 3 para melhor qualidade. Grave mais ou clique em 'Clonar Voz'.`;
      case "processing":
        return "Processando sua voz com Fish Speech... Isso pode levar alguns segundos.";
      case "testing":
        return "Testando a voz clonada...";
      case "complete":
        return "Pronto! Sua voz está configurada. A partir de agora, eu falo com a sua voz!";
      default:
        return "";
    }
  }, [cloneFlowStep, currentPhrase, samples]);

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
    isFishClone,
    cloneRefPath,
    currentPhrase,
    cloneFlowStep,
    guideTotal: GUIDE_PHRASES.length,
    startRecording,
    stopRecording,
    removeSample,
    cloneVoice,
    testVoice,
    deleteClonedVoice,
    startCloneFlow,
    getFlowInstruction,
    isVoiceCloneCommand,
  };
}
