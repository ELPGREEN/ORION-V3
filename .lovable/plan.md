
Objetivo

- Vou tratar seu pedido como: deixar um único arquivo dono real do microfone/STT.
- Não vou juntar a interface inteira num arquivo gigante; vou remover os reconhecedores paralelos e centralizar tudo no `src/hooks/useNeuralVoice.ts`, que hoje já é o STT principal mais completo.

Diagnóstico atual

- Hoje existem vários caminhos independentes de voz:
  - `src/components/dashboard/GlobalOrionListener.tsx` — wake word próprio + captura curta
  - `src/components/dashboard/neural/useWakeWord.ts` — wake word próprio
  - `src/hooks/useNeuralVoice.ts` — STT principal
  - `src/hooks/useVoiceInput.ts` — SpeechRecognition separado
  - `src/components/dashboard/neural/RobotVoiceCommands.tsx` — SpeechRecognition separado
  - `src/lib/neural/orion-orchestrator-exec.ts` — STT one-shot, aparenta estar órfão
- O conflito mobile vem principalmente da disputa entre `GlobalOrionListener`, `useWakeWord` e o STT principal.

Plano

1. Definir um único dono do mic/STT: `useNeuralVoice.ts`.
   - Preservo o pipeline principal que já funciona.
   - Levo para ele o controle de wake word/handoff, sem criar um segundo reconhecimento.

2. Criar uma instância compartilhada do engine.
   - Adicionar um contexto/provider fino só para compartilhar a mesma instância entre `GlobalOrionListener` e `NeuralVision`.
   - O provider não terá STT próprio; ele só expõe o engine único.

3. Unificar o fluxo em uma FSM só.
```text
wake-listening -> wake-detected -> command-active -> speaking -> resume
```
   - Mesmo owner, mesmo stream, sem `stop/start` entre wake word e comando.
   - Pausas curtas continuam no mesmo fluxo, sem reconectar mic.

4. Limpar `GlobalOrionListener.tsx`.
   - Remover toda lógica própria de `SpeechRecognition`.
   - Deixar só orb, permissões, overlay e chamadas para o engine compartilhado.

5. Remover `useWakeWord.ts`.
   - Migrar regex/estado útil para o engine único.
   - Eliminar restart loops duplicados.

6. Simplificar `NeuralVision.tsx`.
   - Tirar auto-starts e handoffs paralelos.
   - Consumir só o engine único para iniciar conversa, retomar escuta e tratar `initialCommand`.

7. Migrar os outros pontos independentes.
   - `useVoiceInput.ts` vira wrapper fino do engine único, sem `SpeechRecognition` próprio.
   - `RobotVoiceCommands.tsx` passa a usar o mesmo engine com callback específico.
   - `orion-orchestrator-exec.ts` perde o STT one-shot se continuar sem uso.

8. Manter apenas a infraestrutura compartilhada.
   - `src/lib/voice/micArbiter.ts` e `src/lib/voice/persistentMic.ts` ficam.
   - Eles continuam como base, mas só um engine vai mandar neles.

Validação

- Testar no mobile:
  - sem “tic-tic”
  - sem segundo `SpeechRecognition.start()` após wake word
  - wake word -> comando -> resposta -> volta à escuta
  - pausa natural de 2–4s sem cortar
- Validar também dashboard, overlay e `/consulta` usando o mesmo dono do microfone.

Arquivos principais afetados

- `src/hooks/useNeuralVoice.ts`
- `src/components/dashboard/GlobalOrionListener.tsx`
- `src/components/dashboard/neural/NeuralVision.tsx`
- `src/components/dashboard/neural/useWakeWord.ts` (remover)
- `src/hooks/useVoiceInput.ts`
- `src/components/dashboard/neural/RobotVoiceCommands.tsx`
- `src/lib/neural/orion-orchestrator-exec.ts` (se confirmado órfão)

Resultado esperado

- Um único dono real do STT/microfone.
- Fim da disputa entre wake word e STT principal.
- Menos barulho, menos reconexão, comportamento previsível no mobile.
