/**
 * Single source of truth for Orion / HUD version strings.
 *
 * If you bump either version:
 *   1. Update the constants below.
 *   2. The JarvisHUD UI and JarvisHUD.version.test.tsx will follow automatically.
 *   3. Keep the PR title / changelog in sync.
 */

export const ORION_VERSION = "v25.0" as const;
export const HUD_VERSION = "v10.1" as const;

/** "ORION v21.2 • HUD v8.0 • CLEARANCE L5" */
export const ORION_HUD_CLEARANCE_LABEL =
  `ORION ${ORION_VERSION} • HUD ${HUD_VERSION} • CLEARANCE L5` as const;

/** "v21.2 · HUD v8.0" — compact form for status bars */
export const ORION_HUD_COMPACT_LABEL =
  `${ORION_VERSION} · HUD ${HUD_VERSION}` as const;
