import { describe, it, expect, vi } from 'vitest';
import { analyzeSemantics, classifyLegalDomain, extractLegalEntities } from '../nlp-semantic-analyzer';

describe('NLP Performance & Correctness (Bolt Optimized)', () => {
  it('should correctly prioritize legal domains', () => {
    // Both penal and civil keywords are present. Penal should win due to priority in DOMAIN_RULES.
    const text = "crime de responsabilidade civil e homicídio";
    const domain = classifyLegalDomain(text);
    expect(domain).toBe('penal');
  });

  it('should handle extremely long text (50k characters) within acceptable time', () => {
    const longText = "Artigo 121 do Código Penal. ".repeat(2000); // ~54,000 chars
    expect(longText.length).toBeGreaterThan(50000);

    const t0 = performance.now();
    const analysis = analyzeSemantics(longText);
    const duration = performance.now() - t0;

    console.log(`[Benchmark] 50k chars analysis took: ${duration.toFixed(2)}ms`);

    // Bolt target: < 50ms for 50k characters on typical hardware
    expect(duration).toBeLessThan(100);
    expect(analysis.entities.length).toBeGreaterThan(0);
  });

  it('should handle noisy STT input correctly', () => {
    const text = "éé tipo o artigo 5 da constituição sabe ali no stf";
    const entities = extractLegalEntities(text);

    expect(entities.some(e => e.normalized.includes('Art. 5'))).toBe(true);
    expect(entities.some(e => e.normalized === 'STF')).toBe(true);
  });

  it('should maintain correctness for complex legal citations', () => {
    const text = "Conforme o Art. 121, § 2º, inciso I do Código Penal e a Lei 13.105/2015";
    const entities = extractLegalEntities(text);

    expect(entities.find(e => e.type === 'article')?.normalized).toContain('Art. 121');
    expect(entities.find(e => e.type === 'law')?.normalized).toBe('Lei 13.105/2015');
  });

  it('should resolve coreferences using context', () => {
    const context = "Estamos falando sobre o Artigo 121 do Código Penal.";
    const text = "isso trata do homicídio.";
    const resolved = analyzeSemantics(text, context).resolvedText;

    expect(resolved.toLowerCase()).toContain('artigo 121 do código penal');
  });
});
