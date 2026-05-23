import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "../sanitize";

describe("sanitizeHTML", () => {
  it("should sanitize malicious HTML", () => {
    const input = '<img src=x onerror=alert(1)>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain("onerror");
  });

  it("should add rel='noopener noreferrer' to target='_blank' links", () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("should allow additional tags", () => {
    const input = '<article><section><mark>Highlighted</mark> <del>Deleted</del></section></article>';
    const output = sanitizeHTML(input);
    expect(output).toContain("<article>");
    expect(output).toContain("<section>");
    expect(output).toContain("<mark>");
    expect(output).toContain("<del>");
  });

  it("should allow title attribute", () => {
    const input = '<span title="Tool tip">Text</span>';
    const output = sanitizeHTML(input);
    expect(output).toContain('title="Tool tip"');
  });
});
