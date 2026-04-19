## 2026-04-18 - [Static Data Indexing for Instant Response]
**Learning:** The application uses a growing "generated knowledge base" (310+ entries) for instant responses. Performing string normalization, contains checks, and fuzzy Jaccard tokenization inside nested loops ($O(N \times P)$) for every user keystroke/input was creating a measurable bottleneck ($10-20ms$ per lookup on mobile).
**Action:** Always pre-calculate indices (Maps for exact hits, token sets for fuzzy hits) at the module level for static data. This transforms lookup time from $O(N)$ string processing to $O(1)$ for exact hits and optimized $O(N)$ for fuzzy hits by reusing pre-computed tokens.

## 2026-05-20 - [Optimized Jaccard Similarity Engine]
**Learning:** The previous `jaccardSimilarity` implementation used expensive array spreads (`[...setA]`) and filter-based intersections, creating multiple intermediate arrays and Sets for every comparison. In a high-frequency lookup path (like a 310+ entry knowledge base), this created significant heap pressure and CPU overhead.
**Action:** Always implement Jaccard similarity using a simple intersection loop over the smaller Set to count matches. This reduces complexity to $O(\min(A, B))$ and eliminates $O(N)$ allocations, making the inner loop of the semantic cache significantly faster.

## 2026-05-22 - [Sticky Regex for O(1) Streaming Detection]
**Learning:** Using `accumulated.slice(spokenUpTo).match(...)` during high-frequency streaming creates (N^2)$ string copies and overhead.
**Action:** Always use sticky regexes (`/y`) combined with `lastIndex = spokenUpTo` and `exec()` for sentence/token detection in growing buffers. This allows the engine to match directly at the current offset without allocating new substrings, keeping processing time constant regardless of buffer size.
