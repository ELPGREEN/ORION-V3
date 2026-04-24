import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Lock the JarvisHUD reported version strings to the PR contract:
 *   - Orion core: v21.2
 *   - HUD shell:  v8.0
 *
 * If you intentionally bump either version, update both this test
 * AND the matching strings in JarvisHUD.tsx in the same commit.
 */
describe("JarvisHUD version contract", () => {
  const source = readFileSync(
    resolve(__dirname, "JarvisHUD.tsx"),
    "utf-8",
  );

  it("reports ORION v21.2 in the user identity block", () => {
    expect(source).toMatch(/ORION v21\.2/);
  });

  it("reports HUD v8.0 in the user identity block", () => {
    expect(source).toMatch(/HUD v8\.0/);
  });

  it("reports v21.2 · HUD v8.0 in the OS status bar", () => {
    expect(source).toMatch(/v21\.2\s*·\s*HUD v8\.0/);
  });

  it("does not contain stale version markers (v22.x, v8.x other than 8.0)", () => {
    expect(source).not.toMatch(/v22\.\d/);
    expect(source).not.toMatch(/HUD v(?!8\.0)\d+\.\d+/);
  });
});
