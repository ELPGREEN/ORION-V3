/**
 * Orion - Anti-Hallucination Optimizer
 * 
 * Proposta de otimização para reduzir alucinações:
 * 
 * Mudanças recomendadas:
 * 1. FREE_ENERGY_THRESHOLD_LOW: 35 → 25 (mais sensível)
 * 2. FREE_ENERGY_THRESHOLD_HIGH: 60 → 50 (correção mais frequente)
 * 3. shouldCorrect: severity === "high" → severity >= "low"
 * 4. Adicionar mais padrões de fabricação
 * 5. Bloquear frases de incerteza
 */

export const OPTIMIZED_THRESHOLDS = {
  FREE_ENERGY_THRESHOLD_LOW: 25,    // Era 35
  FREE_ENERGY_THRESHOLD_HIGH: 50,   // Era 60
  
  // Limiar para bloquear resposta completamente
  BLOCK_THRESHOLD: 75,  // Respostas com FE > 75 são bloqueadas
  
  // Confiança mínima para aceitar resposta
  MIN_CONFIDENCE: 70,  // Era implícito ~50%
};

// Frases que indicam incerteza e devem ser penalizadas
export const UNCERTAINTY_PHRASES = [
  "não tenho certeza",
  "pode ser que",
  "talvez",
  "provavelmente",
  "creio que",
  "acredito que",
  "na minha opinião",
  "não tenho certeza",
  "não posso confirmar",
  "é possível que",
  "não tenho informações",
  "não encontrei",
  "não consegui",
  "falha ao",
  "erro ao",
];

// Padrões de fabricação adicionais
export const FABRICATION_PATTERNS_EXTENDED = [
  // Leis com números absurdamente altos
  /Lei\s+n[°º.]?\s*\d{5,}/i,
  
  // Artigos com 4+ dígitos
  /Art(?:igo)?\.?\s*\d{4,}/i,
  
  // Súmulas com 3+ dígitos
  /Súmula\s+(?:Vinculante\s+)?\d{3,}/i,
  
  // Processos com números excessivamente longos
  /(?:RE|REsp)\s+\d{10,}/i,
  
  // Datas futuras impossíveis
  /(?:20[3-9]\d|21\d{2})\/\d{2}\/\d{2}/i,
  
  // Números de telefone fabricados
  /\d{5}[-.\s]?\d{4,}/i,
  
  // URLs claramente fictícias
  /(?:www\.|http)\S*[a-z]{2,}\.(?:com|org|gov)\.\S{1,20}/i,
];

// Sugestão de código para replacement em active-inference-guard.ts

export const REPLACEMENT_CODE = `
// ═══ CONSTANTS - OPTIMIZED FOR REDUCED HALLUCINATIONS ═══

const FREE_ENERGY_THRESHOLD_LOW = 25;  // OPTIMIZED: was 35
const FREE_ENERGY_THRESHOLD_HIGH = 50; // OPTIMIZED: was 60
const BLOCK_THRESHOLD = 75;            // NEW: block responses above this

// Enhanced uncertainty phrases - penalize doubt
const UNCERTAINTY_PHRASES = [
  "não tenho certeza",
  "pode ser que",
  "talvez",
  "provavelmente",
  "creio que",
  "acredito que",
  "na minha opinião",
  "não posso confirmar",
  "não tenho informações",
  "falha ao",
  "erro ao",
];

// ═══ SHOULD CORRECT - MORE AGGRESSIVE ═══
export function shouldCorrect(result: ActiveInferenceResult): boolean {
  // OPTIMIZED: Also correct medium severity
  return result.severity === "high" || result.severity === "low";
}

// NEW: BLOCK BAD RESPONSES
export function shouldBlock(result: ActiveInferenceResult): boolean {
  return result.freeEnergy > BLOCK_THRESHOLD || 
         result.hallucinations.some(h => h.severity === "high");
}
`;

export function checkUncertaintyPenalty(text: string): number {
  const lower = text.toLowerCase();
  let penalty = 0;
  
  for (const phrase of UNCERTAINTY_PHRASES) {
    if (lower.includes(phrase)) {
      penalty += 5;
    }
  }
  
  return penalty;
}

export function detectFabrication(text: string): string[] {
  const fabrications: string[] = [];
  
  for (const pattern of FABRICATION_PATTERNS_EXTENDED) {
    const matches = text.match(pattern);
    if (matches) {
      fabrications.push(...matches);
    }
  }
  
  return fabrications;
}

export function getResponseGrade(
  freeEnergy: number,
  hallucinationCount: number,
  hasGrounding: boolean
): 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' {
  if (freeEnergy > 70 || hallucinationCount > 5) return 'F';
  if (freeEnergy > 60 || hallucinationCount > 3) return 'D';
  if (freeEnergy > 50 || hallucinationCount > 2) return 'C';
  if (freeEnergy > 35 || hallucinationCount > 1) return 'B';
  if (freeEnergy > 25 && hasGrounding) return 'A';
  return 'A+';
}
