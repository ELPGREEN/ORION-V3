

# Integração Orion Extension + Vertex AI ADK Multi-Agent

## Análise do Sistema Atual

### Funcionalidades Implementadas
- **Widget flutuante** (content.js, 1003 linhas): orb draggable, painel com chat, quick actions, auto-minimize
- **YouTube PiP**: detecção automática de vídeo, minimização, Picture-in-Picture nativo
- **PDF/Image upload**: drag-and-drop, extração de texto (Tj/TJ parser), contexto mantido no chat
- **Análise de página**: extração DOM (headings, links, images, text), summarize/translate/analyze
- **Side Panel** (sidepanel.html/js): chat, ferramentas, notas, bookmarks, histórico, links
- **Background service worker** (778 linhas): auth cache, AI queries via neural-ops, vision capture, web search (Firecrawl), scraping, clipboard, downloads, bookmarks, history, TTS, notes
- **Popup** (popup.html/js): dashboard de 14 capacidades, quick links, atalhos
- **Persistência**: chrome.storage.local para chat, notas, projeto, wake word
- **Auth**: verificação via Supabase (token armazenado), owner bypass, premium check
- **Wake word "Orion"**: SpeechRecognition contínuo com comandos de voz

### Gargalos Identificados
1. **Single-agent monolítico**: todas as queries vão para `neural-ops` edge function (2950 linhas) — sem routing inteligente
2. **PDF parsing rudimentar**: extração via regex Tj/TJ, sem OCR real, sem tabelas estruturadas
3. **Sem paralelismo**: cada ação é sequencial (aguarda resposta antes de permitir outra)
4. **Contexto efêmero**: project context limitado a chrome.storage.local, sem persistência cross-session robusta
5. **Sem tool calling**: queries enviadas como texto puro para o LLM, sem structured outputs

## Arquitetura Proposta: Vertex AI ADK Multi-Agent

```text
┌─────────────────────────────────────────────────┐
│           CHROME EXTENSION (Frontend)            │
│  Widget Flutuante │ Side Panel │ Popup           │
│       ↓ tasks via chrome.runtime.sendMessage     │
└──────────────────┬──────────────────────────────┘
                   │ HTTPS
                   ▼
┌──────────────────────────────────────────────────┐
│     SUPABASE EDGE FUNCTION: orion-agent-hub      │
│  (Router/Dispatcher — classifica tarefa e        │
│   despacha para o agente certo no Vertex AI)     │
│                                                   │
│  task_type → agent_id mapping:                    │
│    "pdf_analysis"   → Research Agent              │
│    "page_summary"   → Content Agent               │
│    "web_search"     → Search Agent                │
│    "data_extract"   → Data Agent                  │
│    "general_chat"   → Orchestrator Agent          │
│    "academic"       → Academic Agent              │
└──────────────────┬──────────────────────────────┘
                   │ REST API
                   ▼
┌──────────────────────────────────────────────────┐
│         VERTEX AI AGENT ENGINE (GCP)              │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Orchestrator Agent (gemini-2.5-flash)      │ │
│  │  - Routes to sub-agents                     │ │
│  │  - Maintains conversation context           │ │
│  │  - AquaMonkey personality                   │ │
│  └────┬──────┬──────┬──────┬──────┬───────────┘ │
│       │      │      │      │      │              │
│  ┌────┴─┐┌───┴──┐┌──┴───┐┌┴────┐┌┴──────┐      │
│  │Resear││Conten││Search││ Data ││Academ.│      │
│  │  ch  ││  t   ││Agent ││Agent ││Agent  │      │
│  │Agent ││Agent ││      ││      ││       │      │
│  └──────┘└──────┘└──────┘└──────┘└───────┘      │
│                                                   │
│  Tools: Google Search, Sheets API, Drive API,     │
│         Code Execution, PDF parsing               │
└──────────────────────────────────────────────────┘
```

### Agentes Definidos

| Agent | Responsabilidade | Tools |
|-------|-----------------|-------|
| **Orchestrator** | Classifica intent, roteia, mantém contexto, personality | Todos via delegation |
| **Research Agent** | Papers, PDFs, análise profunda de documentos | Google Scholar grounding, PDF tool |
| **Content Agent** | Resumo/análise de páginas web, tradução | Google Search grounding |
| **Search Agent** | Pesquisa web inteligente com grounding | Google Search, Firecrawl |
| **Data Agent** | Extração estruturada, tabelas, Google Sheets | Sheets API, Code Execution |
| **Academic Agent** | Outlines, revisão literária, metodologia | Scholar grounding, Code Execution |

## Implementação Prática

### Novos Arquivos

1. **`supabase/functions/orion-agent-hub/index.ts`** — Edge function dispatcher
   - Recebe tarefas da extensão com `task_type` + `payload`
   - Classifica automaticamente se task_type não enviado (via Gemini Flash Lite rápido)
   - Chama Vertex AI Agent Engine REST API com a sessão do agente correto
   - Retorna resultado para a extensão
   - Mantém session_id para contexto persistente por usuário

2. **`extension/agents.js`** — Client-side agent dispatcher (novo módulo)
   - Mapeia ações do widget para task_types
   - Envia para `orion-agent-hub` em vez de `neural-ops` direto
   - Suporta respostas assíncronas (mostra "Agente Research analisando..." enquanto espera)

3. **Alterações em `extension/background.js`**
   - `handleAIQuery()` agora roteia via `orion-agent-hub` com task classification
   - PDF queries → `task_type: "pdf_analysis"`
   - Page analysis → `task_type: "page_summary"`
   - Web search → `task_type: "web_search"` (ainda via Firecrawl como fallback)
   - Adiciona `session_id` persistente por usuário (chrome.storage)

4. **Alterações em `extension/content.js`**
   - Quick actions enviam `task_type` explícito
   - Novo badge mostrando qual agente está processando
   - Respostas mostram `[Research Agent]` ou `[Content Agent]` como prefixo

5. **GCP Setup (manual pelo usuário)**
   - Criar agents via Vertex AI Agent Builder ou ADK CLI
   - Deploy no Agent Engine
   - Configurar OAuth service account
   - Armazenar credenciais como secrets no Supabase

### Edge Function: orion-agent-hub

Lógica principal:
- Autentica via Supabase JWT
- Classifica task_type se não enviado (Gemini Flash Lite, ~200ms)
- Monta request para Vertex AI Agent Engine REST API:
  ```
  POST https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/agents/{AGENT_ID}/sessions/{SESSION_ID}:chat
  ```
- Usa GCP service account key (stored as Supabase secret) para auth
- Retorna resposta formatada
- Fallback para neural-ops se Agent Engine falhar

### Secrets Necessários (Supabase)
- `GCP_SERVICE_ACCOUNT_KEY` — JSON da service account com permissão Vertex AI
- `GCP_PROJECT_ID` — ID do projeto (orion-d3734)
- `GCP_REGION` — us-central1 ou europe-west4

### Mudanças na Extensão

**background.js** — Novo routing:
- Detecta task type baseado em keywords/context
- Envia para `orion-agent-hub` com session_id
- Mantém fallback para `neural-ops`

**content.js** — UI improvements:
- Badge do agente ativo no painel ("🔬 Research" / "📝 Content")
- Loading state por agente
- Respostas prefixadas com nome do agente

## Restrições Respeitadas
- ZERO mudanças em STT/TTS/microfone/wake word
- Mantém toda a lógica de voz exatamente como está
- neural-ops continua funcionando como fallback

## Deploy Steps
1. Criar service account no GCP com papel `Vertex AI User`
2. Gerar JSON key, adicionar como secret `GCP_SERVICE_ACCOUNT_KEY` no Supabase
3. Criar agents no Vertex AI Agent Builder (ou via ADK Python SDK localmente)
4. Deploy agents no Agent Engine
5. Deploy edge function `orion-agent-hub`
6. Atualizar extensão (background.js routing + content.js badges)
7. Rebuild e empacotar extensão ZIP
8. Testar cada task_type individualmente

