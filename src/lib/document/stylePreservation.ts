/**
 * stylePreservation.ts — Extract and restore user inline styles
 * that AI responses may strip during content generation.
 */

interface StyleEntry {
  tagKey: string;     // e.g. "h1[0]", "p[3]"
  styles: string;     // raw inline style string
}

/** Extract inline styles from HTML elements, keyed by tag+index */
export function extractUserStyles(html: string): StyleEntry[] {
  const entries: StyleEntry[] = [];
  const tagCounts: Record<string, number> = {};

  const regex = /<(\w+)([^>]*?)>/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];

    const styleMatch = attrs.match(/style="([^"]*)"/i);
    if (styleMatch && styleMatch[1].trim()) {
      const idx = tagCounts[tag] || 0;
      tagCounts[tag] = idx + 1;
      entries.push({
        tagKey: `${tag}[${idx}]`,
        styles: styleMatch[1].trim(),
      });
    } else {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }

  return entries;
}

/** Reapply user styles to processed HTML where AI may have stripped them */
export function reapplyUserStyles(originalHtml: string, processedHtml: string): string {
  const originalStyles = extractUserStyles(originalHtml);
  if (originalStyles.length === 0) return processedHtml;

  // Build lookup by tagKey
  const styleMap = new Map<string, string>();
  for (const entry of originalStyles) {
    styleMap.set(entry.tagKey, entry.styles);
  }

  // Walk processed HTML and re-inject styles where missing
  const tagCounts: Record<string, number> = {};
  const result = processedHtml.replace(/<(\w+)((?:\s[^>]*)?)>/gi, (fullMatch, tag: string, attrs: string) => {
    const lowerTag = tag.toLowerCase();
    const idx = tagCounts[lowerTag] || 0;
    tagCounts[lowerTag] = idx + 1;

    const key = `${lowerTag}[${idx}]`;
    const originalStyle = styleMap.get(key);
    if (!originalStyle) return fullMatch;

    // Check if processed tag already has a style attribute
    if (/style="/i.test(attrs)) {
      // Merge: keep processed styles, add missing original ones
      return fullMatch.replace(/style="([^"]*)"/i, (_m, existing: string) => {
        const existingProps = new Set(
          existing.split(";").map((p) => p.split(":")[0]?.trim().toLowerCase()).filter(Boolean)
        );
        const originalParts = originalStyle.split(";").filter((p) => {
          const prop = p.split(":")[0]?.trim().toLowerCase();
          return prop && !existingProps.has(prop);
        });
        const merged = existing + (originalParts.length > 0 ? "; " + originalParts.join("; ") : "");
        return `style="${merged}"`;
      });
    }

    // No style in processed — inject original
    return `<${tag}${attrs} style="${originalStyle}">`;
  });

  return result;
}
