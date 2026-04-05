/**
 * ─── TensorFlow Text (Browser-Adapted) ───
 * Text and NLP ops: tokenization, n-grams, TF-IDF, BPE, 
 * text normalization, and sequence utilities.
 * 
 * Ref: TensorFlow Text (Google, Apache 2.0)
 *      github.com/tensorflow/text
 */

// ═══ TOKENIZATION ═══

/** Whitespace tokenizer with optional lowercasing */
export function whitespaceTokenize(text: string, lowercase = true): string[] {
  const processed = lowercase ? text.toLowerCase() : text;
  return processed.split(/\s+/).filter(t => t.length > 0);
}

/** Unicode script tokenizer: splits on script boundaries */
export function unicodeTokenize(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}\s]+/gu) ?? [];
}

/** WordPiece tokenizer (simplified) — Schuster & Nakajima (2012) */
export function wordpieceTokenize(text: string, vocab: Set<string>, maxWordLen = 200, unkToken = "[UNK]"): string[] {
  const words = whitespaceTokenize(text);
  const tokens: string[] = [];

  for (const word of words) {
    if (word.length > maxWordLen) { tokens.push(unkToken); continue; }
    let start = 0;
    const subTokens: string[] = [];
    let failed = false;

    while (start < word.length) {
      let end = word.length;
      let found = false;
      while (start < end) {
        const substr = start === 0 ? word.slice(start, end) : `##${word.slice(start, end)}`;
        if (vocab.has(substr)) {
          subTokens.push(substr);
          found = true;
          start = end;
          break;
        }
        end--;
      }
      if (!found) { failed = true; break; }
    }

    if (failed) tokens.push(unkToken);
    else tokens.push(...subTokens);
  }
  return tokens;
}

/** Byte-Pair Encoding tokenizer — Sennrich et al. (2016) */
export function bpeTokenize(text: string, merges: [string, string][], vocabSize = 1000): string[] {
  let symbols = text.toLowerCase().split("").map(c => c === " " ? "▁" : c);

  for (const [a, b] of merges) {
    const merged: string[] = [];
    let i = 0;
    while (i < symbols.length) {
      if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
        merged.push(a + b);
        i += 2;
      } else {
        merged.push(symbols[i]);
        i++;
      }
    }
    symbols = merged;
  }
  return symbols;
}

/** SentencePiece-style unigram tokenizer (simplified) */
export function sentencePieceTokenize(text: string, vocab: Map<string, number>): string[] {
  const processed = "▁" + text.toLowerCase().replace(/\s+/g, "▁");
  const tokens: string[] = [];
  let i = 0;

  while (i < processed.length) {
    let bestLen = 1;
    let bestToken = processed[i];
    for (let len = Math.min(20, processed.length - i); len >= 1; len--) {
      const candidate = processed.slice(i, i + len);
      if (vocab.has(candidate)) {
        bestLen = len;
        bestToken = candidate;
        break;
      }
    }
    tokens.push(bestToken);
    i += bestLen;
  }
  return tokens;
}

// ═══ N-GRAMS ═══

/** Generate n-grams from tokens */
export function ngrams(tokens: string[], n: number): string[] {
  if (tokens.length < n) return [];
  const result: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    result.push(tokens.slice(i, i + n).join(" "));
  }
  return result;
}

/** Character n-grams (for subword features) */
export function charNgrams(text: string, n: number): string[] {
  const padded = `<${text}>`;
  const result: string[] = [];
  for (let i = 0; i <= padded.length - n; i++) result.push(padded.slice(i, i + n));
  return result;
}

/** Skip-grams: n-grams with gaps — Guthrie et al. (2006) */
export function skipGrams(tokens: string[], n: number, skipDistance = 1): string[][] {
  const result: string[][] = [];
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j <= Math.min(i + n + skipDistance, tokens.length - 1); j++) {
      result.push([tokens[i], tokens[j]]);
    }
  }
  return result;
}

// ═══ TF-IDF ═══

export interface TFIDFResult {
  term: string;
  tf: number;
  idf: number;
  tfidf: number;
}

/** Compute TF-IDF vectors */
export function tfidf(documents: string[][], query?: string[]): TFIDFResult[] {
  const docCount = documents.length;
  const df = new Map<string, number>();

  for (const doc of documents) {
    const unique = new Set(doc);
    for (const term of unique) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const targetDoc = query ?? documents[0] ?? [];
  const termCounts = new Map<string, number>();
  for (const term of targetDoc) termCounts.set(term, (termCounts.get(term) ?? 0) + 1);

  const results: TFIDFResult[] = [];
  for (const [term, count] of termCounts) {
    const tf = count / targetDoc.length;
    const idf = Math.log((docCount + 1) / ((df.get(term) ?? 0) + 1)) + 1;
    results.push({ term, tf, idf, tfidf: tf * idf });
  }

  return results.sort((a, b) => b.tfidf - a.tfidf);
}

/** BM25 scoring — Robertson et al. (1995) */
export function bm25Score(
  query: string[],
  document: string[],
  allDocuments: string[][],
  k1 = 1.5,
  b = 0.75
): number {
  const avgDl = allDocuments.reduce((s, d) => s + d.length, 0) / allDocuments.length;
  const docCount = allDocuments.length;
  const df = new Map<string, number>();
  for (const doc of allDocuments) {
    const unique = new Set(doc);
    for (const term of unique) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const termFreq = new Map<string, number>();
  for (const t of document) termFreq.set(t, (termFreq.get(t) ?? 0) + 1);

  let score = 0;
  for (const term of query) {
    const tf = termFreq.get(term) ?? 0;
    const docFreq = df.get(term) ?? 0;
    const idf = Math.log((docCount - docFreq + 0.5) / (docFreq + 0.5) + 1);
    score += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * document.length / avgDl));
  }
  return score;
}

// ═══ TEXT NORMALIZATION ═══

/** Normalize unicode: NFD/NFC/NFKD/NFKC */
export function normalizeUnicode(text: string, form: "NFC" | "NFD" | "NFKC" | "NFKD" = "NFKC"): string {
  return text.normalize(form);
}

/** Strip accents from text */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Case folding with unicode support */
export function caseFold(text: string): string {
  return text.toLocaleLowerCase();
}

/** Remove punctuation */
export function removePunctuation(text: string): string {
  return text.replace(/[^\p{L}\p{N}\s]/gu, "");
}

// ═══ SEQUENCE UTILITIES ═══

/** Pad/truncate sequences to fixed length */
export function padSequence(tokens: string[], maxLen: number, padToken = "[PAD]", truncate: "pre" | "post" = "post"): string[] {
  if (tokens.length >= maxLen) {
    return truncate === "post" ? tokens.slice(0, maxLen) : tokens.slice(tokens.length - maxLen);
  }
  const padding = new Array(maxLen - tokens.length).fill(padToken);
  return truncate === "post" ? [...tokens, ...padding] : [...padding, ...tokens];
}

/** Create attention mask from padded sequence */
export function createAttentionMask(tokens: string[], padToken = "[PAD]"): number[] {
  return tokens.map(t => t === padToken ? 0 : 1);
}

/** Sliding window over text for long document processing */
export function slidingWindow(tokens: string[], windowSize: number, stride: number): string[][] {
  const windows: string[][] = [];
  for (let i = 0; i < tokens.length; i += stride) {
    windows.push(tokens.slice(i, i + windowSize));
    if (i + windowSize >= tokens.length) break;
  }
  return windows;
}

/** Edit distance (Levenshtein) between two strings */
export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => {
    const row = new Array(n + 1).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** ROUGE-L score for summarization evaluation */
export function rougeL(reference: string[], hypothesis: string[]): { precision: number; recall: number; f1: number } {
  // LCS length
  const m = reference.length, n = hypothesis.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = reference[i - 1] === hypothesis[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const lcs = dp[m][n];
  const precision = n > 0 ? lcs / n : 0;
  const recall = m > 0 ? lcs / m : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  return { precision, recall, f1 };
}

/** BLEU score (simplified unigram) — Papineni et al. (2002) */
export function bleuScore(reference: string[], hypothesis: string[]): number {
  const refCounts = new Map<string, number>();
  for (const t of reference) refCounts.set(t, (refCounts.get(t) ?? 0) + 1);

  let matches = 0;
  const hypCounts = new Map<string, number>();
  for (const t of hypothesis) {
    hypCounts.set(t, (hypCounts.get(t) ?? 0) + 1);
    if ((hypCounts.get(t) ?? 0) <= (refCounts.get(t) ?? 0)) matches++;
  }

  const precision = hypothesis.length > 0 ? matches / hypothesis.length : 0;
  const brevityPenalty = hypothesis.length >= reference.length ? 1 : Math.exp(1 - reference.length / hypothesis.length);
  return brevityPenalty * precision;
}

export function getTextOpsState() {
  return {
    tokenizers: ["Whitespace", "Unicode Script", "WordPiece (Schuster 2012)", "BPE (Sennrich 2016)", "SentencePiece"],
    features: ["N-grams", "Char N-grams", "Skip-grams", "TF-IDF", "BM25"],
    normalization: ["Unicode (NFC/NFD/NFKC/NFKD)", "Accent Stripping", "Case Folding", "Punctuation Removal"],
    evaluation: ["ROUGE-L", "BLEU", "Edit Distance (Levenshtein)"],
    sequence: ["Padding/Truncation", "Attention Mask", "Sliding Window"],
  };
}
