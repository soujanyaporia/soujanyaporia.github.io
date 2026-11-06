import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragDigitCardExtremes';

it('solves each response from the displayed cards and any printed limits', () => {
  const boundedHands = new Set<string>();
  const pairedHands = new Set<string>();
  let testedReachableLowerLimit = false;
  let testedZeroOnes = false;

  for (let seed = 0; seed < 100; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'pattern') throw new Error('Expected visible digit cards');
      const cards = q.picture.items;
      expect(cards).toHaveLength(4);
      expect(new Set(cards).size).toBe(4);
      expect(cards.every(card => /^\d$/.test(card))).toBe(true);
      const hand = [...cards].sort().join('');

      // Scan ordinary two-digit numbers in order. Each digit must have its own card.
      const possible: number[] = [];
      for (let value = 10; value <= 99; value++) {
        const [tens, ones] = String(value);
        if (tens !== ones && cards.includes(tens) && cards.includes(ones)) possible.push(value);
      }
      const context = (q.context ?? []).join(' ');
      const bounds = /greater than (\d+) and less than (\d+)/.exec(context);
      expect(q.prompt).toContain('smallest');
      if (bounds) {
        boundedHands.add(hand);
        const lower = Number(bounds[1]);
        const upper = Number(bounds[2]);
        expect(lower).toBeGreaterThanOrEqual(10);
        expect(upper).toBeLessThanOrEqual(100);
        const allowed = possible.filter(n => lower < n && n < upper);
        expect(allowed.length).toBeGreaterThan(1);
        expect(possible[0]).toBeLessThan(lower);
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(allowed[0]));
        if (possible.includes(lower)) testedReachableLowerLimit = true;
      } else {
        pairedHands.add(hand);
        expect(q.prompt).toContain('greatest');
        expect(context).toContain('Put the cards back');
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Expected two labelled number fields');
        expect([spec.firstLabel, spec.secondLabel]).toEqual(['Smallest number', 'Greatest number']);
        const answers = [String(possible[0]), String(possible[possible.length - 1])];
        const expected = JSON.stringify(answers);
        expect(q.answer).toBe(expected);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...answers].reverse()))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(answers.slice(0, 1)))).toBe(false);
        if (cards.includes('0') && answers[0].endsWith('0')) testedZeroOnes = true;
      }
    }
  }
  expect(boundedHands.size).toBeGreaterThan(8);
  expect(pairedHands.size).toBeGreaterThan(8);
  expect(testedReachableLowerLimit).toBe(true);
  expect(testedZeroOnes).toBe(true);
});

it('replays a question and gives both response tasks at neighbouring indices', () => {
  for (const seed of [0, 1, 22, 91]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const next = makeRagQuestion(seed, 1);
    expect(next.key).not.toBe(first.key);
    expect(Boolean(next.structuredResponse)).not.toBe(Boolean(first.structuredResponse));
  }
});
