// ─── Clause Library ───
// CRUD for reusable legal clauses stored in localStorage

export interface SavedClause {
  id: string;
  name: string;
  category: string;
  text: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

const STORAGE_KEY = "legal-clause-library";

function readAll(): SavedClause[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(clauses: SavedClause[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clauses));
}

export function getAllClauses(): SavedClause[] {
  return readAll().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getClausesByCategory(category: string): SavedClause[] {
  return getAllClauses().filter((c) => c.category === category);
}

export function searchClauses(query: string): SavedClause[] {
  const q = query.toLowerCase();
  return getAllClauses().filter(
    (c) => c.name.toLowerCase().includes(q) || c.text.toLowerCase().includes(q) || c.category.toLowerCase().includes(q)
  );
}

export function addClause(name: string, category: string, text: string): SavedClause {
  const clauses = readAll();
  const clause: SavedClause = {
    id: `clause-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    category,
    text,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    usageCount: 0,
  };
  clauses.push(clause);
  writeAll(clauses);
  return clause;
}

export function updateClause(id: string, updates: Partial<Pick<SavedClause, "name" | "category" | "text">>): SavedClause | null {
  const clauses = readAll();
  const idx = clauses.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  Object.assign(clauses[idx], updates, { updatedAt: new Date().toISOString() });
  writeAll(clauses);
  return clauses[idx];
}

export function deleteClause(id: string): boolean {
  const clauses = readAll();
  const filtered = clauses.filter((c) => c.id !== id);
  if (filtered.length === clauses.length) return false;
  writeAll(filtered);
  return true;
}

export function incrementUsage(id: string) {
  const clauses = readAll();
  const clause = clauses.find((c) => c.id === id);
  if (clause) {
    clause.usageCount++;
    clause.updatedAt = new Date().toISOString();
    writeAll(clauses);
  }
}

export function getCategories(): string[] {
  const clauses = readAll();
  return [...new Set(clauses.map((c) => c.category))].sort();
}

export const DEFAULT_CATEGORIES = [
  "Contratual",
  "Processual",
  "Trabalhista",
  "Tributário",
  "LGPD",
  "Societário",
  "Penal",
  "Constitucional",
  "Outro",
];

// ─── Pre-built Legal Clauses (seed data) ───

export const PREBUILT_CLAUSES: Omit<SavedClause, "id" | "createdAt" | "updatedAt" | "usageCount">[] = [
  {
    name: "Cláusula de Foro",
    category: "Contratual",
    text: "Fica eleito o foro da Comarca de {{cidade}}, Estado de {{estado}}, para dirimir quaisquer dúvidas ou controvérsias oriundas do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
  },
  {
    name: "Cláusula de Confidencialidade",
    category: "Contratual",
    text: "As partes se comprometem a manter sigilo absoluto sobre todas as informações confidenciais trocadas em razão do presente contrato, durante sua vigência e pelo prazo de {{prazo_anos}} anos após seu término, sob pena de responder por perdas e danos, nos termos dos artigos 186, 187 e 927 do Código Civil.",
  },
  {
    name: "Cláusula de Rescisão",
    category: "Contratual",
    text: "O presente contrato poderá ser rescindido por qualquer das partes, mediante notificação por escrito com antecedência mínima de {{dias_antecedencia}} dias, sem prejuízo das obrigações já assumidas e dos pagamentos devidos até a data da efetiva rescisão.",
  },
  {
    name: "Pedido de Justiça Gratuita",
    category: "Processual",
    text: "Requer a concessão dos benefícios da justiça gratuita, nos termos do artigo 98 e seguintes do Código de Processo Civil e do artigo 5º, inciso LXXIV, da Constituição Federal, por não possuir condições financeiras de arcar com as custas processuais e honorários advocatícios sem prejuízo de seu sustento e de sua família.",
  },
  {
    name: "Pedido de Tutela Antecipada",
    category: "Processual",
    text: "Requer a concessão de tutela provisória de urgência, na modalidade antecipada, nos termos do artigo 300 do Código de Processo Civil, ante a presença dos requisitos da probabilidade do direito e do perigo de dano ou risco ao resultado útil do processo, para o fim de {{pedido_tutela}}.",
  },
  {
    name: "Fecho Processual Padrão",
    category: "Processual",
    text: "Nestes termos,\npede deferimento.\n\n{{cidade}}, {{data}}.\n\n{{nome_advogado}}\nOAB/{{estado}} {{numero_oab}}",
  },
  {
    name: "Cláusula LGPD - Consentimento",
    category: "LGPD",
    text: "Em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018), o CONTRATANTE autoriza expressamente o tratamento de seus dados pessoais para as finalidades estritamente necessárias à execução do presente contrato, podendo revogar este consentimento a qualquer tempo, mediante comunicação por escrito.",
  },
  {
    name: "Cláusula de Honorários Advocatícios",
    category: "Contratual",
    text: "Pelos serviços advocatícios prestados, o CONTRATANTE pagará ao CONTRATADO o valor de R$ {{valor}} ({{valor_extenso}}), a título de honorários advocatícios, nos termos do artigo 22 da Lei nº 8.906/1994 (Estatuto da Advocacia e da OAB), a ser pago {{forma_pagamento}}.",
  },
  {
    name: "Pedido de Habeas Corpus",
    category: "Penal",
    text: "Requer a concessão da ordem de HABEAS CORPUS, com pedido liminar, em favor do paciente, determinando-se a expedição de alvará de soltura clausulado, ou subsidiariamente, a aplicação de medidas cautelares diversas da prisão, nos termos do artigo 319 do Código de Processo Penal, por restar evidenciada a ilegalidade/abusividade da prisão, conforme fundamentação supra.",
  },
  {
    name: "Princípio da Presunção de Inocência",
    category: "Constitucional",
    text: "Nos termos do artigo 5º, inciso LVII, da Constituição Federal de 1988, \"ninguém será considerado culpado até o trânsito em julgado de sentença penal condenatória\". Este princípio constitucional da presunção de inocência constitui garantia fundamental do Estado Democrático de Direito, sendo reforçado pelo artigo 283 do Código de Processo Penal e pela jurisprudência consolidada do Supremo Tribunal Federal.",
  },
  {
    name: "Cláusula Penal Compensatória",
    category: "Contratual",
    text: "Em caso de descumprimento de qualquer das obrigações previstas neste contrato, a parte infratora ficará sujeita ao pagamento de multa compensatória no valor equivalente a {{percentual}}% ({{percentual_extenso}} por cento) do valor total do contrato, sem prejuízo da indenização por perdas e danos, nos termos dos artigos 408 a 416 do Código Civil.",
  },
  {
    name: "Verbas Rescisórias Trabalhistas",
    category: "Trabalhista",
    text: "Requer a condenação da Reclamada ao pagamento das seguintes verbas rescisórias: aviso prévio indenizado (art. 487, §1º, CLT), férias proporcionais acrescidas de 1/3 constitucional (arts. 146 e 7º, XVII, CF), 13º salário proporcional (Lei 4.090/62), FGTS com multa de 40% (art. 18, §1º, Lei 8.036/90) e entrega das guias para habilitação no seguro-desemprego (Lei 7.998/90).",
  },
];

/**
 * Seeds the clause library with pre-built clauses if empty.
 */
export function seedDefaultClauses(): void {
  const existing = readAll();
  if (existing.length > 0) return; // Don't overwrite user data

  const now = new Date().toISOString();
  const seeded: SavedClause[] = PREBUILT_CLAUSES.map((c, i) => ({
    ...c,
    id: `prebuilt-${i}-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
    usageCount: 0,
  }));

  writeAll(seeded);
}
