/**
 * ─── Temporal Visual Memory (Episodic) ───
 * 
 * Connects vision frames across time, giving Orion a sense of
 * "what happened before" — like human episodic memory.
 * 
 * Tracks:
 * 1. Object persistence (was this object here before?)
 * 2. Scene transitions (indoor→outdoor, office→kitchen)
 * 3. Event detection (person appeared/left, object moved)
 * 4. Session narrative (what happened in the last N seconds)
 * 
 * Memory decays exponentially — recent events are vivid, old ones fade.
 */

import type { UnifiedDetection } from "./realtime-vision-engine";

// ─── Types ───

export interface VisualEpisode {
  id: string;
  timestamp: number;
  objects: string[];        // Labels present in this frame
  objectCount: number;
  faceCount: number;
  scene: string;            // Scene classification
  ocrText: string;          // Any detected text
  significance: number;     // 0-1, how notable this frame was
}

export interface VisualEvent {
  type: "object_appeared" | "object_disappeared" | "scene_change" | "person_entered" | "person_left" | "text_detected" | "gesture_detected";
  timestamp: number;
  description: string;
  details: Record<string, unknown>;
  decayWeight: number;      // Current decay weight (1=fresh, 0=forgotten)
}

export interface TemporalNarrative {
  summary: string;
  events: VisualEvent[];
  currentScene: string;
  persistentObjects: string[];   // Objects present for >5s
  transientObjects: string[];    // Objects seen briefly
  sessionDuration: number;       // ms
  episodeCount: number;
}

// ─── Constants ───

const MAX_EPISODES = 60;         // ~60 seconds at 1fps
const MAX_EVENTS = 30;
const DECAY_HALF_LIFE_MS = 30_000; // Events lose half significance every 30s
const PERSISTENCE_THRESHOLD_MS = 5_000; // Object must be seen for 5s to be "persistent"
const MIN_SIGNIFICANCE = 0.05;   // Below this, events are forgotten

// ─── State ───

const _episodes: VisualEpisode[] = [];
const _events: VisualEvent[] = [];
const _objectFirstSeen = new Map<string, number>();
const _objectLastSeen = new Map<string, number>();
let _lastScene = "";
let _sessionStart = Date.now();
let _episodeCounter = 0;

// ─── Core ───

/**
 * Record a new visual frame as an episode.
 */
export function recordEpisode(
  detections: UnifiedDetection[],
  faceCount: number,
  scene: string,
  ocrText: string = ""
): VisualEpisode {
  const now = Date.now();
  if (_episodes.length === 0) _sessionStart = now;

  const labels = [...new Set(detections.map(d => d.namePt || d.name))];
  const previousLabels = _episodes.length > 0
    ? new Set(_episodes[_episodes.length - 1].objects)
    : new Set<string>();

  // Detect events
  // 1. New objects
  for (const label of labels) {
    if (!previousLabels.has(label)) {
      const isFirstEver = !_objectFirstSeen.has(label);
      if (isFirstEver) {
        _objectFirstSeen.set(label, now);
        addEvent({
          type: label.toLowerCase().includes("pessoa") || label.toLowerCase() === "person"
            ? "person_entered" : "object_appeared",
          timestamp: now,
          description: `${label} apareceu na cena`,
          details: { label },
          decayWeight: 1.0,
        });
      }
    }
    _objectLastSeen.set(label, now);
  }

  // 2. Disappeared objects
  for (const prev of previousLabels) {
    if (!labels.includes(prev)) {
      addEvent({
        type: prev.toLowerCase().includes("pessoa") || prev.toLowerCase() === "person"
          ? "person_left" : "object_disappeared",
        timestamp: now,
        description: `${prev} saiu da cena`,
        details: { label: prev },
        decayWeight: 1.0,
      });
    }
  }

  // 3. Scene change
  if (scene && scene !== _lastScene && _lastScene) {
    addEvent({
      type: "scene_change",
      timestamp: now,
      description: `Cena mudou de "${_lastScene}" para "${scene}"`,
      details: { from: _lastScene, to: scene },
      decayWeight: 1.0,
    });
  }
  if (scene) _lastScene = scene;

  // 4. Text detected
  if (ocrText && ocrText.length > 5) {
    const lastTextEvent = [..._events].reverse().find(e => e.type === "text_detected");
    const lastText = lastTextEvent?.details?.text as string | undefined;
    if (lastText !== ocrText) {
      addEvent({
        type: "text_detected",
        timestamp: now,
        description: `Texto detectado: "${ocrText.slice(0, 60)}"`,
        details: { text: ocrText },
        decayWeight: 1.0,
      });
    }
  }

  // Calculate significance (how different this frame is from the last)
  const significance = calculateSignificance(labels, previousLabels, scene);

  const episode: VisualEpisode = {
    id: `ep_${++_episodeCounter}`,
    timestamp: now,
    objects: labels,
    objectCount: labels.length,
    faceCount,
    scene: scene || _lastScene,
    ocrText,
    significance,
  };

  _episodes.push(episode);
  if (_episodes.length > MAX_EPISODES) _episodes.shift();

  // Decay old events
  decayEvents(now);

  return episode;
}

/**
 * Get the current temporal narrative — a summary of what happened.
 */
export function getTemporalNarrative(): TemporalNarrative {
  const now = Date.now();
  decayEvents(now);

  // Persistent objects: seen for >5s
  const persistent: string[] = [];
  const transient: string[] = [];

  for (const [label, firstSeen] of _objectFirstSeen) {
    const lastSeen = _objectLastSeen.get(label) || firstSeen;
    if (lastSeen - firstSeen >= PERSISTENCE_THRESHOLD_MS && now - lastSeen < 10_000) {
      persistent.push(label);
    } else if (now - lastSeen < 15_000) {
      transient.push(label);
    }
  }

  // Build narrative summary
  const activeEvents = _events.filter(e => e.decayWeight > MIN_SIGNIFICANCE);
  const summary = buildNarrativeSummary(activeEvents, persistent, _lastScene);

  return {
    summary,
    events: activeEvents,
    currentScene: _lastScene,
    persistentObjects: persistent,
    transientObjects: transient,
    sessionDuration: now - _sessionStart,
    episodeCount: _episodes.length,
  };
}

/**
 * Format temporal memory for AI prompt injection.
 */
export function formatTemporalMemoryForPrompt(): string {
  const narrative = getTemporalNarrative();
  if (narrative.events.length === 0 && narrative.persistentObjects.length === 0) return "";

  const lines: string[] = ["MEMÓRIA VISUAL TEMPORAL:"];

  if (narrative.persistentObjects.length > 0) {
    lines.push(`• Objetos persistentes: ${narrative.persistentObjects.join(", ")}`);
  }

  if (narrative.transientObjects.length > 0) {
    lines.push(`• Objetos passageiros: ${narrative.transientObjects.join(", ")}`);
  }

  // Recent events (max 5, most significant)
  const recentEvents = narrative.events
    .sort((a, b) => b.decayWeight - a.decayWeight)
    .slice(0, 5);

  if (recentEvents.length > 0) {
    lines.push("• Eventos recentes:");
    for (const e of recentEvents) {
      const ago = Math.round((Date.now() - e.timestamp) / 1000);
      lines.push(`  — ${e.description} (há ${ago}s)`);
    }
  }

  if (narrative.summary) {
    lines.push(`• Resumo: ${narrative.summary}`);
  }

  return lines.join("\n");
}

/**
 * Clear all temporal memory (e.g., on session reset).
 */
export function clearTemporalMemory(): void {
  _episodes.length = 0;
  _events.length = 0;
  _objectFirstSeen.clear();
  _objectLastSeen.clear();
  _lastScene = "";
  _sessionStart = Date.now();
  _episodeCounter = 0;
}

// ─── Helpers ───

function addEvent(event: VisualEvent): void {
  _events.push(event);
  if (_events.length > MAX_EVENTS * 2) {
    // Remove fully decayed events
    const active = _events.filter(e => e.decayWeight > MIN_SIGNIFICANCE);
    _events.length = 0;
    _events.push(...active.slice(-MAX_EVENTS));
  }
}

function decayEvents(now: number): void {
  for (const event of _events) {
    const age = now - event.timestamp;
    event.decayWeight = Math.exp(-0.693 * age / DECAY_HALF_LIFE_MS); // exponential decay
  }
}

function calculateSignificance(
  currentLabels: string[],
  previousLabels: Set<string>,
  scene: string
): number {
  if (previousLabels.size === 0) return 1.0; // First frame is always significant

  const currentSet = new Set(currentLabels);
  let newCount = 0;
  let lostCount = 0;

  for (const label of currentLabels) {
    if (!previousLabels.has(label)) newCount++;
  }
  for (const label of previousLabels) {
    if (!currentSet.has(label)) lostCount++;
  }

  const sceneChanged = scene !== _lastScene ? 0.3 : 0;
  const objectDelta = (newCount + lostCount) / Math.max(currentLabels.length + previousLabels.size, 1);

  return Math.min(1, sceneChanged + objectDelta);
}

function buildNarrativeSummary(
  events: VisualEvent[],
  persistent: string[],
  scene: string
): string {
  const parts: string[] = [];

  if (scene) parts.push(`Cena atual: ${scene}.`);
  if (persistent.length > 0) parts.push(`${persistent.join(", ")} presente(s) de forma contínua.`);

  const sceneChanges = events.filter(e => e.type === "scene_change");
  if (sceneChanges.length > 0) {
    parts.push(`${sceneChanges.length} mudança(s) de cena detectada(s).`);
  }

  const peopleEvents = events.filter(e => e.type === "person_entered" || e.type === "person_left");
  if (peopleEvents.length > 0) {
    const entered = peopleEvents.filter(e => e.type === "person_entered").length;
    const left = peopleEvents.filter(e => e.type === "person_left").length;
    if (entered > 0) parts.push(`${entered} pessoa(s) entrou(aram).`);
    if (left > 0) parts.push(`${left} pessoa(s) saiu(íram).`);
  }

  return parts.join(" ");
}
