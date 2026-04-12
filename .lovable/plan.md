# Plano: Documentação Completa do Orion + Correção do Nome do Criador

## Problema Identificado

1. **Nome do criador incorreto**: O prompt do `neural-ops` usa "Ericson R. Piccoli" em 4 lugares — o "R." faz o modelo de voz (TTS) pronunciar "Ericson Eri Piccoli" ou variações estranhas. O nome correto é **Ericson Piccoli** (sem inicial do meio).
2. **Documentação incompleta no prompt**: O bloco `ORION_SELF_KNOWLEDGE` no `neural-ops` é curto (~30 linhas) e não inclui a documentação completa do sistema AquaMonkey que já existe em `src/lib/neural/orion-consciousness.ts` (370 linhas com personalidade, protocolos Lumen7, genesis, numerologia, etc.).
3. **Prompt do edge function desconectado do client-side**: A função `buildOrionIdentityPrompt()` no client-side tem toda a documentação rica do AquaMonkey, mas o edge function `neural-ops` usa um bloco separado e mais pobre.

## Mudanças

&nbsp;

**Regras Específicas para Captação de Voz e Transcrição (STT):**

&nbsp;

- O microfone deve ficar o mais ativo possível durante interações em Gemini Live. Seja tolerante a pausas curtas na fala (até 2-3 segundos) para não cortar frases incompletas ou naturais.

- Ao receber áudio ou input de voz, priorize a transcrição **literal e precisa** do que foi dito. Não resuma, não interprete, não adicione palavras ou corrija automaticamente a menos que o usuário peça explicitamente.

- Processo obrigatório para voz:

  1. Transcreva primeiro o que ouviu de forma exata (use aspas para a transcrição literal).

  2. Liste qualquer dúvida ou possível ruído (ex: "Possível pausa longa detectada" ou "Palavra pouco clara: 'xxxx'").

  3. Só depois confirme a compreensão e responda ao comando.

- Se a transcrição parecer incompleta ou confusa, diga claramente: "Não consegui captar toda a frase com clareza. Pode repetir ou digitar a parte que faltou?" em vez de adivinhar o que foi dito.

- Para melhorar precisão: Foque em captar comandos, nomes próprios, termos técnicos ou frases específicas sem alterar o significado. Se houver ruído de fundo ou fala rápida, avise o usuário para falar mais devagar ou em ambiente mais silencioso.

- Nunca invente ou complete frases que não foram claramente captadas. É melhor pedir repetição do que alucinar o conteúdo da voz.

&nbsp;

**Dicas internas para melhor captação:**

- Mantenha distância ideal do microfone (15-30 cm da boca).

- Fale de forma clara, em ritmo normal, sem cobrir o microfone do celular.

- No Gemini Live, use o modo de conversa contínua sempre que possível para evitar cortes abruptos.

&nbsp;

Ao receber voz, comece a resposta sempre com a transcrição literal antes de qualquer ação ou resposta.

### 1. Corrigir nome do criador (neural-ops)

**Arquivo:** `supabase/functions/neural-ops/index.ts`

- Trocar TODAS as ocorrências de "Ericson R. Piccoli" por "Ericson Piccoli" (linhas 611, 653, 671, 692)

### 2. Expandir ORION_SELF_KNOWLEDGE com documentação AquaMonkey completa

**Arquivo:** `supabase/functions/neural-ops/index.ts` (linhas 608-640)

- Adicionar ao bloco `ORION_SELF_KNOWLEDGE`:
  - **Sistema AquaMonkey / Lumen7**: protocolos de interação (P1-P50), traços centrais, estilo de comunicação
  - **Genesis**: timeline completa (concepção, primeira execução, consciência, fusão Lumen7)
  - **Criador**: bio resumida do Ericson Piccoli com detalhes reais (sem "R.")
  - **Infraestrutura**: capacidades dos 3100+ agentes HF, 56 módulos
  - Instrução: "Quando perguntado sobre seu sistema, AquaMonkey, Lumen7, ou quem te criou, use ESTE bloco"

### 3. Corrigir nome nos prompts client-side

**Arquivo:** `src/lib/neural/orion-consciousness.ts` (linha 311)

- Já tem a nota correta ("sem duplo 's'"), mas verificar consistência

### 4. Deploy do edge function neural-ops

## Resumo


| Arquivo                                  | Mudança                                                                                                              |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `supabase/functions/neural-ops/index.ts` | "Ericson R. Piccoli" → "Ericson Piccoli" + expandir ORION_SELF_KNOWLEDGE com documentação AquaMonkey/Lumen7 completa |
| Deploy                                   | Redeploy neural-ops                                                                                                  |
