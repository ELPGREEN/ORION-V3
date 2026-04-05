/**
 * Client Requirements Parser
 * Extracts document generation requirements from natural language messages
 */

export function parseClientRequirements(message: string): {
  quantity?: number;
  documentType?: string;
  parties?: string[];
  specificRequests?: string[];
  urgency?: "normal" | "urgent" | "immediate";
} {
  const requirements: {
    quantity?: number;
    documentType?: string;
    parties?: string[];
    specificRequests?: string[];
    urgency?: "normal" | "urgent" | "immediate";
  } = {};

  const quantityMatch = message.match(/(\d+)\s*(documento|memorial|contrato|petição|petições|documentos)/i);
  if (quantityMatch) {
    requirements.quantity = parseInt(quantityMatch[1], 10);
  }

  const typePatterns = [
    { pattern: /petição inicial/i, type: "peticao-inicial" },
    { pattern: /contestação/i, type: "contestacao" },
    { pattern: /memorial/i, type: "manifestacao" },
    { pattern: /contrato de serviço/i, type: "contrato-servicos" },
    { pattern: /contrato de honorário/i, type: "contrato-honorarios" },
    { pattern: /contrato de locação/i, type: "contrato-locacao" },
    { pattern: /procuração/i, type: "procuracao-ad-judicia" },
    { pattern: /notificação extrajudicial/i, type: "notificacao-extrajudicial" },
    { pattern: /acordo extrajudicial/i, type: "acordo-extrajudicial" },
    { pattern: /recurso|apelação/i, type: "recurso-apelacao" },
  ];

  for (const { pattern, type } of typePatterns) {
    if (pattern.test(message)) {
      requirements.documentType = type;
      break;
    }
  }

  const partiesMatch = message.match(/(?:partes?|autor|réu|contratante|contratado):\s*([^,.]+(?:,\s*[^,.]+)*)/i);
  if (partiesMatch) {
    requirements.parties = partiesMatch[1].split(",").map((p) => p.trim());
  }

  if (/urgen|imediato|hoje|agora|rápido/i.test(message)) {
    requirements.urgency = "urgent";
  } else if (/prioritário|logo|breve/i.test(message)) {
    requirements.urgency = "immediate";
  } else {
    requirements.urgency = "normal";
  }

  const specificPatterns = [
    /incluir jurisprudência/i,
    /incluir doutrina/i,
    /citar artigos/i,
    /com fundamentação/i,
    /incluir testemunhas/i,
    /formato pdf/i,
    /com assinatura/i,
  ];

  requirements.specificRequests = specificPatterns
    .filter((pattern) => pattern.test(message))
    .map((pattern) => pattern.source);

  return requirements;
}
