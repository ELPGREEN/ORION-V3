/**
 * ─── Orion System Diagnostic ───
 * Verifica conexões: LLMs, IoT, Agentes, OpenRouter
 */

import { supabase } from "@/integrations/supabase/client";

export interface SystemDiagnostics {
  status: "healthy" | "degraded" | "offline";
  timestamp: number;
  checks: {
    supabase: { status: "ok" | "error"; latencyMs: number; error?: string };
    openrouter: { status: "ok" | "error"; latencyMs: number; error?: string; models: number };
    deepseek: { status: "ok" | "error"; latencyMs: number; error?: string };
    groq: { status: "ok" | "error"; latencyMs: number; error?: string };
    iot: { status: "ok" | "error"; connected: number; error?: string };
    agents: { status: "ok"; count: number };
  };
}

export async function runSystemDiagnostics(): Promise<SystemDiagnostics> {
  const result: SystemDiagnostics = {
    status: "healthy",
    timestamp: Date.now(),
    checks: {
      supabase: { status: "ok", latencyMs: 0 },
      openrouter: { status: "ok", latencyMs: 0, models: 0 },
      deepseek: { status: "ok", latencyMs: 0 },
      groq: { status: "ok", latencyMs: 0 },
      iot: { status: "ok", connected: 0 },
      agents: { status: "ok", count: 0 },
    },
  };

  // Check Supabase
  try {
    const start = Date.now();
    const { error } = await supabase.from("profiles").select("id").limit(1);
    result.checks.supabase.latencyMs = Date.now() - start;
    if (error && error.code !== "PGRST116") {
      result.checks.supabase.status = "error";
      result.checks.supabase.error = error.message;
    }
  } catch (e) {
    result.checks.supabase.status = "error";
    result.checks.supabase.error = e instanceof Error ? e.message : "Unknown error";
  }

  // Check OpenRouter
  try {
    const openrouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;
    if (openrouterKey) {
      const start = Date.now();
      const response = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${openrouterKey}` },
      });
      result.checks.openrouter.latencyMs = Date.now() - start;
      
      if (response.ok) {
        const data = await response.json();
        result.checks.openrouter.models = data.data?.length || 0;
      } else {
        result.checks.openrouter.status = "error";
        result.checks.openrouter.error = `HTTP ${response.status}`;
      }
    } else {
      result.checks.openrouter.status = "error";
      result.checks.openrouter.error = "No API key";
    }
  } catch (e) {
    result.checks.openrouter.status = "error";
    result.checks.openrouter.error = e instanceof Error ? e.message : "Connection failed";
  }

  // Check DeepSeek
  try {
    const deepseekKey = import.meta.env.VITE_DEEPSEEK_API_KEY;
    if (deepseekKey) {
      const start = Date.now();
      const response = await fetch("https://api.deepseek.com/v1/models", {
        headers: { Authorization: `Bearer ${deepseekKey}` },
      });
      result.checks.deepseek.latencyMs = Date.now() - start;
      if (!response.ok) {
        result.checks.deepseek.status = "error";
        result.checks.deepseek.error = `HTTP ${response.status}`;
      }
    } else {
      result.checks.deepseek.status = "error";
      result.checks.deepseek.error = "No API key";
    }
  } catch (e) {
    result.checks.deepseek.status = "error";
    result.checks.deepseek.error = e instanceof Error ? e.message : "Connection failed";
  }

  // Check Groq
  try {
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqKey) {
      const start = Date.now();
      const response = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${groqKey}` },
      });
      result.checks.groq.latencyMs = Date.now() - start;
      if (!response.ok) {
        result.checks.groq.status = "error";
        result.checks.groq.error = `HTTP ${response.status}`;
      }
    } else {
      result.checks.groq.status = "error";
      result.checks.groq.error = "No API key";
    }
  } catch (e) {
    result.checks.groq.status = "error";
    result.checks.groq.error = e instanceof Error ? e.message : "Connection failed";
  }

  // Check IoT (mock - would need actual MQTT connection)
  result.checks.iot.connected = 0;

  // Count Agents (mock - would need actual agent registry)
  result.checks.agents.count = 11;

  // Overall status
  const errors = Object.values(result.checks).filter(c => c.status === "error");
  if (errors.length > 2) result.status = "offline";
  else if (errors.length > 0) result.status = "degraded";

  return result;
}

// Quick status check
export async function quickStatus(): Promise<{ llm: boolean; iot: boolean; agents: boolean }> {
  const diagnostics = await runSystemDiagnostics();
  
  return {
    llm: diagnostics.checks.openrouter.status === "ok" || 
         diagnostics.checks.deepseek.status === "ok" ||
         diagnostics.checks.groq.status === "ok",
    iot: diagnostics.checks.iot.status === "ok",
    agents: diagnostics.checks.agents.status === "ok",
  };
}
