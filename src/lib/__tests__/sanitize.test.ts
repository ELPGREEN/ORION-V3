import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "../sanitize";

describe("sanitizeHTML", () => {
  it("should remove script tags", () => {
    const input = "<p>Hello <script>alert('xss')</script>World</p>";
    const output = sanitizeHTML(input);
    expect(output).toBe("<p>Hello World</p>");
  });

  it("should remove on* event handlers", () => {
    const input = '<button onclick="alert(\'xss\')">Click me</button>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain("onclick");
  });

  it("should allow whitelisted tags and attributes", () => {
    const input = '<article><h1 title="title">Hello</h1><p>Text with <strong>bold</strong> and <mark>highlight</mark></p></article>';
    const output = sanitizeHTML(input);
    expect(output).toContain("<article>");
    expect(output).toContain("<h1");
    expect(output).toContain('title="title"');
    expect(output).toContain("<mark>");
  });

  it('should automatically add rel="noopener noreferrer" to target="_blank" links', () => {
    const input = '<a href="https://example.com" target="_blank">External Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it('should override existing rel attribute with secure values if target="_blank"', () => {
    const input = '<a href="https://example.com" target="_blank" rel="follow">External Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).not.toContain('rel="follow"');
  });
});
