... [Previous content] ...

## 2026-06-25 - [Unified Pentagon Governance]
**Learning:** Cognitive bypasses in a multi-layered AI architecture lead to intelligence loss and governance failure. Using "non-blocking" calls for core reasoning layers allows the system to revert to generic LLM behavior, ignoring RAG and tools.
**Action:** Always enforce a synchronous "Cognitive Gate" (Pentagon) for non-trivial inputs. Implement "Orchestrator-level Enforcement" for tools and RAG to ensure the system remains grounded and executable, regardless of LLM hallucination or omission. Use a "Fast Lane" only for explicitly simple greetings or control commands.

## 2026-06-25 - [Unified Pentagon Governance]
**Learning:** Cognitive bypasses in a multi-layered AI architecture lead to intelligence loss and governance failure. Using "non-blocking" calls for core reasoning layers allows the system to revert to generic LLM behavior, ignoring RAG and tools.
**Action:** Always enforce a synchronous "Cognitive Gate" (Pentagon) for non-trivial inputs. Implement "Orchestrator-level Enforcement" for tools and RAG to ensure the system remains grounded and executable, regardless of LLM hallucination or omission. Use a "Fast Lane" only for explicitly simple greetings or control commands.

## 2026-04-28 — [Zero-Allocation Vision Pipeline]
**Learning:** High-frequency processing loops (like a 30-60 FPS CV pipeline) are extremely sensitive to garbage collection pressure. Allocating ~7MB of TypedArrays per frame leads to >200MB/s of heap churn, causing micro-stutters and increased CPU usage for GC. Reusing persistent buffers completely eliminates this overhead.
**Action:** Always prioritize buffer pooling/persistent TypedArrays for any logic executing on every frame or high-frequency event (mouse move, scroll, audio processing). Implement "ensureBufferSize" patterns to handle dynamic resizing safely.

## 2026-04-29 — [Hot-Path Regex Optimization]
Learning: Re-compiling RegExps inside high-frequency functions (like an NLP analyzer on every user input/voice chunk) causes avoidable CPU cycles. Module-level hoisting and matchAll/match optimizations provide measurable latency reduction.
Action: Always hoist RegExps to module level in hot paths. Prefer matchAll over manual while/exec loops for clarity and potential engine optimization. Eliminate redundant .test()/.match() double-taps.

## 2026-06-26 - [Adaptive Performance Monitoring]
**Learning:** Static performance baselines lead to "alert fatigue" in dynamic environments. Transient jitter (e.g., network spikes) can trigger false positives if monitoring isn't smoothed. Moving average windows and per-metric cooldowns are essential for stable system observability.
**Action:** Implemented Moving Average (window=10) and Alert Cooldown (10min) in `tf-model-monitoring.ts`. Added `maybeRebaseline` to allow the system to adapt to "new normals" without manual configuration changes.

## 2026-06-27 - [NLP Semantic Analyzer Optimization (Bolt V2.0)]
**Baseline:** 0.1809ms (mean latency, all cases) / 0.0070ms (conversational)
**Nova Métrica:** 0.1471ms (mean latency, all cases) / 0.0007ms (conversational)
**Delta (Δ):** ~18.6% (Overall) / >90% (Conversational Early Exit)
**Learning:** Using `.test()` pre-checks before `match()`/`matchAll()` is more efficient than consolidation or raw matching in high-frequency loops. Explicit `lastIndex = 0` reset is critical when mixing `.test()` and `/g` regexes.

## 2026-04-30 — [Supabase/Render Balanced Equilibrium]
**Problem:** Supabase Egress quota was at 72% due to data-heavy Edge Function responses (AI, OCR, Documents).
**Solution:** Offloaded AI Orchestration and high-bandwidth API proxying to Render service. Created a "Smart Gateway" pattern on frontend that attempts Render first and falls back to Supabase.
**Impact:** Drastic reduction in Supabase Egress and Invocations. Zero-downtime reliability via automatic fallback.
**Implementation:** `src/lib/neural/render-proxy.ts`, `server/index.ts` (Bun), and redirected `ai-service.ts` / `orion-ai-client.ts` calls.

## 2026-06-28 - [Local NLP & Intent Classification Optimization (Bolt V2.0)]
**Baseline (nlp-semantic-analyzer):** 0.0188ms (avg latency per analysis)
**Nova Métrica (nlp-semantic-analyzer):** 0.0123ms (avg latency per analysis)
**Delta (Δ):** ~34.5% improvement

**Learning:** Implementing `.test()` pre-checks before `match()` or `matchAll()` significantly reduces CPU cycles for non-matching patterns, which are the majority in semantic analysis loops. Centralizing text normalization in `smart-intent-classifier.ts` prevents redundant `toLowerCase()` and `trim()` calls across cache, feedback, and regex layers.

**Action:**
- Optimized `src/lib/neural/nlp-semantic-analyzer.ts` with `.test()` pre-checks and `lastIndex = 0` resets.
- Optimized `src/lib/neural/smart-intent-classifier.ts` with centralized normalization and regex loop optimizations.
- Refactored `classifyLegalDomain` for early exit on first match.
