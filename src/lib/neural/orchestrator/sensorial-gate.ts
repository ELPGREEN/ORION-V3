/**
 * Sensorial Gate — Bridge between voice (STT) and vision (MCP/Gemini)
 * for the Orion orchestrator.
 *
 * Responsibilities:
 *  1. SILENCE FILTER: kill the "talking-to-the-void" loop. If there is no
 *     transcript AND no visual delta, return null and let the caller skip.
 *  2. IDENTIFICATION TRIGGER: when the user says "o que você está vendo",
 *     "identifica", "olha", etc., force a deep vision capture BEFORE the LLM.
 *  3. VISUAL CONTEXT INJECTION: prepend [VISUAL_DATA: ...] to the context
 *     so any agent (Bolt/Palette/Harvester) can reason on what is on screen.
 *  4. FALLBACK: try MCP/Gemini-via-edge first, fallback to Gemini 7-key
 *     rotation (already wired inside the neural-ops edge function).
 *
 * Honors public/.jules/vision_rules.json behavior_flags at runtime.
 */

import { getVS } from "@/lib/neural/vision-state";
import { captureVideoFrame, analyzeFrame } from "@/lib/vision/gemini-vision";

const IDENTIFY_TRIGGERS = [
  "o que você",
  "o que voce",
  "o que está",
  "o que esta",
  "identifica",
  "identifique",
  "olha",
  "olhe",
  "veja",
  "está vendo",
  "esta vendo",
  "descreve",
  "descreva",
  "o que tem na",
  "o que tem aí",
  "o que tem ai",
];

// ─── Vision rules loader (lazy, cached) ───
interface VisionRules {
  behavior_flags?: {
    auto_identify_on_ask?: boolean;
    silence_on_no_input?: boolean;
    ocr_enabled?: boolean;
    describe_scene_delta_only?: boolean;
  };
}
let _rulesCache: VisionRules | null = null;
let _rulesLoaded = false;
async function loadVisionRules(): Promise<VisionRules> {
  if (_rulesLoaded) return _rulesCache ?? {};
  _rulesLoaded = true;
  if (typeof fetch === "undefined") return {};
  try {
    const r = await fetch("/.jules/vision_rules.json", { cache: "force-cache" });
    if (r.ok) _rulesCache = (await r.json()) as VisionRules;
  } catch {
    /* silent — gate uses safe defaults */
  }
  return _rulesCache ?? {};
}

export interface SensorialResult {
  visualContext: string | null;
  triggered: boolean;
  reason: "identification" | "delta" | "none";
  skip: boolean; // true → silent / passive observation
}

let _lastVisualHash = "";
let _lastVisualText = "";
let _lastVisualAt = 0;

/** Cheap delta detector: did the vision-state description change since last call? */
function isVisualChangeDetected(): boolean {
  const vs = getVS?.();
  const desc: string = vs?.lastVision?.description || vs?.description || "";
  if (!desc) return false;
  const hash = `${desc.length}:${desc.slice(0, 64)}`;
  if (hash !== _lastVisualHash) {
    _lastVisualHash = hash;
    _lastVisualText = desc;
    return true;
  }
  return false;
}

function isIdentificationCommand(transcript: string): boolean {
  const t = (transcript || "").toLowerCase();
  if (!t.trim()) return false;
  return IDENTIFY_TRIGGERS.some((kw) => t.includes(kw));
}

/** Try to grab a fresh frame from the registered camera <video> element. */
async function captureLiveFrame(): Promise<string> {
  const vs = getVS?.();
  const video: HTMLVideoElement | undefined =
    vs?.videoEl || vs?.videoRef?.current || (typeof document !== "undefined"
      ? (document.querySelector("video[data-orion-cam]") as HTMLVideoElement | null) ?? undefined
      : undefined);
  if (!video) return "";
  try {
    return captureVideoFrame(video, 320, 0.6);
  } catch {
    return "";
  }
}

/**
 * Main gate. Returns:
 *  - skip=true  → caller should NOT invoke the LLM (passive observation mode)
 *  - visualContext → string to prepend to the orchestrator context
 */
export async function runSensorialGate(
  transcript: string,
  opts?: { hasVisualDelta?: boolean; force?: boolean },
): Promise<SensorialResult> {
  const trimmed = (transcript || "").trim();
  const delta = opts?.hasVisualDelta ?? isVisualChangeDetected();

  // Load behavior flags from .jules/vision_rules.json (cached, with safe defaults)
  const rules = await loadVisionRules();
  const flags = rules.behavior_flags ?? {};
  const silenceOnNoInput = flags.silence_on_no_input ?? true;
  const autoIdentifyOnAsk = flags.auto_identify_on_ask ?? true;

  // 1) SILENCE FILTER — anti-insistence rule (configurable)
  if (silenceOnNoInput && !trimmed && !delta && !opts?.force) {
    return { visualContext: null, triggered: false, reason: "none", skip: true };
  }

  // 2) IDENTIFICATION TRIGGER — force a fresh deep vision capture
  if ((autoIdentifyOnAsk && isIdentificationCommand(trimmed)) || opts?.force) {
    const frame = await captureLiveFrame();
    if (frame) {
      try {
        const res = await analyzeFrame(
          frame,
          trimmed || "Descreva com precisão tudo o que vê na cena.",
          "",
        );
        const desc = res?.description?.trim();
        if (desc) {
          _lastVisualText = desc;
          _lastVisualAt = Date.now();
          return {
            visualContext: `[VISUAL_DATA: ${desc}]`,
            triggered: true,
            reason: "identification",
            skip: false,
          };
        }
      } catch {
        /* fall through to cached */
      }
    }
    // Fallback to last known description if capture failed
    if (_lastVisualText) {
      return {
        visualContext: `[VISUAL_DATA (cached): ${_lastVisualText}]`,
        triggered: true,
        reason: "identification",
        skip: false,
      };
    }
  }

  // 3) DELTA ONLY — feed the rolling description as ambient context
  if (delta && _lastVisualText) {
    return {
      visualContext: `[VISUAL_DELTA: ${_lastVisualText}]`,
      triggered: true,
      reason: "delta",
      skip: false,
    };
  }

  return { visualContext: null, triggered: false, reason: "none", skip: false };
}

export function getLastVisualDescription(): { text: string; at: number } {
  return { text: _lastVisualText, at: _lastVisualAt };
}
