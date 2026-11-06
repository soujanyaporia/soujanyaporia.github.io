import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragOddEvenCandidates';

const odd = (label: string) => /[13579]$/.test(label);

it('solves each question using only its prompt and displayed options', () => {
  const forms = new Set<string>();
  const endpointParities = new Set<string>();
  for (let seed = -12; seed < 36; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      let expected: string;
      if (q.prompt.startsWith('How many')) {
        forms.add('count');
        expect(q.choices).toBeUndefined();
        const ends = /between (\d+) and (\d+)\? Do not count either end\./.exec(q.prompt);
        if (!ends) throw new Error('The open interval must be visible');
        const low = Number(ends[1]), high = Number(ends[2]);
        expect(low).toBeGreaterThanOrEqual(0);
        expect(high).toBeLessThanOrEqual(1000);
        expect(high - low).toBeGreaterThan(1);
        expect(high - low).toBeLessThanOrEqual(20);
        endpointParities.add(`${low % 2}:${high % 2}`);
        let count = 0;
        for (let n = low + 1; n < high; n++) if (odd(String(n))) count++;
        expected = String(count);
      } else {
        const options = q.choices ?? [];
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        let matches: string[];
        if (q.prompt.includes('both have three digits')) {
          forms.add('pair');
          const pairs = options.map(s => s.split(' and '));
          for (const p of pairs) {
            expect(p).toHaveLength(2);
            expect(p.every(s => /^[1-9]\d{1,2}$/.test(s))).toBe(true);
          }
          const long = (s: string) => s.length === 3;
          expect(pairs.some(p => p.every(odd) && !p.every(long))).toBe(true);
          expect(pairs.some(p => p.every(long) && !p.every(odd))).toBe(true);
          matches = options.filter((_, i) => pairs[i].every(s => long(s) && odd(s)));
        } else {
          expect(options.every(s => /^[1-9]\d{2}$/.test(s))).toBe(true);
          const above = /greater than (\d+)/.exec(q.prompt);
          if (above) {
            forms.add('bound');
            const bound = Number(above[1]);
            expect(options.some(s => !odd(s) && Number(s) > bound)).toBe(true);
            expect(options.some(s => odd(s) && Number(s) < bound)).toBe(true);
            matches = options.filter(s => odd(s) && Number(s) > bound);
          } else {
            forms.add('smallest');
            expect(q.prompt).toMatch(/odd numbers.*smallest/i);
            const odds = options.filter(odd).map(Number);
            expect(odds.length).toBeGreaterThanOrEqual(2);
            const least = Math.min(...odds);
            expect(Math.min(...options.map(Number))).toBeLessThan(least);
            matches = options.filter(s => Number(s) === least);
          }
        }
        expect(matches).toHaveLength(1);
        expected = matches[0];
      }
      expect(q.answer).toBe(expected);
    }
  }
  expect(forms.size).toBe(4);
  expect(endpointParities.size).toBe(4);
});

it('replays the same seed and index and varies the visible givens', () => {
  const signatures = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      signatures.add(JSON.stringify([q.prompt, q.choices]));
    }
  }
  expect(signatures.size).toBeGreaterThan(72);
});
