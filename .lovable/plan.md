

# Plano: LLM Knowledge Harvester + Per-User Encrypted KB + Inference API

## Contexto

O sistema neural já tem: backpropagation, Hebbian learning, distillation, knowledge base com embeddings, provider routing (quantum-llm-router), e pipeline orchestrator. O que falta é o ciclo de **coleta de conhecimento externo** durante o treino, **armazenamento criptografado por usuário**, e **API de inferência** pós-treino.

## Arquitetura

```text
┌─────────────────────────────────────────────────┐
│              TRAINING PHASE                      │
│                                                  │
│  neural-knowledge-harvester (nova edge function) │
│     ├── Query Groq, OpenAI, Gemini, DeepSeek    │
│     ├── Gera pares (prompt → response)          │
│     ├── Avalia qualidade (LLM-as-judge)         │
│     ├── Insere em neural_learning_data          │
│     └── Dispara neural-training (neural_learn)  │
│                                                  │
│  Resultado: pesos sinápticos atualizados,       │
│  knowledge base enriquecida, modelo distilado   │
├─────────────────────────────────────────────────┤
│              INFERENCE PHASE                     │
│                                                  │
│  neural-inference (nova edge function)           │
│     ├── Carrega pesos treinados                 │
│     ├── Quantum Router seleciona provider       │
│     ├── Injeta RAG context do user's KB         │
│     └── Retorna resposta "aprendida"            │
├─────────────────────────────────────────────────┤
│              PER-USER ENCRYPTED KB               │
│                                                  │
│  user_private_knowledge (nova tabela)            │
│     ├── user_id, encrypted_content (pgcrypto)   │
│     ├── RLS: só o próprio user acessa           │
│     ├── O user pode deletar tudo (GDPR)         │
│     └── Cada user = seu próprio Jarvis context  │
└─────────────────────────────────────────────────┘
```

## Etapas de Implementação

### 1. Edge Function: `neural-knowledge-harvester`

Nova edge function que, durante o treino, consulta múltiplos LLMs para coletar conhecimento:

- Recebe uma lista de **tópicos/prompts de treino** (ex: "Explique habeas corpus", "O que é LGPD")
- Para cada prompt, consulta **Groq, Gemini, DeepSeek, OpenAI** em paralelo
- Compara respostas, seleciona a melhor (LLM-as-judge usando Gemini)
- Insere o par (input, best_output) em `neural_learning_data` com `quality_score`
- Chama `neural-training` com `action: neural_learn` para treinar com os novos dados
- Usa as API keys já configuradas (GROQ_API_KEY, GEMINI_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY)

### 2. Tabela: `user_private_knowledge`

Tabela com criptografia via `pgcrypto` para knowledge pessoal de cada usuário:

- Colunas: `id`, `user_id`, `title`, `encrypted_content`, `encryption_iv`, `tags`, `embedding` (vector), `created_at`
- RLS: SELECT/INSERT/UPDATE/DELETE apenas pelo próprio `user_id`
- O conteúdo é criptografado client-side (AES-256-GCM) com chave derivada do user
- O embedding é gerado do título + tags (sem expor conteúdo) para busca semântica

### 3. Edge Function: `neural-inference`

API de inferência pós-treino:

- Carrega pesos sinápticos treinados (`__synaptic_weights__`)
- Carrega modelo distilado (`__distilled_model_v17__`)
- Usa quantum-router logic para selecionar provider baseado nos pesos aprendidos
- Injeta RAG context da `user_private_knowledge` (descriptografado no client)
- Retorna resposta com metadata de confiança e proveniência

### 4. Integração no Frontend

- Novo hook `useNeuralInference` que chama `neural-inference`
- Componente de gestão da KB privada (CRUD criptografado)
- Painel de treino mostrando progresso do harvester
- Integração com o Jarvis existente para usar inference ao invés de chamadas diretas

## Detalhes Técnicos

**Harvester — Proxy de APIs durante treino:**
- Usa `Promise.allSettled` para consultar 4 providers simultaneamente
- Timeout de 30s por provider, retry com exponential backoff
- Rate limiting interno (max 10 req/min por provider)
- Armazena raw responses para auditoria em `neural_learning_data.metadata`

**Criptografia per-user:**
- AES-256-GCM no client (Web Crypto API)
- Chave derivada com PBKDF2 do user's auth token + salt fixo por user
- Embedding gerado apenas do título (não do conteúdo) para preservar privacidade
- Opção de export/delete total (compliance LGPD)

**Inference pipeline:**
- Score de confiança baseado nos pesos treinados
- Fallback cascade: modelo distilado → quantum router → provider direto
- Cache de inferência em `elp_response_cache` (já existe)

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/neural-knowledge-harvester/index.ts` | Criar |
| `supabase/functions/neural-inference/index.ts` | Criar |
| Migration: `user_private_knowledge` table + RLS | Criar |
| `src/hooks/useNeuralInference.ts` | Criar |
| `src/hooks/usePrivateKnowledge.ts` | Criar |
| `src/lib/crypto/user-encryption.ts` | Criar |
| `src/components/dashboard/neural/KnowledgeHarvester.tsx` | Criar |
| `src/components/dashboard/neural/PrivateKnowledge.tsx` | Criar |

