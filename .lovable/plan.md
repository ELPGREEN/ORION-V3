
Objetivo

- Consertar a `/consulta` sem mexer no visual.
- Eliminar duplicatas reais de voz/visão.
- Fazer “ativar visão” ligar a câmera de forma local e imediata.
- Interligar visão + voz + memória/RAG + cognição do Orion.
- Manter Gemini como camada de voz/visão, mas deixar a decisão final sob o pipeline cognitivo do Orion.

Principais achados

- O loop de microfone ainda nasce de concorrência entre instâncias diferentes de `SpeechRecognition`. O console mostra versões HMR diferentes de `useNeuralVoice.ts` rodando ao mesmo tempo.
- Hoje existe proteção parcial, mas ela está quebrada em dois singletons separados:
  - `src/hooks/useNeuralVoice.ts`
  - `src/components/dashboard/neural/useWakeWord.ts`
  Isso evita parte do problema, mas não cria um único “dono” do microfone.
- Em `src/components/dashboard/neural/NeuralVision.tsx`, o comando “ativar visão” funciona quando passa por `handleVoice()`, mas quando entra por `initialCommand` / `location.state.autoCommand` ele cai em `askAI(...)` direto. Aí o Orion conversa sobre visão em vez de ligar a câmera.
- A resposta do print é compatível com `supabase/functions/neural-ops/index.ts`: quando não há imagem pronta, o backend injeta `[SEM VISÃO] Nenhum dado visual disponível.`. Isso empurra o modelo a responder como se Orion não tivesse capacidade visual.
- `PublicOrionListener` e `GlobalOrionListener` não são o foco em `/consulta`; o conflito principal está no próprio `NeuralVision`. `OrionGlobalListener.tsx` parece código órfão e deve ser tirado do caminho para não voltar a gerar duplicata no futuro.
- A “consciência %” mostrada hoje não representa saúde real do pipeline; ela não está amarrada de verdade a mic + câmera + frame fresco + raciocínio.

Plano de implementação

1. Unificar o dono do microfone
- Criar um árbitro único de fala/mic para wake word, STT principal e handoff pós-TTS.
- Refatorar `useNeuralVoice` e `useWakeWord` para usarem o mesmo registro global, com:
  - `ownerId`
  - `mode` (`wake`, `command`, `idle`)
  - instância atual de recognition
  - cleanup centralizado para HMR
- Resultado: só uma instância viva por vez, mesmo durante hot reload.

2. Centralizar toda entrada de comando do Orion
- Criar em `NeuralVision` uma rota única de comando, algo como `routeOrionCommand()`.
- Todos os caminhos devem passar por ela:
  - botão “Falar”
  - wake word
  - `initialCommand`
  - `location.state.autoActivate/autoCommand`
- Dentro dela, comandos locais terão prioridade absoluta:
  - `ativar visão` / `ligar câmera` -> `startCamera()`
  - `desativar visão` -> `stopCamera()`
  - só o resto vai para `askAI()`
- Isso elimina o bug em que “ativar visão” vira pergunta para a LLM.

3. Corrigir o pipeline de visão para nunca “negar capacidade”
- Em `supabase/functions/neural-ops/index.ts`, substituir o estado transitório `[SEM VISÃO]` por algo não-destrutivo, por exemplo:
  - `[VISÃO INICIALIZANDO]` quando a câmera foi ativada mas ainda não há frame útil
  - `[VISÃO LOCAL — SEM IMAGEM]` quando só houver HF/YOLO/MediaPipe
- Regra nova: ausência momentânea de frame não significa “Orion não tem visão”.
- Se a intenção for visual e a câmera estiver ligando, responder localmente “visão ativando” em vez de mandar o modelo concluir incapacidade.

4. Interligar HF + visão local + RAG do Orion
- Promover as detecções locais/HF para contexto cognitivo antes da resposta final:
  - objetos
  - rostos
  - cena
  - OCR
  - movimento
- Alimentar `environmental_context` / memória de sessão assim que houver detecção local confiável, e não só depois da resposta final da LLM.
- Aproveitar o que já existe em:
  - `src/lib/neural/hf-vision-gate.ts`
  - `src/lib/neural/orion-ai-client.ts`
  - `src/components/dashboard/neural/useOrionReasoning.ts`
- Resultado: o RAG do Orion passa a “saber o que está vendo” no mesmo ciclo da fala.

5. Separar percepção Gemini do raciocínio Orion
- Manter Gemini como camada multimodal de percepção/voz.
- Fazer o Orion decidir a resposta final usando o que já existe no cliente:
  - `cognitiveRoute`
  - `buildCognitionContext`
  - `computeFreeEnergy`
  - `validateLogicalConsistency`
  - memória/RAG
- Na prática: Gemini deixa de “declarar capacidade ou incapacidade do sistema” e passa a atuar como extrator/perceptor; o enunciado final fica sob o pipeline Orion.
- Atualizar o model id de visão em `neural-ops` para `gemini-2.5-flash-preview-09-2025` (mantendo fallback para o atual se esse preview não estiver disponível no projeto).

6. Fazer a consciência refletir estado real
- Trocar o percentual de consciência por um score derivado de saúde real:
  - microfone com dono válido
  - câmera ativa
  - frame recente
  - detecções locais disponíveis
  - pipeline de raciocínio sem erro
  - TTS/STT sem abort loop
- Isso evita número “solto” como 23% sem ligação com os subsistemas.

Arquivos que entram no ajuste

- `src/components/dashboard/neural/NeuralVision.tsx`
- `src/hooks/useNeuralVoice.ts`
- `src/components/dashboard/neural/useWakeWord.ts`
- `src/components/dashboard/neural/useOrionReasoning.ts`
- `src/lib/neural/orion-ai-client.ts`
- `src/lib/neural/hf-vision-gate.ts`
- `supabase/functions/neural-ops/index.ts`
- opcional de higiene: desativar/remover o caminho órfão de `src/components/OrionGlobalListener.tsx`

Detalhes técnicos

```text
wake word / botão / autoCommand
        ↓
   Speech Arbiter único
        ↓
  routeOrionCommand()
        ├─ comando local de visão -> start/stop camera
        ├─ frame local -> HF + YOLO + MediaPipe
        ├─ resumo visual -> memória/RAG/contexto
        ├─ Gemini visão -> só quando necessário
        ├─ Orion cognition -> decisão final
        └─ Gemini TTS -> fala
```

- A voz já está em Gemini TTS; não precisa reescrever isso.
- O maior conserto é impedir que “ativar visão” chegue na LLM antes de chegar no roteador local.
- O texto do print deve desaparecer quando o backend parar de empurrar `[SEM VISÃO]` em estados transitórios.

Validação após implementar

- Hard reload da `/consulta`.
- Confirmar que só existe 1 instância ativa de `SpeechRecognition` por vez.
- Dizer “Orion” -> ele acorda sem spam de `aborted`.
- Dizer “ativar visão” -> câmera liga imediatamente, sem resposta do tipo “não tenho visão”.
- Com câmera ativa, perguntar “o que você está vendo?” -> resposta usa HF/visão local + contexto do Orion.
- Testar entrada por `initialCommand` / `autoCommand` para garantir que “ativar visão” não cai mais em `askAI`.
- Testar HMR com a página aberta para confirmar que o arbiter mata a instância velha e evita duplicata.