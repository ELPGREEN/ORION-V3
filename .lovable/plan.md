
Objetivo da auditoria: atacar os 3 sintomas que você descreveu no Orion: visão lenta para responder “o que você está vendo”, microfone que não volta a ativar sozinho, e fala picotada por vírgulas/pontos.

1. Diagnóstico confirmado
- Visão “em tempo real” hoje não é realmente em tempo real:
  - `NeuralVision.tsx` só chama a análise remota em `frameCount % 60` e ainda usa cache de 4s em `detectRealTime()`.
  - `gemini-vision.ts` usa `supabase.functions.invoke("neural-ops")`, ou seja: espera a resposta completa.
  - `neural-ops` ainda monta contexto pesado para visão (RAG/web/url/etc.). Os logs mostram `RAG found 3 relevant KB entries`, o que é latência desnecessária para “descreva o que você vê”.
- O microfone realmente pode “morrer” após a fala:
  - Em `useOrionReasoning.ts`, a fila de fala usa `speak(batch, { skipMicToggle: true })`.
  - No fim da fila existe o comentário “Resume mic ONCE after all speech is done”, mas a retomada não foi implementada.
  - Resultado: o TTS termina, o STT não volta, e o wake word também não retorna porque `voiceActiveRef` continua ativo.
- A fala está fragmentada demais:
  - `analyzeFrameStreaming()` quebra a resposta por sentença e até por vírgula longa.
  - Isso gera várias chamadas pequenas de TTS. Os logs do `gemini-tts` mostram áudios de 12 e 13 caracteres, típico de fala picotada.
  - `geminiTTS.ts` ainda possui fallback oculto para `google-cloud-tts`, o que contradiz sua regra de “Gemini ou silêncio” e pode aumentar atraso.

2. Causas-raiz principais
- Gargalo 1: visão visual passa por pipeline de nuvem + prompt pesado mesmo quando a pergunta é só descritiva.
- Gargalo 2: o fluxo de resposta por streaming fala em pedaços pequenos.
- Bug 1: retorno do microfone após TTS está incompleto no fluxo principal da visão.
- Risco estrutural: existem múltiplos pontos de entrada de voz (`useNeuralVoice`, `useWakeWord`, `GlobalOrionListener`, `VoiceInputButton/useVoiceInput`) com comportamentos diferentes.

3. Plano de correção
Etapa A — Corrigir primeiro o bug crítico da escuta
- Em `src/components/dashboard/neural/useOrionReasoning.ts`:
  - implementar a retomada explícita do STT ao final da fila de fala;
  - garantir que isso aconteça tanto no fluxo com streaming quanto no fallback;
  - evitar estado “surdo” quando `skipMicToggle: true` for usado.
- Em `src/hooks/useNeuralVoice.ts`:
  - endurecer `resumeSTT()` e proteger contra corrida com wake word;
  - revisar `voiceActiveRef`/`listening` para que o wake word só reassuma quando realmente deve.
Resultado esperado: acabou o problema de ele falar e não voltar a ouvir.

Etapa B — Criar um fast path real para visão por voz
- Em `src/lib/neural/orion-ai-client.ts` e `supabase/functions/neural-ops/index.ts`:
  - adicionar um modo visual rápido para perguntas como:
    - “o que você está vendo?”
    - “descreva o que você vê”
    - “o que tem na minha frente?”
  - nesse modo, pular RAG, web search, URL scraping, contexto pesado e instruções desnecessárias;
  - enviar prompt mínimo, imagem atual e contexto visual estritamente necessário.
- Em `src/components/dashboard/neural/NeuralVision.tsx`:
  - quando a pergunta visual for explícita, capturar frame fresco imediatamente, sem depender do cache de 4s;
  - manter a detecção local como resposta instantânea/base e usar Gemini como refinamento detalhado.
Resultado esperado: resposta visual muito mais rápida e sem “ficar analisando pra sempre”.

Etapa C — Tirar a fala do modo “stop-start”
- Em `src/lib/neural/orion-ai-client.ts`:
  - parar de quebrar fala por vírgula longa;
  - emitir chunks de voz por blocos mais naturais, não microfrases;
  - manter resposta progressiva, mas com menos chamadas TTS.
- Em `src/components/dashboard/neural/useOrionReasoning.ts`:
  - aumentar o batching da fila de fala;
  - falar um bloco maior por vez, evitando 10 chamadas pequenas.
- Em `src/lib/tts/geminiTTS.ts`:
  - remover o fallback de `google-cloud-tts`;
  - deixar estritamente `Gemini TTS -> silêncio`.
Resultado esperado: voz mais contínua, menos pausas artificiais entre frases.

Etapa D — Consolidar a arquitetura de voz
- Definir um único comportamento canônico:
  - NeuralVision usa `useNeuralVoice` + `useWakeWord`;
  - Dashboard fora da visão usa `GlobalOrionListener`;
  - chats com `VoiceInputButton` ficam isolados e não devem interferir na visão.
- Revisar pontos que chamam `speakWithGeminiTTS` direto para alinhar política de silêncio e evitar comportamento inconsistente.
Resultado esperado: menos conflitos de microfone e menos regressão futura.

4. Arquivos que eu vou mexer
- `src/components/dashboard/neural/useOrionReasoning.ts`
- `src/hooks/useNeuralVoice.ts`
- `src/components/dashboard/neural/NeuralVision.tsx`
- `src/lib/neural/orion-ai-client.ts`
- `supabase/functions/neural-ops/index.ts`
- `src/lib/tts/geminiTTS.ts`

5. Detalhes técnicos da auditoria
- Evidência de fragmentação TTS: logs recentes do `gemini-tts` mostram requisições com 12 e 13 caracteres.
- Evidência de latência extra na visão: logs do `neural-ops` mostram busca RAG sendo executada antes de responder.
- Evidência do bug de escuta: o código comenta que vai retomar o microfone no fim da fila, mas essa chamada não existe.
- Evidência de pseudo “tempo real”: `detectRealTime()` hoje é remoto, com throttle + cache, então não pode responder como visão instantânea.

6. Validação após implementação
- Testar fluxo completo na visão neural:
  - “Orion”
  - “ativar visão”
  - “o que você está vendo?”
  - Orion responde
  - microfone reativa sozinho
  - novo comando é aceito sem tocar na tela
- Testar fala com frases longas contendo vírgulas e pontos.
- Testar repetição em desktop e mobile.
- Confirmar que, se Gemini TTS falhar, o sistema fica em silêncio sem fallback robótico.

Se você aprovar, eu implemento essa correção em ordem: 1) retorno do microfone, 2) fast path visual, 3) suavização do TTS, 4) consolidação final.
