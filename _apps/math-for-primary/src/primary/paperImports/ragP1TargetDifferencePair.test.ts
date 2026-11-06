import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP1TargetDifferencePair';

it('accepts exactly the two displayed numbers at the requested distance, in either order', () => {
  const sizes = new Set<number>();
  for (let seed = -2; seed <= 35; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const spec = q.structuredResponse;
      if (spec?.kind !== 'named-pair') throw new Error('Expected a row of selectable numbers');
      const target = /\b(\d+) apart\b/.exec(q.prompt);
      if (!target) throw new Error('Missing distance in the pupil prompt');
      const gap = Number(target[1]);
      const cards = spec.options;
      expect([3, 6]).toContain(cards.length);
      sizes.add(cards.length);
      expect(new Set(cards).size).toBe(cards.length);
      const cap = cards.length === 6 ? 10 : 99;
      for (const card of cards) {
        expect(card).toMatch(/^(0|[1-9]\d*)$/);
        expect(Number(card)).toBeGreaterThanOrEqual(cards.length === 6 ? 0 : 10);
        expect(Number(card)).toBeLessThanOrEqual(cap);
      }
      expect(gap).toBeGreaterThan(0);

      // Derive the answer from the prompt and selectable labels before consulting the key.
      const solutions = cards.flatMap(a => cards.filter(b => Number(b) === Number(a) + gap).map(b => [a, b]));
      expect(solutions).toHaveLength(1);
      const [smaller, larger] = solutions[0];
      expect(JSON.parse(q.answer).sort()).toEqual([smaller, larger].sort());
      for (const a of cards) for (const b of cards) {
        const valid = (a === smaller && b === larger) || (a === larger && b === smaller);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([a, b]))).toBe(valid);
      }
    }
  }
  expect([...sizes].sort()).toEqual([3, 6]);
});

it('repeats the same question for the same seed and index and varies the visible exercise', () => {
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  const seen = new Set<string>();
  for (let i = 0; i < 16; i++) {
    const q = makeRagQuestion(19, i);
    expect(makeRagQuestion(19, i)).toEqual(q);
    seen.add(JSON.stringify([q.prompt, q.structuredResponse]));
  }
  expect(seen.size).toBeGreaterThan(8);
});
