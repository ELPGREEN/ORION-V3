# Sentinel Security Journal 🛡️

## 2025-05-22 - [Enhancement] Centralized HTML Sanitization & Link Security
**Vulnerability:** Inconsistent XSS protection across components and lack of Reverse Tabnabbing protection in user-generated HTML links.
**Learning:** Even with a central utility, components may drift and use direct library calls with different configurations, creating security gaps.
**Prevention:** Enforce use of central sanitization utility and implement global hooks to ensure security standards (like noopener/noreferrer) are applied consistently.
