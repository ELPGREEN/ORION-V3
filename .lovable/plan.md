

# Auditoria Completa: Orion Voice + Vision Pipeline

## Diagnóstico — 6 Problemas Críticos Identificados

### BUG 1: Loop infinito de SpeechRecognition "aborted" (CAUSA RAIZ DO ORION NÃO RESPONDER)
Existem **3 componentes** criando instâncias de SpeechRecognition ao mesmo tempo, competindo pelo microfone:
- `OrionGlobalListener.tsx` — monta nas páginas públicas (ex: `/solucoes/industria`), usa `rec.continuous = true`, sem Mic Arbiter
- `PublicOrionListener.tsx` — monta nas mesmas páginas públicas, TAMBÉM cria SpeechRecognition
- `GlobalOrionListener.tsx` — monta no dashboard

Na página atual (`/solucoes/industria`), **DOIS listeners estão rodando simultaneamente** (OrionGlobalListener + PublicOrionListener), cada um matando o outro em loop, gerando centenas de `[Voice] SpeechRecognition error: aborted` por minuto. O Mic Arbiter (`micArbiter.ts`) NÃO é usado por `OrionGlobalListener` nem por `PublicOrionListener`.

### BUG 2: CSP (Content Security Policy) bloqueando recursos essenciais
O `index.html` define um CSP via `<meta>` tag que está incompleto:
- `font-src`: falta `https://cdn.gpteng.co` (bloqueia fontes do Lovable)
- `connect-src`: falta `https://region1.google-analytics.com` e `https://media.roboflow.com`
- YOLO modelo bloqueado (`media.roboflow.com/onnx/yolov8n.onnx`)
- Firebase Storage CORS para Piper TTS (`pt_BR-faber-medium.onnx`) falha repetidamente

### BUG 3: THREE.js GridHelper com cores inválidas + Context Lost
`TronGridBackground.tsx` e `OrionBackground3D.tsx` passam cores com canal alpha (`#00bcd415`, `#D4AF3708`) que THREE.Color não suporta. Múltiplas instâncias de `<Canvas>` (R3F) na mesma página consomem todos os WebGL contexts disponíveis.

### BUG 4: Piper TTS retry infinito (CORS Firebase Storage)
`piperTTS.ts` tenta carregar o modelo `.onnx` de `firebasestorage.googleapis.com` repetidamente a cada 15s. CORS falha, mas o sistema continua tentando sem backoff permanente (apenas `MAX_FAILURES = 2` por sessão, mas o Firebase URL resolution retries independentemente).

### BUG 5: Supabase auth lock warnings
Múltiplos componentes competindo pelo client Supabase causam `Lock "lock:sb-..." was not released within 5000ms` — sintoma do excesso de componentes inicializando ao mesmo tempo.

### BUG 6: Orion não processa comandos por voz
Com a decisão "Orion só fala no overlay do Orion", os listeners públicos não deveriam existir. Mas como estão montados e roubando o mic, quando o usuário abre o Orion real (NeuralVision), o mic já está corrompido.

---

## Plano de Correção (Estabilidade → Velocidade → Equilíbrio)

### Passo 1: Eliminar listeners de voz duplicados nas páginas públicas
**Arquivos**: `src/components/OrionGlobalListener.tsx`, `src/components/PublicOrionListener.tsx`, `src/App.tsx`

- Remover `OrionGlobalListener` completamente (não é usado em nenhum layout, só importado para ser desabilitado)
- Modificar `PublicOrionListener` para NÃO criar SpeechRecognition. Manter apenas o orb visual como botão que navega para `/consulta` ou abre o dashboard Orion
- Isso elimina 100% dos loops de abort nas páginas públicas

### Passo 2: Corrigir CSP no index.html
**Arquivo**: `index.html`

Atualizar a meta tag CSP:
- `font-src`: adicionar `https://cdn.gpteng.co`
- `connect-src`: adicionar `https://region1.google-analytics.com https://media.roboflow.com`
- Isso desbloqueia YOLO, Analytics e fontes

### Passo 3: Corrigir cores THREE.js e reduzir Canvas instances
**Arquivos**: `src/components/ui/TronGridBackground.tsx`, `src/components/ui/OrionBackground3D.tsx`

- Trocar `#00bcd415` → `#00bcd4` e `#D4AF3708` → `#D4AF37` (sem alpha no hex)
- Usar `opacity` via material, não via cor hex com alpha

### Passo 4: Silenciar Piper TTS Firebase retry
**Arquivo**: `src/lib/tts/piperTTS.ts`

- Marcar `firebaseModelChecked = true` + `return null` imediatamente se CORS falhar uma vez. Não retentar o Firebase URL em sessões subsequentes
- Piper já é fallback — se Firebase CORS não funcionar, pular silenciosamente

### Passo 5: Otimizar fluxo de mic no NeuralVision/GlobalOrionListener
**Arquivos**: `src/components/dashboard/GlobalOrionListener.tsx`, `src/hooks/useNeuralVoice.ts`

- `GlobalOrionListener` (dashboard): já usa Mic Arbiter, mas precisa de `rec.continuous = false` (já implementado). Verificar que `restartAttemptsRef` funciona corretamente com backoff
- `useNeuralVoice`: o fluxo `speak → resumeSTT` já está correto. Garantir que `consecutiveAbortsRef` não acumula entre sessões TTS

### Passo 6: Camera híbrida (on-demand)
**Arquivo**: `src/components/dashboard/neural/NeuralVision.tsx`

- Não iniciar câmera automaticamente ao abrir overlay
- Câmera liga apenas quando: (a) comando "ativar visão", (b) clique no botão câmera, (c) a IA detecta que a pergunta precisa de análise visual
- Isso reduz carga de GPU e previne Context Lost

### Passo 7: Adiar preload de modelos pesados
**Arquivos**: `src/lib/neural/realtime-vision-engine.ts`, `src/lib/neural/hf-vision-gate.ts`

- `preloadAllVision()` no mount da NeuralVision: manter, mas só executar quando câmera for ativada (não no mount)
- `preloadHFVisionGate()`: executar lazy (quando primeira query visual chegar)
- Isso previne excesso de WebGL contexts e reduz tempo de boot

---

## Resultado Esperado
- Zero `SpeechRecognition error: aborted` nas páginas públicas
- Orion responde apenas no overlay/chat dedicado
- Câmera liga só quando necessário
- YOLO e MediaPipe funcionam sem bloqueio CSP
- TTS Gemini funciona sem interferência de Piper retry
- WebGL Context Lost eliminado

