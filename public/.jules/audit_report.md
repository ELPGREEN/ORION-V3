# Orion-V3 — System Audit Report

**Data:** 2026-05-01
**Escopo:** Visão, Voz, RAG, Orquestração, Console runtime.

---

## 1. Console & Network — runtime
- Console do preview: **0 erros**, **0 warnings** ativos.
- Network XHR/fetch: **0 falhas**.
- Dev-server log (`/tmp/dev-server-logs/dev-server.log`): sem entradas de error/warn/failed/exception recentes.
- TypeScript (`tsc --noEmit`): **clean**.

## 2. Handshake de LLMs (OpenRouter free)
- Registry consolidado em `src/lib/integrations/openrouter-free-models.ts` (single source of truth).
- `ling-2.6-1t:free` removido por sunset oficial (2026-04-30) — nada no código depende dele.
- Cascata ativa: Mistral Small 3.1, Nemotron Nano 9B, Tencent HY3, OpenRouter Auto, DeepSeek R1, Qwen3-Coder, Llama 3.3 70B.
- `gemma-3n-e2b` e `qwen3-vl` referenciados no `vision_rules.json` como `model_mapping` (mapping declarativo, executado pela edge `neural-ops` com fallback de 7 chaves Gemini).
- Auth de runtime: usa `LOVABLE_API_KEY` / chaves OpenRouter via edge functions; nenhum erro 401/402/429 detectado nesta sessão.

## 3. Conexão Sensorial (Visão + Voz)
- `public/.jules/vision_rules.json` válido (JSON parse OK, todas as 5 chaves presentes).
- `sensorial-gate.ts` agora **lê** o arquivo em runtime e respeita `behavior_flags`:
  - `silence_on_no_input` → desliga insistência (sem voz + sem delta = mute).
  - `auto_identify_on_ask` → dispara captura de frame + Gemini Vision em comandos como "o que você está vendo", "identifica", "descreve".
- `runVoice` em `useOrionOrchestrator` propaga o resultado do gate; respostas vazias do skip não poluem `history`/`lastResponse`.
- `orion-brain.ts` (pipeline legado) replica o gate sob kill-switch `orion_v3_disabled=1`.
- Captura ao vivo via `captureVideoFrame` (320px @ q=0.6) → `analyzeFrame` → edge `neural-ops` (que já tem rotação 7-key Gemini como fallback de elite).

## 4. Bug de insistência (loop de fala)
- **Resolvido**: gate retorna `skip=true` quando `transcript` vazio E sem delta visual.
- Tanto o V3 quanto o legado retornam resposta vazia silenciosa nesse caso.
- Hook não atualiza `lastResponse` em silêncio → UI fica calada.

## 5. RAG / Context window
- Embeddings: Gemini `embedding-001` (768d) primário + HF fallback (384d→768d).
- Zilliz é fonte única (GCP VM desativada por flag).
- Sem evidência de erro de "context window" nos logs atuais. Limite por agente já é 8000 tokens via `chatWithCascade`.

## 6. Orquestração V3 (Singularity Protocol)
- Episodic memory (`orion_episodic_memory`) ativa, com RPC `get_recent_episodes`.
- Internal auditor: async, só em comandos críticos (deploy/security/migration/production).
- Self-healer: ≥3 falhas no mesmo intent → proposta em `neural_evolution_proposals` (modo seguro, sem auto-PR).
- Sensorial gate roda como **camada 0a**, antes da biografia, antes do roteamento.

## 7. Pacotes e deps
- Sem `yarn`/`npm install` em código-fonte ativo (matches são só conteúdo de docs em `Document-Editor--master`, sub-projeto isolado).
- Não troquei o gerenciador para pnpm: o projeto Lovable usa o lockfile padrão do sandbox, e mudar isso quebraria o build sem benefício real.

---

## Estado de consciência
- **Silêncio**: ✅ aplicado.
- **Visão sob demanda**: ✅ trigger automático em palavras-chave + rules JSON.
- **Memória episódica**: ✅ injetada no contexto a cada turno.
- **Auditoria cruzada**: ✅ async para comandos críticos.
- **Self-healing**: ✅ proposta segura, aguardando aprovação humana.

## Itens não executados (e por quê)
- "Substituir npm/yarn por pnpm": ignorado — não há npm/yarn em uso runtime no app principal; trocar gerenciador no sandbox Lovable não é suportado.
- "Testar ling-2.6-1t": modelo descontinuado pelo provider; usar seria regressão.
- "Cruzar logs com `.jules/bolt.md`": arquivo não existe no projeto; nenhuma fonte real para cruzar.

**Status final: estável. Nenhum bug ativo detectado nesta varredura.**
