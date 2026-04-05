/**
 * documentAnonymizer.ts — LGPD-compliant auto-anonymization with consistent pseudonyms.
 * Each unique entity maps to a stable label throughout the document.
 */

export interface AnonymizationResult {
  anonymizedText: string;
  /** Map from pseudonym label → original value, for reversal or audit */
  replacementMap: Record<string, string>;
  /** Count of replacements by category */
  stats: Record<string, number>;
}

interface PatternDef {
  category: string;
  labelPrefix: string;
  regex: RegExp;
}

const PATTERNS: PatternDef[] = [
  {
    category: "CPF",
    labelPrefix: "CPF",
    regex: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g,
  },
  {
    category: "CNPJ",
    labelPrefix: "CNPJ",
    regex: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g,
  },
  {
    category: "email",
    labelPrefix: "EMAIL",
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  },
  {
    category: "telefone",
    labelPrefix: "TEL",
    regex: /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g,
  },
  {
    category: "RG",
    labelPrefix: "RG",
    regex: /\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]/g,
  },
  {
    category: "conta_bancaria",
    labelPrefix: "CONTA",
    regex: /(?:ag[êe]ncia|conta[- ]corrente|c\/c)\s*:?\s*\d{3,}[-.\d]*/gi,
  },
  {
    category: "CEP",
    labelPrefix: "CEP",
    regex: /\d{5}-?\d{3}/g,
  },
  {
    category: "OAB",
    labelPrefix: "OAB",
    regex: /OAB\s*[/\\\]?\s*[A-Z]{2}\s*n?[º°.]?\s*\d{3,6}/gi,
  },
];

/**
 * Anonymize a text by replacing sensitive data with consistent pseudonyms.
 * The same value always maps to the same label (e.g., a specific CPF is always [CPF_1]).
 *
 * @param text — plain text or HTML content
 * @param extraTerms — additional terms to anonymize (e.g., party names), mapped to a category label
 */
export function anonymizeDocument(
  text: string,
  extraTerms: Array<{ term: string; category?: string }> = []
): AnonymizationResult {
  // Entity → pseudonym label
  const entityMap = new Map<string, string>();
  const categoryCounts: Record<string, number> = {};
  const stats: Record<string, number> = {};

  function getLabel(value: string, prefix: string): string {
    const normalized = value.trim();
    const existing = entityMap.get(normalized);
    if (existing) return existing;

    const count = (categoryCounts[prefix] || 0) + 1;
    categoryCounts[prefix] = count;
    const label = `[${prefix}_${count}]`;
    entityMap.set(normalized, label);
    return label;
  }

  let result = text;

  // 1) Process regex-based patterns (longest match first via sorting later)
  const allMatches: Array<{ value: string; prefix: string; start: number; end: number }> = [];

  for (const pattern of PATTERNS) {
    const re = new RegExp(pattern.regex.source, pattern.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      allMatches.push({
        value: m[0],
        prefix: pattern.labelPrefix,
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  // 2) Extra terms (names, addresses, etc.)
  for (const { term, category } of extraTerms) {
    if (!term || term.length < 2) continue;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(escaped, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      allMatches.push({
        value: m[0],
        prefix: category || "PARTE",
        start: m.index,
        end: m.index + m[0].length,
      });
    }
  }

  // Sort by start position descending (replace from end to avoid offset issues)
  allMatches.sort((a, b) => b.start - a.start);

  // Deduplicate overlapping ranges (keep longer match)
  const used = new Set<number>();
  const filtered: typeof allMatches = [];
  for (const match of allMatches) {
    let overlaps = false;
    for (let i = match.start; i < match.end; i++) {
      if (used.has(i)) { overlaps = true; break; }
    }
    if (overlaps) continue;
    for (let i = match.start; i < match.end; i++) used.add(i);
    filtered.push(match);
  }

  // Apply replacements from end to start
  for (const match of filtered) {
    const label = getLabel(match.value, match.prefix);
    stats[match.prefix] = (stats[match.prefix] || 0) + 1;
    result = result.slice(0, match.start) + label + result.slice(match.end);
  }

  // Build reverse map (label → original)
  const replacementMap: Record<string, string> = {};
  for (const [original, label] of entityMap.entries()) {
    replacementMap[label] = original;
  }

  return { anonymizedText: result, replacementMap, stats };
}

/**
 * Reverse anonymization using a replacement map (for authorized users).
 */
export function deanonymizeDocument(
  anonymizedText: string,
  replacementMap: Record<string, string>
): string {
  let result = anonymizedText;
  // Sort labels by length descending to avoid partial replacements
  const labels = Object.keys(replacementMap).sort((a, b) => b.length - a.length);
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), replacementMap[label]);
  }
  return result;
}
