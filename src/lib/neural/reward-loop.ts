/**
 * ─── Orion Reinforcement Feedback Loop ───
 * Consumes user feedback (thumbs up/down, stars) to adjust
 * provider routing weights and strategy selection.
 * 
 * Reward signals:
 * - Positive feedback → boost provider/strategy weight
 * - Negative feedback → penalize and trigger fallback preference
 * - Star ratings → granular quality scoring
 * 
 * Integrates with meta-learning.ts for recursive self-optimization.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface FeedbackSignal {
  interactionId: string;
  userId: string;
  provider: string;
  domain: string;
  feedbackType: "thumbs_up" | "thumbs_down" | "star_rating" | "correction";
  value: number; // 1 for up, -1 for down, 1-5 for stars
  context?: string;
  timestamp: number;
}

export interface ProviderWeight {
  provider: string;
  domain: string;
  weight: number; // 0-1, higher = preferred
  totalFeedback: number;
  positiveRate: number;
  lastUpdated: number;
}

export interface RewardState {
  providerWeights: ProviderWeight[];
  totalSignals: number;
  lastProcessed: number;
}

// ─── Constants ───

const REWARD_KEY = "orion_reward_state";
const LEARNING_RATE = 0.05;
const DECAY_FACTOR = 0.995; // Slow decay to prevent over-fitting to old data
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 1.0;
const DEFAULT_WEIGHT = 0.5;

// ─── State Management ───

function getRewardState(): RewardState {
  if (typeof window === "undefined") return { providerWeights: [], totalSignals: 0, lastProcessed: 0 };
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( REWARD_KEY);
    return raw ? JSON.parse(raw) : { providerWeights: [], totalSignals: 0, lastProcessed: 0 };
  } catch {
    return { providerWeights: [], totalSignals: 0, lastProcessed: 0 };
  }
}

function saveRewardState(state: RewardState): void {
  if (typeof window === "undefined") return;
  if (typeof window !== "undefined") localStorage.setItem(REWARD_KEY, JSON.stringify(state));
}

// ─── Core Reward Processing ───

export function processReward(signal: FeedbackSignal): RewardState {
  const state = getRewardState();

  // Find or create provider weight entry
  let pw = state.providerWeights.find(
    w => w.provider === signal.provider && w.domain === signal.domain
  );

  if (!pw) {
    pw = {
      provider: signal.provider,
      domain: signal.domain,
      weight: DEFAULT_WEIGHT,
      totalFeedback: 0,
      positiveRate: 0.5,
      lastUpdated: Date.now(),
    };
    state.providerWeights.push(pw);
  }

  // Calculate reward magnitude
  let reward: number;
  switch (signal.feedbackType) {
    case "thumbs_up":
      reward = LEARNING_RATE;
      break;
    case "thumbs_down":
      reward = -LEARNING_RATE * 1.5; // Penalize harder
      break;
    case "star_rating":
      reward = LEARNING_RATE * ((signal.value - 3) / 2); // Normalize: 1→-1, 3→0, 5→+1
      break;
    case "correction":
      reward = -LEARNING_RATE * 2; // Corrections are strong negative signals
      break;
    default:
      reward = 0;
  }

  // Update weight with clamping
  pw.weight = Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, pw.weight + reward));
  pw.totalFeedback++;
  pw.positiveRate = (pw.positiveRate * (pw.totalFeedback - 1) + (reward > 0 ? 1 : 0)) / pw.totalFeedback;
  pw.lastUpdated = Date.now();

  // Apply decay to all weights (prevents stale biases)
  for (const w of state.providerWeights) {
    if (w !== pw) {
      w.weight = Math.max(MIN_WEIGHT, w.weight * DECAY_FACTOR);
    }
  }

  state.totalSignals++;
  state.lastProcessed = Date.now();
  saveRewardState(state);

  console.debug(`[RewardLoop] ${signal.provider}/${signal.domain}: ${reward > 0 ? "+" : ""}${reward.toFixed(3)} → weight=${pw.weight.toFixed(3)}`);

  return state;
}

// ─── Batch Processing ───

export function processBatchRewards(signals: FeedbackSignal[]): RewardState {
  let state = getRewardState();
  for (const signal of signals) {
    state = processReward(signal);
  }
  return state;
}

// ─── Weight Querying ───

export function getProviderWeight(provider: string, domain = "general"): number {
  const state = getRewardState();
  const pw = state.providerWeights.find(
    w => w.provider === provider && (w.domain === domain || w.domain === "general")
  );
  return pw?.weight ?? DEFAULT_WEIGHT;
}

export function getRankedProviders(domain = "general"): ProviderWeight[] {
  const state = getRewardState();
  return state.providerWeights
    .filter(w => w.domain === domain || w.domain === "general")
    .sort((a, b) => b.weight - a.weight);
}

export function getRewardStats(): RewardState {
  return getRewardState();
}

/**
 * Get the preferred provider for a domain based on accumulated feedback.
 * Returns the provider with the highest reward weight, or null if no data.
 */
export function getPreferredProvider(domain = "general"): { provider: string; weight: number } | null {
  const ranked = getRankedProviders(domain);
  if (ranked.length === 0) return null;
  return { provider: ranked[0].provider, weight: ranked[0].weight };
}

// ─── Persistence to Supabase ───

export async function syncRewardsToSupabase(userId: string): Promise<void> {
  const state = getRewardState();
  if (state.providerWeights.length === 0) return;

  try {
    const entries = state.providerWeights.slice(0, 20).map(pw => ({
      user_id: userId,
      input_text: `[reward:${pw.provider}] domain=${pw.domain}`,
      output_text: `weight=${pw.weight.toFixed(4)} positive_rate=${pw.positiveRate.toFixed(4)} total=${pw.totalFeedback}`,
      interaction_type: "reward_signal",
      quality_score: pw.weight,
      learned: pw.totalFeedback >= 5,
      metadata: {
        provider: pw.provider,
        domain: pw.domain,
        weight: pw.weight,
        positive_rate: pw.positiveRate,
        total_feedback: pw.totalFeedback,
      },
    }));

    await supabase.from("neural_learning_data").insert(entries);
  } catch (e) {
    console.warn("[RewardLoop] Sync failed:", e);
  }
}

// ─── Load Historical Rewards ───

export async function loadRewardsFromSupabase(userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from("neural_learning_data")
      .select("metadata, quality_score")
      .eq("user_id", userId)
      .eq("interaction_type", "reward_signal")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!data || data.length === 0) return;

    const state = getRewardState();
    for (const row of data) {
      const meta = row.metadata as Record<string, unknown> | null;
      if (!meta) continue;

      const provider = meta.provider as string;
      const domain = meta.domain as string;
      const existing = state.providerWeights.find(
        w => w.provider === provider && w.domain === domain
      );

      if (!existing) {
        state.providerWeights.push({
          provider,
          domain,
          weight: (meta.weight as number) || DEFAULT_WEIGHT,
          totalFeedback: (meta.total_feedback as number) || 0,
          positiveRate: (meta.positive_rate as number) || 0.5,
          lastUpdated: Date.now(),
        });
      }
    }

    saveRewardState(state);
  } catch (e) {
    console.warn("[RewardLoop] Load failed:", e);
  }
}
