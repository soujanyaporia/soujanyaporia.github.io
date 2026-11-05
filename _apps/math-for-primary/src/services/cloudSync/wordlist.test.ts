import { describe, expect, it } from 'vitest';
import { generatePassphrase, normalizePassphrase, WORDLIST_256 } from './wordlist';
describe('recovery code protocol', () => {
  it('has 256 unique, short lowercase words', () => { expect(WORDLIST_256).toHaveLength(256); expect(new Set(WORDLIST_256).size).toBe(256); expect(WORDLIST_256.every(w => /^[a-z]{3,7}$/.test(w))).toBe(true); });
  it('normalizes spacing, hyphens, case and underscores', () => { expect(normalizePassphrase('  Sunny  Otter_HEXAGON---Mango 42 ')).toBe('sunny-otter-hexagon-mango-42'); });
  it('generates only valid four-word codes without Math.random', () => { for (let i = 0; i < 100; i++) { const code = generatePassphrase(); expect(normalizePassphrase(code)).toBe(code); expect(code.split('-')).toHaveLength(5); } });
  it('rejects missing words, unknown words and out-of-range digits before networking', () => { for (const code of ['sunny-otter-mango-42', 'sunny-otter-unknown-mango-42', 'sunny-otter-hexagon-mango-09', 'sunny-otter-hexagon-mango-100']) expect(() => normalizePassphrase(code)).toThrow(); });
});
