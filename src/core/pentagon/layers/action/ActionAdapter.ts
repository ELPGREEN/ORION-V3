import { IPentagonLayer, ActionResult } from "../types";
import { autoChargeBeforeService, detectServiceFromQuery } from "@/lib/neural/arc-auto-charge";
import { ValueCalculator } from "./ValueCalculator";

export class ActionAdapter implements IPentagonLayer<any, ActionResult> {
  public async process(reasoning: any, context: any): Promise<ActionResult> {
    const userId = context?.userId;
    const userEmail = context?.userEmail || "";
    const userName = context?.userName || "Usuário";
    const rawInput = context?.rawInput || context?.perception?.rawInput || "";
    const identityStatus = context?.identityStatus;

    // 1. Respostas determinísticas rápidas
    if (reasoning.plan.includes("confirm_readiness")) {
      return {
        success: true,
        output: "Sim, estou te ouvindo perfeitamente! Como posso ajudar na sua evolução hoje?",
        data: { status: "ready" },
        roiImpact: "Resposta instantânea (<50ms)"
      };
    }

    // 2. Cálculo de ROI e Monetização
    const serviceContext = detectServiceFromQuery(rawInput);
    const roi = ValueCalculator.calculateROI(serviceContext || "general");
    const baseData = { planExecuted: reasoning.plan, roiInfo: roi, serviceDetected: serviceContext };

    if (serviceContext && userId && identityStatus !== "creator" && identityStatus !== "owner") {
      const chargeCheck = await autoChargeBeforeService(userId, userEmail, userName, serviceContext, rawInput);
      if (!chargeCheck.shouldProceed) {
        return {
          success: false,
          output: `${chargeCheck.message}\n\n💡 **Valor deste serviço:** ${roi.valueDescription}`,
          data: { ...baseData, paymentUrl: chargeCheck.paymentUrl, price: chargeCheck.price, needsPayment: chargeCheck.needsPayment },
          roiImpact: "Aguardando monetização"
        };
      }
    }

    // 3. EXECUÇÃO REAL DE FERRAMENTAS (Integração com o legado Órion)
    try {
      const { matchAndExecuteTool } = await import("@/lib/neural/orion-tool-executor");
      const toolResult = await matchAndExecuteTool(rawInput, undefined, identityStatus);

      if (toolResult.handled) {
        return {
          success: true,
          output: `${toolResult.response}\n\n✅ ${roi.valueDescription}`,
          data: { ...baseData, toolResult: toolResult.response, toolName: toolResult.toolName },
          roiImpact: roi.valueDescription
        };
      }
    } catch (e) {
      console.warn("[ActionAdapter] Tool execution failed, falling back to general response", e);
    }

    // 4. Resposta padrão se nenhuma ferramenta disparou
    return {
      success: true,
      output: `Entendido. Processando sua demanda no fluxo AquaMonkey.\n\n💡 ${roi.valueDescription}`,
      data: baseData,
      roiImpact: roi.valueDescription
    };
  }
}
