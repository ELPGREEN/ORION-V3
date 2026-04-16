/**
 * useOrionCore — Hook para comunicação com o Orion Core V3 (brain.py) na VM GCP
 * 
 * Suporta: comandos, status, memória, intenções e status de integrações
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

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

// ─── VM Routing Logic ───

/** Determine if a task should go to the GCP VM (vision/heavy) or stay local/edge */
export function shouldRouteToVM(action: string, payload: Record<string, unknown> = {}): boolean {
  const vmActions = ["vision_analyze", "tts_generate", "stt_transcribe", "face_detect", "face_identify", "ocr_process"];
  if (vmActions.includes(action)) return true;
  // Text/search/legal tasks bypass VM — use edge functions directly
  const edgeActions = ["chat", "search", "legal_search", "translate", "summarize", "route", "status", "health"];
  if (edgeActions.includes(action)) return false;
  // Check payload hints
  if (payload.image || payload.audio || payload.video) return true;
  return false;
}

// ─── VM Call Helper ───

async function callOrionCore<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  // Skip VM for non-vision tasks — use neural-inference edge function directly
  if (!shouldRouteToVM(action, payload)) {
    try {
      const { data, error } = await supabase.functions.invoke("neural-inference", {
        body: { action, ...payload, source: "orion-core-bypass" },
      });
      if (error) { console.warn(`[OrionCore] Edge fallback error for ${action}:`, error); return null; }
      return data as T;
    } catch (err) {
      console.warn(`[OrionCore] Edge fallback failed for ${action}:`, err);
      return null;
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke("orion-vm-proxy", {
      body: { action, ...payload },
    });
    if (error) {
      console.warn(`[OrionCore] Error calling ${action}:`, error);
      return null;
    }
    if (data?.status === "vm_starting") {
      console.log("[OrionCore] VM is booting...");
      return null;
    }
    return data as T;
  } catch (err) {
    console.error(`[OrionCore] Failed to call ${action}:`, err);
    return null;
  }
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
    const data = await callOrionCore<OrionCoreStatus>("brain/status");
    if (data) setStatus(data);
    return data;
  }, []);

  const fetchIntegrations = useCallback(async () => {
    const data = await callOrionCore<IntegrationStatus>("integrations/status");
    if (data) setIntegrations(data);
    return data;
  }, []);

  const fetchMemory = useCallback(async () => {
    const data = await callOrionCore<{ entries: OrionMemoryEntry[] }>("brain/memory");
    if (data?.entries) setMemory(data.entries);
    return data?.entries ?? [];
  }, []);

  const sendCommand = useCallback(async (command: string): Promise<OrionCoreResponse | null> => {
    setLoading(true);
    try {
      const data = await callOrionCore<OrionCoreResponse>("brain/command", { query: command });
      if (data) {
        setLastResponse(data);
        // Store last command for widget sync
        localStorage.setItem("orion_last_command", command);
        localStorage.setItem("orion_last_command_time", new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
        window.dispatchEvent(new CustomEvent("orion-command", { detail: { command, response: data } }));
      }
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-poll status every 30s
  useEffect(() => {
    fetchStatus();
    fetchIntegrations();
    pollRef.current = setInterval(() => {
      fetchStatus();
      fetchIntegrations();
    }, 30_000);
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
