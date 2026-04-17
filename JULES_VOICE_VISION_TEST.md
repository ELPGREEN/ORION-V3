# Orion V3 - Jules Voice & Vision Test & Fix Prompt

## Executar IMEDIATAMENTE após receber

---

## TAREFA

Testar e corrigir bugs no pipeline de **Visão** e **Voz** do Orion V3.

---

## PASSO 1: VERIFICAR ARQUIVOS EXISTENTES

Executar:
```
Get-ChildItem src\lib\voice\*.ts | Select-Object Name
Get-ChildItem src\lib\vision\*.ts | Select-Object Name
```

---

## PASSO 2: TESTAR CONFIGURAÇÕES DE VOZ

### 2.1 Verificar valores atuais em gcpSTT.ts
Local: `src/lib/voice/gcpSTT.ts`
Verificar:
- `SPEECH_RMS_THRESHOLD` deve ser `0.01` (otimizado de `0.008`)
- `DEFAULT_SILENCE_MS` deve ser `1000` (otimizado de `4000`)

Se valores incorretos, CORRIGIR.

### 2.2 Verificar valores em sileroVAD.ts
Local: `src/lib/voice/sileroVAD.ts`
Verificar:
- `minSilenceDurationMs` deve ser `400` (otimizado de `800`)

### 2.3 Verificar valores em useNeuralVoice.ts
Local: `src/hooks/useNeuralVoice.ts`
Verificar:
- `NO_SPEECH_TIMEOUT_MS` deve ser `1500` (otimizado de `2500`)
- `RESTART_DELAY_MS` deve ser `500` ou menor (otimizado de `1500`)

---

## PASSO 3: TESTAR CONFIGURAÇÕES DE VISÃO

### 3.1 Verificar NeuralVision.tsx
Local: `src/components/dashboard/neural/NeuralVision.tsx`
Verificar:
- `VISION_GEMINI_THROTTLE_MS` deve ser `1000` (otimizado de `6000`)
- `VISION_MEDIAPIPE_FRAMESKIP` deve ser `10` (otimizado de `30`)
- `VISION_SUPERNET_FRAMESKIP` deve ser `15` (otimizado de `30`)

### 3.2 Verificar .env
Local: `.env`
Verificar/Adicionar:
```
VITE_VISION_GEMINI_THROTTLE=1000
VITE_VISION_MEDIAPIPE_FRAMESKIP=10
VITE_VISION_SUPERNET_FRAMESKIP=15
```

---

## PASSO 4: CRIAR SCRIPT DE TESTE

Criar arquivo: `src/lib/voice/voice-latency-test.ts`

```typescript
/**
 * Voice Pipeline Latency Test Script
 * Run in browser console to measure actual latencies
 */

export function testVoiceLatency() {
  console.log('[VoiceTest] Starting latency test...');
  
  const results = {
    sttSilenceMs: 0,
    vadMinSilenceMs: 0,
    noSpeechTimeoutMs: 0,
    restartDelayMs: 0,
    expectedTotalMs: 0,
  };
  
  // Import actual values
  try {
    // These should match gcpSTT.ts DEFAULT_SILENCE_MS
    results.sttSilenceMs = 1000;
    results.vadMinSilenceMs = 400;
    results.noSpeechTimeoutMs = 1500;
    results.restartDelayMs = 500;
    results.expectedTotalMs = results.sttSilenceMs + 200; // + processing
  } catch (e) {
    console.error('[VoiceTest] Error reading config:', e);
  }
  
  console.log('[VoiceTest] Results:', results);
  console.log('[VoiceTest] Expected round-trip: ~' + results.expectedTotalMs + 'ms');
  
  return results;
}

export function testVisionLatency() {
  console.log('[VisionTest] Starting vision latency test...');
  
  const results = {
    geminiThrottleMs: 0,
    mediapipeFrameskip: 0,
    supernetFrameskip: 0,
    expectedFps: 0,
  };
  
  try {
    results.geminiThrottleMs = parseInt(import.meta.env.VITE_VISION_GEMINI_THROTTLE || '1000', 10);
    results.mediapipeFrameskip = parseInt(import.meta.env.VITE_VISION_MEDIAPIPE_FRAMESKIP || '10', 10);
    results.supernetFrameskip = parseInt(import.meta.env.VITE_VISION_SUPERNET_FRAMESKIP || '15', 10);
    results.expectedFps = Math.round(30 / results.mediapipeFrameskip);
  } catch (e) {
    console.error('[VisionTest] Error reading config:', e);
  }
  
  console.log('[VisionTest] Results:', results);
  console.log('[VisionTest] Expected detection FPS: ~' + results.expectedFps + ' Hz');
  
  return results;
}

// Auto-run on load
if (typeof window !== 'undefined') {
  (window as any).testVoiceLatency = testVoiceLatency;
  (window as any).testVisionLatency = testVisionLatency;
  console.log('[Test] Run testVoiceLatency() or testVisionLatency() in console');
}
```

---

## PASSO 5: VERIFICAR IMPORTS E DEPENDÊNCIAS

Executar:
```
Get-ChildItem src\lib\voice\voice-latency-optimizer.ts -ErrorAction SilentlyContinue
Get-ChildItem src\lib\vision\realtime-vision-optimizer.ts -ErrorAction SilentlyContinue
```

Se arquivos não existirem, criar com base no código fornecido anteriormente.

---

## PASSO 6: TESTAR NO NAVEGADOR

### Teste Manual - Voz:
1. Abrir Orion no navegador
2. Abrir DevTools (F12) → Console
3. Executar: `testVoiceLatency()`
4. Falar algo e cronometrar resposta
5. Se > 3 segundos, há problema

### Teste Manual - Visão:
1. Ativar câmera no Orion
2. Observar indicador de FPS (deve mostrar 20+ FPS)
3. Colocar objeto na frente da câmera
4. Verificar se é detectado em < 2 segundos

---

## PASSO 7: CORRIGIR PROBLEMAS COMUNS

### Problema: Voz lenta (STT)
**Sintoma:** Demora > 3 segundos para Orion responder
**Causa:** DEFAULT_SILENCE_MS muito alto
**Correção:**
```typescript
// Em gcpSTT.ts
const DEFAULT_SILENCE_MS = 1000; // Era 4000
```

### Problema: Visão lenta (Gemini)
**Sintoma:** Detecções demoram > 5 segundos
**Causa:** VISION_GEMINI_THROTTLE muito alto
**Correção:**
```typescript
// Em NeuralVision.tsx
const VISION_GEMINI_THROTTLE_MS = 1000; // Era 6000
```

### Problema: TTS lento
**Sintoma:** Orion começa a falar depois de longo delay
**Causa:** Texto muito longo ou rede lenta
**Correção:** Verificar conexão com Supabase Edge Functions

### Problema: VAD não detecta silêncio
**Sintoma:** STT fica esperando eternamente
**Causa:** minSilenceDurationMs muito alto
**Correção:**
```typescript
// Em sileroVAD.ts
minSilenceDurationMs: 400, // Era 800
```

---

## PASSO 8: VERIFICAR PIPELINE-LATENCY-TRACKER

Local: `src/lib/neural/pipeline-latency-tracker.ts`

Verificar se exporta:
- `markSTTStart()`
- `markSTTEnd()`
- `markTTSStart()`
- `markTTSEnd()`

Se não existir, criar:
```typescript
export function markSTTStart() {
  (window as any).__orion_stt_start = performance.now();
}

export function markSTTEnd() {
  const start = (window as any).__orion_stt_start;
  if (start) {
    console.log('[Latency] STT:', Math.round(performance.now() - start), 'ms');
  }
}

export function markTTSStart() {
  (window as any).__orion_tts_start = performance.now();
}

export function markTTSEnd() {
  const start = (window as any).__orion_tts_start;
  if (start) {
    console.log('[Latency] TTS:', Math.round(performance.now() - start), 'ms');
  }
}
```

---

## PASSO 9: REPORTAR RESULTADO

Reportar:

1. **Configurações de Voz:**
   - DEFAULT_SILENCE_MS: [valor]
   - SPEECH_RMS_THRESHOLD: [valor]
   - minSilenceDurationMs (VAD): [valor]
   - NO_SPEECH_TIMEOUT_MS: [valor]
   - RESTART_DELAY_MS: [valor]

2. **Configurações de Visão:**
   - VISION_GEMINI_THROTTLE_MS: [valor]
   - VISION_MEDIAPIPE_FRAMESKIP: [valor]
   - VISION_SUPERNET_FRAMESKIP: [valor]

3. **Latências Medidas:**
   - STT Latency: [ms]
   - LLM Latency: [ms]
   - TTS Latency: [ms]
   - Total Round-trip: [ms]

4. **Problemas Encontrados:**
   - Lista de bugs identificados

5. **Correções Aplicadas:**
   - Lista de correções feitas

---

## CRITÉRIOS DE SUCESSO

- [ ] Todos os valores otimizados estão corretos
- [ ] Arquivo voice-latency-optimizer.ts existe
- [ ] Arquivo realtime-vision-optimizer.ts existe
- [ ] Pipeline latency tracker está funcionando
- [ ] Latência de voz < 3 segundos
- [ ] FPS de visão >= 20
- [ ] Detecções de objetos < 2 segundos

---

## INSTRUÇÕES

1. **Executar TODOS os passos** na ordem
2. **Verificar valores** nos arquivos mencionados
3. **Corrigir** qualquer valor incorreto
4. **Testar manualmente** no navegador
5. **Reportar** resultados detalhados

**NÃO IGNORAR NENHUM PASSO**
