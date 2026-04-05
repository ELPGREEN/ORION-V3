// ─── Contract Market Benchmarks ───
// Compares extracted contract values against Brazilian market standards

export type BenchmarkLevel = "green" | "yellow" | "red";
export type Negotiability = "alta" | "media" | "baixa";

export interface BenchmarkResult {
  provision: string;
  extractedValue: string;
  standard: string;
  level: BenchmarkLevel;
  negotiability: Negotiability;
}

interface BenchmarkDef {
  provision: string;
  standard: string;
  negotiability: Negotiability;
  patterns: RegExp[];
  evaluate: (text: string, match: RegExpMatchArray) => { value: string; level: BenchmarkLevel } | null;
}

function extractNumber(s: string): number | null {
  const m = s.replace(/\./g, "").replace(",", ".").match(/[\d]+(?:\.[\d]+)?/);
  return m ? parseFloat(m[0]) : null;
}

const BENCHMARKS: BenchmarkDef[] = [
  {
    provision: "Prazo de aviso prévio",
    standard: "≥ 30 dias",
    negotiability: "alta",
    patterns: [
      /aviso\s+pr[ée]vio\s+(?:de\s+)?(\d+)\s*(?:\(\w+\)\s*)?dias/gi,
      /comunica[rç][ãa]o\s+pr[ée]via\s+(?:de\s+)?(\d+)\s*dias/gi,
      /ant(?:eced[êe]ncia|ecipa[çc][ãa]o)\s+(?:m[ií]nima\s+)?(?:de\s+)?(\d+)\s*dias/gi,
    ],
    evaluate: (_text, match) => {
      const days = extractNumber(match[1]);
      if (days == null) return null;
      const level: BenchmarkLevel = days >= 30 ? "green" : days >= 15 ? "yellow" : "red";
      return { value: `${days} dias`, level };
    },
  },
  {
    provision: "Multa rescisória",
    standard: "≤ 10%",
    negotiability: "alta",
    patterns: [
      /multa\s+(?:rescis[óo]ria|contratual|compensat[óo]ria)\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*%/gi,
      /(\d+(?:[.,]\d+)?)\s*%\s*(?:a\s+t[ií]tulo\s+de\s+)?multa/gi,
    ],
    evaluate: (_text, match) => {
      const pct = extractNumber(match[1]);
      if (pct == null) return null;
      const level: BenchmarkLevel = pct <= 10 ? "green" : pct <= 20 ? "yellow" : "red";
      return { value: `${pct}%`, level };
    },
  },
  {
    provision: "Cláusula de não-concorrência",
    standard: "≤ 2 anos",
    negotiability: "media",
    patterns: [
      /n[ãa]o[- ]concorr[êe]ncia\s+(?:pelo\s+)?(?:prazo|per[ií]odo)\s+(?:de\s+)?(\d+)\s*(?:anos?|meses)/gi,
      /n[ãa]o\s+concorrer[^.]{0,60}(\d+)\s*(?:anos?|meses)/gi,
    ],
    evaluate: (_text, match) => {
      const n = extractNumber(match[1]);
      if (n == null) return null;
      const isMonths = /meses/i.test(match[0]);
      const years = isMonths ? n / 12 : n;
      const level: BenchmarkLevel = years <= 2 ? "green" : years <= 4 ? "yellow" : "red";
      return { value: isMonths ? `${n} meses` : `${n} anos`, level };
    },
  },
  {
    provision: "Prazo para notificação de renovação",
    standard: "≥ 60 dias",
    negotiability: "media",
    patterns: [
      /renova[çc][ãa]o\s+autom[áa]tica[^.]{0,80}(\d+)\s*dias/gi,
      /n[ãa]o\s+renova[çc][ãa]o[^.]{0,60}(\d+)\s*dias/gi,
    ],
    evaluate: (_text, match) => {
      const days = extractNumber(match[1]);
      if (days == null) return null;
      const level: BenchmarkLevel = days >= 60 ? "green" : days >= 30 ? "yellow" : "red";
      return { value: `${days} dias`, level };
    },
  },
  {
    provision: "Limitação de responsabilidade",
    standard: "≤ valor do contrato",
    negotiability: "baixa",
    patterns: [
      /limita[çc][ãa]o\s+de\s+responsabilidade[^.]{0,120}(ilimitad[ao]|sem\s+limita[çc][ãa]o|\d+\s*(?:vezes|x))/gi,
      /responsabilidade[^.]{0,60}limita[^.]{0,60}(\d+)\s*(?:vezes|x)/gi,
    ],
    evaluate: (_text, match) => {
      const raw = match[1].toLowerCase();
      if (/ilimitad|sem\s+limita/i.test(raw)) {
        return { value: "ilimitada", level: "red" };
      }
      const mult = extractNumber(raw);
      if (mult == null) return null;
      const level: BenchmarkLevel = mult <= 1 ? "green" : mult <= 5 ? "yellow" : "red";
      return { value: `${mult}x o valor do contrato`, level };
    },
  },
  {
    provision: "Prazo de confidencialidade",
    standard: "≤ 5 anos",
    negotiability: "media",
    patterns: [
      /confidencialidade[^.]{0,100}(?:prazo|per[ií]odo|vig[êe]ncia)\s+(?:de\s+)?(\d+)\s*anos/gi,
      /confidencialidade[^.]{0,60}(perp[ée]tu|indefinid|indeterminad)/gi,
      /sigilo[^.]{0,100}(\d+)\s*anos/gi,
    ],
    evaluate: (_text, match) => {
      if (/perp[ée]tu|indefinid|indeterminad/i.test(match[0])) {
        return { value: "perpétua", level: "red" };
      }
      const years = extractNumber(match[1]);
      if (years == null) return null;
      const level: BenchmarkLevel = years <= 5 ? "green" : years <= 10 ? "yellow" : "red";
      return { value: `${years} anos`, level };
    },
  },
];

/**
 * Analyze contract text against Brazilian market benchmarks.
 * Returns benchmark results for each detected provision.
 */
export function analyzeContractBenchmarks(text: string): BenchmarkResult[] {
  const plain = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const results: BenchmarkResult[] = [];
  const seen = new Set<string>();

  for (const bench of BENCHMARKS) {
    for (const pattern of bench.patterns) {
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(plain)) !== null) {
        const result = bench.evaluate(plain, match);
        if (result && !seen.has(bench.provision + result.value)) {
          seen.add(bench.provision + result.value);
          results.push({
            provision: bench.provision,
            extractedValue: result.value,
            standard: bench.standard,
            level: result.level,
            negotiability: bench.negotiability,
          });
        }
      }
    }
  }

  return results;
}
