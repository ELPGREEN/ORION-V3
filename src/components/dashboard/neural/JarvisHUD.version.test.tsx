import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ORION_VERSION,
  HUD_VERSION,
  ORION_HUD_CLEARANCE_LABEL,
  ORION_HUD_COMPACT_LABEL,
} from "@/lib/neural/version";

/**
 * Lock the JarvisHUD reported version strings to the constants in
 * `@/lib/neural/version`. Bumping versions there propagates everywhere.
 *
 * This test ensures:
 *   1. JarvisHUD imports the shared constants (no hardcoded version strings)
 *   2. The current constants match the PR contract (Orion v21.2 / HUD v8.0)
 *   3. No stale v22.x markers leak back in
 */
describe("JarvisHUD version contract", () => {
  const source = readFileSync(
    resolve(__dirname, "JarvisHUD.tsx"),
    "utf-8",
  );

  it("imports version constants from the shared module", () => {
    expect(source).toMatch(
      /from\s+["']@\/lib\/neural\/version["']/,
    );
    expect(source).toContain("ORION_HUD_CLEARANCE_LABEL");
    expect(source).toContain("ORION_HUD_COMPACT_LABEL");
  });

  it("does not hardcode version strings inline", () => {
    // Strip the import line before scanning the body
    const body = source.replace(/^import .*$/gm, "");
    expect(body).not.toMatch(/ORION v\d+\.\d+/);
    expect(body).not.toMatch(/HUD v\d+\.\d+/);
  });

  it("constants match the PR contract: ORION v25.0 + HUD v10.1", () => {
    expect(ORION_VERSION).toBe("v25.0");
    expect(HUD_VERSION).toBe("v10.1");
    expect(ORION_HUD_CLEARANCE_LABEL).toBe(
      "ORION v25.0 • HUD v10.1 • CLEARANCE L5",
    );
    expect(ORION_HUD_COMPACT_LABEL).toBe("v25.0 · HUD v10.1");
  });

  it("has no stale v22.x markers anywhere in the file", () => {
    expect(source).not.toMatch(/v22\.\d/);
  });
});
