#!/usr/bin/env node
/**
 * Generate public/sitemap.xml + public/robots.txt from src/lib/seo/public-routes.ts.
 *
 * Runs:
 *   - automatically on `vite build` (via vite-plugin in vite.config.ts)
 *   - manually with `node scripts/generate-sitemap.mjs`
 *
 * The script reads the routes file as text (no transpiler needed) and uses
 * tiny regex extraction so it works in pure Node without ts-node.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ROUTES_FILE = resolve(ROOT, "src/lib/seo/public-routes.ts");
const PUBLIC_DIR = resolve(ROOT, "public");
const TODAY = new Date().toISOString().slice(0, 10);

/** Map of route path → file that owns its content (for git-log fallback). */
const ROUTE_TO_FILE = {
  "/": "src/pages/Index.tsx",
  "/plataforma": "src/pages/Plataforma.tsx",
  "/servicos": "src/pages/Servicos.tsx",
  "/contato": "src/pages/Contato.tsx",
  "/investidor": "src/pages/InvestorTools.tsx",
  "/investidores": "src/pages/Investidores.tsx",
  "/escritorio": "src/pages/Escritorio.tsx",
  "/clientes": "src/pages/Clientes.tsx",
  "/pro-bono": "src/pages/ProBono.tsx",
  "/publicacoes": "src/pages/Publicacoes.tsx",
  "/depoimentos": "src/pages/Depoimentos.tsx",
  "/install": "src/pages/InstallApp.tsx",
  "/privacidade": "src/pages/Privacidade.tsx",
  "/termos": "src/pages/Termos.tsx",
  "/lgpd": "src/pages/LGPD.tsx",
};

/** Returns YYYY-MM-DD of the file's last git commit, or null if unavailable. */
function gitLastModified(relPath) {
  try {
    const abs = resolve(ROOT, relPath);
    if (!existsSync(abs)) return null;
    const out = execSync(`git log -1 --format=%cI -- "${relPath}"`, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    if (!out) return null;
    return out.slice(0, 10);
  } catch {
    return null;
  }
}

/**
 * Pull dynamic content dates from Supabase (e.g., latest published article).
 * Returns the most recent published_at across all articles, or null.
 */
async function fetchLatestArticleDate() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    const res = await fetch(
      `${url}/rest/v1/articles?select=published_at&is_published=eq.true&order=published_at.desc&limit=1`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const rows = await res.json();
    const iso = rows?.[0]?.published_at;
    return iso ? String(iso).slice(0, 10) : null;
  } catch {
    return null;
  }
}

function loadRoutes() {
  const src = readFileSync(ROUTES_FILE, "utf8");

  const baseMatch = src.match(/SITE_BASE_URL\s*=\s*"([^"]+)"/);
  const baseUrl = baseMatch ? baseMatch[1] : "https://www.iasofthub.com";

  const routes = [];
  // path + optional priority + optional changefreq + optional lastmod, in any order
  const objectRe = /\{\s*([^}]+?)\s*\}/g;
  const arrayMatch = src.match(/publicRoutes[^=]*=\s*\[([\s\S]*?)\];/);
  const scope = arrayMatch ? arrayMatch[1] : src;
  let m;
  while ((m = objectRe.exec(scope)) !== null) {
    const body = m[1];
    const path = body.match(/path:\s*"([^"]+)"/)?.[1];
    if (!path) continue;
    const priority = Number(body.match(/priority:\s*([\d.]+)/)?.[1] ?? "0.5");
    const changefreq = body.match(/changefreq:\s*"([^"]+)"/)?.[1] ?? "monthly";
    const lastmod = body.match(/lastmod:\s*"([^"]+)"/)?.[1];
    routes.push({ path, priority, changefreq, lastmod });
  }

  const disallow = [];
  const disallowMatch = src.match(/disallowedPaths[^=]*=\s*\[([\s\S]*?)\];/);
  if (disallowMatch) {
    const re = /"([^"]+)"/g;
    let dm;
    while ((dm = re.exec(disallowMatch[1])) !== null) disallow.push(dm[1]);
  }

  const bots = [];
  const botsMatch = src.match(/allowedBots[^=]*=\s*\[([\s\S]*?)\];/);
  if (botsMatch) {
    const re = /"([^"]+)"/g;
    let bm;
    while ((bm = re.exec(botsMatch[1])) !== null) bots.push(bm[1]);
  }

  return { baseUrl, routes, disallow, bots };
}

/**
 * Resolution order for each route's lastmod:
 *   1. Explicit `lastmod` in public-routes.ts
 *   2. Dynamic source (Supabase) for content-driven routes
 *   3. git log of the page file
 *   4. Today (last fallback)
 */
async function resolveLastmod(route, dynamicDates) {
  if (route.lastmod) return route.lastmod;
  if (route.path === "/publicacoes" && dynamicDates.latestArticle) {
    return dynamicDates.latestArticle;
  }
  const file = ROUTE_TO_FILE[route.path];
  if (file) {
    const git = gitLastModified(file);
    if (git) return git;
  }
  return TODAY;
}

function buildSitemap({ baseUrl, routes }) {
  const urls = routes
    .map(
      (r) => `  <url>
    <loc>${baseUrl}${r.path === "/" ? "/" : r.path}</loc>
    <lastmod>${r.lastmod}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function buildRobots({ baseUrl, disallow, bots }) {
  const allowBlocks = bots
    .map((b) => `User-agent: ${b}\nAllow: /\n`)
    .join("\n");
  const disallowLines = disallow.map((d) => `Disallow: ${d}`).join("\n");

  return `# Auto-generated by scripts/generate-sitemap.mjs — do not edit by hand.
${allowBlocks}
User-agent: *
Allow: /

${disallowLines}

Sitemap: ${baseUrl}/sitemap.xml
`;
}

/**
 * Validates the parsed public routes. Throws (failing the build) when:
 *   - any route contains a dynamic segment (`:id`, `*`, `(group)`)
 *   - any path is duplicated
 *   - any path does not start with "/"
 */
function validateRoutes(routes) {
  const errors = [];
  const seen = new Map();
  const dynamicRe = /[:*]|\(.*\)/;

  for (const r of routes) {
    if (typeof r.path !== "string" || !r.path.startsWith("/")) {
      errors.push(`• invalid path (must start with "/"): ${JSON.stringify(r.path)}`);
      continue;
    }
    if (dynamicRe.test(r.path)) {
      errors.push(
        `• dynamic segment not allowed in sitemap: "${r.path}" — remove or list concrete URLs`,
      );
    }
    // Canonical policy: trailing slash only on root, lowercase, no query/hash
    if (r.path !== "/" && r.path.endsWith("/")) {
      errors.push(
        `• trailing slash on non-root path: "${r.path}" — canonical policy forbids it`,
      );
    }
    if (r.path !== r.path.toLowerCase()) {
      errors.push(`• non-lowercase path: "${r.path}" — canonical policy requires lowercase`);
    }
    if (r.path.includes("?") || r.path.includes("#")) {
      errors.push(`• path must not contain "?" or "#": "${r.path}"`);
    }
    if (seen.has(r.path)) {
      errors.push(`• duplicate route: "${r.path}" appears more than once`);
    } else {
      seen.set(r.path, true);
    }
  }

  if (errors.length > 0) {
    console.error("❌ publicRoutes validation failed:\n" + errors.join("\n"));
    throw new Error(`publicRoutes validation failed (${errors.length} error(s))`);
  }
}

async function main() {
  const data = loadRoutes();
  if (data.routes.length === 0) {
    console.error("⚠️  No public routes parsed from", ROUTES_FILE);
    process.exit(1);
  }

  validateRoutes(data.routes);


  const dynamicDates = {
    latestArticle: await fetchLatestArticleDate(),
  };

  // Resolve lastmod for each route using the priority chain
  const resolved = await Promise.all(
    data.routes.map(async (r) => ({
      ...r,
      lastmod: await resolveLastmod(r, dynamicDates),
    })),
  );

  let explicit = 0;
  let dynamic = 0;
  let gitDerived = 0;
  let fallback = 0;
  for (let i = 0; i < data.routes.length; i++) {
    const orig = data.routes[i];
    const final = resolved[i].lastmod;
    if (orig.lastmod) explicit++;
    else if (orig.path === "/publicacoes" && dynamicDates.latestArticle) dynamic++;
    else if (final !== TODAY) gitDerived++;
    else fallback++;
  }

  mkdirSync(PUBLIC_DIR, { recursive: true });
  writeFileSync(
    resolve(PUBLIC_DIR, "sitemap.xml"),
    buildSitemap({ ...data, routes: resolved }),
  );
  writeFileSync(resolve(PUBLIC_DIR, "robots.txt"), buildRobots(data));
  console.log(
    `✅ sitemap.xml (${data.routes.length} URLs) + robots.txt regenerated.`,
  );
  console.log(
    `   lastmod sources → explicit:${explicit} dynamic:${dynamic} git:${gitDerived} today-fallback:${fallback}`,
  );
}

main().catch((err) => {
  console.error("❌ sitemap generation failed:", err);
  process.exit(1);
});
