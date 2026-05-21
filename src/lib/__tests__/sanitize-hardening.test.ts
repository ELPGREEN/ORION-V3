import { describe, it, expect } from 'vitest';
import { sanitizeHTML } from '../sanitize';

describe('sanitizeHTML hardening', () => {
  it('should add rel="noopener noreferrer" to target="_blank" links', () => {
    const input = '<a href="https://example.com" target="_blank">Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
  });

  it('should not add rel to links without target="_blank"', () => {
    const input = '<a href="https://example.com">Link</a>';
    const output = sanitizeHTML(input);
    expect(output).not.toContain('rel="noopener noreferrer"');
  });

  it('should overwrite existing rel with noopener noreferrer for target="_blank"', () => {
    const input = '<a href="https://example.com" target="_blank" rel="follow">Link</a>';
    const output = sanitizeHTML(input);
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).not.toContain('rel="follow"');
  });

  it('should allow new tags like article and section', () => {
    const input = '<article><section>Content</section></article>';
    const output = sanitizeHTML(input);
    expect(output).toContain('<article>');
    expect(output).toContain('<section>');
  });

  it('should allow del and mark tags', () => {
    const input = '<del>removed</del><mark>highlight</mark>';
    const output = sanitizeHTML(input);
    expect(output).toContain('<del>');
    expect(output).toContain('<mark>');
  });
});
