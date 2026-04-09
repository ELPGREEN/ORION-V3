---
name: Centralized API Keys
description: user_api_keys table + get-api-keys edge function + UI panel for user-provided API keys with AES-256 encryption
type: feature
---
- Table `user_api_keys`: user_id, provider, encrypted_key, iv, is_active
- Edge Function `get-api-keys`: single collection point, user key priority > system fallback rotation
- UI: "Chaves API" tab in Configurações, all roles
- Providers: gemini, groq, openai, mistral, anthropic, huggingface
- Encryption: AES-256-GCM client-side (user-encryption.ts), decrypted server-side
- 36+ edge functions still use inline rotation — progressive refactoring needed to call get-api-keys
- No token counting (user explicitly rejected)
