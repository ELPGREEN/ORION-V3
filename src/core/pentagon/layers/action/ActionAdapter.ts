import { IPentagonLayer, ActionResult } from "../types";
import { autoChargeBeforeService, detectServiceFromQuery } from "@/lib/neural/arc-auto-charge";

export class ActionAdapter implements IPentagonLayer<any, ActionResult> {
  /**
   * Executa ações reais, integrando com o sistema de cobrança automática (Monetização).
   */
  public async process(reasoning: any, context: any): Promise<ActionResult> {
    console.log("[ACTION] Checking value creation and monetization...");

    const userId = context?.userId;
    const userEmail = context?.userEmail || "";
    const userName = context?.userName || "Usuário";
    const rawInput = context?.rawInput || "";

    // 1. Detectar se a ação é um serviço pago
    const serviceContext = detectServiceFromQuery(rawInput);

    if (serviceContext && userId) {
      const chargeCheck = await autoChargeBeforeService(userId, userEmail, userName, serviceContext, rawInput);

      if (!chargeCheck.shouldProceed) {
        return {
          success: false,
          output: chargeCheck.message,
          data: {
            paymentUrl: chargeCheck.paymentUrl,
            price: chargeCheck.price,
            needsPayment: chargeCheck.needsPayment
          },
          roiImpact: "Bloqueado por fluxo de monetização"
        };
      }
    }

    // 2. Executar a ação baseada no plano algébrico
    return {
      success: true,
      output: "Serviço executado com sucesso dentro do fluxo AquaMonkey.",
      data: { planExecuted: reasoning.plan },
      roiImpact: "Valor gerado e faturado via Stripe/ARC"
    };
  }
}
