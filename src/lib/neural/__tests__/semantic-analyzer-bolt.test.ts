import { describe, it, expect } from 'vitest';
import { classifyLegalDomain, analyzeSemantics } from '../nlp-semantic-analyzer';

describe('NLP Semantic Analyzer (BOLT Optimization)', () => {
  it('should correctly classify domains with multiple matches', () => {
    const text = 'contrato de locação, dano moral, cdc, consumidor';
    // Matches 4 'civil' terms
    expect(classifyLegalDomain(text)).toBe('civil');
  });

  it('should prioritize the domain with most matches', () => {
    const text = 'contrato civil e crime de furto e roubo e pena';
    // civil: 1 match ('contrato')
    // penal: 4 matches ('crime', 'furto', 'roubo', 'pena')
    expect(classifyLegalDomain(text)).toBe('penal');
  });

  it('should handle text with no specific domain matches', () => {
    expect(classifyLegalDomain('olá tudo bem')).toBe('geral');
  });

  it('should perform full semantic analysis correctly', () => {
    const analysis = analyzeSemantics('O art. 5 da CF/88 garante direitos fundamentais.');
    expect(analysis.domain).toBe('constitucional');
    expect(analysis.entities.length).toBeGreaterThan(0);
    expect(analysis.entities[0].type).toBe('article');
  });
});
