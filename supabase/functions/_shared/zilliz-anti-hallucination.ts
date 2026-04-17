/**
 * Zilliz Anti-Hallucination Module
 * Runs inside Edge Functions for ultra-fast validation
 * Uses Zilliz vector similarity to verify responses against knowledge base
 */

// Valid legal ranges for Brazilian law
const LEGAL_RANGES = {
  sumulas: {
    stf_vinculante: { min: 1, max: 56 },
    stf_normal: { min: 1, max: 736 },
    stj: { min: 1, max: 660 },
    tst: { min: 1, max: 463 },
  },
  artigos: {
    "código penal": { min: 1, max: 361 },
    "código civil": { min: 1, max: 2046 },
    "cpc": { min: 1, max: 1072 },
    "código processo penal": { min: 1, max: 811 },
    "constituição": { min: 1, max: 250 },
    "cf/88": { min: 1, max: 250 },
    clt: { min: 1, max: 922 },
    cdc: { min: 1, max: 119 },
    eca: { min: 1, max: 267 },
  }
};

// Hallucination patterns
const FABRICATION_PATTERNS = [
  /Lei\s+n[°º.]?\s*\d{5,}/i,
  /Art(?:igo)?\.?\s*\d{4,}/i,
  /Súmula\s+(?:Vinculante\s+)?\d{3,}/i,
  /(?:RE|REsp)\s+\d{10,}/i,
  /(?:20[3-9]\d|21\d{2})\/\d{2}/i, // Datas futuras impossíveis
];

// Uncertainty phrases
const UNCERTAINTY_PATTERNS = [
  /não tenho certeza/gi,
  /pode ser que/gi,
  /talvez/gi,
  /provavelmente/gi,
  /acredito que/gi,
  /não posso confirmar/gi,
  /não tenho informações/gi,
];

export interface HallucinationCheck {
  hasHallucination: boolean;
  freeEnergy: number;
  confidence: number;
  issues: string[];
  severity: "none" | "low" | "high";
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  recommendations: string[];
}

export interface VerifyResult {
  verified: boolean;
  sources: string[];
  confidence: number;
  matchedKnowledge: boolean;
}

/**
 * Extract legal references from text
 */
export function extractLegalReferences(text: string): {
  sumulas: { text: string; tribunal: string; numero: number }[];
  artigos: { text: string; lei: string; numero: number }[];
} {
  const sumulas: { text: string; tribunal: string; numero: number }[] = [];
  const artigos: { text: string; lei: string; numero: number }[] = [];
  
  // Extract Súmulas
  const sumulaPatterns = [
    /Súmula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?(\d+)\s+(?:do\s+)?(STF|STJ|TST)/gi,
    /(?:Súmula|SP)\s+(?:n[°º.]?\s*)?(\d+)\s+(?:do\s+)?(STF|STJ|TST)/gi,
  ];
  
  for (const pattern of sumulaPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const numero = parseInt(match[1]);
      const tribunal = match[2].toLowerCase();
      sumulas.push({ text: match[0], tribunal, numero });
    }
  }
  
  // Extract Artigos
  const artigoPattern = /(?:Art(?:igo)?\.?\s*)(\d+)\s+(?:do\s+)?(?:Código\s+)?([A-Za-záéíóúàèìòùâêîôûãõç\s]+)/gi;
  let match;
  while ((match = artigoPattern.exec(text)) !== null) {
    const numero = parseInt(match[1]);
    const lei = match[2].toLowerCase().trim();
    artigos.push({ text: match[0], lei, numero });
  }
  
  return { sumulas, artigos };
}

/**
 * Verify legal references against known ranges
 */
export function verifyLegalReferences(refs: ReturnType<typeof extractLegalReferences>): {
  validSumulas: string[];
  invalidSumulas: { text: string; reason: string }[];
  validArtigos: string[];
  invalidArtigos: { text: string; reason: string }[];
} {
  const validSumulas: string[] = [];
  const invalidSumulas: { text: string; reason: string }[] = [];
  const validArtigos: string[] = [];
  const invalidArtigos: { text: string; reason: string }[] = [];
  
  // Verify Súmulas
  for (const s of refs.sumulas) {
    const tribunal = s.tribunal.toLowerCase();
    let valid = false;
    let range = null;
    
    if (tribunal === "stj") {
      range = LEGAL_RANGES.sumulas.stj;
    } else if (tribunal === "tst") {
      range = LEGAL_RANGES.sumulas.tst;
    } else if (tribunal === "stf") {
      range = LEGAL_RANGES.sumulas.stf_normal;
    }
    
    if (range && s.numero >= range.min && s.numero <= range.max) {
      validSumulas.push(s.text);
      valid = true;
    }
    
    if (!valid) {
      invalidSumulas.push({
        text: s.text,
        reason: range ? `Súmula ${s.numero} fora do range válido (${range.min}-${range.max})` : `Tribunal ${tribunal} não reconhecido`
      });
    }
  }
  
  // Verify Artigos
  for (const a of refs.artigos) {
    let valid = false;
    let range = null;
    
    for (const [lei, r] of Object.entries(LEGAL_RANGES.artigos)) {
      if (a.lei.includes(lei) || lei.includes(a.lei)) {
        range = r;
        break;
      }
    }
    
    if (range && a.numero >= range.min && a.numero <= range.max) {
      validArtigos.push(a.text);
      valid = true;
    }
    
    if (!valid && range) {
      invalidArtigos.push({
        text: a.text,
        reason: `Artigo ${a.numero} possivelmente fora do range válido para esta lei`
      });
    }
  }
  
  return { validSumulas, invalidSumulas, validArtigos, invalidArtigos };
}

/**
 * Main anti-hallucination check function
 */
export function checkResponseAntiHallucination(
  response: string,
  query: string,
  retrievedContext?: string[]
): HallucinationCheck {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let freeEnergy = 0;
  
  // 1. Check fabrication patterns
  for (const pattern of FABRICATION_PATTERNS) {
    const matches = response.match(pattern);
    if (matches) {
      issues.push(`Padrão suspeito detectado: ${matches.slice(0, 2).join(", ")}`);
      freeEnergy += 15;
    }
  }
  
  // 2. Verify legal references
  const refs = extractLegalReferences(response);
  const verified = verifyLegalReferences(refs);
  
  for (const inv of verified.invalidSumulas) {
    issues.push(`Súmula suspeita: ${inv.reason}`);
    freeEnergy += 20;
  }
  
  for (const inv of verified.invalidArtigos) {
    issues.push(`Artigo suspeito: ${inv.reason}`);
    freeEnergy += 10;
  }
  
  // 3. Check uncertainty phrases
  let uncertaintyCount = 0;
  for (const pattern of UNCERTAINTY_PATTERNS) {
    const matches = response.match(pattern);
    if (matches) uncertaintyCount += matches.length;
  }
  
  if (uncertaintyCount > 2) {
    issues.push(`Excesso de expressões de incerteza (${uncertaintyCount})`);
    freeEnergy += 5 * Math.min(uncertaintyCount, 5);
  }
  
  // 4. Check semantic coherence
  const queryWords = new Set(query.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const responseWords = new Set(response.toLowerCase().split(/\s+/).filter(w => w.length > 4));
  const overlap = [...queryWords].filter(w => responseWords.has(w)).length / Math.max(queryWords.size, 1);
  
  if (overlap < 0.2) {
    issues.push(`Baixa coerência com a pergunta (${(overlap * 100).toFixed(0)}%)`);
    freeEnergy += 25;
  }
  
  // 5. Check against retrieved context
  if (retrievedContext && retrievedContext.length > 0) {
    const contextWords = new Set(retrievedContext.join(" ").toLowerCase().split(/\s+/).filter(w => w.length > 4));
    const responseAgainstContext = [...responseWords].filter(w => contextWords.has(w)).length / Math.max(responseWords.size, 1);
    
    if (responseAgainstContext < 0.3) {
      issues.push(`Resposta não respaldada pelo contexto recuperado`);
      freeEnergy += 20;
    }
  }
  
  // Normalize free energy to 0-100
  freeEnergy = Math.min(100, freeEnergy);
  
  // Determine severity
  let severity: "none" | "low" | "high" = "none";
  if (freeEnergy > 50) severity = "high";
  else if (freeEnergy > 25) severity = "low";
  
  // Calculate confidence
  const confidence = Math.max(0, 100 - freeEnergy);
  
  // Determine grade
  let grade: "A+" | "A" | "B" | "C" | "D" | "F";
  if (freeEnergy > 75) grade = "F";
  else if (freeEnergy > 60) grade = "D";
  else if (freeEnergy > 45) grade = "C";
  else if (freeEnergy > 30) grade = "B";
  else if (freeEnergy > 15) grade = "A";
  else grade = "A+";
  
  // Generate recommendations
  if (severity === "high") {
    recommendations.push("⚠️ Resposta com alta chance de alucinação. Verificar todas as referências.");
    recommendations.push("Recomenda-se consultar fontes oficiais.");
  } else if (severity === "low") {
    recommendations.push("ℹ️ Algumas referências necessitam verificação.");
  }
  
  return {
    hasHallucination: severity !== "none",
    freeEnergy,
    confidence,
    issues,
    severity,
    grade,
    recommendations,
  };
}

/**
 * Quick verification against Zilliz knowledge
 */
export async function verifyAgainstKnowledge(
  response: string,
  zillizSearchUrl: string,
  token: string
): Promise<VerifyResult> {
  try {
    // Extract key claims from response
    const claims = response.split(/[.!?]/).filter(s => s.trim().length > 20).slice(0, 3);
    
    if (claims.length === 0) {
      return { verified: false, sources: [], confidence: 0, matchedKnowledge: false };
    }
    
    const matchedClaims: string[] = [];
    const sources: string[] = [];
    
    for (const claim of claims) {
      // Search for claim in Zilliz
      const searchRes = await fetch(zillizSearchUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ query: claim, topK: 3 }),
      });
      
      if (searchRes.ok) {
        const data = await searchRes.json();
        const results = data.results || [];
        
        if (results.length > 0 && results[0].distance < 0.5) {
          matchedClaims.push(claim);
          if (results[0].text) sources.push(results[0].text);
        }
      }
    }
    
    const matchedKnowledge = matchedClaims.length / claims.length > 0.5;
    const confidence = matchedKnowledge ? (matchedClaims.length / claims.length) * 100 : 0;
    
    return {
      verified: matchedKnowledge,
      sources: [...new Set(sources)].slice(0, 5),
      confidence,
      matchedKnowledge,
    };
  } catch (e) {
    console.error("[ZillizAntiHallucination] Verification failed:", e);
    return { verified: false, sources: [], confidence: 0, matchedKnowledge: false };
  }
}

/**
 * Generate disclaimer based on check result
 */
export function generateDisclaimer(result: HallucinationCheck, verified?: VerifyResult): string {
  if (result.severity === "none") return "";
  
  let disclaimer = "";
  
  if (result.severity === "high") {
    disclaimer = "⚠️ **ALERTA**: Esta resposta contém referências que não puderam ser verificadas. ";
    disclaimer += `Classificação: ${result.grade}. `;
    if (result.issues.length > 0) {
      disclaimer += `\n\n**Problemas detectados:**\n${result.issues.map(i => `- ${i}`).join("\n")}`;
    }
    disclaimer += "\n\n**Recomendação**: Consultar fontes oficiais.";
  } else if (result.severity === "low") {
    disclaimer = "ℹ️ **Nota**: Algumas informações podem necessitar verificação adicional.";
  }
  
  if (verified && !verified.verified) {
    disclaimer += "\n\n⚠️ **Contexto insuficiente na base de conhecimento** para validar completamente esta resposta.";
  }
  
  if (verified && verified.sources.length > 0) {
    disclaimer += `\n\n**Fontes verificadas**: ${verified.sources.slice(0, 3).join("; ")}`;
  }
  
  return disclaimer;
}
