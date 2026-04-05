import DOMPurify from "dompurify";

/**
 * Sanitizes HTML content to prevent XSS attacks.
 * Uses DOMPurify with a permissive config suitable for legal documents.
 * FIX: XSS - Central sanitization utility (Audit C1)
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr", "div", "span",
      "strong", "b", "em", "i", "u", "s", "sub", "sup",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "a", "img",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class", "id", "style", "colspan", "rowspan",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

// Alias for backward compat
export const sanitizeHtml = sanitizeHTML;
