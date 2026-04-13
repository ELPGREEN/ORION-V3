

# Plano: Compreensão Inteligente de Linguagem Natural para o Orion

## Status: ✅ IMPLEMENTADO

### O que foi feito:

1. **Edge Function `classify-intent`** — Gemini Flash Lite com tool calling, rotação de 7 chaves, ~200-400ms
2. **`smart-intent-classifier.ts`** — Classificador unificado com regex fast-path (<1ms) + LLM fallback + cache local (TTL 5min)
3. **Voice Intent Dispatcher** — Atualizado com `classifyVoiceCommandSmart()` (async, usa LLM) e `classifyVoiceCommand()` (sync, regex-only)
4. **Agentic Loop** — `planPhase()` agora usa smart classifier antes do regex legado

### Arquitetura:
```
Fala → [Cache?] → [Regex <1ms?] → [Gemini Flash Lite ~300ms] → Intent + Params → Dispatcher
```

### Categorias suportadas:
navigation, search, media, youtube, spotify, legal, calendar, calculation, translation, time_date, crm, reporting, vision_describe, identity, explanation, humor, security, auto_construct, self_evolve, web_search, image_generation, general
