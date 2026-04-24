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
}

/** Public + indexable routes. Keep priorities consistent: home=1.0, hubs=0.9, leaves=0.7. */
export const publicRoutes: SitemapRoute[] = [
  { path: "/", priority: 1.0, changefreq: "weekly" },

  // Vitrine / plataforma
  { path: "/plataforma", priority: 0.9, changefreq: "monthly" },
  { path: "/servicos", priority: 0.9, changefreq: "monthly" },
  { path: "/contato", priority: 0.8, changefreq: "monthly" },
  { path: "/investidor", priority: 0.7, changefreq: "monthly" },
  { path: "/investidores", priority: 0.7, changefreq: "monthly" },
  { path: "/escritorio", priority: 0.6, changefreq: "monthly" },
  { path: "/clientes", priority: 0.6, changefreq: "monthly" },
  { path: "/pro-bono", priority: 0.5, changefreq: "monthly" },

  // Conteúdo público
  { path: "/publicacoes", priority: 0.8, changefreq: "weekly" },
  { path: "/depoimentos", priority: 0.6, changefreq: "monthly" },
  { path: "/install", priority: 0.5, changefreq: "yearly" },

  // Soluções por perfil
  { path: "/solucoes/advogados", priority: 0.8, changefreq: "monthly" },
  { path: "/solucoes/produtores", priority: 0.8, changefreq: "monthly" },
  { path: "/solucoes/afiliados", priority: 0.8, changefreq: "monthly" },
  { path: "/solucoes/industria", priority: 0.8, changefreq: "monthly" },

  // Plantas industriais
  { path: "/planta/tire-recycling", priority: 0.7, changefreq: "monthly" },
  { path: "/planta/pyrolysis", priority: 0.7, changefreq: "monthly" },
  { path: "/planta/otr", priority: 0.7, changefreq: "monthly" },

  // Legal (indexáveis)
  { path: "/privacidade", priority: 0.4, changefreq: "yearly" },
  { path: "/termos", priority: 0.4, changefreq: "yearly" },
  { path: "/lgpd", priority: 0.4, changefreq: "yearly" },
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
