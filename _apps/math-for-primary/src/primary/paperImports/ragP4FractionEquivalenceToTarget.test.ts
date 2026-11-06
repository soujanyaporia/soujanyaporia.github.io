import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP4FractionEquivalenceToTarget';

function readFraction(label: string): [number, number] {
  const match = /^([1-9]\d*)\/([1-9]\d*)$/.exec(label);
  if (!match) throw new Error(`Expected a visible fraction, got ${label}`);
  const numerator = Number(match[1]);
  const denominator = Number(match[2]);
  expect(numerator).toBeLessThan(denominator);
  return [numerator, denominator];
}

test('solves from the displayed target and checks every selectable response', () => {
  for (let seed = -12; seed <= 52; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const [targetTop, targetBottom] = readFraction(q.display ?? '');
      const pair = q.structuredResponse;
      if (pair && pair.kind !== 'named-pair') throw new Error('Unexpected response control');
      const options = pair ? pair.options : (q.choices ?? []);
      expect(options).toHaveLength(4);
      expect(new Set(options).size).toBe(4);
      const matches = options.filter(label => {
        const [top, bottom] = readFraction(label);
        expect(bottom).toBeLessThanOrEqual(36);
        return top * targetBottom === targetTop * bottom;
      });
      const different = options.filter(label => !matches.includes(label));

      if (pair) {
        expect(q.prompt).toMatch(/both.*same value/i);
        expect(matches).toHaveLength(2);
        expect(JSON.parse(q.answer).sort()).toEqual([...matches].sort());
        for (const a of options) {
          for (const b of options) {
            const shouldAccept = a !== b && matches.includes(a) && matches.includes(b);
            expect(correctAnswer(q, JSON.stringify([a, b]))).toBe(shouldAccept);
          }
        }
        // Even the other equivalent pair must be rejected for this target.
        const [a, b] = readFraction(different[0]);
        const [c, d] = readFraction(different[1]);
        expect(a * d).toBe(c * b);
      } else {
        expect(q.prompt).toMatch(/one fraction.*different value/i);
        expect(matches).toHaveLength(3);
        expect(different).toEqual([q.answer]);
        for (const option of options) {
          expect(correctAnswer(q, option)).toBe(different.includes(option));
        }
      }
    }
  }
});

test('replays a seed and exercises both controls with varied visible givens', () => {
  const targets = new Set<string>();
  const exceptionPositions = new Set<number>();
  let pairs = 0;
  for (let index = 0; index < 64; index++) {
    const q = makeRagQuestion(37, index);
    expect(makeRagQuestion(37, index)).toEqual(q);
    targets.add(q.display ?? '');
    if (q.choices) {
      exceptionPositions.add(q.choices.indexOf(q.answer));
    } else {
      pairs++;
    }
  }
  expect(pairs).toBe(32);
  expect(targets.size).toBeGreaterThan(3);
  expect(exceptionPositions).toEqual(new Set([0, 1, 2, 3]));
});
