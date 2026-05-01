export interface RefinementField {
  key: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "number";
  options?: string[];
  required: boolean;
  placeholder?: string;
  hint?: string;
  validate?: "processo" | "cpf" | "cnpj" | "valor" | "email" | "oab" | "percentual";
}
