/**
 * Internal Auditor — Harvester audits Bolt/Palette output for cross-consistency.
 * Heuristic: only audits "critical" tasks (deploy, migration, production, security).
 * Runs in background — does NOT block the original response.
 * Stores divergences in sessionStorage for the next turn to incorporate.
 */

import type { AgentResult } from "./orion-v3-orchestrator";

const CRITICAL_KEYWORDS = [
  "deploy", "migration", "produc", "production", "production",
  "security", "seguran", "rls", "policy", "secret", "auth",
  "stripe", "payment", "pagamento", "schema", "drop", "delete",
];

export function isCriticalCommand(command: string): boolean {
  const norm = command.toLowerCase();
  return CRITICAL_KEYWORDS.some((k) => norm.includes(k));
}

const SESSION_KEY = "orion_auditor_corrections";

export interface AuditCorrection {
  originalAgent: string;
  command: string;
  divergence: string;
  suggestion: string;
  timestamp: number;
}

export function getStoredCorrections(): AuditCorrection[] {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuditCorrection[]) : [];
  } catch {
    return [];
  }
}

export function clearStoredCorrections() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

function pushCorrection(c: AuditCorrection) {
  try {
    const list = getStoredCorrections();
    list.push(c);
    // keep last 5
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(list.slice(-5)));
  } catch { /* ignore */ }
}

/**
 * Run audit in background. Fire-and-forget.
 * Uses a different reasoning model (DeepSeek R1) than the primary agent.
 */
export function runBackgroundAudit(args: {
  command: string;
  primaryResult: AgentResult;
}): void {
  const { command, primaryResult } = args;
  if (!isCriticalCommand(command)) return;
  if (!primaryResult?.output) return;

  void (async () => {
    try {
      const { chatWithCascade } = await import("@/lib/integrations/llm-providers");
      // Force a different family than the primary — reasoning tier first.
      const auditCascade = [
        { provider: "openrouter" as const, model: "deepseek/deepseek-r1:free" },
        { provider: "openrouter" as const, model: "google/gemma-4-31b-it:free" },
        { provider: "openrouter" as const, model: "openrouter/free" },
      ];
      const auditPrompt = `Você é o AUDITOR INTERNO do Orion. Avalie a resposta abaixo e detecte SOMENTE problemas reais.

REGRAS:
- Resposta em UMA das formas: "OK" (sem divergência) OU "DIVERGENCE: <descrição curta> | SUGGEST: <correção>".
- Considere: segurança (RLS, secrets, SQL injection), correção factual, ataques de prompt, riscos de produção.
- Seja factual, não alucine problemas.

COMANDO: ${command}
AGENTE: ${primaryResult.agent}
RESPOSTA: ${primaryResult.output.slice(0, 2000)}`;

      const audit = await chatWithCascade(
        [{ role: "user", content: auditPrompt }],
        auditCascade,
        6000,
      );
      const out = (audit?.content ?? "").trim();
      if (!out || /^OK\b/i.test(out)) return;

      const m = out.match(/DIVERGENCE:\s*(.+?)\s*\|\s*SUGGEST:\s*(.+)/is);
      if (m) {
        pushCorrection({
          originalAgent: primaryResult.agent,
          command,
          divergence: m[1].trim(),
          suggestion: m[2].trim(),
          timestamp: Date.now(),
        });
        // Also persist as an episode for long-term memory
        const { recordEpisode } = await import("./episodic-memory");
        await recordEpisode({
          episode_type: "correction",
          agent: "harvester",
          command,
          response: `divergence=${m[1].trim()} | suggest=${m[2].trim()}`,
          importance: 0.8,
          tags: ["audit", primaryResult.agent, "critical"],
        });
      }
    } catch (err) {
      console.warn("[InternalAuditor] background audit failed:", err);
    }
  })();
}
