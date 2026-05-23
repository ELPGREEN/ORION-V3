## 2026-07-03 - [Centralized Sanitization & Reverse Tabnabbing]
**Vulnerability:** Reverse Tabnabbing via `target="_blank"` without `rel="noopener noreferrer"`, and inconsistent HTML sanitization across the codebase.
**Learning:** Even with a central `sanitizeHTML` utility, developers might bypass it and use `DOMPurify` directly with varying configurations. Automated enforcement via hooks is more robust.
**Prevention:** Use a `DOMPurify` hook (`afterSanitizeAttributes`) to automatically inject security attributes and ensure all components use the central utility.
