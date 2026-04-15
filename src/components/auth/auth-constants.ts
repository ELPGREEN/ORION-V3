import { Users, Scale, Briefcase, Link2 } from "lucide-react";
import { z } from "zod";

export type AccountType = "cliente" | "advogado" | "produtor" | "afiliado" | "nomade";
export type AuthStep = "form" | "face_enroll" | "done";

export interface CadastroForm {
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;
  cpf: string;
  tipoCaso: string;
  descricaoProblema: string;
  oabNumero: string;
  oabUf: string;
  areasAtuacao: string[];
  descricaoNegocio: string;
}

export const INITIAL_FORM: CadastroForm = {
  nome: "", email: "", telefone: "", senha: "", confirmarSenha: "",
  cpf: "", tipoCaso: "", descricaoProblema: "",
  oabNumero: "", oabUf: "", areasAtuacao: [],
  descricaoNegocio: "",
};

export const emailSchema = z.string().email("E-mail inválido");
export const passwordSchema = z.string().min(8, "Senha deve ter no mínimo 8 caracteres");
export const nomeSchema = z.string().min(2, "Nome deve ter no mínimo 2 caracteres");

export const ACCOUNT_TYPES: { value: AccountType; label: string; icon: any; desc: string }[] = [
  { value: "cliente", label: "Cliente", icon: Users, desc: "Buscar assistência jurídica" },
  { value: "advogado", label: "Advogado", icon: Scale, desc: "Gerenciar clientes e processos" },
  { value: "produtor", label: "Produtor", icon: Briefcase, desc: "Criar e vender produtos digitais" },
  { value: "afiliado", label: "Afiliado", icon: Link2, desc: "Ganhar comissões por indicações" },
];

export const TIPOS_CASO = [
  "Direito Penal", "Direito Civil", "Direito de Família", "Direito Trabalhista",
  "Direito Internacional", "Direito Empresarial", "Direito do Consumidor",
  "Direitos Humanos", "Imigração", "Outro"
];

export const AREAS_ATUACAO = [
  "Penal", "Civil", "Família", "Trabalhista", "Tributário",
  "Empresarial", "Consumidor", "Internacional", "Imobiliário",
  "Ambiental", "Digital", "Previdenciário"
];

export const UFS = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT",
  "PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"
];

export const formatCPF = (value: string) => {
  const n = value.replace(/\D/g, "");
  if (n.length <= 3) return n;
  if (n.length <= 6) return `${n.slice(0, 3)}.${n.slice(3)}`;
  if (n.length <= 9) return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6)}`;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
};

export const formatPhone = (value: string) => {
  const n = value.replace(/\D/g, "");
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0, 2)}) ${n.slice(2)}`;
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7, 11)}`;
};
