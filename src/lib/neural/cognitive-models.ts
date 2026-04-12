/**
 * ─── Cognitive Neuroscience Models ───
 * Weber-Fechner psychophysics & Edelman neuronal group selection.
 * 
 * Refs: Weber (1834), Fechner (1860), Edelman (1987) Neural Darwinism
 */

// ─── Weber-Fechner Law (Approximate Number System) ───

/**
 * Weber-Fechner: perceived intensity is proportional to log of stimulus.
 * ψ = k · ln(S / S₀) where S₀ is absolute threshold.
 */
export function weberFechnerResponse(stimulus: number, threshold = 1, k = 1): number {
  if (stimulus <= 0 || threshold <= 0) return 0;
  return k * Math.log(stimulus / threshold);
}

/**
 * Weber fraction: ΔS/S = constant (just-noticeable difference).
 * Returns the JND for a given stimulus intensity and Weber fraction.
 */
export function weberJND(stimulus: number, weberFraction = 0.1): number {
  return stimulus * weberFraction;
}

/**
 * Stevens' Power Law generalization: ψ = k · S^n
 * (more general than Weber-Fechner for many modalities)
 */
export function stevensPowerLaw(stimulus: number, exponent = 0.5, k = 1): number {
  if (stimulus <= 0) return 0;
  return k * Math.pow(stimulus, exponent);
}

/**
 * ANS (Approximate Number System) discriminability.
 * Uses Weber ratio to determine if two quantities are perceptually distinguishable.
 * Returns confidence [0,1] that the difference is perceived.
 */
export function ansDiscriminability(n1: number, n2: number, weberFraction = 0.15): number {
  if (n1 <= 0 || n2 <= 0) return 0;
  const ratio = Math.abs(n1 - n2) / Math.max(n1, n2);
  // Sigmoid-like discriminability based on Weber ratio
  const d = ratio / weberFraction;
  return 1 / (1 + Math.exp(-3 * (d - 1)));
}

/**
 * Fechner integration: total perceived difference between two stimuli
 * ψ₂ - ψ₁ = k · ln(S₂ / S₁)
 */
export function fechnerDifference(s1: number, s2: number, k = 1): number {
  if (s1 <= 0 || s2 <= 0) return 0;
  return k * Math.log(s2 / s1);
}

// ─── Edelman Neuronal Group Selection (TNGS) ───

export interface NeuronalGroup {
  id: string;
  neurons: number;       // group size
  fitness: number;       // selection value [0,1]
  connections: Map<string, number>;  // connections to other groups with strength
  repertoire: 'primary' | 'secondary';
  activated: boolean;
}

export interface TNGSState {
  groups: NeuronalGroup[];
  generation: number;
}

/**
 * Create initial neuronal repertoire (developmental selection).
 * Generates diverse groups with random connectivity.
 */
export function createPrimaryRepertoire(
  numGroups: number,
  avgNeurons = 50,
  connectProb = 0.3
): TNGSState {
  const groups: NeuronalGroup[] = [];

  for (let i = 0; i < numGroups; i++) {
    const connections = new Map<string, number>();
    for (let j = 0; j < numGroups; j++) {
      if (i !== j && Math.random() < connectProb) {
        connections.set(`g${j}`, Math.random());
      }
    }
    groups.push({
      id: `g${i}`,
      neurons: Math.max(10, Math.round(avgNeurons + (Math.random() - 0.5) * avgNeurons)),
      fitness: Math.random() * 0.5, // initial low fitness
      connections,
      repertoire: 'primary',
      activated: false,
    });
  }

  return { groups, generation: 0 };
}

/**
 * Experiential selection: strengthen groups that respond to stimuli,
 * weaken those that don't. This is the core of Neural Darwinism.
 * 
 * @param stimulus - activation pattern [0,1] per group
 * @param learningRate - how fast selection occurs
 */
export function experientialSelection(
  state: TNGSState,
  stimulus: number[],
  learningRate = 0.1
): TNGSState {
  const groups = state.groups.map((g, i) => {
    const activation = stimulus[i] || 0;
    const activated = activation > 0.3;
    
    // Fitness increases for activated groups, decays for inactive
    const newFitness = activated
      ? Math.min(1, g.fitness + learningRate * activation)
      : Math.max(0, g.fitness - learningRate * 0.1);

    // Strengthen connections between co-activated groups
    const newConnections = new Map(g.connections);
    g.connections.forEach((strength, targetId) => {
      const targetIdx = state.groups.findIndex(tg => tg.id === targetId);
      const targetActivated = targetIdx >= 0 && (stimulus[targetIdx] || 0) > 0.3;
      
      if (activated && targetActivated) {
        newConnections.set(targetId, Math.min(1, strength + learningRate * 0.5));
      } else if (!activated && !targetActivated) {
        newConnections.set(targetId, Math.max(0, strength - learningRate * 0.05));
      }
    });

    return {
      ...g,
      fitness: newFitness,
      activated,
      connections: newConnections,
      repertoire: newFitness > 0.6 ? 'secondary' as const : g.repertoire,
    };
  });

  return { groups, generation: state.generation + 1 };
}

/**
 * Reentrant signaling: propagate activation through connected groups.
 * This implements Edelman's concept of reentry — parallel reciprocal signaling.
 */
export function reentrantSignaling(
  state: TNGSState,
  iterations = 3
): number[] {
  const n = state.groups.length;
  let activations = state.groups.map(g => g.activated ? g.fitness : 0);

  for (let iter = 0; iter < iterations; iter++) {
    const newAct = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let input = activations[i] * 0.5; // self-sustain
      state.groups[i].connections.forEach((strength, targetId) => {
        const j = state.groups.findIndex(g => g.id === targetId);
        if (j >= 0) input += activations[j] * strength * 0.3;
      });
      newAct[i] = Math.tanh(input); // bounded activation
    }
    activations = newAct;
  }

  return activations;
}

/**
 * Group competition: select winning coalition of neuronal groups.
 * Top groups by combined fitness + reentrant activation form the "conscious" percept.
 */
export function selectWinningCoalition(
  state: TNGSState,
  topK = 5
): NeuronalGroup[] {
  const activations = reentrantSignaling(state);
  const scored = state.groups.map((g, i) => ({
    group: g,
    score: g.fitness * 0.6 + activations[i] * 0.4,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.group);
}
