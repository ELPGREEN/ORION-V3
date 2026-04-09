

# Sistema Centralizado de Chaves API do Usuario

## Resumo
Criar tabela `user_api_keys` no Supabase, uma Edge Function unica `get-api-keys` que coleta chaves do usuario (prioridade) ou do sistema (fallback), e um painel UI para o usuario cadastrar suas chaves. Todas as 36+ edge functions passam a usar essa funcao central. Sem contagem de tokens visivel.

## Arquitetura

```text
Usuario → UI "Minhas Chaves" → Salva criptografado (AES-256)
                                     ↓
                           Tabela: user_api_keys
                           (user_id, provider, encrypted_key, iv, is_active)
                                     ↓
                Edge Function: get-api-keys (UNICA coleta)
                - Recebe user_id + provider
                - Busca chave do usuario → descriptografa server-side
                - Se nao tiver → rotacao das env vars do sistema
                - Retorna chave pronta
                                     ↓
                36+ edge functions importam helper getApiKey()
                em vez de duplicar ["GEMINI_API_KEY_GCP",...]
```

## Implementacao

### Passo 1: Migration — Tabela `user_api_keys`
```sql
CREATE TABLE public.user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- "gemini", "groq", "openai", etc.
  encrypted_key TEXT NOT NULL,
  iv TEXT NOT NULL,
  label TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own keys" ON public.user_api_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE UNIQUE INDEX idx_user_api_keys_provider ON public.user_api_keys(user_id, provider);
```

### Passo 2: Edge Function `get-api-keys`
Nova funcao que serve como ponto unico de coleta:
- Recebe `{ user_id, provider }` (ex: `"gemini"`)
- Busca na tabela `user_api_keys` chave ativa do usuario
- Se encontrar: descriptografa server-side (AES-256-GCM usando user_id como derivacao, mesma logica de `user-encryption.ts`)
- Se nao encontrar: faz rotacao das env vars do sistema (`GEMINI_API_KEY_GCP`, `GEMINI_API_KEY`, etc.)
- Retorna `{ key: string, source: "user" | "system" }`

### Passo 3: Helper compartilhado para Edge Functions
Criar arquivo helper que as 36+ functions importam:
- `supabase/functions/get-api-keys/index.ts` — a edge function publica
- Dentro de cada edge function existente, substituir o bloco `["GEMINI_API_KEY_GCP",...].map(...).filter(Boolean)` por uma chamada interna ao Supabase (usando service role) para buscar a chave do usuario, com fallback para env vars

Na pratica, como edge functions nao importam entre si facilmente, o padrao sera:
1. Cada edge function que recebe `authorization` header extrai o `user_id` do JWT
2. Faz um SELECT direto na tabela `user_api_keys` usando service role
3. Se encontrar chave ativa → usa ela (descriptografada)
4. Se nao → usa env vars do sistema (rotacao atual)
5. Isso sera um bloco de ~15 linhas que substitui o bloco duplicado atual

### Passo 4: UI — Painel "Minhas Chaves API"
Novo componente acessivel nas configuracoes do Orion:
- Lista de providers suportados: Gemini, Groq, OpenAI, Mistral
- Input mascarado (mostra so ultimos 4 chars)
- Botao "Validar" — testa a chave com chamada real antes de salvar
- Criptografa client-side usando `user-encryption.ts` existente antes de salvar
- Indicador visual: "Usando sua chave" vs "Usando chave do sistema"
- Sem contagem de tokens

### Passo 5: Refatorar edge functions prioritarias
Aplicar o novo padrao nestas functions primeiro (as mais usadas):
- `neural-ops` (hub central)
- `chat-juridico` (chat principal)
- `gemini-tts` (voz)
- `generate-embeddings` (embeddings)
- `groq-vision-hybrid` (visao)
- `ocr-document` (OCR)
- `ai-autocomplete` (autocomplete)
- `gerar-documento` / `aprimorar-documento` (documentos)

As demais seguem o mesmo padrao progressivamente.

## Seguranca
- AES-256-GCM client-side (chave derivada do user_id via PBKDF2, usando `user-encryption.ts`)
- Descriptografia server-side na edge function com service_role
- RLS: `auth.uid() = user_id`
- Chaves nunca em logs ou respostas

## Resultado
- Usuario com chave propria: sistema usa a chave dele
- Usuario sem chave: rotacao de 7 chaves do sistema (comportamento atual)
- Duplicacao de logica eliminada — uma unica funcao de coleta
- Sem contagem de tokens compartilhada

