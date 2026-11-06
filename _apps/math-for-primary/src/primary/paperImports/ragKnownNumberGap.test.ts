import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragKnownNumberGap';

test('the two visible clues determine exactly one answer to the question asked', () => {
  const seen = { larger: new Set<string>(), smaller: new Set<string>() };
  for (let seed = -8; seed < 32; seed++) {
    for (const index of [0, 1, 2, 7]) {
      const q = makeRagQuestion(seed, index);
      const clues = q.context?.join(' ') ?? '';
      const distance = /(\d+) apart\./.exec(clues);
      const low = /I chose (\d+) as my smaller number\./.exec(clues);
      const sum = /Adding my numbers gives (\d+)\./.exec(clues);
      if (!distance || Boolean(low) === Boolean(sum)) throw Error('Expected a gap and one other clue');
      const gap = Number(distance[1]);
      expect(gap).toBeGreaterThan(0);
      const matches: number[] = [];
      if (low) {
        expect(q.prompt).toBe('What is my larger number?');
        const smaller = Number(low[1]);
        expect(smaller).toBeGreaterThan(0);
        for (let guess = smaller + 1; guess <= 9999; guess++) {
          if (guess - smaller === gap) matches.push(guess);
        }
        seen.larger.add(clues);
      } else if (sum) {
        expect(q.prompt).toBe('What is my smaller number?');
        const total = Number(sum[1]);
        expect(total).toBeLessThanOrEqual(9999);
        expect(total - gap).toBeGreaterThan(0);
        expect(total - gap).toBeLessThanOrEqual(999);
        for (let guess = 1; guess < total - guess; guess++) {
          const partner = total - guess;
          if (partner - guess === gap) matches.push(guess);
        }
        seen.smaller.add(clues);
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(String(matches[0]));
      expect(q.unit).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
    }
  }
  expect(seen.larger.size).toBeGreaterThan(20);
  expect(seen.smaller.size).toBeGreaterThan(20);
});

test('a seed and index reproduce the question, and consecutive indices practise both targets', () => {
  for (const seed of [0, 1, 19, 2401]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const next = makeRagQuestion(seed, 1);
    expect(next).toEqual(makeRagQuestion(seed, 1));
    expect(next.prompt).not.toBe(first.prompt);
  }
});
