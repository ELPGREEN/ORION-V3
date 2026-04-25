/**
 * ─── Orion Financial Intelligence ───
 * Injects revenue and service costs into the Maestro interaction context.
 */

import { getRevenueSummary } from "./arc-revenue-generator";
import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches the AI's financial performance context.
 */
export async function getFinancialContext(userId: string): Promise<string> {
  try {
    const summary = await getRevenueSummary(userId);
    if (summary.totalEarned === 0) return "";

    return `[FINANCEIRO AI] Ganhos Totais: R$ ${(summary.totalEarned / 100).toFixed(2)}\nSaldo Pendente: R$ ${(summary.totalPending / 100).toFixed(2)}`;
  } catch {
    return "";
  }
}
