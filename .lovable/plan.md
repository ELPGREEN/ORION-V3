# Plano: Compreensão Inteligente de Linguagem Natural para o Orion

## O Problema Atual

depois que eu termino de falar ele demora mais de4 segundo para falar ele deve falar em 1.5 segundo menos tempo 

O Orion hoje classifica comandos de voz usando **regex estático** — ele procura palavras-chave exatas como "abrir", "procurar", "calcular". Se você falar de um jeito diferente ("me mostra aquele negócio lá do youtube"), ele não entende porque nenhum regex bate.

Existem **3 classificadores separados** fazendo a mesma coisa de formas diferentes:

- `voice-intent-dispatcher.ts` → regex para comandos de voz
- `orion-agentic-loop.ts` → regex para o loop agêntico  
- `orion-ai-client.ts` → regex para classificação visual/textual

Nenhum deles "pensa" — todos são pattern matching simples.

## A Solução

Adicionar uma **camada de compreensão semântica** usando o Gemini (grátis) quando os regex falham. O fluxo ficaria:

```text
Fala do usuário
    │
    ▼
[1] Regex rápido (< 1ms) ── match? ──▶ Executa direto
    │ não
    ▼
[2] Gemini Flash Lite via Edge Function (~300ms)
    "Classifique esta intenção em uma das categorias: 
     navigation, search, media, legal, calendar, etc."
    │
    ▼
[3] Retorna intent estruturado + parâmetros extraídos
    │
    ▼
[4] Executa normalmente pelo dispatcher
```

## O Que Será Feito

### 1. Nova Edge Function: `classify-intent`

- Recebe o texto do usuário
- Usa Gemini Flash Lite (grátis, rápido) com tool calling para retornar JSON estruturado
- Prompt curto e direto: lista as categorias possíveis, pede para classificar e extrair parâmetros
- Resposta em ~200-400ms

### 2. Classificador Inteligente Unificado (`smart-intent-classifier.ts`)

- Tenta regex primeiro (instantâneo)
- Se confiança < 0.7, chama a edge function
- Cache local de classificações recentes (mesma frase = mesmo resultado)
- Substitui os 3 classificadores espalhados

### 3. Prompt de Classificação (o que você pediu)

O prompt será algo como:

```
Você é um classificador de intenções do assistente Orion.
Dado o texto do usuário, retorne a categoria e os parâmetros.

Categorias: navigation, search, media, youtube, spotify, legal, 
calendar, calculation, translation, time_date, crm, reporting, 
vision_describe, identity, explanation, humor, general

Exemplos:
- "me mostra uns vídeos legais" → media, {query: "vídeos legais", platform: "youtube"}
- "quanto tá o dólar hoje" → search, {query: "cotação dólar"}  
- "vai lá pros documentos" → navigation, {target: "documentos"}
- "toca um pagode aí" → media, {query: "pagode", platform: "spotify"}
```

### 4. Atualizar o Agentic Loop e Voice Dispatcher

- Trocar a classificação por regex pela chamada ao classificador unificado
- Manter regex como fast-path (não remover, apenas adicionar fallback)

## Detalhes Técnicos

- **Modelo**: Gemini Flash Lite (grátis, ~200ms)
- **Método**: Tool calling para output estruturado (não JSON livre)
- **Cache**: Map local com TTL de 5min para frases similares
- **Fallback**: Se Gemini falhar, usa classificação regex existente
- **Custo**: Zero (APIs Gemini gratuitas com rotação de 7 chaves)

## Resultado Esperado

Antes: "abre aquele negócio de música" → `general` (não entende)
Depois: "abre aquele negócio de música" → `media` com `{query: "música", platform: "spotify"}`

Antes: "dá uma olhada no que tem de novo" → `general`  
Depois: "dá uma olhada no que tem de novo" → `search` com `{query: "novidades"}`