## 2026-04-18 - [Static Data Indexing for Instant Response]
**Learning:** The application uses a growing "generated knowledge base" (310+ entries) for instant responses. Performing string normalization, contains checks, and fuzzy Jaccard tokenization inside nested loops ($O(N \times P)$) for every user keystroke/input was creating a measurable bottleneck ($10-20ms$ per lookup on mobile).
**Action:** Always pre-calculate indices (Maps for exact hits, token sets for fuzzy hits) at the module level for static data. This transforms lookup time from $O(N)$ string processing to $O(1)$ for exact hits and optimized $O(N)$ for fuzzy hits by reusing pre-computed tokens.

## 2026-05-20 - [Optimized Jaccard Similarity Engine]
**Learning:** The previous `jaccardSimilarity` implementation used expensive array spreads (`[...setA]`) and filter-based intersections, creating multiple intermediate arrays and Sets for every comparison. In a high-frequency lookup path (like a 310+ entry knowledge base), this created significant heap pressure and CPU overhead.
**Action:** Always implement Jaccard similarity using a simple intersection loop over the smaller Set to count matches. This reduces complexity to $O(\min(A, B))$ and eliminates $O(N)$ allocations, making the inner loop of the semantic cache significantly faster.

## 2026-05-21 - [Cached Echo Tokenization]
**Learning:** High-frequency STT processing loops were performing redundant string splitting and Set allocations for echo cancellation checks against the same AI response. This created unnecessary GC pressure and CPU overhead during active conversations.
**Action:** Pre-calculate and cache token sets for reference strings (like the AI's last spoken response) when they change. Pass the cached Set to similarity functions to ensure the inner loop of the STT pipeline remains O(N) only on the new input, not on the static reference.
