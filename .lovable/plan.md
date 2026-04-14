

# Auditoria Completa: Transcrição Duplicada + Comandos Não Executados

## Problemas Encontrados

### 1. GCP STT NÃO aplica deduplicação
A função `deduplicateRepeatedPhrases` só é chamada no path do Web Speech API (linha 748 de `useNeuralVoice.ts`). O GCP STT `onFinal` callback (linha 951) envia `text.trim()` diretamente para `onCmdRef.current` sem nenhuma deduplicação. Como o GCP STT é o path primário, a maioria das transcrições duplicadas passa direto.

### 2. `handleVoice` remove "ativar" de comandos
Linha 385: `.replace(/^(ativar?|ligar?|acordar?|oi|olá|e\s*aí)\s*/i, "")` transforma "ativar música do ACDC" em "música do ACDC". Isso pode afetar a classificação de intent.

### 3. Comandos caem em "passthrough" → IA genérica
Muitos intents classificados corretamente (ex: `general`, `explanation`, `humor`) caem no `default` do dispatcher que retorna `passthrough: true`. Depois, `routeOrionCommand` manda para `askAI`, que é conversacional e não executa ações. A IA genérica responde "não tenho acesso a reprodutores" ao invés de executar.

### 4. Regex "buscar música" fica DEPOIS do "search" genérico
Na lista `REGEX_RULES`, o regex de "buscar música" (linha 114) fica DEPOIS do search genérico (linha 120). Mas a iteração `for` no `regexClassify` executa na ordem do array — se "procurar música do ACDC" casa com o search genérico na linha 120 ANTES de chegar ao regex de mídia na 114... ESPERA — na verdade o regex de buscar-música (114) vem ANTES do search (120). Porém, o problema real é que "pesquisar ACDC" (sem "música") cai em `search` (busca interna) quando deveria ir para `web_search` ou `media`.

---

## Plano de Correção

### Arquivo 1: `src/hooks/useNeuralVoice.ts`
- **GCP STT onFinal** (linhas ~946-951): Aplicar `deduplicateRepeatedPhrases()` no texto ANTES de enviar para `onCmdRef.current`
- Adicionar guard de duplicata no próprio GCP callback (o `lastProcessedTranscriptRef` já existe mas a dedup de frases concatenadas não é aplicada)

### Arquivo 2: `src/components/dashboard/neural/NeuralVision.tsx`
- **handleVoice** (linha 385): NÃO remover "ativar" se a frase contém palavras de mídia (música, vídeo, etc.)
- Manter a remoção apenas para greetings ("ativar" sozinho, "ativar Orion")

### Arquivo 3: `src/lib/neural/smart-intent-classifier.ts`
- Adicionar regex para "pesquisar/buscar [algo]" genérico → `web_search` (não `search` interno) quando NÃO for mídia
- O search genérico (linha 120) deve mapear para `web_search` ao invés de `search` interno, pois o usuário quer pesquisar na internet, não no sistema

### Arquivo 4: `src/lib/neural/voice-intent-dispatcher.ts`
- No `media` extractor (linha 45-48): melhorar regex para capturar mais padrões ("buscar", "encontrar", "pesquisar" + query)
- Garantir que media query extraction funcione para todos os verbos

---

## Detalhes Técnicos

### Fix 1: Dedup no GCP STT
```typescript
// useNeuralVoice.ts, onFinal callback (~line 951)
const dedupedText = deduplicateRepeatedPhrases(text.trim());
onCmdRef.current(dedupedText);
```

### Fix 2: Proteger "ativar" em contexto de mídia
```typescript
// NeuralVision.tsx, handleVoice (~line 382-386)
let cleanedCommand = original
  .replace(/^\s*[óòôõo]r[iíìeéè][oóòôõ][nmn][\s,;:-]*/i, "")
  .replace(/^\s*oreo[nm][\s,;:-]*/i, "");
// Only strip "ativar/ligar" if NOT followed by media words
if (!/\b(ativar?|ligar?)\s+(?:m[uú]sica|v[ií]deo|som|can[çc])/i.test(cleanedCommand)) {
  cleanedCommand = cleanedCommand.replace(/^(ativar?|ligar?|acordar?|oi|olá|e\s*aí)\s*/i, "");
}
cleanedCommand = cleanedCommand.trim();
```

### Fix 3: search → web_search
```typescript
// smart-intent-classifier.ts, line 120
// Change "search" intent to "web_search" for generic searches
{ pattern: /\b(procur|busc|encontr|pesquis)\w*\s+/i, intent: "web_search", confidence: 0.85, ... }
```

### Fix 4: Media extractor abrangente
```typescript
// voice-intent-dispatcher.ts, media extractor (line 45-48)
media: (text) => {
  const match = text.match(/(?:tocar?|play|reproduz\w*|abr[aei]?r?|busc\w*|procur\w*|pesquis\w*|ouvir?|escutar?|assistir?|colocar?|encontr\w*)\s+(.+)/i);
  let query = match?.[1]?.trim() || text;
  // Strip media type words and prepositions
  query = query
    .replace(/^(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\s+/i, "")
    .replace(/^(?:d[oae]\s+|d[oa]\s+banda\s+|d[oa]\s+cantor\w*\s+|d[oa]\s+artista\s+|d[oa]\s+grupo\s+)/i, "")
    .replace(/^(?:qualquer\s+(?:uma?\s+)?(?:d[oae]\s+)?)/i, "")
    .trim();
  return { query: query || text, action: /\b(par[ae]|stop|paus)\b/i.test(text) ? "pause" : "play" };
},
```

### Resumo dos arquivos modificados
1. `src/hooks/useNeuralVoice.ts` — dedup no GCP STT onFinal
2. `src/components/dashboard/neural/NeuralVision.tsx` — proteger "ativar" em contexto de mídia
3. `src/lib/neural/smart-intent-classifier.ts` — search genérico → web_search
4. `src/lib/neural/voice-intent-dispatcher.ts` — media extractor mais abrangente

