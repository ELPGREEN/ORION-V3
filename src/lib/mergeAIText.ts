/**
 * mergeAIText — Merges AI-generated text into original HTML,
 * preserving all inline styles (font-family, font-size, color,
 * line-height, text-align, margin-left, etc.)
 *
 * Strategy: Extract the style attributes from each block element
 * in the original HTML, then re-apply them to the corresponding
 * blocks in the AI output. This guarantees text changes without
 * formatting loss.
 */

interface BlockStyle {
  tag: string;
  attrs: string; // full opening tag attributes (class, style, etc.)
}

/**
 * Extract ordered list of block-level element styles from HTML.
 */
function extractBlockStyles(html: string): BlockStyle[] {
  const styles: BlockStyle[] = [];
  // Match opening tags for block elements
  const regex = /<(p|h[1-6]|li|div|blockquote|pre|td|th)(\s[^>]*)?\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    styles.push({
      tag: match[1].toLowerCase(),
      attrs: match[2] || "",
    });
  }
  return styles;
}

/**
 * Get plain text from an HTML block for comparison.
 */
function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Re-apply original block styles to AI-generated content.
 * Matches blocks positionally — if AI added/removed blocks,
 * extra blocks keep AI styling, missing blocks are dropped.
 */
export function mergeAITextPreservingStyles(
  originalHtml: string,
  aiHtml: string,
): string {
  // If AI returned plain text (no HTML tags), wrap in paragraphs
  if (!/<(p|h[1-6]|div|li|ul|ol|table)\b/i.test(aiHtml)) {
    aiHtml = aiHtml
      .split(/\n{2,}/)
      .filter(b => b.trim())
      .map(b => `<p>${b.replace(/\n/g, "<br>")}</p>`)
      .join("");
  }

  const origStyles = extractBlockStyles(originalHtml);
  if (origStyles.length === 0) return aiHtml; // No blocks to preserve

  // Split AI HTML into block segments
  const blockRegex = /(<(?:p|h[1-6]|li|div|blockquote|pre|td|th)(?:\s[^>]*)?>)([\s\S]*?)(<\/(?:p|h[1-6]|li|div|blockquote|pre|td|th)>)/gi;
  
  let result = aiHtml;
  let blockIndex = 0;
  
  result = result.replace(blockRegex, (fullMatch, openTag: string, content: string, closeTag: string) => {
    // Extract the tag name from the AI opening tag
    const tagMatch = openTag.match(/<(p|h[1-6]|li|div|blockquote|pre|td|th)/i);
    const aiTag = tagMatch ? tagMatch[1].toLowerCase() : "p";
    
    if (blockIndex < origStyles.length) {
      const origStyle = origStyles[blockIndex];
      blockIndex++;
      
      // Use the original tag's attributes but keep AI's tag name
      // (AI might change h2 to p for structural reasons — respect that)
      // However, if orig was same tag type, preserve its attributes
      const useTag = origStyle.tag === aiTag ? origStyle.tag : aiTag;
      const useAttrs = origStyle.tag === aiTag ? origStyle.attrs : "";
      
      // Merge: if AI added inline styles for text-only changes, strip them
      // and use original's styles instead
      const aiStyleMatch = openTag.match(/style=\"([^\"]*)\"/i);
      const origStyleMatch = origStyle.attrs.match(/style=\"([^\"]*)\"/i);
      
      let finalAttrs = origStyle.attrs;
      
      // If AI introduced formatting styles, prefer original
      if (aiStyleMatch && origStyleMatch) {
        // Keep original style entirely
        finalAttrs = origStyle.attrs;
      } else if (aiStyleMatch && !origStyleMatch) {
        // AI added styles that didn't exist — strip them to preserve original look
        finalAttrs = origStyle.attrs;
      }
      
      return `<${useTag}${finalAttrs}>${content}</${useTag}>`;
    }
    
    // Extra blocks from AI (new content) — keep as-is
    blockIndex++;
    return fullMatch;
  });

  return result;
}

/**
 * Quick check if content has meaningful formatting to preserve.
 */
export function hasFormattingToPreserve(html: string): boolean {
  return /style=\"[^\"]*(?:font-family|font-size|line-height|text-align|color|margin-left)[^\"]*\"/i.test(html);
}
