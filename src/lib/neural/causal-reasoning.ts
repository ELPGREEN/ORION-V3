/**
 * ─── v22.4: Causal Reasoning Engine ───
 * Motor de raciocínio causal para inferência causa-efeito.
 * Transcende correlações estatísticas — permite contrafactuais e predição de outcomes.
 *
 * Ref: Pearl (2009) "Causality", Schölkopf (2021) "Causal Representation Learning"
 */

// ─── Types ───

export interface CausalNode {
  id: string;
  label: string;
  type: "event" | "state" | "action" | "observation";
  domain?: string;
  timestamp?: number;
  metadata?: Record<string, unknown>;
}

export interface CausalEdge {
  from: string;   // node id
  to: string;     // node id
  strength: number;   // 0-1, causal strength
  evidence: number;   // how many observations support this link
  mechanism?: string; // description of how cause leads to effect
  lastUpdated: number;
}

export interface CausalGraph {
  nodes: Map<string, CausalNode>;
  edges: CausalEdge[];
  createdAt: number;
  lastUpdated: number;
}

export interface CausalInference {
  query: string;
  causes: Array<{ node: CausalNode; strength: number; path: string[] }>;
  effects: Array<{ node: CausalNode; strength: number; path: string[] }>;
  confidence: number;
  reasoning: string;
}

export interface CounterfactualResult {
  original: string;
  without: string;
  outcome: string;
  probability: number; // 0-1, how likely the counterfactual world
  reasoning: string;
}

// ─── Causal Graph Management ───

export function createCausalGraph(): CausalGraph {
  return {
    nodes: new Map(),
    edges: [],
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };
}

export function addCausalNode(graph: CausalGraph, node: CausalNode): CausalGraph {
  const nodes = new Map(graph.nodes);
  nodes.set(node.id, { ...node, timestamp: node.timestamp ?? Date.now() });
  return { ...graph, nodes, lastUpdated: Date.now() };
}

export function addCausalLink(
  graph: CausalGraph,
  fromId: string,
  toId: string,
  strength: number = 0.5,
  mechanism?: string
): CausalGraph {
  const existing = graph.edges.find(e => e.from === fromId && e.to === toId);
  let edges: CausalEdge[];

  if (existing) {
    // Reinforce existing edge (Hebbian-style: repeated co-occurrence strengthens)
    edges = graph.edges.map(e =>
      e.from === fromId && e.to === toId
        ? {
            ...e,
            strength: Math.min(1, e.strength * 0.8 + strength * 0.2 + 0.05),
            evidence: e.evidence + 1,
            mechanism: mechanism ?? e.mechanism,
            lastUpdated: Date.now(),
          }
        : e
    );
  } else {
    edges = [
      ...graph.edges,
      { from: fromId, to: toId, strength, evidence: 1, mechanism, lastUpdated: Date.now() },
    ];
  }

  return { ...graph, edges, lastUpdated: Date.now() };
}

// ─── Inference ───

/**
 * Backward inference: given an effect, find its likely causes.
 * Traverses the graph in reverse, accumulating causal strength.
 */
export function inferCause(graph: CausalGraph, effectId: string, maxDepth: number = 3): CausalInference {
  const causes: CausalInference["causes"] = [];
  const visited = new Set<string>();

  function backtrack(nodeId: string, depth: number, pathStrength: number, path: string[]) {
    if (depth > maxDepth || visited.has(nodeId)) return;
    visited.add(nodeId);

    const incoming = graph.edges.filter(e => e.to === nodeId);
    for (const edge of incoming) {
      const node = graph.nodes.get(edge.from);
      if (!node) continue;

      const combinedStrength = pathStrength * edge.strength;
      const currentPath = [...path, node.id];

      causes.push({ node, strength: combinedStrength, path: currentPath });
      backtrack(edge.from, depth + 1, combinedStrength, currentPath);
    }
  }

  backtrack(effectId, 0, 1.0, []);

  // Sort by strength descending
  causes.sort((a, b) => b.strength - a.strength);

  const effectNode = graph.nodes.get(effectId);
  const topCause = causes[0];

  return {
    query: `Por que "${effectNode?.label ?? effectId}" ocorreu?`,
    causes: causes.slice(0, 10),
    effects: [],
    confidence: topCause ? topCause.strength : 0,
    reasoning: topCause
      ? `Principal causa inferida: "${topCause.node.label}" (força: ${(topCause.strength * 100).toFixed(0)}%, via ${topCause.path.join(" → ")})`
      : `Nenhuma causa encontrada no grafo causal para "${effectNode?.label ?? effectId}"`,
  };
}

/**
 * Forward inference: given a cause, predict its likely effects.
 */
export function predictOutcome(graph: CausalGraph, causeId: string, maxDepth: number = 3): CausalInference {
  const effects: CausalInference["effects"] = [];
  const visited = new Set<string>();

  function forward(nodeId: string, depth: number, pathStrength: number, path: string[]) {
    if (depth > maxDepth || visited.has(nodeId)) return;
    visited.add(nodeId);

    const outgoing = graph.edges.filter(e => e.from === nodeId);
    for (const edge of outgoing) {
      const node = graph.nodes.get(edge.to);
      if (!node) continue;

      const combinedStrength = pathStrength * edge.strength;
      const currentPath = [...path, node.id];

      effects.push({ node, strength: combinedStrength, path: currentPath });
      forward(edge.to, depth + 1, combinedStrength, currentPath);
    }
  }

  forward(causeId, 0, 1.0, []);
  effects.sort((a, b) => b.strength - a.strength);

  const causeNode = graph.nodes.get(causeId);
  const topEffect = effects[0];

  return {
    query: `O que acontece se "${causeNode?.label ?? causeId}" ocorrer?`,
    causes: [],
    effects: effects.slice(0, 10),
    confidence: topEffect ? topEffect.strength : 0,
    reasoning: topEffect
      ? `Efeito mais provável: "${topEffect.node.label}" (prob: ${(topEffect.strength * 100).toFixed(0)}%)`
      : `Nenhum efeito previsto no grafo para "${causeNode?.label ?? causeId}"`,
  };
}

/**
 * Counterfactual: "If X had not happened, would Y still have happened?"
 */
export function counterfactual(
  graph: CausalGraph,
  eventId: string,
  withoutId: string
): CounterfactualResult {
  const eventNode = graph.nodes.get(eventId);
  const withoutNode = graph.nodes.get(withoutId);

  if (!eventNode || !withoutNode) {
    return {
      original: eventNode?.label ?? eventId,
      without: withoutNode?.label ?? withoutId,
      outcome: "Nós não encontrados no grafo causal",
      probability: 0,
      reasoning: "Análise contrafactual impossível — nós ausentes",
    };
  }

  // Find all paths from withoutId to eventId
  const paths: { path: string[]; strength: number }[] = [];
  const visited = new Set<string>();

  function findPaths(current: string, target: string, path: string[], strength: number) {
    if (current === target) {
      paths.push({ path: [...path], strength });
      return;
    }
    if (visited.has(current) || path.length > 5) return;
    visited.add(current);

    for (const edge of graph.edges.filter(e => e.from === current)) {
      findPaths(edge.to, target, [...path, edge.to], strength * edge.strength);
    }

    visited.delete(current);
  }

  findPaths(withoutId, eventId, [withoutId], 1.0);

  if (paths.length === 0) {
    return {
      original: eventNode.label,
      without: withoutNode.label,
      outcome: `"${eventNode.label}" não depende causalmente de "${withoutNode.label}" — ocorreria de qualquer forma`,
      probability: 0.9,
      reasoning: "Sem caminho causal direto ou indireto entre os eventos",
    };
  }

  const maxStrength = Math.max(...paths.map(p => p.strength));
  const wouldStillHappen = 1 - maxStrength;

  return {
    original: eventNode.label,
    without: withoutNode.label,
    outcome: maxStrength > 0.5
      ? `Sem "${withoutNode.label}", "${eventNode.label}" provavelmente NÃO teria ocorrido`
      : `Sem "${withoutNode.label}", "${eventNode.label}" provavelmente AINDA teria ocorrido`,
    probability: wouldStillHappen,
    reasoning: `Dependência causal: ${(maxStrength * 100).toFixed(0)}%. ${paths.length} caminho(s) causal(is) encontrado(s). Mecanismo mais forte: ${paths[0].path.join(" → ")}`,
  };
}

// ─── Learning from Autobiographical Memory ───

/**
 * Extract causal patterns from a sequence of events.
 * Events that co-occur frequently get causal links reinforced.
 */
export function learnCausalPatterns(
  graph: CausalGraph,
  events: Array<{ id: string; label: string; outcome: "success" | "failure" | "neutral"; timestamp: number }>
): CausalGraph {
  let updated = graph;

  // Sort by timestamp
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

  for (let i = 0; i < sorted.length; i++) {
    // Ensure node exists
    if (!updated.nodes.has(sorted[i].id)) {
      updated = addCausalNode(updated, {
        id: sorted[i].id,
        label: sorted[i].label,
        type: "event",
        timestamp: sorted[i].timestamp,
      });
    }

    // Link temporally adjacent events (within 60s window)
    for (let j = i + 1; j < sorted.length && j <= i + 3; j++) {
      const timeDelta = sorted[j].timestamp - sorted[i].timestamp;
      if (timeDelta > 60000) break; // 60s window

      if (!updated.nodes.has(sorted[j].id)) {
        updated = addCausalNode(updated, {
          id: sorted[j].id,
          label: sorted[j].label,
          type: "event",
          timestamp: sorted[j].timestamp,
        });
      }

      // Temporal proximity → causal strength (closer = stronger)
      const temporalStrength = Math.exp(-timeDelta / 30000); // 30s decay
      // Outcome alignment boosts strength
      const outcomeBoost = sorted[i].outcome === sorted[j].outcome ? 0.1 : 0;

      updated = addCausalLink(
        updated,
        sorted[i].id,
        sorted[j].id,
        temporalStrength + outcomeBoost,
        `Temporal co-occurrence (Δt=${(timeDelta / 1000).toFixed(1)}s)`
      );
    }
  }

  return updated;
}

/**
 * Get a summary of the causal graph for introspection.
 */
export function getCausalGraphStats(graph: CausalGraph): {
  nodeCount: number;
  edgeCount: number;
  strongestLinks: Array<{ from: string; to: string; strength: number }>;
  domains: string[];
} {
  const strongestLinks = [...graph.edges]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5)
    .map(e => ({
      from: graph.nodes.get(e.from)?.label ?? e.from,
      to: graph.nodes.get(e.to)?.label ?? e.to,
      strength: e.strength,
    }));

  const domains = new Set<string>();
  for (const [, node] of graph.nodes) {
    if (node.domain) domains.add(node.domain);
  }

  return {
    nodeCount: graph.nodes.size,
    edgeCount: graph.edges.length,
    strongestLinks,
    domains: Array.from(domains),
  };
}
