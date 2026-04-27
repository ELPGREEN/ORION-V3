## 2026-04-18 - [Static Data Indexing for Instant Response]
**Learning:** The application uses a growing "generated knowledge base" (310+ entries) for instant responses. Performing string normalization, contains checks, and fuzzy Jaccard tokenization inside nested loops ($O(N \times P)$) for every user keystroke/input was creating a measurable bottleneck ($10-20ms$ per lookup on mobile).
**Action:** Always pre-calculate indices (Maps for exact hits, token sets for fuzzy hits) at the module level for static data. This transforms lookup time from $O(N)$ string processing to $O(1)$ for exact hits and optimized $O(N)$ for fuzzy hits by reusing pre-computed tokens.

## 2026-05-20 - [Optimized Jaccard Similarity Engine]
**Learning:** The previous `jaccardSimilarity` implementation used expensive array spreads (`[...setA]`) and filter-based intersections, creating multiple intermediate arrays and Sets for every comparison. In a high-frequency lookup path (like a 310+ entry knowledge base), this created significant heap pressure and CPU overhead.
**Action:** Always implement Jaccard similarity using a simple intersection loop over the smaller Set to count matches. This reduces complexity to $O(\min(A, B))$ and eliminates $O(N)$ allocations, making the inner loop of the semantic cache significantly faster.

## 2026-05-21 - [Cached Echo Tokenization]
**Learning:** High-frequency STT processing loops were performing redundant string splitting and Set allocations for echo cancellation checks against the same AI response. This created unnecessary GC pressure and CPU overhead during active conversations.
**Action:** Pre-calculate and cache token sets for reference strings (like the AI's last spoken response) when they change. Pass the cached Set to similarity functions to ensure the inner loop of the STT pipeline remains O(N) only on the new input, not on the static reference.

## 2026-05-22 - [Supabase Count Optimization]
**Learning:** Foundational dashboard queries were fetching full row data and multiple columns while only utilizing the `.count` property. In a high-latency mobile environment, this created unnecessary network payload and body parsing overhead (up to 150ms per interaction).
**Action:** Always use `{ count: "exact", head: true }` in Supabase/PostgREST queries when only record counts are required. This instructs the backend to return metadata in headers, eliminating response body transport and client-side JSON parsing for row data.

## 2026-04-25 - [Consolidated Regex Cleanup]
**Learning:** Sequential `.replace()` calls on long strings (AI responses) created unnecessary string allocations and multiple traversals. Consolidating 10 replacements into a single regex pass in `stripMarkdown` improved efficiency in the hot-path streaming loop.
**Action:** Use combined regexes for multi-pattern string cleanup to minimize allocations and traversals in high-frequency text processing.

## 2026-06-12 - [Optimized Set Intersections & O(N^2) Hoisting]
**Learning:** Common idiomatic patterns like `[...setA].filter(x => setB.has(x)).length` for Jaccard similarity create unnecessary intermediate arrays and redundantly iterate over larger sets. In episodic memory consolidation loops, performing string normalization and Set creation inside the inner loop ((N^2)$) creates significant GC pressure and CPU overhead as the memory store grows.
**Action:** Always implement Set intersections using a direct `for...of` loop over the smaller Set. For nested similarity loops, pre-calculate and cache tokenized Sets once ((N)$) before entering the (N^2)$ comparison phase to minimize redundant processing.

## 2026-06-13 - [State History Capping & Regex Hoisting]
**Learning:** Indefinite array growth in long-running cognitive loops (like the Orion Cortex) creates a slow memory leak that eventually degrades interaction latency. Additionally, complex regex patterns defined inside React hooks are re-allocated/re-compiled on every re-render, adding millisecond-level overhead to the main thread.
**Action:** Always cap state history arrays to a reasonable limit (e.g., 50 entries) in long-lived orchestrators. Hoist complex regex constants to the module level to ensure they are compiled once and reused, reducing GC pressure and execution time during high-frequency render cycles.
