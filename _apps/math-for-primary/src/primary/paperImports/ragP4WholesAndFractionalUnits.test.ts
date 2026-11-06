import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP4WholesAndFractionalUnits';

function optionValue(s: string): number {
  const [n, d = 1] = s.split('/').map(Number);
  return n / d;
}

it('fits pieces against the visible length and regroups the displayed fractions', () => {
  const forms = new Set<string>();
  const mixedDenominators = new Set<number>();
  let sawReduction = false;
  for (let seed = -8; seed <= 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThan(0);
      if (q.display !== undefined) {
        forms.add('mixed answer');
        expect(q.prompt).toMatch(/mixed number/i);
        const f = /^(\d+)\/(\d+)$/.exec(q.display);
        if (!f) throw Error(`Unreadable fraction: ${q.display}`);
        const [n, d] = f.slice(1).map(Number);
        expect(d).toBeGreaterThan(1);
        expect(d).toBeLessThanOrEqual(12);
        let rest = n, wholes = 0;
        while (rest >= d) { rest -= d; wholes++; }
        expect(wholes).toBeGreaterThan(0);
        expect(rest).toBeGreaterThan(0);
        // Find the smallest denominator that can represent the leftover pieces.
        let b = 1;
        while ((rest * b) % d !== 0) b++;
        const result = `${wholes} ${rest * b / d}/${b}`;
        expect(q.answer).toBe(result);
        expect(correctAnswer(q, result)).toBe(true);
        expect(correctAnswer(q, q.display)).toBe(false);
        if (b < d) {
          sawReduction = true;
          expect(correctAnswer(q, `${wholes} ${rest}/${d}`)).toBe(false);
        }
        continue;
      }
      const length = /^The ribbon is (\d+)(?: (\d+)\/(\d+))? m long\.$/.exec(q.context?.[0] ?? '');
      const piece = /^Each piece must be 1\/(\d+) m long\.$/.exec(q.context?.[1] ?? '');
      if (!length || !piece) throw Error('The ribbon length and the size of a piece must both be visible.');
      const w = Number(length[1]), a = Number(length[2] ?? 0), b = Number(length[3] ?? 1), d = Number(piece[1]);
      expect(w).toBeGreaterThanOrEqual(1);
      expect(d).toBeGreaterThan(1);
      expect(d).toBeLessThanOrEqual(12);
      // Measure in ticks of 1/(b*d) metre. One piece uses b ticks.
      let ticks = (w * b + a) * d, count = 0;
      while (ticks >= b) { ticks -= b; count++; }
      expect(ticks).toBe(0);
      expect(q.answer).toBe(String(count));
      expect(q.unit).toBe('pieces');
      if (a !== 0) {
        forms.add('mixed length');
        expect(a).toBeLessThan(b);
        expect(d).toBeGreaterThan(b);
        expect(d % b).toBe(0);
        mixedDenominators.add(d);
      } else forms.add(w === 1 ? 'one whole' : 'several wholes');
      if (a === 0 && w > 1) {
        const options = (q.choices ?? []).map(optionValue);
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        expect(options.filter(x => x === count)).toHaveLength(1);
      } else expect(q.choices).toBeUndefined();
    }
  }
  expect(forms.size).toBe(4);
  expect(sawReduction).toBe(true);
  expect(mixedDenominators.size).toBeGreaterThan(1);
});

it('repeats the same question and choice order for the same seed and index', () => {
  for (let i = 0; i < 8; i++) expect(makeRagQuestion(12, i)).toEqual(makeRagQuestion(12, i));
});
