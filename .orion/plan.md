
User approved the minimal vision-bug fix. Two surgical changes:

1. **`src/lib/orion-tools/intent-guard.ts`** — add vision intents to `INTENT_TOOL_MAP` so they map to allowed tools (vision/ocr) instead of falling through to wrong handlers. Also add `auto_evolution` / `code_analysis` / `code_refactor` mapped to `jules` (owner-only).

2. **`src/components/dashboard/neural/useOrionReasoning.ts`** — need to inspect first to add a hard guard: any intent containing `auto_evolution`, `code_analysis`, `improve_code`, `refactor` requires `isOwner === true`; otherwise route back to normal chat. This stops the "refatorar funções / bugs / código redundante" leak when user asks vision questions.

## Changes

### `intent-guard.ts` — additions
```ts
// Vision (allowed for most roles via vision_analyze tool)
vision_describe: "vision_analyze",
what_seeing: "vision_analyze",
describe_scene: "vision_analyze",
identify_object: "vision_analyze",
count_objects: "vision_analyze",
read_text: "vision_analyze",
ocr_document: "vision_analyze",
identify_face: "vision_analyze",

// Auto-evolution / code analysis (owner-only via jules tool)
auto_evolution: "jules",
code_analysis: "jules",
code_refactor: "jules",
improve_code: "jules",
analyze_code: "jules",
```

### `useOrionReasoning.ts` — guard
Before dispatching any intent whose id matches `/auto_evolution|code_analysis|code_refactor|improve_code|analyze_code/`, check `isOwner`. If not owner → fallback to normal chat reply, never call `improveCodeWithAI` / `analyzeCodeWithAI`.

I need to read the current `useOrionReasoning.ts` to apply the guard surgically without breaking existing flow.

## Files
- `src/lib/orion-tools/intent-guard.ts` (extend map)
- `src/components/dashboard/neural/useOrionReasoning.ts` (add owner-gate before code-analysis branch)

## Result
- "O que você está vendo?" → routes to vision tool, no more refactor monologue.
- Code-analysis prompt only fires when owner explicitly requests it.
