/**
 * Quality Pipeline — Scan estrutural de output de IA + cálculo de quality score.
 * Enhanced v2: deeper legal analysis, completeness checks, citation validation.
 */

export function scanAndFixHeadings(html: string, preserveUserStructure?: boolean): string {
  if (preserveUserStructure) return html;
  let result = html;

  // Detecta parágrafos que são títulos (>70% maiúsculas, sem pontuação final)
  const titleRegex = /<p[^>]*>([^<]{5,120})<\/p>/gi;
  let isFirst = true;
  result = result.replace(titleRegex, (match, inner) => {
    const text = inner.trim();
    const upperRatio = (text.match(/[A-ZÀ-Ú]/g) || []).length / text.length;
    const endsWithPunctuation = /[.,:;!?]$/.test(text);
    if (upperRatio > 0.7 && !endsWithPunctuation) {
      const tag = isFirst ? "h1" : "h2";
      isFirst = false;
      return `<${tag}>${text}</${tag}>`;
    }
    return match;
  });

  // Detecta listas sequenciais: a), b), c)... e converte para <ul><li>
  result = result.replace(
    /(?:<p[^>]*>\s*[a-z]\)\s*.+?<\/p>\s*){2,}/gi,
    (match) => {
      const items = [...match.matchAll(/<p[^>]*>\s*[a-z]\)\s*(.+?)<\/p>/gi)];
      return "<ul>" + items.map((m) => `<li>${m[1]}</li>`).join("") + "</ul>";
    }
  );

  return result;
}

// ─── Legal Completeness Analysis ───

export interface LegalCompletenessCheck {
  hasParties: boolean;       // Identifies parties (autor, réu, impetrante, etc.)
  hasFacts: boolean;         // Section "DOS FATOS" or narrative section
  hasLegalBasis: boolean;    // Legal citations (artigos, leis, súmulas)
  hasRequest: boolean;       // "DO PEDIDO" or request section
  hasClosure: boolean;       // "Nestes termos" or closing phrase
  hasDate: boolean;          // Date reference
  hasSignature: boolean;     // Signature block
  citationCount: number;     // Number of legal citations found
  score: number;             // 0-100 completeness score
  suggestions: string[];     // Missing items
}

export function analyzeLegalCompleteness(html: string): LegalCompletenessCheck {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const suggestions: string[] = [];

  const hasParties = /(?:autor|réu|impetrante|impetrado|requerente|requerido|reclamante|reclamado|apelante|apelado|agravante|agravado|paciente|coator)/i.test(text);
  if (!hasParties) suggestions.push("Identificar as partes processuais (autor/réu, impetrante/impetrado)");

  const hasFacts = /(?:dos?\s+fatos?|da\s+narrativa|do\s+relatório|breve\s+relato)/i.test(text);
  if (!hasFacts) suggestions.push("Adicionar seção 'DOS FATOS' com narrativa detalhada");

  const hasLegalBasis = /(?:art\.?\s*\d+|lei\s+n?[º°]?\s*[\d.]+|súmula\s*n?[º°]?\s*\d+|constituição\s+federal|código\s+(?:civil|penal|processo|trabalho))/i.test(text);
  if (!hasLegalBasis) suggestions.push("Incluir fundamentação legal (artigos, leis, súmulas)");

  const hasRequest = /(?:dos?\s+pedidos?|requer|pleiteia|postula|requer-se|pede-se|ante\s+o\s+exposto)/i.test(text);
  if (!hasRequest) suggestions.push("Adicionar seção 'DO PEDIDO' com requerimentos específicos");

  const hasClosure = /(?:nestes\s+termos|termos\s+em\s+que|pede\s+deferimento|aguarda\s+deferimento|espera\s+deferimento)/i.test(text);
  if (!hasClosure) suggestions.push("Incluir fecho: 'Nestes termos, pede deferimento.'");

  const hasDate = /\d{1,2}\s+de\s+\w+\s+de\s+\d{4}|\d{2}\/\d{2}\/\d{4}/i.test(text);
  if (!hasDate) suggestions.push("Adicionar data do documento");

  const hasSignature = /(?:advogad[oa]|oab|assinatura|{{nome_impetrante}}|{{nome_advogado}})/i.test(text);
  if (!hasSignature) suggestions.push("Incluir bloco de assinatura com OAB");

  // Count legal citations
  const citationMatches = text.match(/art\.?\s*\d+|lei\s+n?[º°]?\s*[\d.]+|súmula\s*n?[º°]?\s*\d+/gi) || [];
  const citationCount = citationMatches.length;

  // Calculate score
  const checks = [hasParties, hasFacts, hasLegalBasis, hasRequest, hasClosure, hasDate, hasSignature];
  const passedChecks = checks.filter(Boolean).length;
  let score = Math.round((passedChecks / checks.length) * 70); // Base 70% from structure
  
  // Bonus for citations
  if (citationCount >= 5) score += 15;
  else if (citationCount >= 3) score += 10;
  else if (citationCount >= 1) score += 5;
  
  // Bonus for document length (adequate content)
  const wordCount = text.split(/\s+/).filter(w => w.length > 2).length;
  if (wordCount >= 500) score += 15;
  else if (wordCount >= 200) score += 10;
  else if (wordCount >= 100) score += 5;

  score = Math.min(score, 100);

  return { hasParties, hasFacts, hasLegalBasis, hasRequest, hasClosure, hasDate, hasSignature, citationCount, score, suggestions };
}

// ─── Argument Strength Analyzer ───

export interface ArgumentStrength {
  totalArguments: number;
  supportedArguments: number;    // Arguments with legal citation
  unsupportedArguments: number;  // Arguments without legal backing
  strengthScore: number;         // 0-100
  weakPoints: string[];
}

export function analyzeArgumentStrength(html: string): ArgumentStrength {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const weakPoints: string[] = [];

  // Split into paragraphs and analyze each
  const paragraphs = text.split(/[.!?]\s+/).filter(s => s.trim().length > 30);
  
  // Detect argumentative statements
  const argPatterns = /(?:portanto|assim|dessa forma|destarte|nesse sentido|com efeito|ademais|outrossim|cumpre\s+(?:destacar|ressaltar|observar)|impende\s+(?:destacar|ressaltar)|é\s+certo\s+que|resta\s+evidente|não\s+há\s+dúvida)/i;
  
  const legalRefPattern = /(?:art\.?\s*\d+|lei\s+n?[º°]?\s*[\d.]+|súmula|cf\/\d{2,4}|cpp|cpc|cc|cp|clt|stf|stj|tst|trt|tjrs)/i;

  let totalArguments = 0;
  let supportedArguments = 0;

  for (const para of paragraphs) {
    if (argPatterns.test(para)) {
      totalArguments++;
      if (legalRefPattern.test(para)) {
        supportedArguments++;
      } else {
        weakPoints.push(para.slice(0, 80) + "...");
      }
    }
  }

  const unsupportedArguments = totalArguments - supportedArguments;
  const strengthScore = totalArguments > 0 
    ? Math.round((supportedArguments / totalArguments) * 100)
    : 50; // Neutral if no explicit arguments found

  if (unsupportedArguments > 0) {
    weakPoints.unshift(`${unsupportedArguments} argumento(s) sem fundamentação legal`);
  }

  return { totalArguments, supportedArguments, unsupportedArguments, strengthScore, weakPoints };
}

// ─── Original Quality Score (enhanced) ───

export interface QualityResult {
  processed: string;
  qualityScore: number;
  headingsDetected: boolean;
  hasLists: boolean;
  emptyParagraphs: number;
  legalCompleteness?: LegalCompletenessCheck;
  argumentStrength?: ArgumentStrength;
}

export function calculateQualityScore(
  html: string,
  baseScore = 0.85,
  preserveUserStructure?: boolean,
  deepAnalysis = false
): QualityResult {
  const processed = scanAndFixHeadings(html, preserveUserStructure);
  let score = baseScore;

  const headingsDetected = /<h[1-3]/.test(processed);
  const hasLists = /<[uo]l/.test(processed);
  const emptyParagraphs = (processed.match(/<p>\s*<\/p>/g) || []).length;

  if (headingsDetected) score += 0.05;
  if (hasLists) score += 0.03;
  if (emptyParagraphs < 3) score += 0.02;
  
  // Check for legal citations bonus
  const text = processed.replace(/<[^>]+>/g, " ");
  const citationCount = (text.match(/art\.?\s*\d+|lei\s+n?[º°]?\s*[\d.]+|súmula/gi) || []).length;
  if (citationCount >= 3) score += 0.03;
  
  // Check for proper structure (headers + paragraphs)
  const structuredSections = (processed.match(/<h[1-3]/g) || []).length;
  if (structuredSections >= 3) score += 0.02;

  score = Math.min(Math.max(score, 0.5), 1.0);

  const result: QualityResult = { processed, qualityScore: score, headingsDetected, hasLists, emptyParagraphs };

  if (deepAnalysis) {
    result.legalCompleteness = analyzeLegalCompleteness(processed);
    result.argumentStrength = analyzeArgumentStrength(processed);
  }

  return result;
}

export function getQualityLabel(score: number): { label: string; color: string; icon: string } {
  if (score >= 0.9) return { label: "Excelente", color: "text-green-500", icon: "✅" };
  if (score >= 0.8) return { label: "Bom", color: "text-primary", icon: "📋" };
  if (score >= 0.7) return { label: "Regular", color: "text-yellow-500", icon: "⚠️" };
  return { label: "Revisar", color: "text-destructive", icon: "❌" };
}
