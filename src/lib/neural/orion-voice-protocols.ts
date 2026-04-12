/**
 * Orion Voice Protocols — 1500 protocols for fast recognition,
 * phrase linking, anti-hallucination, and coherent responses.
 * 
 * Loaded lazily from /data/orion_voice_protocols.json
 * Matched against user query to inject relevant context into LLM prompt.
 */

interface Protocol {
  id: number;
  cat: string;
  sub: string;
  trigger: string;
  response: string;
  priority: string;
  guard?: string;
}

interface ProtocolDB {
  version: string;
  total: number;
  protocols: Protocol[];
}

let protocolDB: ProtocolDB | null = null;
let loadingPromise: Promise<void> | null = null;

// Lazy load protocols
async function ensureLoaded(): Promise<ProtocolDB> {
  if (protocolDB) return protocolDB;
  if (!loadingPromise) {
    loadingPromise = fetch("/data/orion_voice_protocols.json")
      .then(r => r.json())
      .then(data => { protocolDB = data; })
      .catch(err => {
        console.warn("[Orion Protocols] Failed to load:", err);
        protocolDB = { version: "0", total: 0, protocols: [] };
      });
  }
  await loadingPromise;
  return protocolDB!;
}

// Pre-load on module import
ensureLoaded();

// Build search index by category for fast lookup
const categoryIndex = new Map<string, Protocol[]>();

function buildIndex(db: ProtocolDB) {
  if (categoryIndex.size > 0) return;
  for (const p of db.protocols) {
    const key = p.cat;
    if (!categoryIndex.has(key)) categoryIndex.set(key, []);
    categoryIndex.get(key)!.push(p);
  }
}

// Normalize accents for voice-to-text matching (ê→e, ã→a, etc.)
function normalizeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/**
 * Match user query against protocols and return relevant ones.
 * Returns max 30 protocols: quick responses + anti-hallucination guards + connectors
 */
export async function matchProtocols(query: string): Promise<{
  quickResponse: string | null;
  guards: string[];
  connectors: string[];
  coherenceRules: string[];
  systemPromptAddition: string;
}> {
  const db = await ensureLoaded();
  buildIndex(db);
  
  const q = query.toLowerCase().trim();
  const qNorm = normalizeAccents(query);
  const result = {
    quickResponse: null as string | null,
    guards: [] as string[],
    connectors: [] as string[],
    coherenceRules: [] as string[],
    systemPromptAddition: "",
  };

  // 1. Check for quick response (greetings, identity, capabilities)
  const quickCats = ["saudacao", "identidade"];
  for (const cat of quickCats) {
    const protocols = categoryIndex.get(cat) || [];
    for (const p of protocols) {
      const triggerNorm = normalizeAccents(p.trigger);
      if (qNorm.includes(triggerNorm) || triggerNorm.includes(qNorm)) {
        result.quickResponse = p.response;
        break;
      }
    }
    if (result.quickResponse) break;
  }

  // 2. Match anti-hallucination guards based on query content
  const antiHalluc = categoryIndex.get("anti_alucinacao") || [];
  for (const p of antiHalluc) {
    if (p.guard && (q.includes(p.trigger) || qNorm.includes(normalizeAccents(p.trigger)))) {
      result.guards.push(p.guard);
      if (result.guards.length >= 5) break;
    }
  }

  // 3. Always include generic anti-hallucination rules
  const genericGuards = antiHalluc
    .filter(p => p.sub === "generica")
    .slice(0, 5)
    .map(p => p.guard!)
    .filter(Boolean);
  result.guards.push(...genericGuards);

  // 4. Detect topic and add topic-specific guards
  const topics = [
    "saúde", "saude", "médic", "medic", "remédio", "remedio", "doença", "doenca",
    "direito", "lei", "juríd", "jurid", "processo", "advogad",
    "investir", "investimento", "ação", "acao", "bitcoin", "cripto", "financ",
    "preço", "preco", "custo", "valor", "quanto",
  ];
  const topicDetected = topics.some(t => q.includes(t));
  if (topicDetected) {
    const thematic = antiHalluc
      .filter(p => p.sub === "tematica")
      .filter(p => {
        const tema = p.trigger.replace("tema_", "").replace("_dados", "").replace("_especifico", "");
        return q.includes(tema);
      })
      .slice(0, 3)
      .map(p => p.guard!)
      .filter(Boolean);
    result.guards.push(...thematic);
  }

  // 5. Select appropriate connectors based on query intent
  const connectors = categoryIndex.get("conector") || [];
  const queryType = detectQueryType(q);
  const relevantConnSubs = getRelevantConnectorSubs(queryType);
  for (const sub of relevantConnSubs) {
    const subConns = connectors.filter(p => p.sub === sub);
    if (subConns.length > 0) {
      // Pick 2-3 random connectors from this sub-category
      const picked = subConns.sort(() => Math.random() - 0.5).slice(0, 2);
      result.connectors.push(...picked.map(p => p.response));
    }
  }

  // 6. Match coherence rules
  const coherence = categoryIndex.get("coerencia") || [];
  const speed = categoryIndex.get("velocidade") || [];
  
  // Determine response length protocol
  const isSimple = q.split(" ").length <= 5 && !q.includes("explique") && !q.includes("detalhe");
  const isComplex = q.includes("explique") || q.includes("detalhe") || q.includes("compare") || q.includes("analise") || q.split(" ").length > 15;
  
  if (isSimple) {
    result.coherenceRules.push("Resposta CURTA: 1-3 frases, direto ao ponto.");
  } else if (isComplex) {
    result.coherenceRules.push("Resposta DETALHADA: estruturar em tópicos, com exemplos.");
  } else {
    result.coherenceRules.push("Resposta MÉDIA: 1-2 parágrafos, desenvolvimento conciso.");
  }

  // Add speed protocols
  const speedRules = speed.slice(0, 5).map(p => p.guard!).filter(Boolean);
  result.coherenceRules.push(...speedRules);

  // 7. Check domain-specific quick responses
  if (!result.quickResponse) {
    const domain = categoryIndex.get("dominio") || [];
    for (const p of domain) {
      const triggerNorm = normalizeAccents(p.trigger);
      if (qNorm.includes(triggerNorm) || triggerNorm.includes(qNorm)) {
        result.quickResponse = p.response;
        break;
      }
    }
  }

  // 8. Build system prompt addition
  const parts: string[] = [];
  
  if (result.guards.length > 0) {
    const uniqueGuards = [...new Set(result.guards)].slice(0, 8);
    parts.push("## PROTOCOLOS ANTI-ALUCINAÇÃO ATIVOS:");
    uniqueGuards.forEach((g, i) => parts.push(`${i + 1}. ${g}`));
  }

  if (result.connectors.length > 0) {
    parts.push("\n## CONECTORES SUGERIDOS:");
    parts.push(`Use estes conectores para fluência: ${result.connectors.join(" | ")}`);
  }

  if (result.coherenceRules.length > 0) {
    const uniqueRules = [...new Set(result.coherenceRules)].slice(0, 5);
    parts.push("\n## REGRAS DE COERÊNCIA:");
    uniqueRules.forEach(r => parts.push(`- ${r}`));
  }

  if (result.quickResponse) {
    parts.push(`\n## RESPOSTA DE REFERÊNCIA (use como base, pode adaptar):`);
    parts.push(result.quickResponse);
  }

  result.systemPromptAddition = parts.join("\n");

  return result;
}

function detectQueryType(q: string): "definition" | "howto" | "comparison" | "opinion" | "factual" | "general" {
  if (q.startsWith("o que é") || q.startsWith("o que são") || q.includes("significa")) return "definition";
  if (q.startsWith("como") || q.includes("como fazer") || q.includes("como funciona")) return "howto";
  if (q.includes(" vs ") || q.includes("diferença") || q.includes("comparar") || q.includes("melhor")) return "comparison";
  if (q.includes("acha") || q.includes("opinião") || q.includes("deveria")) return "opinion";
  if (q.includes("quando") || q.includes("onde") || q.includes("quem") || q.includes("quantos")) return "factual";
  return "general";
}

function getRelevantConnectorSubs(type: string): string[] {
  switch (type) {
    case "definition": return ["intro", "exemplo", "conclusao"];
    case "howto": return ["temporal", "enfase", "conclusao"];
    case "comparison": return ["contraste", "conclusao", "enfase"];
    case "opinion": return ["incerteza", "contraste", "conclusao"];
    case "factual": return ["intro", "causa", "correcao"];
    default: return ["intro", "continuacao", "conclusao"];
  }
}
