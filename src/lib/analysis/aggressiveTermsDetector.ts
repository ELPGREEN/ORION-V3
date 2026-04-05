// ─── Aggressive Terms Detector ───
// Scans legal documents for aggressive, risky, or unbalanced clauses
// Returns findings with severity, position, and explanation

export interface AggressiveTerm {
  id: string;
  pattern: string;
  matchedText: string;
  category: "penalidade" | "renuncia" | "foro" | "prazo" | "assimetria" | "responsabilidade" | "confidencialidade" | "rescisao";
  severity: "alto" | "medio" | "baixo";
  explanation: string;
  suggestion: string;
  position: number; // char index in plain text
}

interface TermPattern {
  regex: RegExp;
  category: AggressiveTerm["category"];
  severity: AggressiveTerm["severity"];
  explanation: string;
  suggestion: string;
}

const PATTERNS: TermPattern[] = [
  // ── Penalidades excessivas ──
  {
    regex: /multa\s+(?:de\s+)?(\d{2,3})\s*%/gi,
    category: "penalidade",
    severity: "alto",
    explanation: "Multa percentual potencialmente excessiva. Multas acima de 10% podem ser consideradas abusivas.",
    suggestion: "Considere limitar a multa a 2% conforme CDC Art. 52, §1º, ou negociar percentual razoável.",
  },
  {
    regex: /juros\s+(?:de\s+)?(\d+)\s*%\s*(?:ao\s+)?m[eê]s/gi,
    category: "penalidade",
    severity: "alto",
    explanation: "Juros mensais que podem ultrapassar o limite legal de 1% a.m. (Lei de Usura, Decreto 22.626/33).",
    suggestion: "Limitar juros a 1% ao mês conforme legislação vigente.",
  },
  {
    regex: /multa\s+(?:morat[oó]ria\s+)?(?:de\s+)?(?:até\s+)?(\d{2,3})\s*%/gi,
    category: "penalidade",
    severity: "medio",
    explanation: "Multa moratória elevada. O CDC limita a multa moratória a 2%.",
    suggestion: "Adequar ao limite de 2% do CDC ou justificar percentual em relação contratual não-consumerista.",
  },
  {
    regex: /perda\s+(?:total\s+)?(?:de\s+todos?\s+)?(?:os?\s+)?valores?\s+pagos?/gi,
    category: "penalidade",
    severity: "alto",
    explanation: "Cláusula de perda total de valores pagos pode ser considerada abusiva (CDC Art. 51, II).",
    suggestion: "Prever devolução proporcional ou retenção limitada a percentual razoável.",
  },

  // ── Renúncias amplas ──
  {
    regex: /ren[uú]ncia?\s+(?:a\s+)?todos?\s+(?:os?\s+)?direitos?/gi,
    category: "renuncia",
    severity: "alto",
    explanation: "Renúncia ampla e genérica a direitos. Pode ser considerada nula por limitar direitos fundamentais.",
    suggestion: "Especificar quais direitos são objeto de renúncia, com limites claros.",
  },
  {
    regex: /irrevog[aá]vel\s+e\s+irretrat[aá]vel/gi,
    category: "renuncia",
    severity: "medio",
    explanation: "Cláusula de irrevogabilidade e irretratabilidade pode limitar excessivamente a parte.",
    suggestion: "Considerar período de arrependimento ou condições de revogação.",
  },
  {
    regex: /ren[uú]ncia?\s+(?:ao?\s+)?(?:direito\s+de\s+)?(?:recorrer|recurso|ação|a[çc][aã]o\s+judicial)/gi,
    category: "renuncia",
    severity: "alto",
    explanation: "Renúncia ao direito de ação ou recurso viola o princípio da inafastabilidade da jurisdição (CF Art. 5º, XXXV).",
    suggestion: "Remover cláusula — o direito de acesso à justiça é irrenunciável.",
  },
  {
    regex: /abre\s+m[aã]o\s+(?:de\s+)?(?:todo|qualquer|quaisquer)\s+(?:direito|pretens[aã]o|reivindica[çc][aã]o)/gi,
    category: "renuncia",
    severity: "alto",
    explanation: "Renúncia genérica a direitos e pretensões.",
    suggestion: "Limitar a renúncia a pretensões específicas e determinadas.",
  },

  // ── Foro prejudicial ──
  {
    regex: /foro\s+(?:da\s+)?(?:comarca\s+(?:de\s+)?)?(?:São Paulo|Rio de Janeiro|Brasília|capital)/gi,
    category: "foro",
    severity: "baixo",
    explanation: "Eleição de foro em capital pode prejudicar parte domiciliada em outra localidade.",
    suggestion: "Considerar foro do domicílio do réu ou do consumidor, conforme CPC Art. 46 e CDC Art. 101, I.",
  },
  {
    regex: /exclus[aã]o\s+(?:da?\s+)?(?:compet[eê]ncia|jurisdi[çc][aã]o)\s+(?:da?\s+)?justi[çc]a/gi,
    category: "foro",
    severity: "medio",
    explanation: "Tentativa de excluir competência da justiça comum pode ser inválida.",
    suggestion: "Verificar se a cláusula compromissória arbitral atende os requisitos legais (Lei 9.307/96).",
  },

  // ── Prazos irrazoáveis ──
  {
    regex: /prazo\s+(?:de\s+)?(\d+)\s*(?:horas?|h)\s+para\s+(?:responder|manifestar|contestar)/gi,
    category: "prazo",
    severity: "medio",
    explanation: "Prazo em horas para resposta pode ser considerado irrazoável.",
    suggestion: "Estabelecer prazo mínimo em dias úteis, compatível com a complexidade da obrigação.",
  },
  {
    regex: /(?:dever[aá]|obriga[çc][aã]o\s+de)\s+(?:responder|cumprir|entregar)\s+(?:em\s+)?(?:at[eé]\s+)?24\s*(?:horas?|h)/gi,
    category: "prazo",
    severity: "medio",
    explanation: "Prazo de 24 horas pode ser insuficiente dependendo da obrigação.",
    suggestion: "Avaliar razoabilidade do prazo conforme a natureza da obrigação.",
  },
  {
    regex: /renova[çc][aã]o\s+autom[aá]tica\s+(?:por\s+)?(?:prazo\s+)?indeterminado/gi,
    category: "prazo",
    severity: "medio",
    explanation: "Renovação automática por prazo indeterminado pode vincular a parte indefinidamente.",
    suggestion: "Estabelecer prazo determinado para renovação com possibilidade de não-renovação mediante aviso prévio.",
  },

  // ── Assimetrias contratuais ──
  {
    regex: /(?:somente|apenas|exclusivamente)\s+(?:a\s+)?(?:contratante|contratada|parte)\s+(?:poder[aá]|ter[aá]\s+direito)/gi,
    category: "assimetria",
    severity: "medio",
    explanation: "Direito conferido a apenas uma das partes pode gerar desequilíbrio contratual.",
    suggestion: "Considerar reciprocidade de direitos ou justificar a assimetria.",
  },
  {
    regex: /a\s+critério\s+exclusivo\s+(?:da?\s+)?(?:contratante|empresa|locador)/gi,
    category: "assimetria",
    severity: "medio",
    explanation: "Decisão unilateral de uma parte sem critérios objetivos.",
    suggestion: "Estabelecer critérios objetivos ou submeter à concordância mútua.",
  },
  {
    regex: /poder[aá]\s+(?:alterar|modificar|mudar)\s+(?:unilateralmente|a\s+qualquer\s+(?:tempo|momento))\s+(?:as?\s+)?(?:condições|termos|valores|preços)/gi,
    category: "assimetria",
    severity: "alto",
    explanation: "Possibilidade de alteração unilateral de condições contratuais é potencialmente abusiva (CDC Art. 51, XIII).",
    suggestion: "Exigir concordância mútua para alterações ou estabelecer índices objetivos de reajuste.",
  },

  // ── Responsabilidade ──
  {
    regex: /(?:isen[çc][aã]o|exclus[aã]o)\s+(?:total\s+)?(?:de\s+)?responsabilidade/gi,
    category: "responsabilidade",
    severity: "alto",
    explanation: "Isenção total de responsabilidade pode ser nula, especialmente em relações de consumo (CDC Art. 51, I).",
    suggestion: "Limitar responsabilidade a valor razoável ou ao valor do contrato.",
  },
  {
    regex: /sem\s+direito\s+a\s+(?:qualquer\s+)?indeniza[çc][aã]o/gi,
    category: "responsabilidade",
    severity: "medio",
    explanation: "Exclusão de direito a indenização pode ser abusiva.",
    suggestion: "Prever possibilidade de indenização proporcional ao dano efetivo.",
  },
  {
    regex: /n[aã]o\s+(?:se\s+)?responsabiliza\s+(?:por\s+)?(?:danos?\s+)?(?:indiretos?|consequenciais?|lucros?\s+cessantes?)/gi,
    category: "responsabilidade",
    severity: "baixo",
    explanation: "Exclusão de danos indiretos é comum em contratos comerciais, mas deve ser negociada.",
    suggestion: "Avaliar se a exclusão de danos indiretos é adequada ao contexto do contrato.",
  },

  // ── Confidencialidade excessiva ──
  {
    regex: /confidencialidade\s+(?:por\s+)?prazo\s+indeterminado/gi,
    category: "confidencialidade",
    severity: "baixo",
    explanation: "Obrigação de confidencialidade por prazo indeterminado pode ser excessiva.",
    suggestion: "Estabelecer prazo razoável (2-5 anos) para a obrigação de confidencialidade.",
  },
  {
    regex: /n[aã]o[- ]?concorr[eê]ncia\s+(?:por\s+)?(?:prazo\s+)?(?:de\s+)?(\d+)\s+anos?/gi,
    category: "confidencialidade",
    severity: "medio",
    explanation: "Cláusula de não-concorrência deve ser limitada em tempo, espaço e atividade.",
    suggestion: "Limitar a não-concorrência a prazo razoável (máximo 2 anos), região específica e atividade determinada.",
  },

  // ── Rescisão unilateral ──
  {
    regex: /rescis[aã]o\s+(?:unilateral\s+)?(?:sem\s+)?(?:justa\s+)?causa\s+(?:a\s+qualquer\s+(?:tempo|momento)|imediata)/gi,
    category: "rescisao",
    severity: "medio",
    explanation: "Rescisão unilateral sem aviso prévio pode prejudicar a outra parte.",
    suggestion: "Estabelecer aviso prévio mínimo (30-90 dias) e condições de rescisão.",
  },
  {
    regex: /poder[aá]\s+rescindir\s+(?:o\s+)?(?:presente\s+)?(?:contrato|instrumento)\s+(?:a\s+qualquer\s+(?:tempo|momento)|imediatamente)/gi,
    category: "rescisao",
    severity: "medio",
    explanation: "Rescisão imediata sem aviso prévio pode causar prejuízo.",
    suggestion: "Prever aviso prévio e condições para rescisão antecipada.",
  },
];

/**
 * Scan document text for aggressive terms and return findings.
 */
export function detectAggressiveTerms(html: string): AggressiveTerm[] {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const findings: AggressiveTerm[] = [];
  let idCounter = 0;

  for (const pattern of PATTERNS) {
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    let match;
    while ((match = regex.exec(text)) !== null) {
      findings.push({
        id: `agg-${idCounter++}`,
        pattern: pattern.regex.source,
        matchedText: match[0],
        category: pattern.category,
        severity: pattern.severity,
        explanation: pattern.explanation,
        suggestion: pattern.suggestion,
        position: match.index,
      });
    }
  }

  // Sort by severity (alto first) then position
  const severityOrder = { alto: 0, medio: 1, baixo: 2 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || a.position - b.position);

  return findings;
}

const CATEGORY_LABELS: Record<AggressiveTerm["category"], string> = {
  penalidade: "Penalidade",
  renuncia: "Renúncia",
  foro: "Foro",
  prazo: "Prazo",
  assimetria: "Assimetria",
  responsabilidade: "Responsabilidade",
  confidencialidade: "Confidencialidade",
  rescisao: "Rescisão",
};

export function getCategoryLabel(category: AggressiveTerm["category"]): string {
  return CATEGORY_LABELS[category] || category;
}
