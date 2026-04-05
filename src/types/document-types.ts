import type { Jurisdiction } from "@/components/dashboard/JurisdictionSelector";

export interface DocumentType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  category: "penal" | "civil" | "trabalhista" | "contrato" | "extrajudicial" | "ferramentas" | "academico" | "internacional";
}

export interface UploadedDocument {
  key: string;
  fileName: string;
  content: string;
  promptRole: string;
}

export interface FormData {
  tipo: string;
  parteAutora: string;
  parteRe: string;
  qualificacaoAutora: string;
  qualificacaoRe: string;
  correus: { nome: string; qualificacao: string }[];
  testemunhas: { nome: string; qualificacao: string }[];
  fatos: string;
  pedidos: string;
  valorCausa: string;
  tribunal: string;
  tribunalId: string;
  tipoVara: string;
  comarca: string;
  numeroVara: string;
  areaJuridica: string;
  numeroProcesso: string;
  tom: string;
  incluirJurisprudencia: boolean;
  incluirTestemunhasAssinatura: boolean;
  watermark: string;
  clausulasExtras: string;
  foroEleicao: string;
  modelo: string;
  jurisdicao: Jurisdiction;
  uploadedDocuments: UploadedDocument[];
}

export const categoryLabels: Record<string, string> = {
  penal: "Penal",
  civil: "Civil",
  trabalhista: "Trabalhista",
  contrato: "Contratos",
  extrajudicial: "Extrajudicial",
  internacional: "Internacional",
  academico: "Acadêmico",
  ferramentas: "Ferramentas",
};

export const judicialCategories = ["penal", "civil", "trabalhista"];
export const isJudicialCategory = (cat?: string) => !!cat && judicialCategories.includes(cat);
