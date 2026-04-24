import { publicRoutes, SITE_BASE_URL } from "./public-routes";

/**
 * Canonical URL policy (single source of truth):
 *   - Always absolute (https://www.iasofthub.com + path)
 *   - Lowercase
 *   - No query string, no hash
 *   - Trailing slash ONLY for root "/"
 *   - All other paths: NO trailing slash (e.g. "/plataforma", not "/plataforma/")
 *
 * Used by:
 *   - DynamicMeta → injects <link rel="canonical">
 *   - generate-sitemap.mjs → validates that public-routes.ts follows the policy
 */

export function normalizePath(rawPath: string): string {
  if (!rawPath) return "/";
  // strip query + hash
  const noQuery = rawPath.split("?")[0].split("#")[0];
  // collapse duplicate slashes
  const collapsed = noQuery.replace(/\/{2,}/g, "/");
  // lowercase
  const lower = collapsed.toLowerCase();
  // root stays "/"
  if (lower === "/" || lower === "") return "/";
  // strip trailing slash on non-root
  return lower.endsWith("/") ? lower.slice(0, -1) : lower;
}

export function buildCanonicalUrl(pathname: string): string {
  const path = normalizePath(pathname);
  const base = SITE_BASE_URL.replace(/\/+$/, "");
  return path === "/" ? `${base}/` : `${base}${path}`;
}

/** Returns true if `pathname` matches a route declared as public+indexable. */
export function isIndexableRoute(pathname: string): boolean {
  const normalized = normalizePath(pathname);
  return publicRoutes.some((r) => normalizePath(r.path) === normalized);
}

/**
 * Pre-computed canonical map: { "/plataforma": "https://www.iasofthub.com/plataforma", ... }
 * Useful for prerender / SSG scenarios.
 */
export const CANONICAL_MAP: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(
    publicRoutes.map((r) => {
      const norm = normalizePath(r.path);
      return [norm, buildCanonicalUrl(norm)];
    }),
  ),
);
