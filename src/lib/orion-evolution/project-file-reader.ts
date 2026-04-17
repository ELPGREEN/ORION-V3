/**
 * ─── Project File Reader ───
 * Reads source files from the running Vite dev server / built bundle so Orion
 * can self-evolve without asking the user to paste code.
 *
 * Strategy:
 *  1. Try Vite raw import (`/src/...?raw`) — works in dev.
 *  2. Fallback to public path fetch.
 *  3. As a last resort, use import.meta.glob to access bundled sources.
 */

// Eagerly map every source file as raw text. Vite inlines this at build time,
// so it works in both dev and production previews.
const RAW_SOURCES = import.meta.glob("/src/**/*.{ts,tsx,js,jsx,css,json,md}", {
  query: "?raw",
  import: "default",
  eager: false,
}) as Record<string, () => Promise<string>>;

const PATH_REGEX = /(?:^|\s|["'`(])((?:src|supabase|public)\/[\w./-]+\.(?:tsx?|jsx?|css|json|md|sql|toml))/gi;

/** Normalize "src/App.tsx" → "/src/App.tsx" and fix common case issues. */
function normalizePath(raw: string): string {
  let p = raw.trim().replace(/^\.?\//, "");
  if (!p.startsWith("/")) p = "/" + p;
  // Common typo: "app.tsx" → "App.tsx"
  p = p.replace(/\/src\/app\.tsx$/i, "/src/App.tsx");
  return p;
}

/** Try every known path resolution to load a file as text. */
export async function readProjectFile(path: string): Promise<string | null> {
  const norm = normalizePath(path);

  // 1) Glob lookup (case-insensitive fallback)
  const direct = RAW_SOURCES[norm];
  if (direct) {
    try {
      return await direct();
    } catch {
      /* fall through */
    }
  }

  const lower = norm.toLowerCase();
  const matchKey = Object.keys(RAW_SOURCES).find((k) => k.toLowerCase() === lower);
  if (matchKey) {
    try {
      return await RAW_SOURCES[matchKey]();
    } catch {
      /* fall through */
    }
  }

  // 2) Vite dev raw fetch
  try {
    const res = await fetch(`${norm}?raw`, { cache: "no-store" });
    if (res.ok) {
      const text = await res.text();
      // Vite returns a JS module wrapping the raw string in dev — strip it.
      const m = text.match(/export default\s+("|')([\s\S]*)\1/);
      return m ? JSON.parse(`"${m[2]}"`) : text;
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
