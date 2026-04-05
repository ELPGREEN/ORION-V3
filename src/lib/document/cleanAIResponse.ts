/**
 * cleanAIResponse — Pipeline de 14 etapas para limpar respostas de IA
 * Converte markdown/texto bruto em HTML limpo para o editor Tiptap.
 */
export function cleanAIResponse(text: string): string {
  if (!text || typeof text !== "string") return "";
  let result = text.trim();

  // 1. Extrair HTML de ```html ... ``` (pega o ÚLTIMO bloco)
  const htmlBlocks = [...result.matchAll(/```html\s*([\s\S]*?)```/gi)];
  if (htmlBlocks.length > 0) {
    result = htmlBlocks[htmlBlocks.length - 1][1].trim();
  } else {
    // 2. Tentar blocos ``` genéricos com tags HTML
    const genericBlock = result.match(/```\s*([\s\S]*?)```/);
    if (genericBlock && genericBlock[1].includes("<")) {
      result = genericBlock[1].trim();
    }
  }

  // 3. Remover wrappers <html>, <head>, <body>, <!DOCTYPE>
  result = result.replace(/<\/?html[^>]*>/gi, "");
  result = result.replace(/<\/?head[^>]*>/gi, "");
  result = result.replace(/<\/?body[^>]*>/gi, "");
  result = result.replace(/<!DOCTYPE[^>]*>/gi, "");
  result = result.replace(/<meta[^>]*>/gi, "");
  result = result.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, "");
  result = result.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");

  // 4. Remover preâmbulo textual antes da primeira tag
  const firstTag = result.indexOf("<");
  if (firstTag > 0) {
    const preamble = result.substring(0, firstTag);
    if (!/[<>]/.test(preamble) && preamble.length < 500) {
      result = result.substring(firstTag);
    }
  }

  // 5. Remover trailing text após última closing tag
  const lastClose = result.lastIndexOf(">");
  if (lastClose >= 0 && lastClose < result.length - 1) {
    const trailing = result.substring(lastClose + 1);
    if (trailing.length < 300 && !trailing.includes("<")) {
      result = result.substring(0, lastClose + 1);
    }
  }

  // 6. Converter **bold** → <strong> (dotAll flag for multiline)
  result = result.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");

  // 7. Converter *italic* → <em>
  result = result.replace(/(?<![<\w])(\*)([^*]+?)\1(?![>\w])/g, "<em>$2</em>");

  // 8. Converter # headings → <h1>-<h6>
  result = result.replace(/^######\s+(.+)$/gm, "<h6>$1</h6>");
  result = result.replace(/^#####\s+(.+)$/gm, "<h5>$1</h5>");
  result = result.replace(/^####\s+(.+)$/gm, "<h4>$1</h4>");
  result = result.replace(/^###\s+(.+)$/gm, "<h3>$1</h3>");
  result = result.replace(/^##\s+(.+)$/gm, "<h2>$1</h2>");
  result = result.replace(/^#\s+(.+)$/gm, "<h1>$1</h1>");

  // 9. Converter --- → <hr>
  result = result.replace(/^---+$/gm, "<hr>");

  // 10. Converter > blockquote → <blockquote>
  result = result.replace(/^>\s+(.+)$/gm, "<blockquote>$1</blockquote>");

  // 11. Converter bullets e numbered → <li> + wrap em <ul>/<ol>
  // Separate numbered from unordered to use <ol> vs <ul>
  result = result.replace(/((?:^\d+\.\s+.+$\n?)+)/gm, (match) => {
    const items = match.trim().split("\n").map(line =>
      `<li>${line.replace(/^\d+\.\s+/, "").trim()}</li>`
    ).join("");
    return `<ol>${items}</ol>`;
  });
  result = result.replace(/((?:^[-*]\s+.+$\n?)+)/gm, (match) => {
    const items = match.trim().split("\n").map(line =>
      `<li>${line.replace(/^[-*]\s+/, "").trim()}</li>`
    ).join("");
    return `<ul>${items}</ul>`;
  });

  // 12. Converter tabelas markdown simples → <table>
  result = result.replace(/((?:^\|.+\|$\n?)+)/gm, (tableBlock) => {
    const rows = tableBlock.trim().split("\n").filter(r => r.trim());
    // Skip separator rows (|---|---|)
    const dataRows = rows.filter(r => !/^\|[\s\-:]+\|$/.test(r));
    if (dataRows.length === 0) return tableBlock;
    const htmlRows = dataRows.map((row, idx) => {
      const cells = row.split("|").filter(c => c.trim() !== "");
      const tag = idx === 0 ? "th" : "td";
      const cellsHtml = cells.map(c => `<${tag}>${c.trim()}</${tag}>`).join("");
      return `<tr>${cellsHtml}</tr>`;
    }).join("");
    return `<table>${htmlRows}</table>`;
  });

  // 13. Remover asteriscos soltos residuais
  result = result.replace(/(?<![<\w/])\*(?![>\w])/g, "");

  // 14. Wrap plain-text lines soltas em <p> se houver HTML ao redor
  if (result.includes("<") && !result.startsWith("<")) {
    result = result.split("\n").map(line => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^</.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    }).join("\n");
  }

  return result.trim();
}
