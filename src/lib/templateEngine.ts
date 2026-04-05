export interface TemplateVariable {
  name: string;
  defaultValue?: string;
  occurrences: number;
}

/**
 * Extract all {{variable}} placeholders from HTML content
 */
export function extractVariables(html: string): TemplateVariable[] {
  const regex = /\{\{(\s*[\w\sÀ-ÿ._-]+\s*)\}\}/g;
  const countMap = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const name = match[1].trim();
    countMap.set(name, (countMap.get(name) || 0) + 1);
  }

  return Array.from(countMap.entries()).map(([name, occurrences]) => ({
    name,
    occurrences,
  }));
}

/**
 * Replace all {{variable}} placeholders with provided values
 */
export function fillVariables(
  html: string,
  values: Record<string, string>
): string {
  let result = html;
  for (const [name, value] of Object.entries(values)) {
    if (!value) continue;
    // Escape special regex chars in variable name
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\{\\{\\s*${escaped}\\s*\\}\\}`, "g");
    result = result.replace(regex, value);
  }
  return result;
}

/**
 * Common legal document variable presets
 */
export const COMMON_VARIABLES: Record<string, string[]> = {
  partes: ["nome_autor", "nome_reu", "cpf_autor", "cpf_reu", "endereco_autor", "endereco_reu"],
  processo: ["numero_processo", "vara", "comarca", "tribunal", "classe_processual"],
  datas: ["data_atual", "data_fatos", "data_audiencia", "prazo"],
  valores: ["valor_causa", "valor_danos", "valor_honorarios"],
  advogado: ["nome_advogado", "oab_numero", "escritorio", "telefone_advogado", "email_advogado"],
};

/**
 * Insert a variable placeholder at cursor position
 */
export function createVariablePlaceholder(name: string): string {
  return `{{${name}}}`;
}
