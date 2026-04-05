import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface OabAdvogado {
  nome?: string;
  inscricao?: string;
  uf?: string;
  situacao?: string;
  tipoinscricao?: string;
  datainscricao?: string;
  subsecional?: string;
  sociedade?: string;
  email?: string;
  endereco?: string;
  telefone?: string;
  cpf?: string;
  datanascimento?: string;
  naturalidade?: string;
}

export interface OabConsultaResult {
  success: boolean;
  data?: OabAdvogado;
  rawXml?: string;
  error?: string;
}

export interface AcessoRHOrganization {
  name: string;
  accounts: Array<{
    uid: string;
    name: string;
    customFields: Record<string, string | null>;
  }>;
}

export interface AcessoRHRole {
  acc: string;
  code: string;
  id: string;
  name: string;
  context?: { brazil?: { cbo?: string; escolaridadeMinima?: string } };
}

export interface AcessoRHDepartment {
  acc: string;
  code: string;
  id: string;
  name: string;
}

// ─── Helper ───

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("oab-acessorh", { body });
  if (error) throw new Error(error.message || "Erro na comunicação");
  if (data && !data.success && data.error) throw new Error(data.error);
  return data;
}

// ═══════════════════════════════════════
// OAB CNA
// ═══════════════════════════════════════

export async function consultaOAB(params: {
  inscricao?: string; uf?: string; nome?: string; cpf?: string;
}): Promise<OabConsultaResult> {
  return invoke({ action: "consulta_oab", ...params });
}

// ═══════════════════════════════════════
// ORGANIZAÇÃO
// ═══════════════════════════════════════

export async function getOrganization(token?: string): Promise<AcessoRHOrganization[]> {
  const res = await invoke({ action: "acessorh_organization", token });
  return res.data;
}

// ═══════════════════════════════════════
// CARGOS
// ═══════════════════════════════════════

export async function createRole(accountUid: string, roleData: { code: string; name: string; context?: any }, token?: string) {
  return invoke({ action: "acessorh_create_role", accountUid, roleData, token });
}

export async function listRoles(accountUid: string, opts?: { limit?: number; skip?: number; code?: string }, token?: string): Promise<AcessoRHRole[]> {
  const res = await invoke({ action: "acessorh_list_roles", accountUid, ...opts, token });
  return res.data;
}

export async function deleteRole(accountUid: string, roleUid: string, token?: string) {
  return invoke({ action: "acessorh_delete_role", accountUid, roleUid, token });
}

// ═══════════════════════════════════════
// DEPARTAMENTOS
// ═══════════════════════════════════════

export async function createDepartment(accountUid: string, departmentData: { code: string; name: string }, token?: string) {
  return invoke({ action: "acessorh_create_department", accountUid, departmentData, token });
}

export async function listDepartments(accountUid: string, opts?: { limit?: number; skip?: number; code?: string }, token?: string): Promise<AcessoRHDepartment[]> {
  const res = await invoke({ action: "acessorh_list_departments", accountUid, ...opts, token });
  return res.data;
}

export async function deleteDepartment(accountUid: string, departmentUid: string, token?: string) {
  return invoke({ action: "acessorh_delete_department", accountUid, departmentUid, token });
}

// ═══════════════════════════════════════
// POSIÇÕES
// ═══════════════════════════════════════

export async function createPosition(positionData: Record<string, unknown>, token?: string) {
  return invoke({ action: "acessorh_create_position", positionData, token });
}

export async function exportPositions(exportData: Record<string, unknown>, token?: string) {
  return invoke({ action: "acessorh_export_positions", exportData, token });
}

export async function getPosition(positionId: string, token?: string) {
  return invoke({ action: "acessorh_get_position", positionId, token });
}

// ═══════════════════════════════════════
// BENEFÍCIOS
// ═══════════════════════════════════════

export async function listBenefits(accountUid: string, opts?: { category?: string; limit?: number; skip?: number; sort?: string; order?: string }, token?: string) {
  const res = await invoke({ action: "acessorh_list_benefits", accountUid, ...opts, token });
  return res.data;
}

// ═══════════════════════════════════════
// ARQUIVOS
// ═══════════════════════════════════════

export async function uploadFile(fileBase64: string, fileName: string, mimeType?: string, token?: string) {
  return invoke({ action: "acessorh_upload_file", fileBase64, fileName, mimeType, token });
}

export async function downloadFile(filePath: string, token?: string) {
  return invoke({ action: "acessorh_download_file", filePath, token });
}

// ═══════════════════════════════════════
// ANEXOS
// ═══════════════════════════════════════

export async function listAttachments(accountUid: string, opts?: { limit?: number; skip?: number }, token?: string) {
  const res = await invoke({ action: "acessorh_list_attachments", accountUid, ...opts, token });
  return res.data;
}

// ═══════════════════════════════════════
// MODELOS DE CARTA
// ═══════════════════════════════════════

export async function listModels(accountUid: string, opts?: { type?: string; limit?: number; skip?: number; sort?: string }, token?: string) {
  const res = await invoke({ action: "acessorh_list_models", accountUid, ...opts, token });
  return res.data;
}

// ═══════════════════════════════════════
// IBGE
// ═══════════════════════════════════════

export async function getIbgeCode(uf: string, city: string, token?: string) {
  const res = await invoke({ action: "acessorh_ibge_code", uf, city, token });
  return res.data;
}

// ═══════════════════════════════════════
// WEBHOOKS
// ═══════════════════════════════════════

export async function createWebhook(params: {
  accountUid: string;
  unitUid?: string;
  events?: string[];
  authKind?: "secret" | "basic" | "apiKey";
  webhookSecret?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  apiKeyPrefix?: string;
}, token?: string) {
  return invoke({ action: "acessorh_create_webhook", ...params, token });
}

// ═══════════════════════════════════════
// REFERÊNCIA DE DOCUMENTOS
// ═══════════════════════════════════════

export async function getDocumentsReference() {
  return invoke({ action: "acessorh_oab_doc_info" });
}
