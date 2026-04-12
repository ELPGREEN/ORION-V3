/**
 * ─── Tesla Wireless P2P — Comunicação Direta entre Agentes Neurais ───
 * Inspirado na transmissão sem fio de Tesla: agentes com alta co-ativação
 * STDP formam "links ressonantes" e se comunicam diretamente, sem hub central.
 *
 * Links emergem organicamente pelo uso real (pesos STDP), não por config estática.
 * O supervisor permanece como fallback para agentes sem afinidade comprovada.
 */

import type { AgentRole, A2AMessageType, AgentSocietyState } from "./multi-agent";

// ─── Thresholds ───

const RESONANCE_LINK_THRESHOLD = 0.15;
const LINK_DECAY_THRESHOLD = 0.08;
const MAX_INBOX_SIZE = 50;
const MAX_NETWORK_LOG = 200;

// ─── Types ───

export interface ResonanceLink {
  from: AgentRole;
  to: AgentRole;
  strength: number;
  formedAt: number;
  messagesExchanged: number;
}

export interface TeslaDirectMessage {
  id: string;
  from: AgentRole;
  to: AgentRole | "*";
  type: A2AMessageType;
  payload: Record<string, unknown>;
  timestamp: number;
  isP2P: true;
  resonanceStrength: number;
  hopCount: 0;
  deliveredAt: number | null;
}

export interface P2PNetworkMetrics {
  activeLinks: number;
  totalMessagesDelivered: number;
  totalMessagesFailed: number;
  bypassedHubCount: number;
  avgResonanceStrength: number;
  networkTopology: Array<{ from: AgentRole; to: AgentRole; strength: number }>;
}

// ─── Singleton Network State ───

let _links: ResonanceLink[] = [];
let _inboxes: Map<AgentRole, TeslaDirectMessage[]> = new Map();
let _metrics: P2PNetworkMetrics = {
  activeLinks: 0,
  totalMessagesDelivered: 0,
  totalMessagesFailed: 0,
  bypassedHubCount: 0,
  avgResonanceStrength: 0,
  networkTopology: [],
};
let _networkLog: TeslaDirectMessage[] = [];

// ─── Helpers ───

let _msgCounter = 0;
function generateMsgId(): string {
  return `tp2p_${Date.now()}_${++_msgCounter}`;
}

function getAvgWeight(
  weights: number[][],
  a: number,
  b: number
): number {
  const wAB = weights[a]?.[b] ?? 0;
  const wBA = weights[b]?.[a] ?? 0;
  return (wAB + wBA) / 2;
}

// ─── Role-to-Neuron mapping (mirrors multi-agent.ts) ───

const ROLE_TO_NEURON: Record<AgentRole, number> = {
  leitura: 0, pesquisa: 1, construcao: 2, planejador: 3,
  supervisor: 4, critico: 5, refinador: 6, monitoramento: 7,
  colaborador: 8, multimodal: 9, self_model: 10,
};

// ─── Core API ───

/**
 * Recalcula links ressonantes a partir dos pesos STDP atuais.
 * Links acima do threshold são mantidos/criados; abaixo são removidos.
 */
export function refreshResonanceLinks(society: AgentSocietyState): void {
  const roles = Object.keys(ROLE_TO_NEURON) as AgentRole[];
  const weights = society.binding.weights;
  const now = Date.now();
  const newLinks: ResonanceLink[] = [];

  for (let i = 0; i < roles.length; i++) {
    for (let j = i + 1; j < roles.length; j++) {
      const roleA = roles[i];
      const roleB = roles[j];
      const nA = ROLE_TO_NEURON[roleA];
      const nB = ROLE_TO_NEURON[roleB];
      const avgW = getAvgWeight(weights, nA, nB);

      if (avgW >= RESONANCE_LINK_THRESHOLD) {
        // Preserve existing link stats if it already existed
        const existing = _links.find(
          (l) =>
            (l.from === roleA && l.to === roleB) ||
            (l.from === roleB && l.to === roleA)
        );
        newLinks.push({
          from: roleA,
          to: roleB,
          strength: avgW,
          formedAt: existing?.formedAt ?? now,
          messagesExchanged: existing?.messagesExchanged ?? 0,
        });
      }
      // Links below LINK_DECAY_THRESHOLD are simply not included (pruned)
    }
  }

  _links = newLinks;

  // Update metrics
  _metrics.activeLinks = _links.length;
  _metrics.avgResonanceStrength =
    _links.length > 0
      ? _links.reduce((s, l) => s + l.strength, 0) / _links.length
      : 0;
  _metrics.networkTopology = _links.map((l) => ({
    from: l.from,
    to: l.to,
    strength: l.strength,
  }));
}

/**
 * Verifica se existe um link ressonante entre dois agentes.
 */
export function hasResonanceLink(a: AgentRole, b: AgentRole): boolean {
  return _links.some(
    (l) =>
      (l.from === a && l.to === b) || (l.from === b && l.to === a)
  );
}

/**
 * Retorna a força do link ressonante entre dois agentes (0 se inexistente).
 */
export function getResonanceStrength(a: AgentRole, b: AgentRole): number {
  const link = _links.find(
    (l) =>
      (l.from === a && l.to === b) || (l.from === b && l.to === a)
  );
  return link?.strength ?? 0;
}

/**
 * Envia mensagem direta P2P entre dois agentes.
 * Retorna true se entregue (link ressonante existe), false caso contrário (fallback para hub).
 */
export function sendDirect(
  from: AgentRole,
  to: AgentRole,
  type: A2AMessageType,
  payload: Record<string, unknown>
): boolean {
  const link = _links.find(
    (l) =>
      (l.from === from && l.to === to) || (l.from === to && l.to === from)
  );

  if (!link) {
    _metrics.totalMessagesFailed++;
    return false; // No resonance link — caller should use hub
  }

  const now = Date.now();
  const msg: TeslaDirectMessage = {
    id: generateMsgId(),
    from,
    to,
    type,
    payload,
    timestamp: now,
    isP2P: true,
    resonanceStrength: link.strength,
    hopCount: 0,
    deliveredAt: now,
  };

  // Deliver to inbox
  if (!_inboxes.has(to)) _inboxes.set(to, []);
  const inbox = _inboxes.get(to)!;
  if (inbox.length >= MAX_INBOX_SIZE) inbox.shift();
  inbox.push(msg);

  // Update link stats
  link.messagesExchanged++;

  // Update network log
  _networkLog = [..._networkLog.slice(-(MAX_NETWORK_LOG - 1)), msg];

  // Update metrics
  _metrics.totalMessagesDelivered++;
  _metrics.bypassedHubCount++;

  return true;
}

/**
 * Broadcast P2P: envia mensagem apenas para agentes com links ressonantes ativos.
 * Retorna lista de agentes que receberam.
 */
export function broadcastResonant(
  from: AgentRole,
  type: A2AMessageType,
  payload: Record<string, unknown>
): AgentRole[] {
  const recipients: AgentRole[] = [];

  for (const link of _links) {
    let target: AgentRole | null = null;
    if (link.from === from) target = link.to;
    else if (link.to === from) target = link.from;

    if (target) {
      const sent = sendDirect(from, target, type, payload);
      if (sent) recipients.push(target);
    }
  }

  return recipients;
}

/**
 * Lê mensagens P2P pendentes na inbox de um agente.
 * Esvazia a inbox após leitura (consume pattern).
 */
export function drainInbox(role: AgentRole): TeslaDirectMessage[] {
  const inbox = _inboxes.get(role) ?? [];
  _inboxes.set(role, []);
  return inbox;
}

/**
 * Retorna todos os parceiros P2P ativos para um agente.
 */
export function getP2PPartners(role: AgentRole): Array<{ role: AgentRole; strength: number }> {
  const partners: Array<{ role: AgentRole; strength: number }> = [];
  for (const link of _links) {
    if (link.from === role) partners.push({ role: link.to, strength: link.strength });
    else if (link.to === role) partners.push({ role: link.from, strength: link.strength });
  }
  return partners.sort((a, b) => b.strength - a.strength);
}

/**
 * Retorna métricas da rede P2P.
 */
export function getP2PNetworkStatus(): Readonly<P2PNetworkMetrics> {
  return _metrics;
}

/**
 * Retorna log recente de mensagens P2P.
 */
export function getP2PNetworkLog(): readonly TeslaDirectMessage[] {
  return _networkLog;
}

/**
 * Reset completo da rede P2P (para testes).
 */
export function resetP2PNetwork(): void {
  _links = [];
  _inboxes = new Map();
  _networkLog = [];
  _msgCounter = 0;
  _metrics = {
    activeLinks: 0,
    totalMessagesDelivered: 0,
    totalMessagesFailed: 0,
    bypassedHubCount: 0,
    avgResonanceStrength: 0,
    networkTopology: [],
  };
}
