# PROMPT PARA O LOVABLE — VERIFICAR END-TO-END SUPABASE + FRONTEND

## Objetivo
Verificar se o ORION-V3 está 100% funcional no Lovable após o sync do GitHub. Testar Supabase (Auth, DB, Edge Functions) e Frontend (React/Vite).

## Contexto
- Repositório: `ELPGREEN/blank-canvas-magic-040-c1c0e681` (Lovable)
- Sync: `ORION-V3 (ELPGREEN) → Lovable (automático via GitHub Actions)`
- Branch: `main`
- Commit mais recente: `6e59cb57` - feat: complete NeuralVision split

---

## 1. VERIFICAÇÕES DE SUPABASE (Backend)

### 1.1 Conexão Básica
```
Verifique se o projeto Supabase está conectado corretamente:
- URL: https://zyhcymzwlfbcddphemk.supabase.co
- Chaves: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no Lovable

Teste: Tente fazer login com um usuário existente.
Se der erro de CORS → verifique se o domínio do Lovable está na lista de "Authorized URLs" no Supabase.
```

### 1.2 Auth (Autenticação)
```
1. Teste login com email/senha
2. Teste fluxo "Esqueceu a senha"
3. Verifique se o RLS (Row Level Security) está ativo nas tabelas críticas:
   - neural_config
   - agent_logs
   - user_preferences
4. Confira se os policies permitem SELECT/INSERT para usuários autenticados
```

### 1.3 Banco de Dados
```
Execute no SQL Editor do Supabase:
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;

Verifique se as migrations em supabase/migrations/ foram aplicadas:
- Tabelas necessárias: profiles, neural_config, agent_logs, etc.
- Se faltar alguma tabela → rode a migration faltante no SQL Editor
```

### 1.4 Edge Functions
```
Liste as Edge Functions no Supabase Dashboard:
- orion-mcp
- analyze-document
- outflux-proxy
- revolutionary-agent
- neural-orchestrator

Teste: curl -X POST https://zyhcymzwlfbcddphemk.supabase.co/functions/v1/orion-mcp \
  -H "Authorization: Bearer <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'

Resposta esperada: {"status": "ok", "openrouter": true}
```

---

## 2. VERIFICAÇÕES DE FRONTEND (React/Vite)

### 2.1 Build e Dev Server
```
1. Verifique se o Lovable consegue fazer build sem erros:
   - Se o build falhar com "out of memory" → adicione no Lovable settings:
     NODE_OPTIONS=--max_old_space_size=4096

2. Teste o dev server no Lovable:
   - Abra o preview
   - Verifique se carrega em http://localhost:8080 (ou URL do Lovable)
   - Console deve estar limpo (sem erros vermelhos)
```

### 2.2 Componentes Principais
```
Teste os seguintes componentes (clique/navegue):
☑ Dashboard principal → /dashboard
☑ NeuralVision → /dashboard/neural (câmera, voice, PiP, HUD)
☑ Chat IA → /dashboard/chat
☑ Vision → /dashboard/vision
☑ Documentos → /dashboard/documents
☑ Configurações → /dashboard/settings

Cada página deve:
- Carregar sem erro no console
- Mostrar dados do Supabase (se aplicável)
- Ter botões/cliques responsivos
```

### 2.3 NeuralVision (Componente Crítico)
```
O NeuralVision foi SPLITado em 4 módulos. Verifique:
1. Câmera ativa? (permissão do navegador)
2. Microfone ativo? (escuta contínua)
3. PiP (Picture-in-Picture) aparece quando câmera liga?
4. HUD esquerdo (Consciência, Stats, Controle, Visão, Modo, Objetos)
5. HUD direito (Raciocínio, Pipeline, SuperNet, Chat)
6. Plasma Core animado no centro
7. Comandos de voz funcionam? (diga "Orion, o que você vê?")

Se der erro → abra o Console (F12) e procure por:
- "NeuralVisionContainer" errors
- "useNeuralVisionHandlers" errors
- "OrionStandalonePanel" errors
```

### 2.4 Supabase Realtime
```
Teste se o Realtime funciona:
1. Abra duas abas do navegador
2. Faça uma ação no Dashboard (ex: alterar config)
3. A outra aba deve atualizar automaticamente (se usar subscriptions)
```

---

## 3. VERIFICAÇÕES DE INTEGRAÇÃO

### 3.1 OpenRouter (LLM Providers)
```
Teste os modelos gratuitos:
1. Vá em Configurações → LLM Providers
2. Teste um chat com: "Olá, quem é você?"
3. Verifique se os modelos carregam:
   - openrouter/free
   - deepseek/deepseek-r1
   - qwen/qwen3-coder-480b
   - meta-llama/llama-3.3-70b-instruct

Se der erro 401/403 → verifique OPENROUTER_API_KEY no Lovable Secrets
```

### 3.2 Web Search (OpenRouter Plugin)
```
Teste busca na web:
1. No chat, digite: "pesquisar na web modelos de linguagem 2026"
2. Deve ativar o plugin de web search via OpenRouter
3. Resultado deve mostrar fontes/URLs

Verifique se o modelo suporta web search:
- deepseek/deepseek-r1: sim
- qwen/qwen3-coder-480b: sim
```

### 3.3 Pentagon Architecture
```
Teste o fluxo cognitivo:
1. Digite: "analisar sentimento deste texto: Estou muito feliz!"
2. Verifique no console se aparece:
   [CORTEX] Transitioning: idle -> perceiving
   [CORTEX] Transitioning: perceiving -> remembering
   [CORTEX] Transitioning: remembering -> reasoning
   [CORTEX] Transitioning: reasoning -> acting
   [CORTEX] Transitioning: acting -> evaluating
   [CORTEX] Transitioning: evaluating -> idle
```

---

## 4. CHECKLIST FINAL (Copie e cole no Lovable)

```
SUPABASE:
☑ Conexão OK (login funciona)
☑ Auth OK (RLS ativo)
☑ DB OK (tabelas existem)
☑ Edge Functions OK (orion-mcp responde)

FRONTEND:
☑ Build OK (sem erros)
☑ Dev Server OK (preview funciona)
☑ Dashboard carrega
☑ NeuralVision carrega (câmera + HUD)
☑ Chat IA responde
☑ Documentos carregam

INTEGRAÇÕES:
☑ OpenRouter funciona (modelos livres)
☑ Web Search ativa (quando solicitado)
☑ Pentagon Architecture executa ciclo completo
☑ Voice (microfone) ativo e responde

SE ALGO FALHAR:
1. Copie o erro do Console (F12)
2. Verifique a aba "Network" no F12 (requests vermelhas = erro)
3. Confira as Secrets no Lovable (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, OPENROUTER_API_KEY)
4. Verifique o Supabase Dashboard (Auth → Users, Database → Tables)
```

---

## 5. COMANDOS PARA TESTAR NO CHAT DO ORION

```
1. "Orion, o que você vê?" (se câmera ativa)
2. "pesquisar na web Quantum Computing 2026"
3. "comparar fontes sobre inteligência artificial"
4. "sugestões de busca para robótica"
5. "ativar modo reasoning"
6. "qual sua configuração neural?"
7. "testar conexão Supabase"
```

---

## 6. SE DER ERRO DE BUILD NO LOVABLE

```
O Lovable tem limite de memória. Se o build falhar:

1. Adicione no Lovable Environment Variables:
   NODE_OPTIONS=--max_old_space_size=4096

2. Ou faça build local e tire o Vite de tentar comprimir:
   No vite.config.ts, adicione:
   build: {
     minify: false, // temporário para teste
   }

3. Verifique se os imports estão corretos:
   - NeuralVisionContainer deve importar de "./NeuralVisionContainer"
   - orion-ai-client agora é um diretório (orion-ai-client/index.ts)
```

---

## 7. RELATÓRIO FINAL (Responda isso para o usuário)

```
✅ SUPABASE: [OK/ERRO] - [detalhes]
✅ FRONTEND: [OK/ERRO] - [detalhes]
✅ INTEGRAÇÕES: [OK/ERRO] - [detalhes]
✅ NEURAL VISION: [OK/ERRO] - [detalhes]

ERROS ENCONTRADOS:
1. [erro 1]
2. [erro 2]

PRÓXIMOS PASSOS:
1. [passo 1]
2. [passo 2]
```

---

**Enviar este prompt para o Lovable após o sync ser concluído (verifique se o commit `6e59cb57` aparece no repositório do Lovable).**
