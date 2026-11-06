import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragBasicRectangleMeasurements';

// Derive answers solely from the numbers and relationships shown in the generated question.
function solveVisible(q: ReturnType<typeof makeRagQuestion>): number {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  let m = /rectangle is (\d+) cm wide\. Its length is (\d+) cm greater/.exec(text);
  if (m) return Number(m[1]) * (Number(m[1]) + Number(m[2]));
  m = /perimeter of (\d+) cm and a breadth of (\d+) cm/.exec(text);
  if (m) {
    const [perimeter, breadth] = m.slice(1).map(Number);
    return breadth * (perimeter / 2 - breadth);
  }
  m = /tabletop is (\d+) m long and (\d+) m wide\. (\d+\/\d+) of it is covered/.exec(text);
  if (m) {
    const [length, breadth] = m.slice(1, 3).map(Number);
    const [numerator, denominator] = m[3].split('/').map(Number);
    return length * breadth * numerator / denominator;
  }
  throw new Error(`Could not solve from visible givens: ${text}`);
}

describe('basic rectangle measurements generator', () => {
  it('has visible givens that independently determine the answer across seeds and indices', () => {
    for (let seed = 0; seed < 90; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(Number(q.answer)).toBe(solveVisible(q));
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
      }
    }
  });
});
