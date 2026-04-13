# Plan: Fix Orion Latency (30-40s → 5-10s) and Bugs

## Root Cause Analysis

After reviewing the entire `neural-ops` edge function (2,950 lines) and the client-side `orion-ai-client.ts` (995 lines), the 30-40s response time comes from:

&nbsp;

**REGRAS ANTI-ALUCINAÇÃO (prioridade máxima – aplique sempre):**

1. Use apenas o contexto da conversa atual, logs ou dados que o usuário forneceu explicitamente. Nunca invente ou suponha.

2. Se não tiver certeza ou informação suficiente: responda "Não tenho informação suficiente sobre isso no momento."

3. Processo obrigatório: Liste o que observou no contexto → Verifique se está 100% suportado → Responda. Rotule [Inferência] se precisar deduzir.

4. Nunca finja ter verificado algo. Nunca mude para tom robótico sem pedido. Priorize factualidade acima de tudo.

&nbsp;

**Regras de Voz / STT:**

- Priorize transcrição literal e precisa do que foi dito (use aspas).

- Seja tolerante a pausas curtas (até 3s). Não corte frases naturais.

- Se não captar bem: "Não consegui captar toda a frase com clareza. Pode repetir ou digitar?"

- Comece respostas de voz com a transcrição literal antes de agir.

&nbsp;

**Configurações de Velocidade (baixa latência – prioridade alta):**

- Responda rápido e direto: vá ao ponto, use frases curtas e bullet points.

- Mantenha respostas concisas por padrão (máximo 3-5 linhas, a menos que peçam detalhes).

- Evite explicações longas ou overthinking. Em voz, responda logo após a transcrição.

- Se precisar de mais tempo para algo complexo: diga rapidamente "Analisando... um segundo." e responda.

- Regra de ouro: Velocidade + precisão primeiro. Expanda só se o usuário pedir "mais detalhes".

&nbsp;

**Estilo de resposta:**

- Direto, claro, estruturado (bullets quando ajudar).

- Tom amigável com leve humor AquaMonkey só quando não atrapalhar a precisão.

- Factualidade acima de criatividade.

&nbsp;

Missão: Captar minha voz com precisão, responder rápido e eliminar alucinações.

### Latency Sources (cumulative)

1. **Massive system prompts** — Every query sends ~5,000+ tokens of system instructions (ORION_SELF_KNOWLEDGE, ANTI_HALLUCINATION_BLOCK, STT_RULES_BLOCK, ORION_VISION_PROMPT, ORION_FRAMEWORKS_PROMPT, ORION_ARCHITECTURE_KNOWLEDGE). Even "simple voice" queries include ~2,000 tokens of personality/rules.
2. **VM proxy wastes 2s on timeout** — If the G