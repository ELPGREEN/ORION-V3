

# Auditoria Completa — Código Destruído vs Estado Funcional

## Diagnóstico

Depois de auditar todos os arquivos modificados nas últimas sessões, aqui está o que encontrei:

### O que está FUNCIONANDO corretamente agora
1. **micArbiter.ts** — Criado corretamente, singleton global unificado. Zero erros.
2. **useNeuralVoice.ts** — Integrado com micArbiter, cleanup de HMR, voiceActiveRef. Zero erros TS.
3. **useWakeWord.ts** — Integrado com micArbiter. Zero erros TS.
4. **NeuralVision.tsx** — routeOrionCommand() funciona, auto-boot/wake word lógica OK.
5. **neural-ops/index.ts** — `[VISÃO DISPONÍVEL — CÂMERA INATIVA]` já corrigido. Modelo `gemini-2.5-flash`.
6. **Build**: `tsc --noEmit` passa com zero erros. Dev server sem crashes.

### Problemas REAIS encontrados (o que está quebrando visão/voz/consciência)

**Problema 1: Modelo desatualizado no neural-ops**
O edge function usa `gemini-2.5-flash` (linha 449, 450, 1600) em vez do `gemini-2.5-flash-preview-09-2025` que o usuário especificou. Isso pode estar causando respostas inadequadas sobre capacidades, pois o modelo mais antigo pode não ter as mesmas instruções de sistema refinadas.

**Problema 2: HuggingFace BLOQUEADO pelo CSP do preview**
Os logs mostram repetidamente:
```
Fetch API cannot load https://huggingface.co/api/models?limit=1.
Refused to connect because it violates the document's Content Security Policy.
```
O `hf-connectivity.ts` tenta checar se HF está disponível, **falha sempre no preview Lovable** por causa do CSP. Resultado: `isHuggingFaceAvailable()` retorna `false` → `hf-vision-gate.ts` NUNCA carrega os modelos MobileNet → visão local HF fica 100% morta. A visão funciona SOMENTE no domínio publicado.

**Problema 3: Firebase Storage CORS bloqueado (Piper TTS)**
```
Access to XMLHttpRequest at 'firebasestorage.googleapis.com/.../pt_BR-faber-medium.onnx'
has been blocked by CORS policy
```
O Piper TTS tenta baixar o modelo ONNX do Firebase Storage, mas CORS bloqueia. Isso não afeta a voz principal (Gemini TTS funciona via edge function), mas gera spam de erros no console.

**Problema 4: Consciência (EnergyOrb) — score parece correto mas pode ficar baixo**
O score na EnergyOrb agora lê do `__orion_mic_arbiter__` e `__orion_last_rt_vision_ts__`. Sem câmera ativa, o score fica em ~15-25% (correto — câmera desligada). Com câmera + mic ativo, deve subir para 70-100%. Isso é comportamento esperado.

**Problema 5: Raciocínio do Orion usa reasoning do Gemini, não do Orion**
O sistema cognitivo local (`cognitiveRoute`, `buildCognitionContext`, `computeFreeEnergy`, `validateLogicalConsistency`) já existe e roda ANTES do LLM. MAS: o `gemini-2.5-flash` pode estar fazendo "thinking" interno (reasoning), o que consome tokens e latência desnecessários. O usuário pediu que o Gemini seja só percepção/voz e o raciocínio fique no pipeline Orion.

## Plano de Correção

### 1. Atualizar modelo Gemini no neural-ops
- Trocar `gemini-2.5-flash` para `gemini-2.5-flash-preview-09-2025` nas 3 constantes (linhas 449, 450, 1600)
- Adicionar `thinkingConfig: { thinkingBudget: 0 }` no request body para DESATIVAR o reasoning do Gemini (o raciocínio é do pipeline Orion, não do Gemini)
- Isso economiza tokens e faz o Gemini funcionar como perceptor puro

### 2. Corrigir HF Vision Gate para funcionar sem connectivity check
- Em `hf-connectivity.ts`: quando o fetch falha por CSP (preview), tratar como "disponível" em vez de "indisponível" — o download dos modelos HF é feito via `@huggingface/transformers` que usa CDN diferente do API endpoint
- Alternativa: fazer `isHuggingFaceAvailable()` retornar `true` quando no domínio publicado e o erro for CSP-related

### 3. Silenciar Firebase Storage CORS errors
- Em `piperTTS.ts`: adicionar try/catch mais robusto no download do modelo ONNX, sem logar repetidamente o mesmo erro

### 4. Desabilitar thinking budget no Gemini
- No body do request a `generativelanguage.googleapis.com`, passar `generationConfig.thinking_config.thinking_budget_tokens = 0` (Gemini 2.5 Flash API)
- Isso garante que o Gemini só faz percepção e voz, sem gastar tokens em raciocínio interno

### 5. Redeploy do neural-ops
- Após as mudanças, redeploy da edge function

## Arquivos a modificar
- `supabase/functions/neural-ops/index.ts` — modelo + thinking budget
- `src/lib/neural/hf-connectivity.ts` — fallback para CSP blocks
- `src/lib/tts/piperTTS.ts` — silenciar CORS errors repetidos

## O que NÃO precisa ser mexido (código está correto)
- `src/lib/voice/micArbiter.ts` — OK
- `src/hooks/useNeuralVoice.ts` — OK  
- `src/components/dashboard/neural/useWakeWord.ts` — OK
- `src/components/dashboard/neural/NeuralVision.tsx` — OK
- `src/components/dashboard/neural/EnergyOrb.tsx` — OK
- `src/components/dashboard/neural/useOrionReasoning.ts` — OK

