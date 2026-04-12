/**
 * ─── v21: Multimodal Mamba Fusion ───
 * Superior Temporal Sulcus (STS) — multisensory integration analogy.
 * Three streams (text, vision, layout) fused via gated mechanism.
 * 
 * Ref: Gu & Dao (2023) Mamba, Ngiam et al. (2011) Multimodal Deep Learning
 */

export type FusionStrategy = "gated" | "attention" | "hierarchical" | "concatenate" | "five_way";

export interface MultimodalFusionConfig {
  dState: number;
  nLayers: number;
  fusionStrategy: FusionStrategy;
  useResidual: boolean;
  useLayerNorm: boolean;
}

export const DEFAULT_FUSION_CONFIG: MultimodalFusionConfig = {
  dState: 16,
  nLayers: 4,
  fusionStrategy: "gated",
  useResidual: true,
  useLayerNorm: true,
};

import { layerNorm, sigmoid } from "./activations";

function mambaBlock(input: number[], dState: number): number[] {
  const output = new Array(input.length).fill(0);
  const state = new Array(dState).fill(0);

  for (let t = 0; t < input.length; t++) {
    // Selective scan step
    const dt = sigmoid(input[t] * 0.5);
    for (let s = 0; s < dState; s++) {
      state[s] = state[s] * (1 - dt) + input[t] * dt * Math.sin((s + 1) * 0.1);
    }
    output[t] = state.reduce((a, b) => a + b, 0) / dState;
  }
  return output;
}

export function fuseStreams(
  textStream: number[],
  visionStream: number[],
  layoutStream: number[],
  config: MultimodalFusionConfig = DEFAULT_FUSION_CONFIG,
  audioStream?: number[],
  gestureStream?: number[]
): number[] {
  const dim = Math.min(textStream.length, visionStream.length, layoutStream.length);
  const text = mambaBlock(textStream.slice(0, dim), config.dState);
  const vision = mambaBlock(visionStream.slice(0, dim), config.dState);
  const layout = mambaBlock(layoutStream.slice(0, dim), config.dState);

  let fused: number[];

  switch (config.fusionStrategy) {
    case "gated": {
      fused = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) {
        const gateText = sigmoid(text[i] * 1.5 - vision[i] * 0.5 - layout[i] * 0.5);
        const gateVision = sigmoid(vision[i] * 1.5 - text[i] * 0.5 - layout[i] * 0.5);
        const gateLayout = 1 - gateText - gateVision;
        const clampedLayout = Math.max(0, gateLayout);
        const total = gateText + gateVision + clampedLayout + 1e-8;
        fused[i] = (gateText * text[i] + gateVision * vision[i] + clampedLayout * layout[i]) / total;
      }
      break;
    }
    case "attention": {
      fused = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) {
        const vals = [text[i], vision[i], layout[i]];
        const maxVal = Math.max(...vals);
        const expWeights = vals.map(v => Math.exp(v - maxVal));
        const total = expWeights.reduce((a, b) => a + b, 0) + 1e-8;
        fused[i] = (expWeights[0] * text[i] + expWeights[1] * vision[i] + expWeights[2] * layout[i]) / total;
      }
      break;
    }
    case "hierarchical": {
      const textVision = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) textVision[i] = (text[i] + vision[i]) / 2;
      fused = new Array(dim).fill(0);
      for (let i = 0; i < dim; i++) fused[i] = (textVision[i] + layout[i]) / 2;
      break;
    }
    case "five_way": {
      // v22: 5-stream fusion (text + vision + layout + audio + gesture)
      const audio = audioStream ? mambaBlock(audioStream.slice(0, dim), config.dState) : text.map(() => 0);
      const gesture = gestureStream ? mambaBlock(gestureStream.slice(0, dim), config.dState) : text.map(() => 0);
      fused = new Array(dim).fill(0);
      const weights = [0.30, 0.25, 0.15, 0.20, 0.10]; // text, vision, layout, audio, gesture
      for (let i = 0; i < dim; i++) {
        const streams = [text[i], vision[i], layout[i], audio[i], gesture[i]];
        const gate = sigmoid(streams.reduce((a, b) => a + b, 0));
        fused[i] = gate * streams.reduce((sum, s, j) => sum + s * weights[j], 0);
      }
      break;
    }
    case "concatenate":
    default:
      fused = [...text, ...vision, ...layout,
        ...(audioStream ? mambaBlock(audioStream.slice(0, dim), config.dState) : []),
        ...(gestureStream ? mambaBlock(gestureStream.slice(0, dim), config.dState) : [])];
  }

  if (config.useLayerNorm && fused.length > 0) {
    fused = layerNorm(fused);
  }

  if (config.useResidual && config.fusionStrategy !== "concatenate") {
    for (let i = 0; i < Math.min(dim, fused.length); i++) {
      fused[i] += textStream[i] * 0.1;
    }
  }

  return fused;
}
