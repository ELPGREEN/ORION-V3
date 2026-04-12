/**
 * Hallucination Detector
 * Inspired by LegalNexus RAG pipeline — verifies legal entity references in AI responses
 */

export interface HallucinationWarning {
  entity: string;
  type: "sumula" | "artigo" | "processo" | "lei";
  reason: string;
  severity: "high" | "medium" | "low";
}

// Valid Súmula ranges (known to exist)
const SUMULA_RANGES = {
  stf: { vinculante: { min: 1, max: 56 }, normal: { min: 1, max: 736 } },
  stj: { min: 1, max: 660 },
  tst: { min: 1, max: 463 },
};

// Known major laws with article ranges
const LAW_ARTICLE_RANGES: Record<string, { max: number; label: string }> = {
  "código penal": { max: 361, label: "CP" },
  "código civil": { max: 2046, label: "CC" },
  "código de processo civil": { max: 1072, label: "CPC" },
  "código de processo penal": { max: 811, label: "CPP" },
  "constituição": { max: 250, label: "CF" },
  "cf/88": { max: 250, label: "CF" },
  "clt": { max: 922, label: "CLT" },
  "cdc": { max: 119, label: "CDC" },
  "eca": { max: 267, label: "ECA" },
  "lei de execução penal": { max: 204, label: "LEP" },
};

export function detectHallucinations(text: string): HallucinationWarning[] {
  const warnings: HallucinationWarning[] = [];

  // 1. Check Súmula Vinculante numbers
  const svMatches = text.matchAll(/Súmula\s+Vinculante\s+(?:n[°º.]?\s*)?(\d+)/gi);
  for (const m of svMatches) {
    const num = parseInt(m[1]);
    if (num > SUMULA_RANGES.stf.vinculante.max || num < 1) {
      warnings.push({
        entity: m[0],
        type: "sumula",
        reason: `Súmulas Vinculantes existem de 1 a ${SUMULA_RANGES.stf.vinculante.max}. Nº ${num} não existe.`,
        severity: "high",
      });
    }
  }

  // 2. Check STJ Súmula numbers
  const stjMatches = text.matchAll(/Súmula\s+(?:n[°º.]?\s*)?(\d+)\s+(?:do\s+)?STJ/gi);
  for (const m of stjMatches) {
    const num = parseInt(m[1]);
    if (num > SUMULA_RANGES.stj.max || num < 1) {
      warnings.push({
        entity: m[0],
        type: "sumula",
        reason: `Súmulas do STJ existem de 1 a ${SUMULA_RANGES.stj.max}. Nº ${num} não verificado.`,
        severity: "high",
      });
    }
  }

  // 3. Check STF Súmula numbers  
  const stfMatches = text.matchAll(/Súmula\s+(?:n[°º.]?\s*)?(\d+)\s+(?:do\s+)?STF/gi);
  for (const m of stfMatches) {
    const num = parseInt(m[1]);
    if (num > SUMULA_RANGES.stf.normal.max || num < 1) {
      warnings.push({
        entity: m[0],
        type: "sumula",
        reason: `Súmulas do STF existem de 1 a ${SUMULA_RANGES.stf.normal.max}. Nº ${num} não verificado.`,
        severity: "high",
      });
    }
  }

  // 4. Check article numbers against known law ranges
  for (const [lawKey, range] of Object.entries(LAW_ARTICLE_RANGES)) {
    const pattern = new RegExp(`Art(?:igo)?\\.?\\s*(\\d+)(?:[^]*?${lawKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
    const matches = text.matchAll(pattern);
    for (const m of matches) {
      const num = parseInt(m[1]);
      if (num > range.max) {
        warnings.push({
          entity: `Art. ${num} do ${range.label}`,
          type: "artigo",
          reason: `${range.label} possui artigos até ${range.max}. Art. ${num} não existe.`,
          severity: "high",
        });
      }
    }
    // Also check reversed pattern: "do CP, art. X"
    const revPattern = new RegExp(`${lawKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^]*?Art(?:igo)?\\.?\\s*(\\d+)`, "gi");
    const revMatches = text.matchAll(revPattern);
    for (const m of revMatches) {
      const num = parseInt(m[1]);
      if (num > range.max) {
        warnings.push({
          entity: `Art. ${num} do ${range.label}`,
          type: "artigo",
          reason: `${range.label} possui artigos até ${range.max}. Art. ${num} não existe.`,
          severity: "high",
        });
      }
    }
  }

  // 5. Check standalone Súmula numbers (no court specified) — medium severity
  const genericSumulaMatches = text.matchAll(/Súmula\s+(?:n[°º.]?\s*)?(\d+)(?!\s+(?:do\s+)?(?:STF|STJ|TST|Vinculante))/gi);
  for (const m of genericSumulaMatches) {
    const num = parseInt(m[1]);
    if (num > 800) {
      warnings.push({
        entity: m[0],
        type: "sumula",
        reason: `Número de súmula ${num} parece incomum. Verifique o tribunal de origem.`,
        severity: "medium",
      });
    }
  }

  // 6. Check suspicious process numbers (very basic)
  const processoMatches = text.matchAll(/(?:processo|autos)\s+(?:n[°º.]?\s*)?([\d]{4,}[-./][\d./-]+)/gi);
  for (const m of processoMatches) {
    // Flag if it doesn't match CNJ pattern: NNNNNNN-DD.AAAA.J.TR.OOOO
    const cnjPattern = /^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/;
    if (!cnjPattern.test(m[1]) && m[1].length > 10) {
      warnings.push({
        entity: m[0],
        type: "processo",
        reason: "Número de processo não segue padrão CNJ. Verifique a numeração.",
        severity: "low",
      });
    }
  }

  // Deduplicate by entity
  const seen = new Set<string>();
  return warnings.filter(w => {
    if (seen.has(w.entity)) return false;
    seen.add(w.entity);
    return true;
  });
}

export type PipelineRoute = "documento" | "web" | "conhecimento" | "neural";

export function detectPipelineRoute(msg: { sources?: any[]; neuralUsed?: boolean; content: string }): {
  route: PipelineRoute;
  label: string;
  icon: string;
  fallbackUsed: boolean;
  retryCount?: number;
} {
  const hasSources = msg.sources && msg.sources.length > 0;
  const hasNeural = msg.neuralUsed;
  const hasWebIndicator = msg.content.includes("fonte: web") || msg.content.includes("pesquisa online") ||
    (msg.sources || []).some((s: any) => s.source_label?.toLowerCase().includes("web") || s.source_label?.toLowerCase().includes("firecrawl"));
  const hasDocIndicator = (msg.sources || []).some((s: any) =>
    s.source_label?.toLowerCase().includes("documento") || s.source_label?.toLowerCase().includes("local"));

  if (hasDocIndicator) {
    return { route: "documento", label: "Documento", icon: "📄", fallbackUsed: hasWebIndicator };
  }
  if (hasWebIndicator) {
    return { route: "web", label: "Web", icon: "🌐", fallbackUsed: false };
  }
  if (hasNeural || hasSources) {
    return { route: "neural", label: "Neural", icon: "🧠", fallbackUsed: false };
  }
  return { route: "conhecimento", label: "Conhecimento", icon: "💡", fallbackUsed: false };
}
