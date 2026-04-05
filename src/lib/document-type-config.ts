// Configuration per document type: labels, hidden fields, auto area, extra fields
// Covers all 148 document types with correct Brazilian legal terminology

export interface ExtraField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "textarea";
}

export interface UploadSlot {
  key: string;
  label: string;
  required: boolean;
  accept: string;
  description: string;
  promptRole: string;
}

export interface DocumentTypeConfig {
  parteAutoraLabel: string;
  parteReLabel: string;
  parteAutoraPlaceholder?: string;
  parteRePlaceholder?: string;
  qualificacaoAutoraPlaceholder?: string;
  qualificacaoRePlaceholder?: string;
  showParteAutora: boolean;
  showParteRe: boolean;
  fatosLabel: string;
  fatosPlaceholder: string;
  pedidosLabel: string;
  pedidosPlaceholder: string;
  hideFields: string[];
  autoAreaJuridica: string;
  extraFields?: ExtraField[];
  requiresUpload?: boolean;
  uploadSlots?: UploadSlot[];
}

// ─────────────────────────────────────────────────────────
// UNIVERSAL UPLOAD SLOTS
// ─────────────────────────────────────────────────────────

export const slotDocumentoModelo: UploadSlot = {
  key: "documento_modelo",
  label: "Documento Modelo (referência de estrutura)",
  required: false,
  accept: ".pdf,.docx,.txt,.doc",
  description: "Faça upload de uma peça anterior sua como referência de estrutura",
  promptRole: "DOCUMENTO MODELO (use como referência de ESTRUTURA apenas, NÃO copie argumentos)",
};

export const slotOutrosDocumentos: UploadSlot = {
  key: "outros_documentos",
  label: "Outros Documentos Relevantes",
  required: false,
  accept: ".pdf,.docx,.txt,.doc",
  description: "Documentos adicionais que possam auxiliar na geração",
  promptRole: "DOCUMENTO COMPLEMENTAR PARA ANÁLISE",
};

// ─────────────────────────────────────────────────────────
// DEFAULT BASES
// ─────────────────────────────────────────────────────────

const defaultJudicialConfig: DocumentTypeConfig = {
  parteAutoraLabel: "Parte Autora",
  parteReLabel: "Parte Ré",
  showParteAutora: true,
  showParteRe: true,
  fatosLabel: "Fatos / Descrição do Caso *",
  fatosPlaceholder: "Descreva os fatos relevantes, circunstâncias, cronologia, provas disponíveis...",
  pedidosLabel: "Pedidos / Requerimentos",
  pedidosPlaceholder: "Quais os pedidos: condenação, indenização, obrigação de fazer...",
  hideFields: [],
  autoAreaJuridica: "",
};

export const defaultExtrajudicialConfig: DocumentTypeConfig = {
  parteAutoraLabel: "Parte 1 / Contratante / Outorgante",
  parteReLabel: "Parte 2 / Contratada / Outorgado",
  showParteAutora: true,
  showParteRe: true,
  fatosLabel: "Objeto / Descrição *",
  fatosPlaceholder: "Descreva o objeto do contrato/acordo, cláusulas desejadas, condições específicas...",
  pedidosLabel: "Cláusulas / Objetivos",
  pedidosPlaceholder: "Obrigações, prazos, valores, penalidades, condições especiais...",
  hideFields: [],
  autoAreaJuridica: "",
};

// ─────────────────────────────────────────────────────────
// PENAL BASES
// ─────────────────────────────────────────────────────────

export const penalHide = ["areaJuridica"];
export const penalHideExtra = ["areaJuridica", "valorCausa", "testemunhas"];

/** Defesa criminal genérica: Acusado vs MP */
export const penalDefesa: Partial<DocumentTypeConfig> = {
  autoAreaJuridica: "penal",
  parteAutoraLabel: "Acusado / Réu",
  parteAutoraPlaceholder: "Nome completo do acusado/réu",
  qualificacaoAutoraPlaceholder: "RG, CPF, nacionalidade, estado civil, profissão, endereço completo, e-mail, telefone",
    parteReLabel: "Ministério Público / Acusação",
    parteRePlaceholder: "Ministério Público do Estado (preenchimento opcional)",
  showParteAutora: true,
  showParteRe: false,
  fatosLabel: "Fatos e Fundamentação da Defesa *",
  fatosPlaceholder: "Descreva os fatos relevantes para a defesa, teses defensivas, provas...",
  pedidosLabel: "Pedidos da Defesa",
  pedidosPlaceholder: "Absolvição, desclassificação, atenuantes, redução de pena...",
  hideFields: penalHide,
};

/** Recurso criminal genérico: Recorrente vs Recorrido */
export const penalRecurso: Partial<DocumentTypeConfig> = {
  ...penalDefesa,
  parteAutoraLabel: "Recorrente",
  parteAutoraPlaceholder: "Nome completo do recorrente",
  parteReLabel: "Recorrido",
  showParteRe: false,
  fatosLabel: "Razões do Recurso *",
  fatosPlaceholder: "Erros da decisão recorrida, análise equivocada de provas, dosimetria incorreta...",
  pedidosLabel: "Pedido de Reforma",
  pedidosPlaceholder: "Reforma da decisão para absolvição, redução de pena, desclassificação...",
};

/** Contrarrazões criminais genéricas */
export const penalContrarrazoes: Partial<DocumentTypeConfig> = {
  ...penalDefesa,
  parteAutoraLabel: "Contrarrazante",
  parteAutoraPlaceholder: "Nome completo",
  showParteRe: false,
  fatosLabel: "Contrarrazões *",
  fatosPlaceholder: "Rebata os argumentos do recurso, reforce a decisão favorável...",
  pedidosLabel: "Pedido",
  pedidosPlaceholder: "Manutenção da decisão recorrida, desprovimento do recurso...",
};

/** Pedido em execução penal: Sentenciado/Reeducando */
export const penalExecucao: Partial<DocumentTypeConfig> = {
  autoAreaJuridica: "penal",
  parteAutoraLabel: "Sentenciado / Reeducando",
  parteAutoraPlaceholder: "Nome completo do sentenciado",
  parteReLabel: "Ministério Público",
  showParteAutora: true,
  showParteRe: false,
  hideFields: penalHideExtra,
};

// ─────────────────────────────────────────────────────────
// CIVIL BASES
// ─────────────────────────────────────────────────────────

/** Recurso cível genérico */
export const civilRecurso: Partial<DocumentTypeConfig> = {
  parteAutoraLabel: "Recorrente / Apelante",
  parteReLabel: "Recorrido / Apelado",
  showParteAutora: true,
  showParteRe: true,
  fatosLabel: "Razões do Recurso *",
  fatosPlaceholder: "Erros da decisão recorrida, fundamentos para reforma...",
  pedidosLabel: "Pedido de Reforma",
  pedidosPlaceholder: "Reforma da sentença/decisão para...",
  hideFields: [],
  autoAreaJuridica: "",
};

/** Contrarrazões cíveis genéricas */
export const civilContrarrazoes: Partial<DocumentTypeConfig> = {
  parteAutoraLabel: "Contrarrazante / Apelado",
  parteReLabel: "Recorrente / Apelante",
  showParteAutora: true,
  showParteRe: false,
  fatosLabel: "Contrarrazões *",
  fatosPlaceholder: "Rebata os argumentos do recurso, demonstre o acerto da decisão...",
  pedidosLabel: "Pedido",
  pedidosPlaceholder: "Manutenção da decisão, desprovimento do recurso...",
  hideFields: [],
  autoAreaJuridica: "",
};

/** Embargos de declaração genérico */
export const embargosDeclaracao: Partial<DocumentTypeConfig> = {
  parteAutoraLabel: "Embargante",
  parteReLabel: "Embargado",
  showParteAutora: true,
  showParteRe: false,
  fatosLabel: "Obscuridade / Omissão / Contradição *",
  fatosPlaceholder: "Aponte o vício da decisão: obscuridade, omissão ou contradição que necessita esclarecimento...",
  pedidosLabel: "Pedido de Esclarecimento",
  pedidosPlaceholder: "Esclarecimento do ponto obscuro, suprimento da omissão, correção da contradição...",
  hideFields: [],
  autoAreaJuridica: "",
};

// ─────────────────────────────────────────────────────────
// TRABALHISTA BASE
// ─────────────────────────────────────────────────────────

export const trabHide = ["areaJuridica"];

export const trabRecurso: Partial<DocumentTypeConfig> = {
  parteAutoraLabel: "Recorrente",
  parteReLabel: "Recorrido",
  showParteAutora: true,
  showParteRe: true,
  fatosLabel: "Razões do Recurso *",
  fatosPlaceholder: "Erros da decisão recorrida, análise equivocada de provas...",
  pedidosLabel: "Pedido de Reforma",
  pedidosPlaceholder: "Reforma da decisão para...",
  hideFields: trabHide,
  autoAreaJuridica: "trabalhista",
};

export const trabContrarrazoes: Partial<DocumentTypeConfig> = {
  parteAutoraLabel: "Contrarrazante",
  parteReLabel: "Recorrente",
  showParteAutora: true,
  showParteRe: false,
  fatosLabel: "Contrarrazões *",
  fatosPlaceholder: "Rebata os argumentos do recurso, demonstre o acerto da decisão...",
  pedidosLabel: "Pedido",
  pedidosPlaceholder: "Manutenção da decisão, desprovimento do recurso...",
  hideFields: trabHide,
  autoAreaJuridica: "trabalhista",
};

// ─────────────────────────────────────────────────────────
// FERRAMENTAS BASE (sem partes, sem tribunal)
// ─────────────────────────────────────────────────────────

export const ferramentaBase: Partial<DocumentTypeConfig> = {
  showParteAutora: false,
  showParteRe: false,
  hideFields: ["areaJuridica", "valorCausa", "tribunal", "correus", "testemunhas", "numeroProcesso"],
  autoAreaJuridica: "",
};

// Este módulo mantém apenas tipos e bases compartilhadas para evitar dependência circular.
