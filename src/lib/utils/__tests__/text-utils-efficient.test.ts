import { describe, it, expect } from 'vitest';
import { countWords, getTokensEfficiently } from '../text-utils';

describe('countWords', () => {
  it('should return 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('should count words correctly', () => {
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  hello   world  ')).toBe(2);
    expect(countWords('one')).toBe(1);
  });

  it('should handle newlines and tabs', () => {
    expect(countWords('hello\nworld')).toBe(2);
    expect(countWords('hello\tworld')).toBe(2);
  });
});

describe('getTokensEfficiently', () => {
  it('should return empty array for empty string', () => {
    expect(getTokensEfficiently('')).toEqual([]);
  });

  it('should tokenize correctly and lowercase', () => {
    expect(getTokensEfficiently('Hello World')).toEqual(['hello', 'world']);
  });

  it('should filter by minLength', () => {
    expect(getTokensEfficiently('a quick brown fox', 3)).toEqual(['quick', 'brown', 'fox']);
  });

  it('should handle multiple spaces', () => {
    expect(getTokensEfficiently('  hello   world  ')).toEqual(['hello', 'world']);
  });
});
