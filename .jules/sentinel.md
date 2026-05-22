## 2026-05-22 - [Enforced Tabnabbing Protection via DOMPurify Hook]
**Vulnerability:** Reverse Tabnabbing (accessing `window.opener` from a child window to redirect the parent window to a malicious site).
**Learning:** Developers often forget to add `rel="noopener noreferrer"` to external links with `target="_blank"`. Inline sanitization configurations across components were inconsistent, missing this protection in several places.
**Prevention:** Use a global `DOMPurify` hook to automatically inject security headers during sanitization, ensuring defense-in-depth across the entire application regardless of local component implementation.
