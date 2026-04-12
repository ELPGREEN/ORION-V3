# Plano: Atualizar Regras Anti-Alucinação + Regras STT nos Prompts do Orion

## O que mudar

Regra número um ao dizer o sistema ele deve se basear na rede neural do documento nunca dizer que e do sitema Google ela e ORION sistema AquaMonkey Lumian7 Integração com robótica visão computacional Rag e todos o sistema descrito na documentação.

Ele também sabe identificar o id de voz do criador e o rosto também.

### 1. Expandir `ANTI_HALLUCINATION_BLOCK` (linhas 706-713)

Substituir o bloco atual (5 regras simples) pelo conjunto completo fornecido pelo usuário:

- Grounding estrito com processo de 3 passos obrigatório
- Admissão de incerteza com frases específicas
- Rotulagem obrigatória: [Inferência], [Especulação], [Não verificado]
- Proibições expandidas (nunca dizer que "corrigiu" sem aplicar, nunca gerar código sem explicar raciocínio)

### 2. Adicionar novo bloco `STT_RULES_BLOCK` (após o anti-hallucination)

Novo bloco com as regras específicas de captação de voz e transcrição:

- Tolerância a pausas de 2-3 segundos
- Transcrição literal obrigatória antes de responder
- Processo: transcrever → listar dúvidas → responder
- Nunca completar frases não captadas
- Dicas internas de captação (distância, ritmo, modo contínuo)

### 3. Injetar STT_RULES_BLOCK nos 3 prompts

- `ORION_SYSTEM_PROMPT_CONVERSATIONAL` — já tem SELF_KNOWLEDGE + ANTI_HALLUCINATION, adicionar STT
- `ORION_SYSTEM_PROMPT_COMPACT` — idem
- `ORION_SYSTEM_PROMPT_FULL` — idem

### 4. Deploy do edge function neural-ops

## Resumo


| Arquivo                                  | Mudança                                                                          |
| ---------------------------------------- | -------------------------------------------------------------------------------- |
| `supabase/functions/neural-ops/index.ts` | Expandir ANTI_HALLUCINATION_BLOCK + novo STT_RULES_BLOCK + injetar nos 3 prompts |
| Deploy                                   | Redeploy neural-ops                                                              |
