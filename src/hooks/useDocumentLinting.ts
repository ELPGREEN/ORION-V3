import { useEffect, useState, useRef } from "react";
import { checkDocumentConsistency } from "@/lib/analysis";

export interface LintIssue {
  id: string;
  severity: "error" | "warning" | "info";
  message: string;
}

interface UseDocumentLintingOptions {
  html: string;
  documentCategory?: string;
  enabled?: boolean;
}

export function useDocumentLinting({ html, documentCategory, enabled = true }: UseDocumentLintingOptions) {
  const [issues, setIssues] = useState<LintIssue[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!enabled) { setIssues([]); return; }
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const words = plain.split(/\s+/).filter(Boolean).length;
      const found: LintIssue[] = [];

      if (words < 30) { setIssues([]); return; }

      const isJudicial = documentCategory === "Judicial";

      // Missing legal foundation
      const hasLegal = /art\.?\s*\d+|lei\s+n?[º°]?\s*\d|código|constituição|súmula/i.test(plain);
      if (!hasLegal && isJudicial && words > 150) {
        found.push({ id: "no-legal", severity: "error", message: "Sem fundamentação legal" });
      }

      // Missing conclusion
      const hasConclusion = /ante\s+o\s+exposto|diante\s+d[oa]\s+exposto|requer|pede\s+deferimento|termos\s+em\s+que/i.test(plain);
      if (!hasConclusion && isJudicial && words > 300) {
        found.push({ id: "no-conclusion", severity: "warning", message: "Sem conclusão/pedido" });
      }

      // Bare article citations
      const bare = (plain.match(/art\.?\s*\d+/gi) || []).length;
      const qualified = (plain.match(/art\.?\s*\d+.*?(lei|código|cf|constituição|cpc|cpp|clt|cdc|cc|cp)/gi) || []).length;
      if (bare > qualified + 2) {
        found.push({ id: "bare-citations", severity: "info", message: `${bare - qualified} citações sem lei` });
      }

      // No headings in long docs
      if (words > 500 && !/<h[1-3]/i.test(html)) {
        found.push({ id: "no-structure", severity: "info", message: "Sem títulos/seções" });
      }

      // ─── PII / Sensitive Data Detection ───
      const piiCounts: Record<string, number> = {};
      const piiPatterns: Array<{ id: string; label: string; regex: RegExp }> = [
        { id: "cpf", label: "CPF", regex: /\d{3}\.\d{3}\.\d{3}-\d{2}/g },
        { id: "cnpj", label: "CNPJ", regex: /\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g },
        { id: "email", label: "e-mail", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
        { id: "phone", label: "telefone", regex: /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)(?:9\s?)?\d{4}[-.\s]?\d{4}/g },
        { id: "rg", label: "RG", regex: /\d{1,2}\.\d{3}\.\d{3}-[0-9Xx]/g },
        { id: "bank", label: "conta bancária", regex: /(?:ag[êe]ncia|conta[- ]corrente|c\/c)\s*:?\s*\d{3,}/gi },
      ];

      for (const p of piiPatterns) {
        const matches = plain.match(p.regex);
        if (matches && matches.length > 0) {
          piiCounts[p.label] = matches.length;
        }
      }

      const piiEntries = Object.entries(piiCounts);
      if (piiEntries.length > 0) {
        const details = piiEntries.map(([label, count]) => `${count} ${label}`).join(", ");
        found.push({
          id: "pii-detected",
          severity: "warning",
          message: `Dados sensíveis detectados: ${details}`,
        });
      }

      // ─── Consistency Checker ───
      const consistency = checkDocumentConsistency(html);
      for (const issue of consistency) {
        found.push({
          id: `consistency-${issue.type}-${found.length}`,
          severity: issue.severity === "error" ? "error" : issue.severity === "warning" ? "warning" : "info",
          message: issue.message,
        });
      }

      setIssues(found);
    }, 2000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [html, documentCategory, enabled]);

  const errorCount = issues.filter((i) => i.severity === "error").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const infoCount = issues.filter((i) => i.severity === "info").length;

  return { issues, errorCount, warningCount, infoCount, totalCount: issues.length };
}
