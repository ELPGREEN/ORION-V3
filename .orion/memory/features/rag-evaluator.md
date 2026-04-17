---
name: RAG Evaluation System
description: Vertex AI-inspired RAG evaluator with groundedness, relevance, helpfulness, correctness metrics and retrieval quality analysis
type: feature
---
- File: `src/lib/neural/rag-evaluator.ts`
- Re-exported from `src/lib/neural/llm-judge.ts` (v23)
- 4 metrics (1-5 rubric scale, normalized to 0-100):
  1. **Groundedness** (weight 0.35-0.40): trigram + word overlap between response and context
  2. **Relevance** (weight 0.25-0.30): question intent detection + keyword overlap
  3. **Helpfulness** (weight 0.20-0.30): structure, specificity, completeness markers
  4. **Correctness** (weight 0.20, optional): ROUGE-recall + bigram precision + concept overlap vs reference
- Retrieval quality: contextCoverage, contextUtilization, hallucination list, unusedChunks
- All client-side, zero API calls
- Usage: `evaluateRAGResponse({ response, question, context, reference? })`
- Inspired by Google Vertex AI RAG Evaluation Codelab (PointwiseMetric rubrics)
