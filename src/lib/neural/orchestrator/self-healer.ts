/**
 * Self-Healing — detects recurring failures and creates safe proposals
 * (mode: "Detectar + sugerir"). Does NOT auto-execute.
 * Proposals go to neural_evolution_proposals when present, otherwise
 * stay in episodic memory tagged "self_heal_proposal".
 */

import { detectRecurringFailures, recordEpisode } from "./episodic-memory";
import { supabase } from "@/integrations/supabase/client";

export interface HealingProposal {
  intent: string;
  failureCount: number;
  rootCause: string;
  suggestedFix: string;
}

export async function attemptSelfHeal(intent: string): Promise<HealingProposal | null> {
  const fails = await detectRecurringFailures(intent, 3);
  if (!fails.length) return null;

  // Build a meta-prompt to analyze the recurring failure pattern
  const { chatWithCascade } = await import("@/lib/integrations/llm-providers");
  const failBlock = fails
    .slice(0, 5)
    .map(
      (f, i) =>
        `${i + 1}. cmd="${(f.command ?? "").slice(0, 150)}" → resp="${(f.response ?? "").slice(0, 150)}"`,
    )
    .join("\n");

  const prompt = `Você é o módulo de SELF-HEALING do Orion. Falhas recorrentes detectadas para o intent "${intent}":

${failBlock}

Diagnostique:
1) ROOT_CAUSE: causa raiz comum (1 frase)
2) FIX: correção recomendada (1-2 frases, acionável, sem código)

Formato OBRIGATÓRIO:
ROOT_CAUSE: <texto>
FIX: <texto>`;

  try {
    const res = await chatWithCascade(
      [{ role: "user", content: prompt }],
      [
        { provider: "openrouter", model: "deepseek/deepseek-r1:free" },
        { provider: "openrouter", model: "qwen/qwen3-coder:free" },
      ],
      8000,
    );
    const out = res?.content ?? "";
    const root = /ROOT_CAUSE:\s*(.+)/i.exec(out)?.[1]?.trim() ?? "Causa não identificada";
    const fix = /FIX:\s*(.+)/is.exec(out)?.[1]?.trim() ?? "Sem sugestão";

    const proposal: HealingProposal = {
      intent,
      failureCount: fails.length,
      rootCause: root,
      suggestedFix: fix,
    };

    // Persist as episode + try to write to evolution_proposals if it exists
    await recordEpisode({
      episode_type: "reflection",
      agent: "orion",
      command: `[self-heal] ${intent}`,
      response: `${root}\n→ ${fix}`,
      importance: 0.9,
      tags: ["self_heal_proposal", intent],
      metadata: { failureCount: fails.length },
    });

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user?.id) {
        await supabase.from("neural_evolution_proposals" as any).insert({
          user_id: auth.user.id,
          proposal_type: "self_heal",
          title: `Self-heal: ${intent}`,
          description: `${root}\n\nSugestão: ${fix}\n\nFalhas recorrentes: ${fails.length}`,
          status: "pending",
        } as any);
      }
    } catch {
      // table may not exist or schema differs — episodic record is enough
    }

    return proposal;
  } catch (err) {
    console.warn("[SelfHealer] analysis failed:", err);
    return null;
  }
}
