import { describe, it, expect } from "vitest";
import { sanitizeHTML } from "../sanitize";

describe("sanitizeHTML", () => {
  it("should remove script tags", () => {
    const input = '<div>Hello<script>alert("xss")</script></div>';
    const output = sanitizeHTML(input);
    expect(output).toBe("<div>Hello</div>");
  });

  it("should remove onmouseover attributes", () => {
    const input = '<div onmouseover="alert(\'xss\')">Hello</div>';
    const output = sanitizeHTML(input);
    expect(output).toBe("<div>Hello</div>");
  });

  it("should allow safe tags and attributes", () => {
    const input = '<h1 class="title">Title</h1><p>Paragraph with <strong style="color: red">bold</strong></p>';
    const output = sanitizeHTML(input);
    expect(output).toContain('<h1 class="title">Title</h1>');
    expect(output).toContain('<strong style="color: red">bold</strong>');
  });

  it('should automatically add rel="noopener noreferrer" to target="_blank" links', () => {
    const input = '<a href="https://example.com" target="_blank">External Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it("should allow additional semantic tags", () => {
    const input = "<article><section><p><mark>Highlighted</mark> and <del>deleted</del></p></section></article>";
    const output = sanitizeHTML(input);
    expect(output).toBe(input);
  });

  it("should allow the title attribute", () => {
    const input = '<span title="Tooltip text">Hover me</span>';
    const output = sanitizeHTML(input);
    expect(output).toBe(input);
  });

  it("should handle nested tables and complex structures", () => {
    const input = '<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td><div class="cell">Data</div></td></tr></tbody></table>';
    const output = sanitizeHTML(input);
    expect(output).toBe(input);
  });
});
