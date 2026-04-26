/**
 * 💰 ROI & Value Calculator for Orion
 * Estimates time saved and financial impact of AI actions.
 */

export interface ROIInfo {
  estimatedTimeSavedMinutes: number;
  financialImpactBRL: number;
  precisionGain: number;
  valueDescription: string;
}

export class ValueCalculator {
  private static SERVICE_VALUES: Record<string, { time: number, cost: number }> = {
    "legal_research": { time: 120, cost: 300 },
    "document_generation": { time: 180, cost: 500 },
    "code_analysis": { time: 60, cost: 200 },
    "vision_api": { time: 30, cost: 50 },
    "translation": { time: 45, cost: 100 },
    "general": { time: 10, cost: 20 }
  };

  public static calculateROI(serviceType: string, complexity: number = 1): ROIInfo {
    const base = this.SERVICE_VALUES[serviceType] || this.SERVICE_VALUES.general;

    const timeSaved = base.time * complexity;
    const impact = base.cost * complexity;

    return {
      estimatedTimeSavedMinutes: timeSaved,
      financialImpactBRL: impact,
      precisionGain: 0.95, // Padrão Órion
      valueDescription: `Economia estimada de ${this.formatTime(timeSaved)} e R$ ${impact.toFixed(2)} em honorários/custos operacionais.`
    };
  }

  private static formatTime(minutes: number): string {
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
}
