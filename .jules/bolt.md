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
