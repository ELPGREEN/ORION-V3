/**
 * Single source of truth for public, indexable routes.
 *
 * Used by:
 *  - scripts/generate-sitemap.mjs      → builds public/sitemap.xml + robots.txt
 *  - vite.config.ts (sitemap plugin)   → regenerates them on dev/build automatically
 *
 * Rules:
 *  - List ONLY routes that are public AND indexable (no auth-only, no params).
 *  - Use canonical paths (no trailing slash except "/").
 *  - Disallowed paths go to `disallowedPaths` and end up in robots.txt.
 */

export const SITE_BASE_URL = "https://www.iasofthub.com";

export type ChangeFreq =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export interface SitemapRoute {
  path: string;
  priority?: number;
  changefreq?: ChangeFreq;
  /** ISO date (YYYY-MM-DD) of the last meaningful content change for this page. */
  lastmod?: string;
}

/**
 * Public + indexable routes. Keep priorities consistent: home=1.0, hubs=0.9, leaves=0.7.
 *
 * `lastmod` should reflect the real last publication/edit date of the page content.
 * Update it when you ship a meaningful change to the page (copy, layout, new section).
 * If omitted, the generator falls back to today.
 */
export const publicRoutes: SitemapRoute[] = [
  { path: "/", priority: 1.0, changefreq: "weekly", lastmod: "2026-04-24" },

  // Vitrine / plataforma
  { path: "/plataforma", priority: 0.9, changefreq: "monthly", lastmod: "2026-04-03" },
  { path: "/servicos", priority: 0.9, changefreq: "monthly", lastmod: "2026-04-03" },
  { path: "/contato", priority: 0.8, changefreq: "monthly", lastmod: "2026-03-15" },
  { path: "/investidor", priority: 0.7, changefreq: "monthly", lastmod: "2026-03-15" },
  { path: "/investidores", priority: 0.7, changefreq: "monthly", lastmod: "2026-03-15" },
  { path: "/escritorio", priority: 0.6, changefreq: "monthly", lastmod: "2026-02-20" },
  { path: "/clientes", priority: 0.6, changefreq: "monthly", lastmod: "2026-02-20" },
  { path: "/pro-bono", priority: 0.5, changefreq: "monthly", lastmod: "2026-02-20" },

  // Conteúdo público (publicações usa data dinâmica via DB — ver nota abaixo)
  { path: "/publicacoes", priority: 0.8, changefreq: "weekly" },
  { path: "/depoimentos", priority: 0.6, changefreq: "monthly", lastmod: "2026-03-01" },
  { path: "/install", priority: 0.5, changefreq: "yearly", lastmod: "2025-11-01" },

  // Soluções por perfil
  { path: "/solucoes/advogados", priority: 0.8, changefreq: "monthly", lastmod: "2026-04-10" },
  { path: "/solucoes/produtores", priority: 0.8, changefreq: "monthly", lastmod: "2026-04-10" },
  { path: "/solucoes/afiliados", priority: 0.8, changefreq: "monthly", lastmod: "2026-04-10" },
  { path: "/solucoes/industria", priority: 0.8, changefreq: "monthly", lastmod: "2026-04-10" },

  // Plantas industriais
  { path: "/planta/tire-recycling", priority: 0.7, changefreq: "monthly", lastmod: "2026-03-20" },
  { path: "/planta/pyrolysis", priority: 0.7, changefreq: "monthly", lastmod: "2026-03-20" },
  { path: "/planta/otr", priority: 0.7, changefreq: "monthly", lastmod: "2026-03-20" },

  // Legal (mudam raramente — datas reais de revisão)
  { path: "/privacidade", priority: 0.4, changefreq: "yearly", lastmod: "2025-09-01" },
  { path: "/termos", priority: 0.4, changefreq: "yearly", lastmod: "2025-09-01" },
  { path: "/lgpd", priority: 0.4, changefreq: "yearly", lastmod: "2025-09-01" },
];

/** Paths blocked from crawlers. */
export const disallowedPaths: string[] = [
  "/dashboard/",
  "/auth",
  "/auth/callback",
  "/esqueci-senha",
  "/cadastro",
  "/loja/",
  "/loja-orion",
  "/vitrine/",
  "/advogado/",
  "/register/",
  "/docs/",
  "/consulta",
  "/~oauth",
];

/** Friendly bots we want to explicitly allow. */
export const allowedBots: string[] = [
  "Googlebot",
  "Bingbot",
  "Twitterbot",
  "facebookexternalhit",
  "LinkedInBot",
  "WhatsApp",
  "TelegramBot",
];
