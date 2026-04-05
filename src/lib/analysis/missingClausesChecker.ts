// ─── Missing Clauses Checker ───
// Verifies mandatory clauses/sections for each document type
// Returns checklist of present/missing items with suggestions

export interface ClauseCheck {
  id: string;
  label: string;
  present: boolean;
  required: boolean;
  suggestion?: string;
  category: string;
}

export interface ClauseCheckResult {
  documentType: string;
  checks: ClauseCheck[];
  presentCount: number;
  missingRequired: number;
  completeness: number; // 0-100
}

interface ClauseDefinition {
  id: string;
  label: string;
  required: boolean;
  patterns: RegExp[];
  suggestion: string;
  category: string;
}

const CLAUSE_DEFINITIONS: Record<string, ClauseDefinition[]> = {
  // ── Contratos ──
  contrato: [
    { id: "objeto", label: "Objeto do Contrato", required: true, category: "Essencial",
      patterns: [/objeto\s+(?:do\s+)?(?:presente\s+)?contrato/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:do\s+)?objeto/i, /tem\s+por\s+objeto/i],
      suggestion: "CLÁUSULA [N] – DO OBJETO\nO presente contrato tem por objeto [descrever o objeto do contrato de forma clara e específica]." },
    { id: "preco", label: "Preço / Remuneração", required: true, category: "Essencial",
      patterns: [/pre[çc]o|remunera[çc][aã]o|valor|pagamento|honor[aá]rios/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:do\s+)?(?:pre[çc]o|valor|pagamento)/i],
      suggestion: "CLÁUSULA [N] – DO PREÇO E FORMA DE PAGAMENTO\nPelo objeto do presente contrato, a CONTRATANTE pagará à CONTRATADA o valor de R$ [valor], a ser pago [forma de pagamento]." },
    { id: "prazo", label: "Prazo / Vigência", required: true, category: "Essencial",
      patterns: [/prazo|vig[eê]ncia|dura[çc][aã]o/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:do\s+)?prazo/i],
      suggestion: "CLÁUSULA [N] – DO PRAZO\nO presente contrato terá vigência de [prazo], iniciando-se em [data] e encerrando-se em [data]." },
    { id: "rescisao", label: "Rescisão", required: true, category: "Essencial",
      patterns: [/rescis[aã]o|resili[çc][aã]o|extin[çc][aã]o/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:da\s+)?rescis[aã]o/i],
      suggestion: "CLÁUSULA [N] – DA RESCISÃO\nO presente contrato poderá ser rescindido por qualquer das partes, mediante aviso prévio de [prazo] dias, sem ônus." },
    { id: "foro", label: "Foro", required: true, category: "Essencial",
      patterns: [/foro|(?:cl[aá]usula|elei[çc][aã]o)\s+(?:de\s+)?foro|comarca/i],
      suggestion: "CLÁUSULA [N] – DO FORO\nFica eleito o foro da Comarca de [cidade/UF] para dirimir quaisquer dúvidas oriundas do presente contrato." },
    { id: "sigilo", label: "Confidencialidade / Sigilo", required: false, category: "Recomendada",
      patterns: [/sigilo|confidencial|segredo|n[aã]o[- ]divulga[çc][aã]o/i],
      suggestion: "CLÁUSULA [N] – DA CONFIDENCIALIDADE\nAs partes se comprometem a manter sigilo sobre todas as informações confidenciais trocadas em razão do presente contrato." },
    { id: "lgpd", label: "LGPD / Proteção de Dados", required: false, category: "Recomendada",
      patterns: [/lgpd|lei\s+geral\s+de\s+prote[çc][aã]o|dados\s+pessoais|lei\s+n?[°º.]?\s*13\.?709/i],
      suggestion: "CLÁUSULA [N] – DA PROTEÇÃO DE DADOS\nAs partes se comprometem a observar a Lei nº 13.709/2018 (LGPD) no tratamento de dados pessoais decorrentes deste contrato." },
    { id: "penalidades", label: "Penalidades / Multas", required: false, category: "Recomendada",
      patterns: [/penalidade|multa|san[çc][oõ]es|infra[çc][oõ]es/i],
      suggestion: "CLÁUSULA [N] – DAS PENALIDADES\nO descumprimento de qualquer cláusula contratual sujeitará a parte infratora ao pagamento de multa de [valor/percentual]." },
    { id: "disposicoes", label: "Disposições Gerais", required: false, category: "Recomendada",
      patterns: [/disposi[çc][oõ]es\s+gerais|disposi[çc][oõ]es\s+finais/i],
      suggestion: "CLÁUSULA [N] – DAS DISPOSIÇÕES GERAIS\nOs casos omissos serão resolvidos de comum acordo entre as partes." },
    // ── CUAD-Inspired Categories (Brazilian adaptation) ──
    { id: "indenizacao", label: "Indenização / Limitação de Responsabilidade", required: false, category: "CUAD",
      patterns: [/indeniza[çc][aã]o|limita[çc][aã]o\s+(?:de\s+)?responsabilidade|responsabilidade\s+civil|danos?\s+(?:materiais?|morais?)/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:da\s+)?(?:indeniza[çc][aã]o|responsabilidade)/i],
      suggestion: "CLÁUSULA [N] – DA INDENIZAÇÃO\nA parte que causar danos à outra, por descumprimento contratual, ficará obrigada a indenizá-la pelos prejuízos comprovados, limitada ao valor total do contrato." },
    { id: "nao_concorrencia", label: "Não-Concorrência / Não-Solicitação", required: false, category: "CUAD",
      patterns: [/n[aã]o[- ]?concorr[eê]ncia|n[aã]o[- ]?solicita[çc][aã]o|n[aã]o[- ]?competi[çc][aã]o|compete\s+com/i],
      suggestion: "CLÁUSULA [N] – DA NÃO-CONCORRÊNCIA\nDurante a vigência deste contrato e pelo período de [prazo] após seu término, a CONTRATADA se compromete a não exercer atividades concorrentes, limitada à região de [localidade]." },
    { id: "propriedade_intelectual", label: "Propriedade Intelectual", required: false, category: "CUAD",
      patterns: [/propriedade\s+intelectual|direitos?\s+autorais?|patente|marca|software|c[oó]digo[- ]?fonte|obra\s+intelectual|PI\b/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:da\s+)?propriedade\s+intelectual/i],
      suggestion: "CLÁUSULA [N] – DA PROPRIEDADE INTELECTUAL\nTodos os direitos de propriedade intelectual sobre os produtos e serviços desenvolvidos em razão deste contrato pertencem exclusivamente à [parte]." },
    { id: "seguro_garantias", label: "Seguro / Garantias", required: false, category: "CUAD",
      patterns: [/seguro|garantia\s+(?:contratual|financeira|banc[aá]ria)|cau[çc][aã]o|fiança|seguro\s+de\s+responsabilidade/i],
      suggestion: "CLÁUSULA [N] – DAS GARANTIAS\nA CONTRATADA deverá apresentar garantia contratual no valor de [percentual]% do valor total do contrato, na modalidade de [caução/fiança/seguro-garantia]." },
    { id: "auditoria", label: "Direito de Auditoria", required: false, category: "CUAD",
      patterns: [/auditoria|fiscaliza[çc][aã]o|inspe[çc][aã]o|direito\s+de\s+(?:acesso|verifica[çc][aã]o)/i],
      suggestion: "CLÁUSULA [N] – DA AUDITORIA\nA CONTRATANTE poderá, a qualquer tempo, realizar auditorias e inspeções para verificar o cumprimento das obrigações contratuais, mediante aviso prévio de [prazo] dias." },
    { id: "forca_maior", label: "Força Maior / Caso Fortuito", required: false, category: "CUAD",
      patterns: [/for[çc]a\s+maior|caso\s+fortuito|evento\s+(?:imprev|extraordin)/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:da\s+)?for[çc]a\s+maior/i],
      suggestion: "CLÁUSULA [N] – DA FORÇA MAIOR\nNenhuma das partes será responsável pelo descumprimento de suas obrigações quando decorrente de caso fortuito ou força maior, nos termos do Art. 393 do Código Civil." },
    { id: "cessao", label: "Cessão / Transferência", required: false, category: "CUAD",
      patterns: [/cess[aã]o|transfer[eê]ncia|ceder|sub[- ]?contrata[çc][aã]o|sub[- ]?rogar/i],
      suggestion: "CLÁUSULA [N] – DA CESSÃO\nO presente contrato não poderá ser cedido ou transferido a terceiros sem o prévio e expresso consentimento da outra parte." },
    { id: "renovacao", label: "Renovação Automática", required: false, category: "CUAD",
      patterns: [/renova[çc][aã]o\s+(?:autom[aá]tica|t[aá]cita)|prorroga[çc][aã]o\s+autom[aá]tica|renovar[- ]?se[- ]?[aá]/i],
      suggestion: "CLÁUSULA [N] – DA RENOVAÇÃO\nO presente contrato será automaticamente renovado por períodos iguais e sucessivos, salvo manifestação contrária de qualquer das partes com antecedência mínima de [prazo] dias." },
    { id: "lei_aplicavel", label: "Lei Aplicável", required: false, category: "CUAD",
      patterns: [/lei\s+aplic[aá]vel|legisla[çc][aã]o\s+(?:aplic[aá]vel|brasileira)|rege[- ]?se\s+(?:pela|pelas)|regido\s+pela/i],
      suggestion: "CLÁUSULA [N] – DA LEI APLICÁVEL\nO presente contrato rege-se pelas leis da República Federativa do Brasil." },
    { id: "notificacoes", label: "Notificações", required: false, category: "CUAD",
      patterns: [/notifica[çc][oõ]es|comunica[çc][oõ]es\s+(?:entre|das)\s+partes|endere[çc]o\s+para\s+correspond[eê]ncia/i],
      suggestion: "CLÁUSULA [N] – DAS NOTIFICAÇÕES\nTodas as notificações e comunicações serão feitas por escrito e enviadas ao endereço indicado no preâmbulo deste contrato." },
    { id: "aditamento", label: "Aditamento / Alterações", required: false, category: "CUAD",
      patterns: [/aditamento|aditivo|altera[çc][oõ]es?\s+contratua/i, /cl[aá]usula\s+(?:\d+[ªaº.]?\s*[-–:]?\s*)?(?:d[oa]s?\s+)?(?:aditamento|altera[çc][oõ]es)/i],
      suggestion: "CLÁUSULA [N] – DOS ADITAMENTOS\nQuaisquer alterações ao presente contrato somente serão válidas se formalizadas por meio de termo aditivo assinado por ambas as partes." },
    { id: "anticorrupcao", label: "Anticorrupção / Compliance", required: false, category: "CUAD",
      patterns: [/anticorrup[çc][aã]o|compliance|lei\s+(?:n?[°º.]?\s*)?12\.?846|integridade|pr[aá]ticas\s+(?:il[ií]citas|corruptas)/i],
      suggestion: "CLÁUSULA [N] – ANTICORRUPÇÃO\nAs partes declaram conhecer e se comprometem a cumprir a Lei nº 12.846/2013 (Lei Anticorrupção), abstendo-se de qualquer prática que constitua ato lesivo à administração pública." },
  ],

  // ── Petições Judiciais ──
  peticao_inicial: [
    { id: "qualificacao", label: "Qualificação das Partes", required: true, category: "Essencial",
      patterns: [/qualifica[çc][aã]o|(?:autor|requerente|demandante).*(?:nacionalidade|estado\s+civil|profiss[aã]o|cpf|rg)/i, /vem\s+(?:respeitosamente|perante)/i],
      suggestion: "[NOME], [nacionalidade], [estado civil], [profissão], portador(a) do RG nº [número] e CPF nº [número], residente e domiciliado(a) em [endereço]." },
    { id: "fatos", label: "Dos Fatos", required: true, category: "Essencial",
      patterns: [/dos?\s+fatos|da\s+narrativa|do\s+hist[oó]rico|fato\s+\d/i],
      suggestion: "II – DOS FATOS\n[Narrar os fatos relevantes em ordem cronológica]" },
    { id: "direito", label: "Do Direito / Fundamentação", required: true, category: "Essencial",
      patterns: [/do\s+direito|da\s+fundamenta[çc][aã]o|fundamento\s+jur[ií]dico/i],
      suggestion: "III – DO DIREITO\n[Apresentar os fundamentos jurídicos que amparam o pedido]" },
    { id: "pedidos", label: "Dos Pedidos", required: true, category: "Essencial",
      patterns: [/dos?\s+pedidos?|requer|pede\s+deferimento|ante\s+o\s+exposto/i],
      suggestion: "IV – DOS PEDIDOS\nAnte o exposto, requer:\na) [pedido 1];\nb) [pedido 2];\nc) a condenação da parte ré ao pagamento das custas processuais e honorários advocatícios." },
    { id: "valor_causa", label: "Valor da Causa", required: true, category: "Essencial",
      patterns: [/valor\s+(?:da\s+)?causa|d[aá]\s+[àa]\s+causa\s+o\s+valor/i],
      suggestion: "Dá-se à causa o valor de R$ [valor]." },
    { id: "provas", label: "Provas", required: false, category: "Recomendada",
      patterns: [/das?\s+provas?|produzir\s+(?:todas?\s+)?(?:as?\s+)?provas?|prova\s+(?:testemunhal|documental|pericial)/i],
      suggestion: "Requer a produção de todas as provas admitidas em direito, em especial documental, testemunhal e pericial." },
    { id: "tutela", label: "Tutela de Urgência", required: false, category: "Recomendada",
      patterns: [/tutela\s+(?:de\s+)?(?:urg[eê]ncia|antecipada|provis[oó]ria)|liminar|medida\s+cautelar/i],
      suggestion: "V – DA TUTELA DE URGÊNCIA\nRequer a concessão de tutela de urgência, nos termos do Art. 300 do CPC, ante a probabilidade do direito e o perigo de dano." },
  ],

  // ── Contestação ──
  contestacao: [
    { id: "tempestividade", label: "Tempestividade", required: false, category: "Formal",
      patterns: [/tempestiv|dentro\s+do\s+prazo|no\s+prazo\s+legal/i],
      suggestion: "I – DA TEMPESTIVIDADE\nA presente contestação é tempestiva, apresentada dentro do prazo legal de 15 (quinze) dias úteis." },
    { id: "preliminares", label: "Preliminares", required: false, category: "Formal",
      patterns: [/preliminar|inépcia|ilegitimidade|incompet[eê]ncia/i],
      suggestion: "II – DAS PRELIMINARES\n[Arguir questões preliminares, se houver]" },
    { id: "merito", label: "Mérito", required: true, category: "Essencial",
      patterns: [/do\s+m[eé]rito|no\s+m[eé]rito|quanto\s+ao\s+m[eé]rito/i],
      suggestion: "III – DO MÉRITO\n[Apresentar defesa quanto ao mérito]" },
    { id: "pedidos", label: "Dos Pedidos", required: true, category: "Essencial",
      patterns: [/dos?\s+pedidos?|requer|pede\s+deferimento|ante\s+o\s+exposto/i],
      suggestion: "IV – DOS PEDIDOS\nAnte o exposto, requer a total improcedência dos pedidos formulados na inicial." },
  ],

  // ── Procuração ──
  procuracao: [
    { id: "outorgante", label: "Outorgante", required: true, category: "Essencial",
      patterns: [/outorgante|mandante|constituinte/i],
      suggestion: "OUTORGANTE: [Nome completo], [qualificação completa]" },
    { id: "outorgado", label: "Outorgado", required: true, category: "Essencial",
      patterns: [/outorgad[oa]|mandat[aá]rio|procurador/i],
      suggestion: "OUTORGADO: [Nome do advogado], inscrito na OAB/[UF] sob o nº [número]" },
    { id: "poderes", label: "Poderes", required: true, category: "Essencial",
      patterns: [/poderes|ad\s+judicia|foro\s+em\s+geral|cl[aá]usula\s+ad\s+judicia/i],
      suggestion: "PODERES: Para o foro em geral, com a cláusula 'ad judicia et extra', podendo [especificar poderes especiais se necessário]." },
    { id: "vigencia", label: "Vigência", required: false, category: "Recomendada",
      patterns: [/vig[eê]ncia|prazo|validade|dura[çc][aã]o/i],
      suggestion: "A presente procuração terá validade de [prazo] a contar desta data." },
    { id: "substabelecimento", label: "Substabelecimento", required: false, category: "Recomendada",
      patterns: [/substabelec/i],
      suggestion: "Com poderes para substabelecer com ou sem reserva de iguais poderes." },
  ],

  // ── Recurso ──
  recurso: [
    { id: "cabimento", label: "Cabimento / Admissibilidade", required: true, category: "Essencial",
      patterns: [/cabimento|admissibilidade|tempestiv/i],
      suggestion: "I – DO CABIMENTO\nO presente recurso é cabível nos termos do Art. [artigo] do CPC, sendo tempestivo e adequado." },
    { id: "razoes", label: "Razões do Recurso", required: true, category: "Essencial",
      patterns: [/raz[oõ]es|fundamentos?\s+(?:do\s+)?recurso|error\s+in/i],
      suggestion: "II – DAS RAZÕES DO RECURSO\n[Apresentar as razões para reforma da decisão]" },
    { id: "pedido_reforma", label: "Pedido de Reforma", required: true, category: "Essencial",
      patterns: [/reform|anula[çc][aã]o|provimento|dar\s+provimento/i],
      suggestion: "III – DO PEDIDO\nAnte o exposto, requer o conhecimento e provimento do presente recurso para reformar a decisão recorrida." },
  ],

  // ── Habeas Corpus ──
  habeas_corpus: [
    { id: "autoridade", label: "Autoridade Coatora", required: true, category: "Essencial",
      patterns: [/autoridade\s+coator|impetrad[oa]|coator/i],
      suggestion: "AUTORIDADE COATORA: [Identificação da autoridade que pratica ou ameaça a coação]" },
    { id: "paciente", label: "Paciente", required: true, category: "Essencial",
      patterns: [/paciente|pessoa\s+(?:presa|detida|ameaçada)/i],
      suggestion: "PACIENTE: [Nome completo], [qualificação]" },
    { id: "constrangimento", label: "Constrangimento Ilegal", required: true, category: "Essencial",
      patterns: [/constrangimento\s+ilegal|ilegalidade|abuso\s+de\s+poder|coa[çc][aã]o/i],
      suggestion: "DO CONSTRANGIMENTO ILEGAL: [Descrever a ilegalidade ou abuso de poder]" },
  ],
};

/**
 * Check for missing clauses in a document based on its type.
 */
export function checkMissingClauses(html: string, documentType?: string): ClauseCheckResult {
  const type = normalizeDocumentType(documentType || "");
  const definitions = CLAUSE_DEFINITIONS[type] || [];

  if (definitions.length === 0) {
    return {
      documentType: type || "desconhecido",
      checks: [],
      presentCount: 0,
      missingRequired: 0,
      completeness: 100,
    };
  }

  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const checks: ClauseCheck[] = [];

  for (const def of definitions) {
    const present = def.patterns.some((p) => p.test(text));
    checks.push({
      id: def.id,
      label: def.label,
      present,
      required: def.required,
      suggestion: def.suggestion,
      category: def.category,
    });
  }

  const presentCount = checks.filter((c) => c.present).length;
  const requiredChecks = checks.filter((c) => c.required);
  const missingRequired = requiredChecks.filter((c) => !c.present).length;
  const completeness = checks.length > 0 ? Math.round((presentCount / checks.length) * 100) : 100;

  return {
    documentType: type,
    checks,
    presentCount,
    missingRequired,
    completeness,
  };
}

function normalizeDocumentType(type: string): string {
  const lower = type.toLowerCase().trim();
  
  if (/contrato|acordo|aditivo|distrato|termo\s+de\s+compromisso|nda/i.test(lower)) return "contrato";
  if (/peti[çc][aã]o\s+inicial|a[çc][aã]o|inicial/i.test(lower)) return "peticao_inicial";
  if (/contesta[çc][aã]o|defesa/i.test(lower)) return "contestacao";
  if (/procura[çc][aã]o|mandato/i.test(lower)) return "procuracao";
  if (/recurso|apela[çc][aã]o|agravo|embargos/i.test(lower)) return "recurso";
  if (/habeas\s+corpus|hc/i.test(lower)) return "habeas_corpus";
  
  // Try key from CLAUSE_DEFINITIONS directly
  if (CLAUSE_DEFINITIONS[lower]) return lower;
  
  return "";
}

/**
 * Get supported document types for the missing clauses checker.
 */
export function getSupportedDocumentTypes(): string[] {
  return Object.keys(CLAUSE_DEFINITIONS);
}
