// ─── Contractual Obligation Extractor per Party ───

export type ObligationType = "fazer" | "nao_fazer" | "pagar" | "entregar";

export interface Obligation {
  party: string;
  obligation: string;
  clauseRef?: string;
  type: ObligationType;
}

// Common party references in Brazilian contracts
const PARTY_PATTERNS = [
  /\b(CONTRATANTE)\b/i,
  /\b(CONTRATAD[OA])\b/i,
  /\b(LOCADOR(?:A)?)\b/i,
  /\b(LOCAT[ÁA]RI[OA])\b/i,
  /\b(EMPREGADOR(?:A)?)\b/i,
  /\b(EMPREGAD[OA])\b/i,
  /\b(CEDENTE)\b/i,
  /\b(CESSION[ÁA]RI[OA])\b/i,
  /\b(PRESTADOR(?:A)?)\b/i,
  /\b(TOMADOR(?:A)?)\b/i,
  /\b(VENDEDOR(?:A)?)\b/i,
  /\b(COMPRADOR(?:A)?)\b/i,
  /\b(FIADOR(?:A)?)\b/i,
  /\b(OUTORGANTE)\b/i,
  /\b(OUTORGAD[OA])\b/i,
  /\b(DEVEDOR(?:A)?)\b/i,
  /\b(CREDOR(?:A)?)\b/i,
  /\b(MANDANTE)\b/i,
  /\b(MANDAT[ÁA]RI[OA])\b/i,
];

// Obligation trigger markers
const OBLIGATION_MARKERS = [
  { regex: /dever[áa]\b/i, negatable: true },
  { regex: /compromete-se\s+a\b/i, negatable: false },
  { regex: /obriga-se\s+a\b/i, negatable: false },
  { regex: /fica\s+obrigad[oa]\s+a\b/i, negatable: false },
  { regex: /[ée]\s+respons[áa]vel\s+por\b/i, negatable: false },
  { regex: /cabe\s+a[o]?\b/i, negatable: false },
  { regex: /compete\s+a[o]?\b/i, negatable: false },
  { regex: /incumbe\s+a[o]?\b/i, negatable: false },
  { regex: /se\s+compromete\s+a\b/i, negatable: false },
  { regex: /tem\s+(?:a\s+)?obriga[çc][ãa]o\s+de\b/i, negatable: false },
];

// Negative obligation markers
const NEGATIVE_MARKERS = /\b(n[ãa]o\s+(?:poder[áa]|dever[áa])|[ée]\s+vedado|fica\s+proibid[oa]|abster-se\s+de|n[ãa]o\s+(?:lhe\s+)?[ée]\s+permitido)\b/i;

// Payment markers
const PAYMENT_MARKERS = /\b(pagar|pagamento|remunera[çc][ãa]o|honor[áa]rios|valor\s+de\s+R\$|parcelas?\s+de|mensalidade|aluguel|pre[çc]o)\b/i;

// Delivery markers
const DELIVERY_MARKERS = /\b(entregar|entrega\s+d[oe]|disponibilizar|fornecer|fornecimento|remeter|remessa|enviar)\b/i;

function classifyType(sentence: string): ObligationType {
  if (NEGATIVE_MARKERS.test(sentence)) return "nao_fazer";
  if (PAYMENT_MARKERS.test(sentence)) return "pagar";
  if (DELIVERY_MARKERS.test(sentence)) return "entregar";
  return "fazer";
}

function findNearestParty(text: string, position: number): string | null {
  // Search backwards from the obligation marker to find the nearest party
  const before = text.slice(Math.max(0, position - 500), position);

  let bestParty: string | null = null;
  let bestDistance = Infinity;

  for (const pattern of PARTY_PATTERNS) {
    const re = new RegExp(pattern.source, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(before)) !== null) {
      const distance = before.length - match.index;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestParty = match[1].toUpperCase();
      }
    }
  }

  // Also check a small window after the position (for "Cabe ao CONTRATANTE..." patterns)
  if (!bestParty) {
    const after = text.slice(position, position + 120);
    for (const pattern of PARTY_PATTERNS) {
      const match = pattern.exec(after);
      if (match) {
        bestParty = match[1].toUpperCase();
        break;
      }
    }
  }

  return bestParty;
}

function extractClauseRef(text: string, position: number): string | undefined {
  const before = text.slice(Math.max(0, position - 300), position);
  // Look for clause references like "Cláusula 5ª", "Art. 3", "§ 2º", "item 4.1"
  const clauseMatch = before.match(
    /(?:cl[áa]usula|art(?:igo)?\.?|se[çc][ãa]o|par[áa]grafo|§)\s*(\d+[ºª°]?(?:\.\d+)*)/gi
  );
  if (clauseMatch) {
    return clauseMatch[clauseMatch.length - 1].trim();
  }
  return undefined;
}

function extractSentence(text: string, markerIndex: number): string {
  // Walk backwards to find sentence start
  let start = markerIndex;
  for (let i = markerIndex - 1; i >= Math.max(0, markerIndex - 400); i--) {
    const ch = text[i];
    if (ch === "." || ch === ";" || ch === "\n") {
      start = i + 1;
      break;
    }
    if (i === Math.max(0, markerIndex - 400)) {
      start = i;
    }
  }

  // Walk forward to find sentence end
  let end = markerIndex;
  for (let i = markerIndex; i < Math.min(text.length, markerIndex + 500); i++) {
    const ch = text[i];
    if (ch === "." || ch === ";" || ch === "\n") {
      end = i + 1;
      break;
    }
    if (i === Math.min(text.length, markerIndex + 500) - 1) {
      end = i + 1;
    }
  }

  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/**
 * Extracts contractual obligations from plain text, categorized by party.
 * Designed for Brazilian legal documents (contratos, termos, etc.).
 */
export function extractObligations(text: string): Obligation[] {
  if (!text || text.length < 50) return [];

  const obligations: Obligation[] = [];
  const seen = new Set<string>();

  for (const marker of OBLIGATION_MARKERS) {
    const re = new RegExp(marker.regex.source, "gi");
    let match: RegExpExecArray | null;

    while ((match = re.exec(text)) !== null) {
      const party = findNearestParty(text, match.index);
      if (!party) continue;

      const sentence = extractSentence(text, match.index);
      if (sentence.length < 15) continue;

      // Deduplicate by party + first 60 chars of obligation
      const key = `${party}:${sentence.slice(0, 60)}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const clauseRef = extractClauseRef(text, match.index);
      const type = classifyType(sentence);

      obligations.push({ party, obligation: sentence, clauseRef, type });
    }
  }

  return obligations;
}

/**
 * Groups obligations by party for display.
 */
export function groupObligationsByParty(
  obligations: Obligation[]
): Record<string, Obligation[]> {
  const groups: Record<string, Obligation[]> = {};
  for (const ob of obligations) {
    if (!groups[ob.party]) groups[ob.party] = [];
    groups[ob.party].push(ob);
  }
  return groups;
}
