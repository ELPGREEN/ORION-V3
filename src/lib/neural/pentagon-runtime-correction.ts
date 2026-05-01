/**
 * 🧠 Pentagon Runtime Auto-Correction
 *
 * Listens for user corrections in real time. When detected:
 *  1. Records the correction in `recordCorrection` (intent feedback)
 *  2. Persists an episodic memory entry so the lesson survives the session
 *  3. Re-feeds the Pentagon with negative reinforcement on the bad path
 *
 * Two trigger sources:
 *  - Heuristic: scans user messages for "não era isso", "errado", etc.
 *  - Explicit: any code can dispatch `if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("orion:user-correction", { detail }))`
 */
import {
  recordCorrection,
  isNegativeFeedback,
  extractCorrectionTarget,
} from "./intent-feedback";
import { createEpisode } from "./episodic-memory";
import { supabase } from "@/integrations/supabase/client";

export interface RuntimeCorrectionDetail {
  /** What the user actually said in the correction */
  userText: string;
  /** What Orion answered before being corrected (optional) */
  previousAnswer?: string;
  /** Original user intent that was misclassified (optional) */
  originalIntent?: string;
  /** What the user really meant (optional, auto-extracted if missing) */
  intendedTarget?: string;
  /** Conversation ID, for episodic dedupe */
  conversationId?: string;
}

let _installed = false;

/**
 * Installs global listeners. Idempotent — call once at app boot.
 */
export function installPentagonAutoCorrection(): void {
  if (_installed || typeof window === "undefined") return;
  _installed = true;

  if (typeof window !== "undefined") window.addEventListener("orion:user-correction", (e: Event) => {
    const detail = (e as CustomEvent<RuntimeCorrectionDetail>).detail;
    if (!detail?.userText) return;
    void handleCorrection(detail);
  });

  // Heuristic listener: any chat message dispatched as `orion:user-message`
  if (typeof window !== "undefined") window.addEventListener("orion:user-message", (e: Event) => {
    const detail = (e as CustomEvent<{ text: string; previousAnswer?: string; originalIntent?: string; conversationId?: string }>).detail;
    if (!detail?.text) return;
    if (!isNegativeFeedback(detail.text)) return;
    void handleCorrection({
      userText: detail.text,
      previousAnswer: detail.previousAnswer,
      originalIntent: detail.originalIntent,
      conversationId: detail.conversationId,
    });
  });

  console.log("[Pentagon-AutoCorrect] 🎯 Runtime correction listeners armed.");
}

async function handleCorrection(detail: RuntimeCorrectionDetail): Promise<void> {
  try {
    const target = detail.intendedTarget || extractCorrectionTarget(detail.userText) || detail.userText;
    const originalIntent = detail.originalIntent || "unknown";
    const correctIntent = inferIntentFromTarget(target);

    // 1. Intent feedback (localStorage)
    recordCorrection(detail.userText, originalIntent, correctIntent);

    // 2. Episodic memory (persistent)
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const conversationId = detail.conversationId || `correction-${Date.now()}`;
      const messages = [
        { role: "user", content: detail.userText, timestamp: new Date().toISOString() },
        { role: "assistant", content: detail.previousAnswer || "(resposta anterior incorreta)", timestamp: new Date().toISOString() },
        { role: "system", content: `CORREÇÃO: usuário queria "${target}", intent correto: ${correctIntent}`, timestamp: new Date().toISOString() },
      ];
      await createEpisode(conversationId, user.id, messages, `Correção: ${correctIntent}`).catch((err) => {
        console.warn("[Pentagon-AutoCorrect] episode persist failed:", err);
      });
    }

    // 3. Notify Pentagon to bias future cycles
    if (typeof window !== "undefined") window.dispatchEvent(
      new CustomEvent("orion:pentagon-learned", {
        detail: { originalIntent, correctIntent, target, userText: detail.userText },
      }),
    );

    console.log(`[Pentagon-AutoCorrect] ✅ Learned: "${detail.userText.slice(0, 60)}" → ${correctIntent}`);
  } catch (err) {
    console.warn("[Pentagon-AutoCorrect] handle failed:", err);
  }
}

function inferIntentFromTarget(target: string): string {
  const t = target.toLowerCase();
  if (/(youtube|m[uú]sica|toca|play)/.test(t)) return "media_play";
  if (/(google|pesquis|buscar|search)/.test(t)) return "web_search";
  if (/(maps|mapa|rota|caminho)/.test(t)) return "navigation";
  if (/(lei|artigo|c[oó]digo|jurispru|tribunal|stf|stj)/.test(t)) return "legal";
  if (/(c[aá]mera|imagem|foto|enxerg|v[eê])/.test(t)) return "visual";
  if (/(abrir|navegar|abre|vai\s+pra|vai\s+para)/.test(t)) return "navigation_app";
  return "textual";
}
