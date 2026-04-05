/**
 * Neural Bridge Client SDK
 * Funções client-side para interagir com a neural-bridge local
 */

import { supabase } from "@/integrations/supabase/client";

interface BridgeStatus {
  success: boolean;
  status: {
    bridge_version: string;
    ready: boolean;
    specializations: number;
    knowledge_entries: number;
    saved_models: number;
  };
}

interface ExportFullResult {
  success: boolean;
  specializations: Array<Record<string, unknown>>;
  knowledge_base: Array<Record<string, unknown>>;
  routing_weights: Record<string, Record<string, number>>;
  neural_weights: Array<Record<string, unknown>>;
}

interface RouteResult {
  success: boolean;
  provider: string;
  weight: number;
  reasoning: string;
}

interface ChildReportResult {
  success: boolean;
  message?: string;
  error?: string;
}

async function callBridge<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || `Bridge call failed: ${action}`);
  return data as T;
}

/** Exporta toda a estrutura neural */
export async function exportFull(): Promise<ExportFullResult> {
  return callBridge<ExportFullResult>("export_full");
}

/** Consulta status do hub neural */
export async function getBridgeStatus(): Promise<BridgeStatus> {
  return callBridge<BridgeStatus>("status");
}

/** Envia report de métricas para o hub (como projeto filho) */
export async function sendChildReport(report: Record<string, unknown>): Promise<ChildReportResult> {
  return callBridge<ChildReportResult>("receive_child_report", { data: { report } });
}

/** Consulta roteamento de IA */
export async function routeQuery(
  useCase: string,
  modelType?: string,
  promptPreview?: string
): Promise<RouteResult> {
  return callBridge<RouteResult>("route", {
    use_case: useCase,
    model_type: modelType || "balanced",
    prompt_preview: promptPreview,
  });
}
