import { describe, it, expect } from 'vitest';
import { getToolsForAgent, ORION_TOOLS } from '../index';
import { isToolAllowed } from '../tool-distribution';

describe('Orion Tools Structural Cleanup (BOLT)', () => {
  it('should allow tools based on role and plan', () => {
    const allowed = isToolAllowed('vision_analyze', 'advogado', 'pro', false);
    expect(allowed).toBe(true);
  });

  it('should block owner-only tools for non-owners', () => {
    const allowed = isToolAllowed('shell', 'advogado', 'pro', false);
    expect(allowed).toBe(false);
  });

  it('should allow everything for owners', () => {
    const allowed = isToolAllowed('shell', 'advogado', 'pro', true);
    expect(allowed).toBe(true);
  });

  it('should have tools defined in ORION_TOOLS', () => {
    expect(ORION_TOOLS.length).toBeGreaterThan(0);
    expect(ORION_TOOLS.find(t => t.name === 'file_read')).toBeDefined();
  });
});
