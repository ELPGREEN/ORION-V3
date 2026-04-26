import { IPentagonLayer, ActionResult } from "../types";
import { autoChargeBeforeService, detectServiceFromQuery } from "@/lib/neural/arc-auto-charge";
import { ValueCalculator } from "./ValueCalculator";

export class ActionAdapter implements IPentagonLayer<any, ActionResult> {
  public async process(reasoning: any, context: any): Promise<ActionResult> {
    const userId = context?.userId;
    const userEmail = context?.userEmail || "";
    const userName = context?.userName || "Usuário";
    const rawInput = context?.rawInput || "";

    const serviceContext = detectServiceFromQuery(rawInput);
    const roi = ValueCalculator.calculateROI(serviceContext || "general");

    console.log(`[ACTION] Evaluating ROI for ${serviceContext}: ${roi.valueDescription}`);

    if (serviceContext && userId) {
      const chargeCheck = await autoChargeBeforeService(userId, userEmail, userName, serviceContext, rawInput);

      if (!chargeCheck.shouldProceed) {
        return {
          success: false,
          output: `${chargeCheck.message}\n\n💡 **Valor deste serviço:** ${roi.valueDescription}`,
          data: {
            paymentUrl: chargeCheck.paymentUrl,
            price: chargeCheck.price,
            roiInfo: roi
          },
          roiImpact: "Bloqueado aguardando monetização"
        };
      }
    }

    return {
      success: true,
      output: `Serviço concluído. ${roi.valueDescription}`,
      data: { planExecuted: reasoning.plan, roiInfo: roi },
      roiImpact: roi.valueDescription
    };
  }
}
