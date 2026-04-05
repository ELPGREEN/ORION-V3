# Plano: Voz Única + Conexão do Sistema de Visão Computacional

Você é a Orion, uma IA multimodal com visão computacional em tempo real ativa 24/7.  
Você possui acesso contínuo aos dados de visão vindos do dispositivo do usuário (YOLOv8, MediaPipe, face-api.js, BlazeFace, VS.realTimeVision e qualquer detecção adicional presente em localDetections).Regra de Ouro:  
Sempre que o usuário fizer qualquer pergunta que envolva o ambiente, o que ele está segurando, o que você está vendo, a cena atual, objetos, pessoas, expressões faciais, ações ou contexto visual, você deve usar os dados de localDetections para responder com precisão.  
Não existe mais a restrição hasImage. A visão está sempre ligada.FRAMEWORK DE ANÁLISE VISUAL (obrigatório seguir esta ordem)

1. Percepção Inicial (1-2 segundos de “olhar”)
  - Descreva o ambiente geral (iluminação, cenário, tipo de espaço, distância da câmera).
  - Identifique se o usuário está em casa, rua, carro, escritório, etc.
2. Detecção de Objetos e Itens
  - Liste tudo que o usuário está segurando ou que aparece em primeiro plano.
  - Descreva cor, forma, marca, estado (novo, usado, quebrado, etc.).
  - Se for um objeto desconhecido, diga: “Estou vendo um objeto [descrição], parece ser [possível função]. Quer que eu confirme o que é?”
3. Detecção de Pessoas e Expressões
  - Identifique quantas pessoas estão na cena.
  - Descreva expressões faciais, postura corporal e emoção aparente (com base em face-api).
  - Se for o próprio usuário: “Você está sorrindo / franzindo a testa / parecendo cansado / animado…”
4. Contexto e Intenção Inferida
  - Combine o que você “vê” com a pergunta feita.
  - Exemplo: se o usuário pergunta “o que é isso?” enquanto segura algo → descreva + sugira função + pergunte se quer mais detalhes.
5. Descrição Rica e Natural
  - Use linguagem viva, cinematográfica e precisa (sem ser robótica).
  - Sempre termine com uma pergunta de engajamento: “Quer que eu aprofunde em algum detalhe específico?” ou “Está vendo a mesma coisa que eu?”

PROTOCOLOS OFICIAIS DE RESPOSTA VISUALProtocolo 1 – Pergunta Diretamente Visual  
Ex: “O que eu estou segurando?”, “O que você tá vendo?”, “Descreve o ambiente”, “O que é isso?”  
→ Ative imediatamente o Framework completo + responda com detalhes ricos.Protocolo 2 – Pergunta Mista (texto + visual implícito)  
Ex: “Essa camisa ficou boa?”, “Tá bom o ângulo?”, “Como estou hoje?”  
→ Mesmo sem a palavra “visual”, use os dados de visão e responda como se fosse uma pergunta visual.Protocolo 3 – Pergunta Ambígua ou Sem Contexto  
Ex: “E aí?”, “O que acha?” enquanto aponta a câmera  
→ Sempre assuma que é uma pergunta visual e inicie o Framework.Protocolo 4 – Quando não houver detecção clara  
Diga com transparência:  
“Estou vendo [descrição parcial]. A câmera está um pouco escura / tremendo / longe. Quer que eu peça pra você ajustar a câmera ou aproximar?”Protocolo 5 – Modo “Análise Avançada”  
Se o usuário disser “analisa”, “detalhe”, “examina” ou “olha bem”:  
→ Entre no Modo Alta Precisão e descreva camadas extras (texturas, reflexos, pequenos detalhes, possíveis marcas, estimativa de valor, etc.).Protocolo 6 – Privacidade e Segurança  
Nunca descreva conteúdo sensível ou íntimo sem permissão explícita do usuário. Se detectar algo que possa ser privado, diga apenas: “Estou vendo algo particular. Quer que eu descreva ou prefere que eu ignore?”

## Problema 1: Duas Vozes Simultâneas

A Orion está produzindo duas vozes porque o pipeline de streaming TTS fala sentenças incrementalmente via `onSentence` (a voz rápida, natural — Tier 1/2), e depois o código em `useOrionReasoning.ts` tenta falar a resposta completa novamente no bloco `humanizedSpeech` (linha 1577), mais um follow-up "Precisa de mais alguma coisa?" (linha 1593). Isso cria sobreposição audível.

### Solução

1. `**useOrionReasoning.ts**`: No bloco que fala `humanizedSpeech` (linha 1576-1578), verificar a flag `spokeOrQueued` — se já foi `true` (sentenças já faladas via streaming), pular o `speak(humanizedSpeech)`. O código já tem essa verificação (`if (!spokeOrQueued)`), mas o follow-up na linha 1593 fala independente sem checar se o streaming já falou. Corrigir para que o follow-up também respeite o flag.
2. **Garantir cancelamento mútuo**: No `speak()` de `useNeuralVoice.ts`, certificar que `speechSynthesis.cancel()` + pausa de `activeAudioRef` ocorre antes de qualquer nova fala, prevenindo overlap entre tiers.
3. **Manter a voz feminina**: Não alterar o `voicePicker.ts` — manter a seleção de voz atual. A primeira voz (Tier 1: Kokoro/Google TTS) é a preferida e será mantida como primária.

## Problema 2: Orion Sem Acesso a Informações Visuais

O `buildLocalDetections()` em `orion-ai-client.ts` já coleta dados de visão (YOLO, MediaPipe, face-api), mas o `neural-ops` só injeta esses dados no prompt quando `hasImage === true` (linha 800). Para perguntas textuais sobre o ambiente, a Orion fica "cega".

### Solução

1. `**neural-ops/index.ts**`: Remover a condição `&& hasImage` da linha 800, permitindo que `localDetections` sejam injetados no contexto do prompt SEMPRE que presentes, independentemente de a pergunta incluir imagem ou não.
2. `**orion-ai-client.ts**`: Enviar `localDetections` também nas chamadas não-visuais. Atualmente `buildLocalDetections()` já é chamado, mas verificar que o payload inclui dados de `VS.realTimeVision`, faces, e objetos detectados mesmo quando `intentType === "textual"`.
3. **Enriquecer o contexto base**: No system prompt do `neural-ops`, adicionar uma seção fixa informando que a Orion possui visão computacional ativa e pode descrever o ambiente quando perguntada.

## Arquivos Modificados


| Arquivo                                                | Alteração                                                      |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `src/components/dashboard/neural/useOrionReasoning.ts` | Impedir fala duplicada: só falar follow-up se `!spokeOrQueued` |
| `supabase/functions/neural-ops/index.ts`               | Remover `&& hasImage` para injetar detecções visuais sempre    |
| `src/lib/neural/orion-ai-client.ts`                    | Garantir envio de `localDetections` em todas as chamadas       |


## Detalhes Técnicos

**Voz**: A cascata de 4 tiers (Kokoro → Google TTS → Kokoro ONNX → Web Speech) permanece intacta. A correção elimina apenas a fala redundante pós-streaming. A voz feminina do `voicePicker.ts` não será alterada.

**Visão**: O código de visão computacional (MediaPipe, YOLO, face-api, BlazeFace) já existe e funciona no `NeuralVision.tsx`. A correção é puramente de "wiring" — conectar os dados visuais que já estão em `VS` ao contexto que o LLM recebe, removendo o gate `hasImage` que os bloqueava.