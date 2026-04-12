/**
 * Mother Network Client SDK v3
 * Funções client-side para comunicação com a rede neural mãe ELP
 * via edge function neural-child-bridge
 */

import { supabase } from "@/integrations/supabase/client";

interface MotherStatus {
  success: boolean;
  mother_status: {
    success: boolean;
    status: {
      bridge_version: string;
      knowledge_entries: number;
      specializations: number;
      saved_models: number;
      ready: boolean;
    };
  };
}

interface SyncResult {
  success: boolean;
  specializations_imported: number;
  knowledge_imported: number;
  weights_synced: boolean;
  synced_at: string;
}

interface ReportResult {
  success: boolean;
  report_summary: {
    child_project: string;
    tables: string[];
    table_counts: Record<string, number>;
    total_records: number;
    recent_avg_score: number;
    timestamp: string;
  };
  mother_response: unknown;
}

interface RoutingResult {
  success: boolean;
  routing_decision: unknown;
}

interface TableSchema {
  success: boolean;
  method: string;
  tables_count?: number;
  schema: Record<string, unknown>;
  child_project: string;
}

interface TableData {
  success: boolean;
  table: string;
  total_count: number;
  returned_count: number;
  limit: number;
  data: Array<Record<string, unknown>>;
}

interface HealthCheck {
  success: boolean;
  version: string;
  mother_url: string;
  child_project: string;
  timestamp: string;
}

async function callBridge<T>(action: string, extra: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.functions.invoke("neural-ops", {
    body: { action, ...extra },
  });
  if (error) throw new Error(error.message || `Bridge call failed: ${action}`);
  return data as T;
}

/** Sincroniza especializações, knowledge e pesos da rede mãe */
export async function syncWithMother(): Promise<SyncResult> {
  return callBridge<SyncResult>("sync_with_mother");
}

/** Envia métricas completas (tabelas, registros, schema) para a rede mãe */
export async function reportToMother(): Promise<ReportResult> {
  return callBridge<ReportResult>("report_to_mother");
}

/** Expõe schema completo do banco para a mãe */
export async function exposeTables(): Promise<TableSchema> {
  return callBridge<TableSchema>("expose_tables");
}

/** Permite consultar dados de qualquer tabela */
export async function exposeData(tableName: string, limit = 50): Promise<TableData> {
  return callBridge<TableData>("expose_data", { table_name: tableName, limit });
}

/** Consulta status da rede mãe */
export async function getMotherStatus(): Promise<MotherStatus> {
  return callBridge<MotherStatus>("get_mother_status");
}

/** Consulta a mãe para decisão de roteamento de IA */
export async function routeViaMother(query: {
  use_case?: string;
  model_type?: string;
  prompt?: string;
}): Promise<RoutingResult> {
  return callBridge<RoutingResult>("route_via_mother", query);
}

/** Health check da bridge */
export async function healthCheck(): Promise<HealthCheck> {
  return callBridge<HealthCheck>("health_check");
}
