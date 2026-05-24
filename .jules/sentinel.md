## 2024-05-23 - [Reverse Tabnabbing Protection]
**Vulnerability:** Reverse Tabnabbing (Audit C2) where malicious sites can take control of the parent window via `window.opener` when `target="_blank"` is used without `rel="noopener noreferrer"`.
**Learning:** Centralized sanitization is often bypassed by components using `DOMPurify` directly with local (and sometimes less secure) configurations.
**Prevention:** Implement a global `DOMPurify` hook (`afterSanitizeAttributes`) in the central sanitization utility to automatically enforce `rel="noopener noreferrer"` on all external links, regardless of the component's intent. Use a unified whitelist to prevent configuration drift.
