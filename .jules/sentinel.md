# Sentinel's Journal 🛡️

## 2026-07-04 - [Centralized HTML Sanitization Pattern]
**Vulnerability:** Scattered use of `DOMPurify` with inconsistent configurations across the codebase. Some components lacked protection against "tabnabbing" (missing `rel="noopener noreferrer"` on `target="_blank"` links).
**Learning:** Having multiple sanitization points makes it difficult to audit and enforce a consistent security policy. Components were defining their own whitelists, leading to potential gaps or over-permissiveness.
**Prevention:** Standardized on a central `sanitizeHTML` utility in `src/lib/sanitize.ts`. Implemented a global `DOMPurify` hook to automatically inject security attributes (`rel="noopener noreferrer"`) into the DOM during sanitization. This ensures defense-in-depth even if developers forget to add the attribute manually.
