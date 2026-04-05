// ─── Keyword Extractor (Simplified TextRank) ───
// Extracts legal keywords and detects document themes

import { tokenize, termFrequency } from "./textSimilarity";

export interface KeywordResult {
  term: string;
  score: number;
}

export interface DetectedTheme {
  label: string;
  keywords: string[];
  score: number;
}

export interface LegislationRank {
  lei: string;
  sigla: string;
  score: number;
  artigos_detectados: string[];
}

export interface ArticleReference {
  artigo: string;
  lei?: string;
  raw: string;
}

// ─── Legal bigrams / collocations that form meaningful units ───
const LEGAL_COLLOCATIONS = [
  "responsabilidade civil", "dano moral", "dano material", "boa fé",
  "devido processo", "ampla defesa", "contraditório", "tutela antecipada",
  "liminar", "medida cautelar", "ação civil", "ação penal", "ação popular",
  "mandado segurança", "habeas corpus", "habeas data", "direito adquirido",
  "ato jurídico", "coisa julgada", "litispendência", "conexão",
  "competência territorial", "competência absoluta", "competência relativa",
  "direito consumidor", "relação consumo", "vício produto", "fato serviço",
  "rescisão contratual", "inadimplemento", "mora", "resolução contrato",
  "dosimetria pena", "regime fechado", "regime semiaberto", "regime aberto",
  "progressão regime", "prisão preventiva", "liberdade provisória",
  "fiança", "crime hediondo", "tráfico drogas", "associação criminosa",
  "lavagem dinheiro", "sonegação fiscal", "execução fiscal",
  "contribuição previdenciária", "benefício previdenciário",
  "aposentadoria", "pensão morte", "auxílio doença",
  "usucapião", "direito propriedade", "posse", "desapropriação",
  "servidão", "hipoteca", "alienação fiduciária",
  "guarda compartilhada", "pensão alimentícia", "divórcio",
  "união estável", "poder familiar", "adoção",
  "licitação", "contrato administrativo", "improbidade administrativa",
  "servidor público", "concurso público", "estabilidade",
  "direito ambiental", "licenciamento ambiental", "área preservação",
  "recurso especial", "recurso extraordinário", "agravo instrumento",
  "embargos declaração", "apelação", "recurso ordinário",
];

// ─── Theme definitions: label → characteristic terms ───
const THEME_DEFINITIONS: { label: string; terms: string[] }[] = [
  { label: "Responsabilidade Civil", terms: ["responsabilidade", "civil", "dano", "moral", "material", "indenização", "culpa", "nexo", "causal"] },
  { label: "Direito do Consumidor", terms: ["consumidor", "fornecedor", "produto", "serviço", "cdc", "vício", "defeito", "recall", "propaganda"] },
  { label: "Direito Penal", terms: ["crime", "penal", "pena", "dolo", "culpa", "tipicidade", "antijuridicidade", "culpabilidade", "dosimetria", "réu", "acusado"] },
  { label: "Direito Trabalhista", terms: ["trabalho", "trabalhista", "empregado", "empregador", "salário", "demissão", "rescisão", "clt", "férias", "fgts"] },
  { label: "Direito de Família", terms: ["família", "guarda", "alimentícia", "divórcio", "união", "estável", "familiar", "adoção", "pensão"] },
  { label: "Direito Administrativo", terms: ["administrativo", "licitação", "servidor", "público", "improbidade", "concurso", "estabilidade", "ato"] },
  { label: "Direito Constitucional", terms: ["constitucional", "constituição", "fundamental", "liberdade", "dignidade", "igualdade", "federação"] },
  { label: "Direito Tributário", terms: ["tributário", "tributo", "imposto", "contribuição", "fiscal", "sonegação", "execução", "dívida", "ativa"] },
  { label: "Direito Processual Civil", terms: ["processo", "processual", "civil", "petição", "contestação", "recurso", "apelação", "agravo", "sentença", "citação"] },
  { label: "Direito Processual Penal", terms: ["processual", "penal", "inquérito", "denúncia", "prisão", "preventiva", "liberdade", "provisória", "habeas"] },
  { label: "Direito Ambiental", terms: ["ambiental", "meio", "ambiente", "licenciamento", "preservação", "fauna", "flora", "poluição"] },
  { label: "Direito Previdenciário", terms: ["previdenciário", "previdência", "aposentadoria", "benefício", "inss", "pensão", "morte", "auxílio", "doença"] },
  { label: "Direito Imobiliário", terms: ["imóvel", "imobiliário", "usucapião", "propriedade", "posse", "registro", "hipoteca", "locação", "despejo"] },
];

// ─── Legislation Database for Top-N Ranking ───
const LEGISLATION_DB: Array<{ lei: string; sigla: string; terms: string[] }> = [
  { lei: "Constituição Federal de 1988", sigla: "CF/88", terms: ["constituição", "constitucional", "fundamental", "federação", "república", "dignidade", "igualdade", "liberdade", "cidadania"] },
  { lei: "Código Civil de 2002", sigla: "CC/2002", terms: ["civil", "obrigação", "contrato", "propriedade", "família", "sucessão", "responsabilidade", "pessoa", "negócio", "jurídico"] },
  { lei: "Código de Processo Civil de 2015", sigla: "CPC/2015", terms: ["processo", "processual", "petição", "contestação", "sentença", "recurso", "apelação", "agravo", "tutela", "citação", "intimação"] },
  { lei: "Código Penal", sigla: "CP", terms: ["crime", "penal", "pena", "dolo", "culpa", "tipicidade", "ilicitude", "culpabilidade", "furto", "roubo", "homicídio", "lesão"] },
  { lei: "Código de Processo Penal", sigla: "CPP", terms: ["inquérito", "denúncia", "prisão", "flagrante", "preventiva", "fiança", "habeas", "corpus", "júri", "audiência"] },
  { lei: "Consolidação das Leis do Trabalho", sigla: "CLT", terms: ["trabalho", "trabalhista", "empregado", "empregador", "salário", "férias", "fgts", "rescisão", "jornada", "clt"] },
  { lei: "Código de Defesa do Consumidor", sigla: "CDC", terms: ["consumidor", "fornecedor", "produto", "serviço", "defeito", "vício", "propaganda", "enganosa", "abusiva", "cdc"] },
  { lei: "Lei de Execução Penal", sigla: "LEP", terms: ["execução", "penal", "preso", "progressão", "regime", "livramento", "condicional", "remição", "saída", "temporária"] },
  { lei: "Estatuto da Criança e do Adolescente", sigla: "ECA", terms: ["criança", "adolescente", "menor", "eca", "proteção", "integral", "conselho", "tutelar", "medida", "socioeducativa"] },
  { lei: "Código Tributário Nacional", sigla: "CTN", terms: ["tributário", "tributo", "imposto", "taxa", "contribuição", "fato", "gerador", "lançamento", "crédito", "ctn"] },
  { lei: "Lei de Improbidade Administrativa", sigla: "LIA", terms: ["improbidade", "administrativa", "enriquecimento", "ilícito", "dano", "erário", "princípio", "administrativo"] },
  { lei: "Lei de Licitações (14.133/2021)", sigla: "Lei 14.133/21", terms: ["licitação", "pregão", "concorrência", "contrato", "administrativo", "edital", "dispensa", "inexigibilidade"] },
  { lei: "Estatuto da OAB", sigla: "Lei 8.906/94", terms: ["advogado", "oab", "honorários", "ética", "prerrogativa", "inscrição", "mandato", "substabelecimento"] },
  { lei: "Lei Geral de Proteção de Dados", sigla: "LGPD", terms: ["dados", "pessoais", "lgpd", "tratamento", "consentimento", "controlador", "operador", "privacidade", "proteção"] },
  { lei: "Lei Maria da Penha", sigla: "Lei 11.340/06", terms: ["violência", "doméstica", "familiar", "mulher", "medida", "protetiva", "afastamento", "maria", "penha"] },
  { lei: "Lei de Drogas", sigla: "Lei 11.343/06", terms: ["drogas", "tráfico", "entorpecente", "substância", "ilícita", "porte", "uso", "associação"] },
  { lei: "Estatuto do Idoso", sigla: "Lei 10.741/03", terms: ["idoso", "envelhecimento", "prioridade", "atendimento", "saúde", "assistência"] },
  { lei: "Lei de Falências e Recuperação Judicial", sigla: "Lei 11.101/05", terms: ["falência", "recuperação", "judicial", "credor", "massa", "falida", "plano"] },
  { lei: "Marco Civil da Internet", sigla: "Lei 12.965/14", terms: ["internet", "neutralidade", "rede", "provedor", "conteúdo", "remoção", "dados", "marco", "civil"] },
  { lei: "Lei do Mandado de Segurança", sigla: "Lei 12.016/09", terms: ["mandado", "segurança", "líquido", "certo", "autoridade", "coatora", "liminar"] },
  { lei: "Lei de Ação Civil Pública", sigla: "Lei 7.347/85", terms: ["ação", "civil", "pública", "coletivo", "difuso", "individual", "homogêneo", "inquérito"] },
  { lei: "Código Eleitoral", sigla: "Cód. Eleitoral", terms: ["eleição", "eleitoral", "candidato", "partido", "propaganda", "voto", "registro"] },
  { lei: "Código Penal Militar", sigla: "CPM", terms: ["militar", "penal", "deserção", "insubordinação", "crime", "militar"] },
  { lei: "Lei de Locações", sigla: "Lei 8.245/91", terms: ["locação", "aluguel", "locador", "locatário", "despejo", "retomada", "fiador", "imóvel"] },
  { lei: "Lei do Inquilinato", sigla: "Lei 8.245/91", terms: ["inquilino", "aluguel", "locação", "despejo", "contrato"] },
  { lei: "Lei Anticorrupção", sigla: "Lei 12.846/13", terms: ["corrupção", "pessoa", "jurídica", "leniência", "acordo", "responsabilização"] },
  { lei: "Lei de Abuso de Autoridade", sigla: "Lei 13.869/19", terms: ["abuso", "autoridade", "agente", "público", "constrangimento"] },
  { lei: "Lei Previdenciária (8.213/91)", sigla: "Lei 8.213/91", terms: ["previdenciário", "aposentadoria", "benefício", "inss", "pensão", "auxílio", "incapacidade"] },
  { lei: "Lei de Execução Fiscal", sigla: "Lei 6.830/80", terms: ["execução", "fiscal", "dívida", "ativa", "certidão", "fazenda", "pública"] },
  { lei: "Estatuto da Pessoa com Deficiência", sigla: "Lei 13.146/15", terms: ["deficiência", "acessibilidade", "inclusão", "barreira", "capacidade"] },
];

/** Extract collocations (bigrams) found in text */
function extractCollocations(text: string): Map<string, number> {
  const lower = text.toLowerCase();
  const found = new Map<string, number>();
  for (const col of LEGAL_COLLOCATIONS) {
    const regex = new RegExp(col.replace(/\s+/g, "\\s+"), "gi");
    const matches = lower.match(regex);
    if (matches) {
      found.set(col, matches.length);
    }
  }
  return found;
}

/** Extract top-N keywords using term frequency + collocation boosting */
export function extractKeywords(text: string, topN = 15): KeywordResult[] {
  const tokens = tokenize(text);
  if (tokens.length === 0) return [];

  const tf = termFrequency(tokens);
  const collocations = extractCollocations(text);

  // Score = tf normalized + collocation bonus
  const maxTf = Math.max(...tf.values());
  const scored = new Map<string, number>();

  for (const [term, freq] of tf) {
    scored.set(term, freq / maxTf);
  }

  // Boost collocation component terms
  for (const [col, count] of collocations) {
    const parts = col.split(/\s+/);
    for (const p of parts) {
      const current = scored.get(p) || 0;
      scored.set(p, current + count * 0.3);
    }
    // Also add the full collocation
    scored.set(col, (count / maxTf) * 1.5);
  }

  return Array.from(scored.entries())
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}

/** Detect document themes based on term overlap with predefined theme clusters */
export function detectThemes(text: string, topN = 5): DetectedTheme[] {
  const tokens = tokenize(text);
  if (tokens.length < 10) return [];

  const tokenSet = new Set(tokens);
  const tf = termFrequency(tokens);
  const maxTf = Math.max(...tf.values(), 1);

  const themes: DetectedTheme[] = [];

  for (const def of THEME_DEFINITIONS) {
    const matchedTerms = def.terms.filter((t) => tokenSet.has(t));
    if (matchedTerms.length === 0) continue;

    // Score based on coverage of theme terms + their frequency
    const coverage = matchedTerms.length / def.terms.length;
    const freqBoost = matchedTerms.reduce((sum, t) => sum + (tf.get(t) || 0) / maxTf, 0) / matchedTerms.length;
    const score = coverage * 0.6 + freqBoost * 0.4;

    if (score > 0.05) {
      themes.push({ label: def.label, keywords: matchedTerms, score });
    }
  }

  return themes.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ─── Top-N Legislation Ranking by TF-IDF ───

/** Rank applicable legislation based on TF-IDF scoring against the text */
export function rankLegislation(text: string, topN = 10): LegislationRank[] {
  const tokens = tokenize(text);
  if (tokens.length < 5) return [];

  const tokenSet = new Set(tokens);
  const tf = termFrequency(tokens);
  const maxTf = Math.max(...tf.values(), 1);
  const totalDocs = LEGISLATION_DB.length;

  const results: LegislationRank[] = [];

  for (const leg of LEGISLATION_DB) {
    const matchedTerms = leg.terms.filter((t) => tokenSet.has(t));
    if (matchedTerms.length === 0) continue;

    // TF-IDF: term frequency in text × inverse document frequency across legislation DB
    let tfidfScore = 0;
    for (const term of matchedTerms) {
      const termTf = (tf.get(term) || 0) / maxTf;
      // IDF: how many legislation entries contain this term
      const docsWithTerm = LEGISLATION_DB.filter((l) => l.terms.includes(term)).length;
      const idf = Math.log(totalDocs / (1 + docsWithTerm));
      tfidfScore += termTf * idf;
    }

    // Coverage bonus
    const coverage = matchedTerms.length / leg.terms.length;
    const finalScore = tfidfScore * 0.7 + coverage * 0.3;

    // Detect specific article references for this legislation
    const artigos = detectArticleReferences(text)
      .filter((ref) => {
        if (!ref.lei) return false;
        return ref.lei.toLowerCase().includes(leg.sigla.toLowerCase()) ||
               leg.sigla.toLowerCase().includes(ref.lei.toLowerCase());
      })
      .map((ref) => ref.raw);

    if (finalScore > 0.02) {
      results.push({ lei: leg.lei, sigla: leg.sigla, score: finalScore, artigos_detectados: artigos });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, topN);
}

/** Extract article references from text (e.g., "Art. 5º", "art. 319 CPC") */
export function detectArticleReferences(text: string): ArticleReference[] {
  const refs: ArticleReference[] = [];
  // Pattern: "Art. 5º", "art. 319", "Arts. 1.009 a 1.014", "§ 2º"
  const artPattern = /\b[Aa]rts?\.\s*(\d[\d.]*[ºo°]?(?:\s*(?:a|e|,)\s*\d[\d.]*[ºo°]?)*)\s*(?:,?\s*(?:d[oa]s?\s+)?([A-Z][A-Za-z\/\d.]+))?/g;
  let match;
  while ((match = artPattern.exec(text)) !== null) {
    refs.push({
      artigo: match[1].trim(),
      lei: match[2]?.trim(),
      raw: match[0].trim(),
    });
  }

  // Pattern: "§ 1º", "§§ 1º e 2º"
  const paraPattern = /§§?\s*(\d+[ºo°]?(?:\s*(?:a|e|,)\s*\d+[ºo°]?)*)/g;
  while ((match = paraPattern.exec(text)) !== null) {
    refs.push({
      artigo: `§ ${match[1].trim()}`,
      raw: match[0].trim(),
    });
  }

  // Deduplicate by raw
  const seen = new Set<string>();
  return refs.filter((r) => {
    if (seen.has(r.raw)) return false;
    seen.add(r.raw);
    return true;
  });
}
