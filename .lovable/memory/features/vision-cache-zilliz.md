---
name: Vision Cache with Zilliz
description: 3-layer smart vision pipeline — client diff + Zilliz memory + Gemini fallback. Cuts 80%+ cost.
type: feature
---

Smart vision pipeline at `src/lib/vision/vision-cache.ts` exports `analyzeFrameSmart()`:

1. **Client pixel-diff** (1ms) — 16x16 grayscale signature; skip if scene unchanged (<8% diff) or too dark (luma <25)
2. **Zilliz memory** (`orion_vision_memory`, 256d COSINE) — perceptual-hash lookup; reuse description if similarity ≥0.92
3. **Gemini fresh** (~1.5s) — only on novel scenes; result auto-saved to Zilliz for next time
4. **Local 2s cache** — same hash within 2s returns instantly

Replace `analyzeFrame` calls with `analyzeFrameSmart` to enable. Returns `source` field: `skipped|local_cache|zilliz_memory|gemini_fresh` for telemetry.

Call `resetVisionCache()` when camera restarts.
