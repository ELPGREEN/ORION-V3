/**
 * Vision Temporal Buffer — Frame-to-frame memory for video understanding.
 * Gives Orion "temporal context" so he understands motion, events, and scene changes
 * like a human watching a video — not just isolated snapshots.
 */

import type { RealTimeVisionResult, UnifiedDetection } from "./realtime-vision-engine";

export interface TemporalFrame {
  timestamp: number;
  objects: Array<{ name: string; namePt: string; confidence: number; x: number; y: number; width: number; height: number }>;
  faceCount: number;
  handCount: number;
  poseCount: number;
  sceneLabel: string | null;
  ocrText: string | null;
  dominantEmotion: string | null;
}

export interface TemporalEvent {
  type: "object_appeared" | "object_disappeared" | "scene_changed" | "person_entered" | "person_left" | "gesture_detected" | "text_appeared" | "emotion_changed";
  description: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface TemporalContext {
  /** Summary of what changed over the last N frames */
  events: TemporalEvent[];
  /** Object tracking: how long each object has been visible */
  objectDurations: Map<string, number>;
  /** Scene stability: has the scene been stable or changing? */
  sceneStability: "stable" | "transitioning" | "dynamic";
  /** Average objects per frame in buffer */
  avgObjectCount: number;
  /** Dominant scene over buffer window */
  dominantScene: string | null;
}

const MAX_BUFFER_SIZE = 30; // ~1 second at 30fps
const EVENT_HISTORY_SIZE = 50;

class VisionTemporalBuffer {
  private frames: TemporalFrame[] = [];
  private events: TemporalEvent[] = [];
  private previousObjects = new Set<string>();
  private previousScene: string | null = null;
  private previousEmotion: string | null = null;
  private objectFirstSeen = new Map<string, number>();

  /**
   * Push a new vision result into the temporal buffer.
   * Automatically detects events (appearances, disappearances, scene changes).
   */
  pushFrame(result: RealTimeVisionResult): TemporalEvent[] {
    const now = Date.now();
    const newEvents: TemporalEvent[] = [];

    // Extract frame summary
    const frame: TemporalFrame = {
      timestamp: now,
      objects: result.allObjects.map(o => ({
        name: o.name, namePt: o.namePt, confidence: o.confidence,
        x: o.x, y: o.y, width: o.width, height: o.height
      })),
      faceCount: result.faces.length,
      handCount: result.hands.length,
      poseCount: (result as any).poses?.length ?? 0,
      sceneLabel: result.frameXResult?.scenario?.label ?? null,
      ocrText: result.ocrResult?.text ?? null,
      dominantEmotion: result.faceAttributes?.[0]?.emotion ?? null,
    };

    // ─── Event Detection ───

    const currentObjects = new Set(result.allObjects.map(o => o.name));

    // New objects appeared
    for (const obj of currentObjects) {
      if (!this.previousObjects.has(obj)) {
        const ptName = result.allObjects.find(o => o.name === obj)?.namePt ?? obj;
        const event: TemporalEvent = {
          type: obj === "person" ? "person_entered" : "object_appeared",
          description: obj === "person" ? "Uma pessoa entrou no campo de visão" : `${ptName} apareceu no campo de visão`,
          timestamp: now,
          details: { object: obj, namePt: ptName }
        };
        newEvents.push(event);
        this.objectFirstSeen.set(obj, now);
      }
    }

    // Objects disappeared
    for (const obj of this.previousObjects) {
      if (!currentObjects.has(obj)) {
        const duration = this.objectFirstSeen.has(obj)
          ? Math.round((now - this.objectFirstSeen.get(obj)!) / 1000)
          : 0;
        const event: TemporalEvent = {
          type: obj === "person" ? "person_left" : "object_disappeared",
          description: obj === "person"
            ? `Uma pessoa saiu do campo de visão (visível por ${duration}s)`
            : `${obj} saiu do campo de visão (visível por ${duration}s)`,
          timestamp: now,
          details: { object: obj, durationSeconds: duration }
        };
        newEvents.push(event);
        this.objectFirstSeen.delete(obj);
      }
    }

    // Scene changed
    if (frame.sceneLabel && frame.sceneLabel !== this.previousScene && frame.sceneLabel !== "outro") {
      newEvents.push({
        type: "scene_changed",
        description: `Cena mudou para: ${frame.sceneLabel}`,
        timestamp: now,
        details: { from: this.previousScene, to: frame.sceneLabel }
      });
    }

    // Emotion changed
    if (frame.dominantEmotion && frame.dominantEmotion !== this.previousEmotion) {
      newEvents.push({
        type: "emotion_changed",
        description: `Emoção detectada mudou para: ${frame.dominantEmotion}`,
        timestamp: now,
        details: { from: this.previousEmotion, to: frame.dominantEmotion }
      });
    }

    // Text appeared
    if (frame.ocrText && frame.ocrText.length > 3) {
      const prevFrame = this.frames[this.frames.length - 1];
      if (!prevFrame?.ocrText || prevFrame.ocrText !== frame.ocrText) {
        newEvents.push({
          type: "text_appeared",
          description: `Texto detectado: "${frame.ocrText.slice(0, 80)}"`,
          timestamp: now,
          details: { text: frame.ocrText }
        });
      }
    }

    // Update state
    this.previousObjects = currentObjects;
    this.previousScene = frame.sceneLabel;
    this.previousEmotion = frame.dominantEmotion;

    // Push to buffers
    this.frames.push(frame);
    if (this.frames.length > MAX_BUFFER_SIZE) this.frames.shift();

    this.events.push(...newEvents);
    if (this.events.length > EVENT_HISTORY_SIZE) {
      this.events = this.events.slice(-EVENT_HISTORY_SIZE);
    }

    return newEvents;
  }

  /**
   * Get temporal context for AI prompt enrichment.
   */
  getContext(): TemporalContext {
    const now = Date.now();

    // Object durations
    const objectDurations = new Map<string, number>();
    for (const [obj, firstSeen] of this.objectFirstSeen) {
      objectDurations.set(obj, Math.round((now - firstSeen) / 1000));
    }

    // Scene stability
    const recentScenes = this.frames.slice(-10).map(f => f.sceneLabel).filter(Boolean);
    const uniqueScenes = new Set(recentScenes);
    const sceneStability: TemporalContext["sceneStability"] =
      uniqueScenes.size <= 1 ? "stable" : uniqueScenes.size <= 2 ? "transitioning" : "dynamic";

    // Average object count
    const avgObjectCount = this.frames.length > 0
      ? this.frames.reduce((sum, f) => sum + f.objects.length, 0) / this.frames.length
      : 0;

    // Dominant scene
    const sceneCounts = new Map<string, number>();
    for (const f of this.frames) {
      if (f.sceneLabel) sceneCounts.set(f.sceneLabel, (sceneCounts.get(f.sceneLabel) ?? 0) + 1);
    }
    let dominantScene: string | null = null;
    let maxCount = 0;
    for (const [scene, count] of sceneCounts) {
      if (count > maxCount) { dominantScene = scene; maxCount = count; }
    }

    // Recent events only (last 10 seconds)
    const recentEvents = this.events.filter(e => now - e.timestamp < 10000);

    return { events: recentEvents, objectDurations, sceneStability, avgObjectCount, dominantScene };
  }

  /**
   * Format temporal context for AI prompt.
   */
  formatForAI(): string {
    const ctx = this.getContext();
    const parts: string[] = [];

    if (ctx.events.length > 0) {
      parts.push(`EVENTOS TEMPORAIS (últimos 10s): ${ctx.events.map(e => e.description).join(" | ")}`);
    }

    if (ctx.objectDurations.size > 0) {
      const durations = Array.from(ctx.objectDurations.entries())
        .filter(([, d]) => d > 2)
        .map(([obj, d]) => `${obj}: ${d}s`)
        .join(", ");
      if (durations) parts.push(`RASTREAMENTO TEMPORAL: ${durations}`);
    }

    if (ctx.dominantScene) {
      parts.push(`CENA DOMINANTE: ${ctx.dominantScene} (estabilidade: ${ctx.sceneStability})`);
    }

    return parts.join("\n");
  }

  /** Clear all buffers */
  reset(): void {
    this.frames = [];
    this.events = [];
    this.previousObjects.clear();
    this.previousScene = null;
    this.previousEmotion = null;
    this.objectFirstSeen.clear();
  }

  /** Get recent event count */
  get recentEventCount(): number {
    const now = Date.now();
    return this.events.filter(e => now - e.timestamp < 10000).length;
  }
}

/** Singleton instance */
export const visionTemporalBuffer = new VisionTemporalBuffer();
