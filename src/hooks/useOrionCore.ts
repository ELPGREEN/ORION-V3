/**
 * useOrionCore — Hook para comunicação com o Orion Core V3 (brain.py) na VM GCP
 * 
 * Suporta: comandos, status, memória, intenções e status de integrações.
 * Integrado ao PENTAGON (Unified Consciousness) para governança e RAG.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { processOrionRequest } from "@/lib/neural/orion-brain";

// ─── Types ───

export interface OrionCoreStatus {
  online: boolean;
  version: string;
  uptime_seconds: number;
  active_integrations: string[];
  intent_patterns: Record<string, string>;
  memory_entries: number;
  last_command?: string;
  last_command_time?: string;
}

export interface OrionCoreResponse {
  response: string;
  action?: string;
  url?: string;
  platform?: string;
  google_structure?: {
    text_response?: string;
    suggestions?: string[];
    action_data?: Record<string, unknown>;
    supplemental_info?: Record<string, unknown>;
  };
  source?: string;
  intent?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationStatus {
  mqtt: { connected: boolean; broker?: string; devices_count: number; last_message?: string };
  ble: { scanning: boolean; paired_devices: number; supported: boolean };
  ros2: { connected: boolean; nodes: string[]; robot_status?: string; last_heartbeat?: string };
  google_assistant: { available: boolean; fallback_count: number };
}

export interface OrionMemoryEntry {
  query: string;
  response: string;
  intent: string;
  timestamp: string;
}

// ─── Hook ───

export function useOrionCore() {
  const [status, setStatus] = useState<OrionCoreStatus | null>(null);
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [memory, setMemory] = useState<OrionMemoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<OrionCoreResponse | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("orion-vm-proxy", {
        body: { action: "brain/status" },
      });
      if (data) setStatus(data);
      return data;
    } catch { return null; }
  }, []);

  const fetchIntegrations = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("orion-vm-proxy", {
        body: { action: "integrations/status" },
      });
      if (data) setIntegrations(data);
      return data;
    } catch { return null; }
  }, []);

  const fetchMemory = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("orion-vm-proxy", {
        body: { action: "brain/memory" },
      });
      if (data?.entries) setMemory(data.entries);
      return data?.entries ?? [];
    } catch { return []; }
  }, []);

  /**
   * Enviar comando via PENTAGON pre-pass.
   * Garante que o comando passe pela consciência unificada antes da execução.
   */
  const sendCommand = useCallback(async (command: string, options: { usePentagon?: boolean } = {}): Promise<OrionCoreResponse | null> => {
    const usePentagon = options.usePentagon !== false;
    setLoading(true);

    try {
      if (usePentagon) {
        // 🍕 Rota via Pentagon (Consciência Unificada)
        const orionRes = await processOrionRequest(command, {
          source: "text",
          conversationContext: "useOrionCore-Hook"
        });

        const finalRes: OrionCoreResponse = {
          response: orionRes.response,
          intent: orionRes.sector,
          metadata: { agent: orionRes.agentUsed, confidence: orionRes.confidence }
        };

        setLastResponse(finalRes);
        localStorage.setItem("orion_last_command", command);
        localStorage.setItem("orion_last_command_time", new Date().toLocaleTimeString());
        window.dispatchEvent(new CustomEvent("orion-command", { detail: { command, response: finalRes } }));

        return finalRes;
      } else {
        // Rota legada/direta para a VM
        const { data } = await supabase.functions.invoke("orion-vm-proxy", {
          body: { action: "brain/command", query: command },
        });
        if (data) {
          setLastResponse(data);
          localStorage.setItem("orion_last_command", command);
          window.dispatchEvent(new CustomEvent("orion-command", { detail: { command, response: data } }));
        }
        return data;
      }
    } catch (err) {
      console.error("[OrionCore] Command failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-poll status
  useEffect(() => {
    fetchStatus();
    fetchIntegrations();
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchIntegrations();
    }, 45_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchStatus, fetchIntegrations]);

  return {
    status,
    integrations,
    memory,
    loading,
    lastResponse,
    sendCommand,
    fetchStatus,
    fetchIntegrations,
    fetchMemory,
    refreshAll: useCallback(async () => {
      await Promise.all([fetchStatus(), fetchIntegrations(), fetchMemory()]);
    }, [fetchStatus, fetchIntegrations, fetchMemory]),
  };
}
