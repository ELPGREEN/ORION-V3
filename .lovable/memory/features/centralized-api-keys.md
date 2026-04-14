---
name: Centralized API Keys
description: user_api_keys table + get-api-keys edge function + UI panel for user-provided API keys with AES-256 encryption
type: feature
---
- Table `user_api_keys`: user_id, provider, encrypted_key, iv, is_active
- Edge Function `get-api-keys`: single collection point, user key priority > system fallback rotation
- UI: "Chaves API" tab in Configurações, all roles
- Providers: gemini, groq, openai, mistral, anthropic, huggingface, deepseek, openrouter
- Encryption: AES-256-GCM client-side (user-encryption.ts), decrypted server-side
- Claude (Anthropic) added as fallback in neural-inference, orion-produtor-ai, orion-advogado-ai
- Provider chain: Gemini → Claude → Mistral → Groq → HuggingFace
- No token counting (user explicitly rejected)
