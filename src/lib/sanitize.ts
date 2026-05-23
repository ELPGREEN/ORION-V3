import DOMPurify from "dompurify";

// Add hook to enforce security on target="_blank" links
// This prevents reverse tabnabbing attacks
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if ("target" in node && node.getAttribute("target") === "_blank") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

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
      "strong", "b", "em", "i", "u", "s", "sub", "sup", "del", "mark",
      "ul", "ol", "li",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code",
      "a", "img", "article", "section",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "src", "alt", "width", "height",
      "class", "id", "style", "colspan", "rowspan", "title",
    ],
    ALLOW_DATA_ATTR: false,
  });
}

// Alias for backward compat
export const sanitizeHtml = sanitizeHTML;
