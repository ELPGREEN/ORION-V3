# Fix TDZ Error "Cannot access 'X' before initialization" in Production Build

## Problem
Production build (Vite/Vercel) crashes with:
```
ReferenceError: Cannot access 'X' before initialization
at NeuralVision-*.js
```

This is a Temporal Dead Zone (TDZ) error caused by circular module dependencies that surface when Vite minifies and chunks code for production.

## Root Cause

### Circular Dependency Chain
```
src/lib/neural/orion-ai-client.ts
  ↓ imports VS from
src/components/dashboard/neural/useVisionProcessing.ts
  ↓ imports OrbState from
src/components/dashboard/neural/EnergyOrb.ts
  ↓ may import back into lib/neural/
```

**Key problematic import** — `src/lib/neural/orion-ai-client.ts` line 20:
```ts
import { VS } from "@/components/dashboard/neural/useVisionProcessing";
```
This is a `lib/` file importing from `components/` — architectural anti-pattern creating the cycle.

### VS Usage in orion-ai-client.ts
Used in `buildLocalDetections()` (~line 253) to read: `VS.regions`, `VS.motion`, `VS.multiTaskResult`, `VS.realTimeVision`, `VS.aiResponding`.

## What Was Already Tried (commit 61cb5ac4)
1. ✅ Moved `addEventListener` from module-level to `initVoiceIdentityListener()` 
2. ✅ Moved `prewarmModules()` from module-level to `lazyPrewarm()` in `useEffect`
3. ❌ Circular import `orion-ai-client.ts → useVisionProcessing.ts` still exists

## Fix Required

### 1. Break the Circular Dependency (PRIORITY)

Create `src/lib/neural/vision-state.ts`:
```ts
let _vsGetter: (() => any) | null = null;
export function setVSGetter(fn: () => any) { _vsGetter = fn; }
export function getVS() { return _vsGetter?.(); }
```

In `src/lib/neural/orion-ai-client.ts`:
- **REMOVE** line 20: `import { VS } from "@/components/dashboard/neural/useVisionProcessing";`
- **ADD**: `import { getVS } from "./vision-state";`
- **REPLACE** all `VS.` references with `getVS()?.` (e.g., `VS.regions` → `getVS()?.regions`)

In `src/components/dashboard/neural/NeuralVision.tsx`:
- **ADD** import: `import { setVSGetter } from "@/lib/neural/vision-state";`
- **ADD** in component (useEffect on mount): `setVSGetter(() => VS);`
- **ADD** cleanup: `return () => { setVSGetter(() => null); };`

### 2. Audit All Module-Level Side Effects

Search these files for code that runs at module load time (not inside functions):
- `src/lib/neural/orion-ai-client.ts`
- `src/lib/neural/orion-consciousness.ts`
- `src/lib/neural/orion-memory.ts`
- `src/lib/neural/neural-cognition-engine.ts`
- `src/lib/neural/quantum-llm-router.ts`
- `src/lib/neural/orion-working-memory.ts`
- `src/components/dashboard/neural/useOrionReasoning.ts`
- `src/components/dashboard/neural/useVisionProcessing.ts`
- `src/components/dashboard/neural/EnergyOrb.ts`
- `src/components/dashboard/neural/NeuralVision.tsx`

Patterns to fix:
1. Top-level function calls (not declarations)
2. `window.addEventListener` at module level
3. `localStorage.getItem/setItem` at module level
4. Any code that executes on import
5. `let`/`const` referencing other modules' exports during initialization

### 3. Verify No Other Circular Imports

Check for: `components/ → lib/neural/ → components/` cycles.
No `lib/neural/` file should import from `components/`.

## Acceptance Criteria
1. `npm run build` succeeds
2. Production loads without `ReferenceError: Cannot access '...' before initialization`
3. `npm run test` passes (173+ tests)
4. `npx tsc --noEmit` clean
5. Vision functionality works (object detection, face detection)
6. Voice identity system works
