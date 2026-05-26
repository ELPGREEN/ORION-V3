# Sentinel Security Journal

## 2025-05-15 - [CRITICAL] Hardcoded Secrets and Unauthenticated Sensitive Bridge
**Vulnerability:** Discovery of hardcoded `MOTHER_ANON_KEY` (a Supabase anon key for a remote "mother" project) in multiple edge functions (`neural-child-bridge`, `stripe-api`). Additionally, the `neural-child-bridge` function was publicly accessible and contained actions like `expose_data` that allowed arbitrary table reads using a service role client.
**Learning:** Hardcoded keys were likely used for "temporary" cross-project communication but remained in the codebase. The bridge was designed for internal federation but lacked an authorization layer, assuming security via obscurity or limited knowledge of the endpoint.
**Prevention:** 1. Never hardcode keys; always use environment variables (`Deno.env.get`). 2. Implement explicit authorization checks (e.g., verifying `Authorization: Bearer <SERVICE_ROLE_KEY>`) for all administrative or cross-system bridge functions. 3. Regularly audit "bridge" or "proxy" functions that escalate privileges.
