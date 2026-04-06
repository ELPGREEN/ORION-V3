/**
 * Orion Autonomous Agent Client v1.0
 * ─────────────────────────────────────────────────────────────
 * Client-side bridge to the Orion Agent Factory edge function.
 * Enables Orion to:
 * - Auto-create agents when struggling with tasks
 * - Invoke specialized agents from the 2900+ HF registry
 * - Self-analyze code and Supabase schema
 * - Manage voice profiles
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface AutonomousAgent {
  id: string;
  agent_name: string;
  agent_role: string;
  hf_model_id: string | null;
  category: string;
  system_prompt: string | null;
  capabilities: string[];
  performance_score: number;
  invocation_count: number;
  success_count: number;
  failure_count: number;
  created_by: string;
  creation_reason: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface VoiceProfile {
  id: string;
  user_id: string;
  profile_type: "owner" | "client" | "user";
  display_name: string;
  elevenlabs_voice_id: string | null;
  voice_sample_url: string | null;
  voice_characteristics: Record<string, unknown>;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface AgentFactoryResult {
  success: boolean;
  agent?: AutonomousAgent;
  agents?: AutonomousAgent[];
  result?: unknown;
  analysis?: string;
  error?: string;
  message?: string;
}

// ─── Agent Factory Client ───

export class OrionAgentFactory {
  /**
   * Auto-create an agent when Orion detects difficulty.
   * Called internally when a task fails or takes too long.
   */
  async autoCreateAgent(
    taskDescription: string,
    difficultyContext: Record<string, unknown>,
    failedAttempts: number = 0
  ): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: {
        action: "auto_create",
        task_description: taskDescription,
        difficulty_context: difficultyContext,
        failed_attempts: failedAttempts,
      },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Invoke a specific autonomous agent by ID.
   */
  async invokeAgent(
    agentId: string,
    input: string,
    context?: Record<string, unknown>
  ): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: { action: "invoke", agent_id: agentId, input, context },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * List all active autonomous agents, optionally filtered.
   */
  async listAgents(filters?: {
    category?: string;
    created_by?: string;
  }): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: { action: "list", ...filters },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Analyze source code line by line.
   */
  async analyzeCode(
    path?: string,
    query?: string,
    mode: "scan" | "find_gaps" | "suggest_improvements" = "scan"
  ): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: { action: "code_analysis", path, query, mode },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Analyze Supabase schema and data health.
   */
  async analyzeSupabase(): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: { action: "supabase_analysis" },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Get the full HF model registry.
   */
  async getRegistry(): Promise<AgentFactoryResult> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: { action: "get_registry" },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Synthesize speech via Orion's multi-engine pipeline.
   * Priority: ElevenLabs (premium) > HF Spaces > Browser fallback.
   */
  async synthesizeSpeech(
    text: string,
    options?: {
      voice_profile_id?: string;
      engine?: "elevenlabs" | "hf_spaces" | "browser_fallback";
      language?: string;
    }
  ): Promise<AgentFactoryResult & { audio_base64?: string; mime_type?: string; engine?: string }> {
    const { data, error } = await supabase.functions.invoke("orion-agent-factory", {
      body: {
        action: "synthesize_speech",
        text,
        ...options,
      },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  /**
   * Smart task execution: try the task, and if it fails,
   * auto-create a specialized agent and retry.
   */
  async executeWithAutoRecovery(
    taskDescription: string,
    primaryAgentId?: string,
    maxRetries: number = 2
  ): Promise<AgentFactoryResult> {
    let lastError: string = "";

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (primaryAgentId) {
          const result = await this.invokeAgent(primaryAgentId, taskDescription);
          if (result.success) return result;
          lastError = result.error || "Unknown failure";
        } else {
          lastError = "No primary agent available";
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
      }

      // If failed, auto-create a specialized agent
      if (attempt < maxRetries) {
        console.log(`[Orion] Attempt ${attempt + 1} failed, creating specialized agent...`);
        const createResult = await this.autoCreateAgent(
          taskDescription,
          { last_error: lastError, attempt },
          attempt + 1
        );

        if (createResult.success && createResult.agent) {
          primaryAgentId = createResult.agent.id;
        }
      }
    }

    return { success: false, error: `All ${maxRetries + 1} attempts failed. Last error: ${lastError}` };
  }
}

// ─── Voice Registry Client ───

export class OrionVoiceRegistry {
  async registerVoice(
    displayName: string,
    profileType: "owner" | "client" | "user" = "user",
    voiceSampleBase64?: string
  ): Promise<{ success: boolean; profile?: VoiceProfile; error?: string }> {
    const { data, error } = await supabase.functions.invoke("orion-voice-registry", {
      body: {
        action: "register",
        display_name: displayName,
        profile_type: profileType,
        voice_sample_base64: voiceSampleBase64,
      },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  async cloneVoice(profileId: string, voiceName?: string): Promise<{ success: boolean; voice_id?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke("orion-voice-registry", {
      body: { action: "clone", profile_id: profileId, voice_name: voiceName },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  async listVoices(): Promise<{ success: boolean; profiles?: VoiceProfile[]; error?: string }> {
    const { data, error } = await supabase.functions.invoke("orion-voice-registry", {
      body: { action: "list" },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  async deleteVoice(profileId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.functions.invoke("orion-voice-registry", {
      body: { action: "delete", profile_id: profileId },
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  async synthesize(text: string, profileId?: string): Promise<Blob | null> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/orion-voice-registry`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ action: "synthesize", text, profile_id: profileId }),
    });
    if (!resp.ok) return null;
    return resp.blob();
  }
}

// ─── Singletons ───
export const orionFactory = new OrionAgentFactory();
export const orionVoice = new OrionVoiceRegistry();
