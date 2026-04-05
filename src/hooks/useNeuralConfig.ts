import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NeuralAgentConfig {
  id: string;
  user_id: string;
  persona: string;
  custom_instructions: string;
  wake_word: string;
  voice_enabled: boolean;
  voice_language: string;
  voice_speed: number;
  voice_pitch: number;
  vision_enabled: boolean;
  vision_auto_describe: boolean;
  vision_rules: VisionRule[];
  custom_commands: CustomCommand[];
  active_modules: string[];
  response_length: string;
  onboarding_completed: boolean;
  // Persona humana
  speech_style: string;
  formality_level: number;
  humor_mode: string;
  proactive_vision: boolean;
  nickname: string;
  mirroring_enabled: boolean;
  personality_prompt: string;
  created_at: string;
  updated_at: string;
}

export interface VisionRule {
  trigger: string;
  action: string;
  enabled: boolean;
}

export interface CustomCommand {
  gatilho: string;
  instrucao: string;
  enabled: boolean;
}

const DEFAULT_CONFIG: Partial<NeuralAgentConfig> = {
  persona: "profissional",
  custom_instructions: "",
  wake_word: "Ana",
  voice_enabled: true,
  voice_language: "pt-BR",
  voice_speed: 0.92,
  voice_pitch: 0.85,
  vision_enabled: true,
  vision_auto_describe: false,
  vision_rules: [],
  custom_commands: [],
  active_modules: ["chat", "vision", "voice", "identification"],
  response_length: "medium",
  onboarding_completed: false,
  speech_style: "formal",
  formality_level: 7,
  humor_mode: "neutro",
  proactive_vision: false,
  nickname: "",
  mirroring_enabled: true,
  personality_prompt: "",
};

export function useNeuralConfig() {
  const { user } = useAuth();
  const [config, setConfig] = useState<NeuralAgentConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Load config
  useEffect(() => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadConfig = async () => {
      try {
        const { data, error } = await supabase
          .from("neural_agent_config" as any)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error && !error.message.includes("does not exist")) {
          console.error("Error loading neural config:", error);
        }

        if (data) {
          setConfig(data as any);
        } else {
          // Create default config
          const { data: newConfig, error: insertErr } = await supabase
            .from("neural_agent_config" as any)
            .insert({ user_id: user.id, ...DEFAULT_CONFIG } as any)
            .select()
            .single();

          if (!insertErr && newConfig) {
            setConfig(newConfig as any);
          }
        }
      } catch (e) {
        console.error("Failed to load neural config:", e);
      } finally {
        setLoading(false);
      }
    };

    loadConfig();

    // Realtime subscription
    const channel = supabase
      .channel("neural_config_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "neural_agent_config",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setConfig(payload.new as any);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const updateConfig = useCallback(
    async (partial: Partial<NeuralAgentConfig>) => {
      if (!user?.id || !config?.id) return false;

      try {
        const { error } = await supabase
          .from("neural_agent_config" as any)
          .update(partial as any)
          .eq("id", config.id);

        if (error) {
          console.error("Error updating neural config:", error);
          toast.error("Erro ao salvar configuração");
          return false;
        }

        setConfig((prev) => (prev ? { ...prev, ...partial } : prev));
        return true;
      } catch (e) {
        console.error("Failed to update neural config:", e);
        return false;
      }
    },
    [user?.id, config?.id]
  );

  return { config, loading, updateConfig };
}
