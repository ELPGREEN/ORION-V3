// ─── Internal Document Consistency Checker ───
// Detects undefined terms, broken cross-references, contradictory values, and date issues.

export interface ConsistencyIssue {
  type: "undefined_term" | "broken_reference" | "contradictory_value" | "date_inconsistency";
  severity: "error" | "warning" | "info";
  message: string;
  location: string;
}

// Common legal terms that appear in ALL CAPS but are not "defined terms"
const COMMON_CAPS = new Set([
  "CONTRATANTE", "CONTRATADA", "CONTRATADO", "LOCADOR", "LOCATÁRIO", "LOCATÁRIA",
  "EMPREGADOR", "EMPREGADA", "EMPREGADO", "CEDENTE", "CESSIONÁRIO", "CESSIONÁRIA",
  "DEVEDOR", "DEVEDORA", "CREDOR", "CREDORA", "AUTOR", "AUTORA", "RÉU", "RÉ",
  "FIADOR", "FIADORA", "OUTORGANTE", "OUTORGADO", "OUTORGADA",
  "PARTES", "PARTE", "TESTEMUNHAS", "CLÁUSULA", "PARÁGRAFO",
  "DO", "DA", "DOS", "DAS", "DE", "EM", "NO", "NA", "NOS", "NAS", "AO", "AOS",
  "O", "A", "OS", "AS", "E", "OU", "QUE", "SE", "POR", "COM", "PARA", "ENTRE",
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
  "CPF", "CNPJ", "RG", "OAB", "INSS", "FGTS", "CLT", "CDC", "CPC", "CPP",
  "STF", "STJ", "TST", "CF", "CC", "CP", "CTN",
  "BRASIL", "LTDA", "S/A", "SA", "ME", "EPP", "EIRELI",
]);

/**
 * Find "defined terms" (ALL CAPS words ≥3 chars) used in the body that
 * don't appear in a definitions/preamble section.
 */
function checkUndefinedTerms(plain: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // Try to find definitions section
  const defSectionMatch = plain.match(/(?:defini[çc][õo]es|gloss[áa]rio|termos\s+definidos)[:\s]*([\s\S]{0,3000}?)(?=\n\s*(?:cl[áa]usula|cap[ií]tulo|\d+[.\s])|$)/i);
  const definedTerms = new Set<string>();

  if (defSectionMatch) {
    // Extract terms defined in the section (quoted or CAPS)
    const defs = defSectionMatch[1];
    const quotedTerms = defs.match(/[""\u201C]([A-ZÀ-Ú\s]{3,})[""\u201D]/g) || [];
    for (const qt of quotedTerms) {
      definedTerms.add(qt.replace(/["""\u201C\u201D]/g, "").trim());
    }
  }

  // Find ALL CAPS terms in quotes throughout the document
  const capsInQuotes = plain.match(/[""\u201C]([A-ZÀ-Ú][A-ZÀ-Ú\s]{2,})[""\u201D]/g) || [];
  const termCounts = new Map<string, number>();

  for (const raw of capsInQuotes) {
    const term = raw.replace(/["""\u201C\u201D]/g, "").trim();
    if (term.length < 3 || COMMON_CAPS.has(term) || definedTerms.has(term)) continue;
    termCounts.set(term, (termCounts.get(term) || 0) + 1);
  }

  for (const [term, count] of termCounts) {
    if (count >= 2 && !definedTerms.has(term)) {
      issues.push({
        type: "undefined_term",
        severity: "warning",
        message: `Termo "${term}" usado ${count}x sem definição formal`,
        location: "corpo do documento",
      });
    }
  }

  return issues;
}

/**
 * Detect references to clauses/items that don't exist in the document.
 */
function checkBrokenReferences(plain: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // Collect existing clause numbers
  const existingClauses = new Set<string>();
  const clauseHeadingPattern = /(?:cl[áa]usula|se[çc][ãa]o|cap[ií]tulo)\s+(\d+(?:\.\d+)*)/gi;
  let m: RegExpExecArray | null;
  while ((m = clauseHeadingPattern.exec(plain)) !== null) {
    existingClauses.add(m[1]);
  }

  if (existingClauses.size === 0) return issues; // No structured clauses found

  // Find references
  const refPattern = /(?:cl[áa]usula|se[çc][ãa]o)\s+(\d+(?:\.\d+)*)/gi;
  const refCounts = new Map<string, number>();
  while ((m = refPattern.exec(plain)) !== null) {
    const ref = m[1];
    if (!existingClauses.has(ref)) {
      refCounts.set(ref, (refCounts.get(ref) || 0) + 1);
    }
  }

  for (const [ref, count] of refCounts) {
    issues.push({
      type: "broken_reference",
      severity: "error",
      message: `Referência à Cláusula ${ref} (${count}x) — não encontrada no documento`,
      location: "referências cruzadas",
    });
  }

  return issues;
}

/**
 * Detect contradictory numeric values for the same provision.
 */
function checkContradictoryValues(plain: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  const provisions: Array<{ label: string; pattern: RegExp }> = [
    { label: "multa", pattern: /multa[^.]{0,30}(\d+(?:[.,]\d+)?)\s*%/gi },
    { label: "prazo", pattern: /prazo[^.]{0,30}(\d+)\s*(?:dias|meses|anos)/gi },
    { label: "juros", pattern: /juros[^.]{0,30}(\d+(?:[.,]\d+)?)\s*%/gi },
    { label: "aviso prévio", pattern: /aviso\s+pr[ée]vio[^.]{0,30}(\d+)\s*dias/gi },
  ];

  for (const { label, pattern } of provisions) {
    const values = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(plain)) !== null) {
      values.add(match[1].replace(",", "."));
    }
    if (values.size > 1) {
      issues.push({
        type: "contradictory_value",
        severity: "warning",
        message: `Valores contraditórios para "${label}": ${[...values].join(", ")}`,
        location: "cláusulas diversas",
      });
    }
  }

  return issues;
}

/**
 * Detect date inconsistencies.
 */
function checkDateInconsistencies(plain: string): ConsistencyIssue[] {
  const issues: ConsistencyIssue[] = [];

  // Extract dd/mm/yyyy dates
  const datePattern = /(\d{1,2})[/.](\d{1,2})[/.](\d{4})/g;
  const dates: Array<{ raw: string; date: Date }> = [];
  let m: RegExpExecArray | null;
  while ((m = datePattern.exec(plain)) !== null) {
    const d = new Date(parseInt(m[3]), parseInt(m[2]) - 1, parseInt(m[1]));
    if (!isNaN(d.getTime())) {
      dates.push({ raw: m[0], date: d });
    }
  }

  if (dates.length < 2) return issues;

  // Sort by position in text (already in order from regex)
  // Check if any "início" date is after "fim" date mentioned nearby
  const startPattern = /in[ií]cio[^.]{0,40}(\d{1,2}[/.]\d{1,2}[/.]\d{4})/gi;
  const endPattern = /(?:t[ée]rmino|fim|encerramento)[^.]{0,40}(\d{1,2}[/.]\d{1,2}[/.]\d{4})/gi;

  const startDates: Date[] = [];
  const endDates: Date[] = [];

  while ((m = startPattern.exec(plain)) !== null) {
    const parts = m[1].split(/[/.]/);
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) startDates.push(d);
  }
  while ((m = endPattern.exec(plain)) !== null) {
    const parts = m[1].split(/[/.]/);
    const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    if (!isNaN(d.getTime())) endDates.push(d);
  }

  for (const start of startDates) {
    for (const end of endDates) {
      if (start > end) {
        issues.push({
          type: "date_inconsistency",
          severity: "error",
          message: `Data de início (${start.toLocaleDateString("pt-BR")}) posterior à data de término (${end.toLocaleDateString("pt-BR")})`,
          location: "datas contratuais",
        });
      }
    }
  }

  return issues;
}

/**
 * Run all consistency checks on document text (plain or HTML).
 */
export function checkDocumentConsistency(text: string): ConsistencyIssue[] {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  return [
    ...checkUndefinedTerms(plain),
    ...checkBrokenReferences(plain),
    ...checkContradictoryValues(plain),
    ...checkDateInconsistencies(plain),
  ];
}
