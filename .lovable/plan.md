

# Fix Orion Speed + Unblock All CSP Resources

## Problem Summary
Three issues making Orion slow and blocked:

1. **CSP blocking resources**: Despite having `huggingface.co` in connect-src, ONNX model downloads are blocked. The Spotify SDK script (`sdk.scdn.co`) is also blocked from `script-src`. YouTube iframes still show violations in some contexts.

2. **MediaPipe timestamp errors**: The monotonic fix was applied but errors persist because all 5 detectors share the same video element and `Promise.all` calls `nextTs()` before the promises actually execute, so timestamps can still collide.

3. **Vision pipeline too heavy**: `detectRealTime()` runs 6+ ML models in parallel every frame (MediaPipe 5 detectors + YOLO + FrameX + depth + OCR + handwritten OCR). This saturates the GPU/CPU and causes multi-second delays.

## Plan

### Step 1 — Fix CSP in `index.html`
Update the CSP meta tag:
- **`connect-src`**: Add `https://cdn-lfs.huggingface.co` (HuggingFace LFS CDN where ONNX files actually redirect to)
- **`script-src`**: Add `https://sdk.scdn.co` for Spotify player SDK
- **`frame-src`**: Already fixed — verify it persists

### Step 2 — Fix MediaPipe timestamps properly
In `mediapipe-vision.ts`, change `detectAllMP` to call `nextTs()` **sequentially inside each detector call** rather than evaluating all timestamps upfront in `Promise.all`. The timestamps need to be called at execution time, not at promise creation time. Run detectors sequentially (they share the same WebGL context anyway — parallel execution on the same GPU context doesn't help and causes the timestamp race).

### Step 3 — Throttle vision pipeline for 3s target
In `realtime-vision-engine.ts`:
- Add a **frame skip** mechanism: only run full detection every 300ms (3 FPS) instead of every frame
- Run **only MediaPipe** (lightweight) on every call; defer YOLO, depth, OCR to every Nth frame
- Skip depth estimation, FrameX, handwritten OCR, and regional descriptions more aggressively (every 30th frame instead of 5th/10th/15th)
- Add an early-return cache: if called within 300ms of last detection, return cached result

### Step 4 — Ensure `willReadFrequently` canvas flag
In `realtime-vision-engine.ts` and `mediapipe-vision.ts`, add `{ willReadFrequently: true }` to any `getContext('2d')` calls used for `getImageData` (already flagged in console warnings).

## Technical Details

**CSP line 33 update** — single line change adding `https://cdn-lfs.huggingface.co` to connect-src and `https://sdk.scdn.co` to script-src.

**MediaPipe sequential** — Change from:
```typescript
const [objects, faces, ...] = await Promise.all([
  detectObjects(video, nextTs("obj")),
  detectFacesMP(video, nextTs("face")),
  ...
]);
```
To sequential execution:
```typescript
const objects = await detectObjects(video, nextTs("obj"));
const faces = await detectFacesMP(video, nextTs("face"));
// etc.
```
This avoids GPU context contention and timestamp races.

**Frame throttle** — Add at the top of `detectRealTime`:
```typescript
const MIN_INTERVAL = 300; // ms — max ~3 FPS for vision
if (now - lastDetectTime < MIN_INTERVAL && cachedResult) return cachedResult;
```

**Files changed**: `index.html`, `src/lib/neural/mediapipe-vision.ts`, `src/lib/neural/realtime-vision-engine.ts`

