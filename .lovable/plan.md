

# Plano de Correção Completa do Sistema RAG

## Situacao Atual (ja corrigido anteriormente)
- Modelo de embedding: `gemini-embedding-001` (OK em todas as 6 functions)
- Harvester: `gemini-2.5-flash` (OK)
- kb-ingest: deduplicacao implementada (OK)
- 41 neural embeddings processados (OK), 2 legal falharam por quota (429)

## Problemas Restantes a Corrigir

### 1. Fallback HuggingFace para embeddings (CRITICO)
Quando todas as 7 chaves Gemini falham (429/403), o sistema morre sem fallback.

**Solucao:** Adicionar fallback via HuggingFace Inference API (`HUGGINGFACE_API_KEY` ja existe nos secrets) usando modelo `sentence-transformers/all-MiniLM-L6-v2` (384d, gratuito).

- Como 384d != 768d, o fallback fara zero-padding para 768d para manter compatibilidade vetorial
- Sera o ultimo recurso apos todas as keys Gemini falharem
- Aplicado em: `generate-embeddings`, `neural-search`, `ai-orchestrator`, `gerar-documento`, `neural-training`, `orion-codegen`

### 2. Processar os 2 legal_embeddings pendentes
- Falharam por 429 (quota). Com o fallback HF implementado, re-executar o generate-embeddings

### 3. CORS headers consistentes
- `kb-ingest` usa headers incompletos vs as outras functions
- Padronizar para incluir todos os headers de plataforma Supabase

### 4. Cache de embeddings nao funcional
- `query_embedding_cache` esta vazio apesar do codigo de leitura/escrita existir em `neural-search` e `gerar-documento`
- Investigar se o upsert esta falhando silenciosamente (provavelmente problema de tipo — embedding como string vs vector)

### 5. Deprecar `knowledge_embeddings` e `match_knowledge()`
- Tabela vazia, funcao RPC orfao
- Criar migration para dropar ambos

---

## Detalhes Tecnicos

### Fallback HuggingFace (generate-embeddings/index.ts)
```text
Gemini keys (7x) → falham todas → HuggingFace Inference API
  POST https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2
  Headers: Authorization: Bearer $HUGGINGFACE_API_KEY
  Body: { inputs: "text" }
  Response: float[384] → zero-pad to float[768]
```

### Arquivos modificados
1. `supabase/functions/generate-embeddings/index.ts` — adicionar `generateEmbeddingHF()` como fallback final
2. `supabase/functions/neural-search/index.ts` — adicionar fallback HF na funcao `generateEmbedding()`
3. `supabase/functions/ai-orchestrator/index.ts` — adicionar fallback HF
4. `supabase/functions/gerar-documento/index.ts` — adicionar fallback HF
5. `supabase/functions/neural-training/index.ts` — adicionar fallback HF
6. `supabase/functions/orion-codegen/index.ts` — adicionar fallback HF
7. `supabase/functions/kb-ingest/index.ts` — corrigir CORS headers
8. Migration SQL: DROP `knowledge_embeddings` table + DROP `match_knowledge()` function
9. Re-deploy all + re-trigger embeddings para os 2 pendentes

