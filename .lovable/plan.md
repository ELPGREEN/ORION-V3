

# Plano: Capacidades "Opera AI" para o Orion

## Resumo

Adicionar 4 capacidades ao chat do Orion que replicam funcionalidades do Opera AI, usando infraestrutura já existente (Firecrawl, YouTube API key, Gemini keys).

## Arquitetura

```text
Usuário digita no chat
        │
        ▼
orion-ai-client.ts (detect intent client-side)
        │
        ▼
neural-ops/index.ts (handleOrionQuery)
        │
   ┌────┴────┬──────────┬──────────────┐
   ▼         ▼          ▼              ▼
Web Search  URL Scrape  YouTube Sum  Image Gen
(firecrawl) (firecrawl) (YT API+LLM) (Gemini 3)
   │         │          │              │
   └────┬────┴──────────┴──────────────┘
        ▼
  Inject context into Gemini prompt → Stream response
```

## Mudanças

### 1. `supabase/functions/neural-ops/index.ts`

**A. Web Search automático** (dentro de `buildOrionMessages`)
- Adicionar `detectWebSearchIntent(query)` — regex para "hoje", "atual", "notícia", "preço de", "quem é", "quando", "onde fica", datas recentes
- Se detectado, chamar `firecrawl-search` inline (via fetch ao próprio Supabase) e injetar resultados no system prompt como contexto
- Timeout de 3s para não bloquear a resposta

**B. URL Context Analysis** (dentro de `buildOrionMessages`)
- Detectar URLs na query com regex `https?://\S+`
- Para cada URL (max 2), chamar `firecrawl-scrape` inline
- Injetar markdown scraped no contexto (truncado a 4000 chars por URL)

**C. YouTube Summarization** (dentro de `buildOrionMessages`)
- Detectar links YouTube (`youtube.com/watch`, `youtu.be/`)
- Extrair video ID, chamar YouTube Data API v3 para captions/snippet
- Injetar transcript no contexto para Gemini resumir
- Usar `YOUTUBE_API_KEY` (já existe nos secrets)

**D. Image Generation** (novo action handler no main router)
- Novo `action === "generate_image"` no handler principal
- Usar Gemini `gemini-2.0-flash-exp` com `responseModalities: ["IMAGE"]`
- Retornar base64 da imagem gerada
- Client detecta intent de geração de imagem ("gere uma imagem", "crie uma imagem", "desenhe")

### 2. `src/lib/neural/orion-ai-client.ts`

- Adicionar detecção de intent no client para marcar:
  - `intentType: "web_search"` — queries factuais/atuais
  - `intentType: "url_analysis"` — quando query contém URL
  - `intentType: "youtube_summary"` — quando query contém link YouTube
  - `intentType: "image_generation"` — quando query pede geração de imagem
- Para image generation: chamar neural-ops com `action: "generate_image"` em vez do fluxo normal de streaming

### 3. Nenhuma mudança na VM

A VM não é necessária para estas features — tudo passa pelas edge functions e APIs existentes.

## Ordem de implementação

1. Web Search no chat (maior impacto)
2. URL context analysis
3. YouTube summarization  
4. Image generation

## Detalhes técnicos

- Web search e URL scrape são injetados **antes** do LLM call, como contexto adicional no system prompt
- YouTube captions usam endpoint `https://www.googleapis.com/youtube/v3/captions` + download
- Image generation usa modelo diferente do texto — precisa de request separado
- Todos os fetches paralelos têm timeout de 3s para não degradar latência
- Citations/fontes são incluídas na resposta para o usuário ver as referências

