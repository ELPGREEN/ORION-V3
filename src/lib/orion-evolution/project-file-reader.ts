/**
 * ─── Project File Reader ───
 * Reads source files from the running Vite dev server so Orion can self-evolve
 * without asking the user to paste code.
 *
 * Important: we intentionally avoid `import.meta.glob("/src/**/*")` here,
 * because that forces Vite to index the entire source tree into the web bundle
 * and can blow up production builds on constrained environments.
 */

const PATH_REGEX = /(?:^|\s|["'`(])((?:src|supabase|public)\/[\w./-]+\.(?:tsx?|jsx?|css|json|md|sql|toml))/gi;

/** Normalize "src/App.tsx" → "/src/App.tsx" and fix common case issues. */
function normalizePath(raw: string): string {
  let p = raw.trim().replace(/^\.?\//, "");
  if (!p.startsWith("/")) p = "/" + p;
  p = p.replace(/\/src\/app\.tsx$/i, "/src/App.tsx");
  return p;
}

function unwrapRawModule(text: string): string {
  const match = text.match(/export default\s+("|')([\s\S]*)\1/);
  return match ? JSON.parse(`"${match[2]}"`) : text;
}

/** Try supported runtime strategies to load a file as text. */
export async function readProjectFile(path: string): Promise<string | null> {
  const norm = normalizePath(path);

  // Dev server raw fetch: works during local development and preview.
  try {
    const res = await fetch(`${norm}?raw`, { cache: "no-store" });
    if (res.ok) {
      return unwrapRawModule(await res.text());
    }
  } catch {
    /* ignore */
  }

  // Production fallback: if the caller exposes mirrored public files, allow them.
  try {
    const res = await fetch(norm, { cache: "no-store" });
    if (res.ok) {
      return await res.text();
    }
  } catch {
    /* ignore */
  }

  return null;
}

/** Extract every project-file path mentioned in a free-text prompt. */
export function extractMentionedPaths(text: string): string[] {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  PATH_REGEX.lastIndex = 0;
  while ((m = PATH_REGEX.exec(text)) !== null) {
    out.add(m[1]);
  }
  return [...out];
}

/**
 * Given a user prompt, auto-load all referenced files and return an enriched
 * prompt with the actual code embedded so the LLM never has to ask for it.
 */
export async function enrichPromptWithFiles(prompt: string, maxBytes = 60_000): Promise<string> {
  const paths = extractMentionedPaths(prompt);
  if (paths.length === 0) return prompt;

  const blocks: string[] = [];
  let used = 0;

  for (const p of paths) {
    const content = await readProjectFile(p);
    if (!content) {
      blocks.push(`### ${p}\n[arquivo não encontrado no bundle]`);
      continue;
    }
    const remaining = maxBytes - used;
    if (remaining <= 0) {
      blocks.push(`### ${p}\n[omitido — limite de tamanho]`);
      continue;
    }
    const slice = content.length > remaining ? content.slice(0, remaining) + "\n…[truncado]" : content;
    used += slice.length;
    blocks.push(`### ${p}\n\`\`\`\n${slice}\n\`\`\``);
  }

  return `${prompt}\n\n---\nConteúdo dos arquivos referenciados (carregado automaticamente — NÃO peça novamente ao usuário):\n\n${blocks.join("\n\n")}`;
}
