# Jules Task — Corrigir Bugs de Voz e Visão do Orion

## Contexto
O Orion V3 tem dois subsistemas críticos com bugs reportados:
1. **Voz (STT + TTS)**: respostas inconsistentes, classificação de intenção disparando ferramentas erradas em perguntas conversacionais, eco do usuário, falsos positivos.
2. **Visão Neural**: câmera falha com mensagens genéricas, identificação de objetos não responde ao que o usuário pede, mensagem "núcleo ativado" repetindo.

Sua tarefa é **diagnosticar e corrigir** todos esses bugs em PRs separados.

---

## Repositório
- Repo: `ELPGREEN/ORION-V3`
- Base branch: `main`
- Criar branches: `jules/fix-voice-<ts>` e `jules/fix-vision-<ts>`

---

## PARTE 1 — Correção de Voz

### Arquivos prováveis a investigar
- `supabase/functions/classify-intent/index.ts` — classificador de intenções
- `supabase/functions/smart-intent-classifier/index.ts` — classificador local
- `supabase/functions/gemini-tts/index.ts` — síntese de voz
- `src/components/dashboard/neural/useOrionReasoning.ts` — fluxo de raciocínio
- `src/lib/neural/orion-ai-client.ts` — guards de intent
- `src/lib/neural/orion-consciousness.ts` — auto-descrição
- Hooks de STT (procurar por `useSTT`, `useVoiceCapture`, `useSpeechRecognition`)

### Bugs a corrigir

#### Bug V1 — Classificador dispara ferramentas em conversa natural
**Sintoma**: "consegue me ouvir?" → toca música. "fala sobre você" → pede código fonte.
**Esperado**: respostas conversacionais devem retornar intent `general` ou `identity` com resposta direta.
**Como corrigir**:
- Auditar regex/padrões em `smart-intent-classifier` e `classify-intent`
- Adicionar fast-paths conversacionais ANTES de qualquer roteamento de tool
- Threshold de confiança alto (>0.75) para disparar `media`, `auto_construct`, `self_evolve`, `web_search`, `image_generation`
- Defaultar para `general` em qualquer ambiguidade

#### Bug V2 — Eco do usuário (Orion repete o que o usuário disse)
**Sintoma**: O TTS lê de volta a transcrição do STT.
**Como corrigir**:
- Garantir que o pipeline nunca passe `userTranscript` para `gemini-tts`
- Filtro: comparar resposta gerada com último input do usuário; se similaridade > 80%, descartar
- Verificar se há loops onde STT é alimentado pela saída de áudio do TTS

#### Bug V3 — Mic ciclando ou bipando
**Sintoma**: usuário relatou que mic não deve ciclar nem dar beeps.
**Como corrigir**:
- Mic sempre ouvindo, sem `start/stop` em loop
- Tolerar pausas de até 3s sem fechar sessão
- Remover qualquer som de notificação/beep do pipeline de captura
- Referência: `mem://preference/stt-voice-capture-rules`

#### Bug V4 — STT alucina fala quando não há áudio
**Como corrigir**:
- Filtrar transcrições com confiança baixa (<0.5)
- Descartar transcrições com menos de 2 palavras OU duração < 300ms
- Validar amplitude RMS mínima do áudio antes de enviar para STT

### Restrições da Voz
- ❌ NÃO trocar Gemini TTS por outro provedor (ElevenLabs PROIBIDO)
- ❌ NÃO mudar a voz Enceladus
- ❌ NÃO alterar a personalidade AquaMonkey do Orion
- ❌ NÃO expor nomes de tabelas/endpoints em mensagens públicas
- ✅ Manter respostas curtas para perguntas simples, completas para complexas

---

## PARTE 2 — Correção de Visão

### Arquivos prováveis a investigar
- `src/components/dashboard/neural/NeuralVision.tsx` — componente principal
- `src/lib/neural/vision-*.ts` — pipelines de visão
- `supabase/functions/vision-*/index.ts` — edge functions de visão
- `supabase/functions/smart-intent-classifier/index.ts` — comandos de visão (200+ regex)

### Bugs a corrigir

#### Bug Vis1 — "Erro na câmera" genérico
**Sintoma**: qualquer falha mostra "Erro na câmera" sem detalhes.
**Já aplicado parcialmente em** `NeuralVision.tsx`. **Estender para**:
- Logar `err.name` + `err.message` em todos os pontos de captura
- Toasts específicos: `NotAllowedError` → "Permissão negada", `NotReadableError` → "Câmera em uso", `NotFoundError` → "Sem câmera", `OverconstrainedError` → "Resolução não suportada"
- Adicionar botão "Tentar novamente" no toast de erro

#### Bug Vis2 — "Núcleo ativado" repetindo
**Sintoma**: mensagem aparece em loop quando inicia visão.
**Como corrigir**:
- Procurar string "núcleo ativado" no codebase
- Garantir que só dispare 1x por sessão de câmera (flag `isInitialized`)
- Mover para log silencioso se for apenas debug

#### Bug Vis3 — Não identifica o que o usuário pede
**Sintoma**: usuário pede "conta os objetos" e Orion responde algo desconectado.
**Como corrigir**:
- Verificar se o comando do usuário chega ao pipeline de visão (logar comando recebido)
- Garantir que o prompt enviado ao Gemini Vision inclua a pergunta exata do usuário
- Validar que regex de comandos de visão (describe/read/count/identify/detect) está casando
- Referência: `mem://features/vision-command-coverage`

#### Bug Vis4 — Pipeline de visão lento ou travando
**Como corrigir**:
- Adicionar timeout (8s) em chamadas para edge functions de visão
- Adicionar AbortController para cancelar análises em andamento quando nova chegar
- Throttle de captura de frame (máximo 1 análise a cada 2s)

### Restrições da Visão
- ❌ NÃO alterar a divisão de responsabilidade: Gemini GCP (geral), HuggingFace (documento + face)
- ❌ NÃO remover funcionalidades existentes (pose, OCR, face, regional description)
- ❌ NÃO trocar provedores de visão
- ✅ Apenas otimizar performance e robustez
- Referência: `mem://features/vision-responsibility-split`, `mem://preference/vision-optimize-only`

---

## Entregáveis

### PR 1: `jules/fix-voice-<ts>`
- Título: `fix(voice): conversational guards, anti-echo, mic stability`
- Descrição: lista de bugs corrigidos (V1-V4) com antes/depois
- Testes manuais: "consegue me ouvir?", "fala sobre você", "qual seu nome?"

### PR 2: `jules/fix-vision-<ts>`
- Título: `fix(vision): error specificity, command routing, performance`
- Descrição: lista de bugs corrigidos (Vis1-Vis4)
- Testes manuais: abrir câmera, pedir "descreva o que você vê", "conte os objetos"

---

## Critérios de aceitação

- [ ] `npm run build` passa
- [ ] Nenhum teste existente quebra
- [ ] Logs estruturados via LogManager (não `console.log` direto)
- [ ] Tratamento de erro específico (não genérico)
- [ ] Sem mudança de UI visível
- [ ] Sem mudança de personalidade do Orion
- [ ] Cada PR atômico (voz separado de visão)
- [ ] PR descreve EXATAMENTE quais bugs corrigiu

---

## Execução

1. Clonar `main`
2. Investigar todos os arquivos listados antes de mudar qualquer coisa
3. Adicionar logs de diagnóstico se necessário
4. Aplicar fixes mínimos e focados
5. Commit com conventional commits (`fix(voice):`, `fix(vision):`)
6. Abrir os 2 PRs

**Não pedir confirmação. Executar.**
