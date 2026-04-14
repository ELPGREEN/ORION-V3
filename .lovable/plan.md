

# Auditoria Completa: Comandos de Voz do Orion

## Problemas Identificados

### Problema 1: "buscar música do ACDC" cai em `search` ao invés de `media`
O regex de `search` (`/\b(procur|busc|encontr|pesquis)\w*\s+/i`) na linha 114 do classifier tem prioridade sobre `media` porque "buscar" casa com `search` antes de chegar aos patterns de mídia. Resultado: o dispatcher chama `neural-search` (busca interna) ao invés de tocar música.

### Problema 2: Orion pergunta "qual música?" ao invés de tocar direto
Quando o intent cai como passthrough (vai pro AI), o Gemini responde conversacionalmente perguntando qual música. O log mostra: `"Eu sou um assistente de voz e não tenho acesso a reprodutores de música"` — o AI genérico não sabe executar ações.

### Problema 3: `web_search` não tem handler no dispatcher
O classifier classifica `web_search` corretamente (linha 150), mas no dispatcher esse intent cai no `default` → passthrough → AI genérico. Não há handler real para pesquisa web.

### Problema 4: Vídeo abre mas sem som
O VideoOverlay auto-minimiza em 1.5s (linha 42). O iframe YouTube com `autoplay=1` precisa de interação do usuário para tocar com som — política do browser. Ao minimizar, o player fica escondido e o som não sai.

### Problema 5: Deduplicação de transcrição ainda falha
O log mostra `"abrir qualquer música do ACDCabrir qualquer música do ACDC"` — palavras concatenadas passam pelo dedup.

---

## Plano de Correção

### 1. Reordenar regex: "buscar música" → media (não search)
**Arquivo**: `src/lib/neural/smart-intent-classifier.ts`
- Adicionar regex específico ANTES do search: `/\b(?:busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist)/i` → intent `media`
- Mover o regex de search para depois, com exclusão de contexto de mídia

### 2. Dispatcher: tratar `web_search` com pesquisa real
**Arquivo**: `src/lib/neural/voice-intent-dispatcher.ts`
- Adicionar `case "web_search"` que chama `pesquisa-unificada` ou `firecrawl-search` edge function
- Retornar resumo dos resultados ao invés de passthrough

### 3. Media: tocar imediatamente sem perguntar
**Arquivo**: `src/lib/neural/voice-intent-dispatcher.ts`
- No case `media`, melhorar a extração de query para pegar o nome do artista/banda diretamente
- Se o usuário diz "música do ACDC", a query deve ser "ACDC" (sem "música do")
- Se diz "buscar música do ACDC", query = "ACDC"
- Nunca fazer passthrough quando intent é `media` com query válida

### 4. Vídeo: não auto-minimizar, manter visível com som
**Arquivo**: `src/components/orion/VideoOverlay.tsx`
- Remover auto-minimize de 1.5s (linha 42, 47)
- Manter player visível e maximizado para garantir interação do usuário
- Adicionar `muted=0` no embed URL explicitamente

### 5. Melhorar deduplicação de STT
**Arquivo**: `src/hooks/useNeuralVoice.ts`
- Melhorar regex de concatenação para detectar frases inteiras duplicadas sem espaço (ex: "abrir música do ACDCabrir música do ACDC")

---

## Detalhes Técnicos

### Classifier — novo regex de mídia para "buscar"
```typescript
// ANTES do search rule (linha ~113):
{ pattern: /\b(?:busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o|playlist|álbum|album)\b/i, 
  intent: "media", confidence: 0.95, 
  extractParams: (t) => {
    const m = t.match(/(?:busc|procur|pesquis|encontr)\w*\s+(?:uma?\s+)?(?:m[uú]sica|v[ií]deo|som|can[çc][aã]o)\s+(?:d[oae]\s+)?(.+)/i);
    return { query: m?.[1]?.trim() || t, action: "play" };
  }
},
```

### Dispatcher — web_search handler
```typescript
case "web_search": {
  const { data, error } = await supabase.functions.invoke("pesquisa-unificada", {
    body: { query: params.query, sources: ["web"], max_results: 3 },
  });
  if (error) return fail(intent.intent, `Erro na pesquisa: ${error.message}`, t0);
  const results = data?.results?.slice(0, 3) || [];
  const summary = results.length > 0
    ? results.map((r: any, i: number) => `${i+1}. ${r.title}: ${r.snippet || ""}`).join(". ")
    : `Não encontrei resultados para "${params.query}".`;
  return ok(intent.intent, summary, { results }, t0);
}
```

### Arquivos modificados
1. `src/lib/neural/smart-intent-classifier.ts` — novo regex mídia "buscar", ajuste search
2. `src/lib/neural/voice-intent-dispatcher.ts` — handler web_search, melhorar extração media query
3. `src/components/orion/VideoOverlay.tsx` — remover auto-minimize
4. `src/hooks/useNeuralVoice.ts` — melhorar dedup de frases concatenadas

