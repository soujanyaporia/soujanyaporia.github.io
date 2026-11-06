import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4SquareSideMeasures';

function readLengthOrArea(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible measurement in ${text}`);
  return Number(match[1]);
}

it('solves each task using the printed measurement and, for MB, the label on the edge', () => {
  const results = new Map<string, Set<number>>();
  for (let seed = -12; seed <= 35; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const givens = q.context?.join(' ') ?? '';
      expect(givens).toMatch(/square tile/i);
      expect(q.unit).toBe('cm');
      let expected: number;
      let form: string;

      if (givens.includes('perimeter')) {
        const perimeter = readLengthOrArea(givens, /perimeter of (\d+) cm\./);
        expect(q.prompt).toContain('one edge');
        expect(perimeter % 4).toBe(0);
        expected = perimeter / 4;
        form = q.choices ? 'perimeter-choice' : 'perimeter-entry';
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices.filter(value => Number(value) * 4 === perimeter)).toEqual([String(expected)]);
        }
      } else {
        const area = readLengthOrArea(givens, /covers (\d+) cm²/);
        const side = Math.sqrt(area);
        expect(Number.isInteger(side)).toBe(true);
        expect(side).toBeGreaterThan(0);
        expect(q.choices).toBeUndefined();
        if (q.prompt.includes('MB')) {
          form = 'edge-segment';
          const figure = q.picture;
          if (figure?.type !== 'paper' || figure.layout !== 'bars') throw new Error('Missing labelled edge');
          expect(figure.rows).toHaveLength(1);
          const row = figure.rows[0];
          expect(row.label).toBe('Edge AB');
          expect(row.parts).toHaveLength(2);
          const [am, mb] = row.parts;
          const marked = readLengthOrArea(am.label, /^AM = (\d+) cm$/);
          expect(mb.label).toBe('MB = ? cm');
          expect(marked).toBeGreaterThan(0);
          expect(marked).toBeLessThan(side);
          expected = side - marked;
          expect(am.size / (am.size + mb.size)).toBeCloseTo(marked / side);
        } else if (q.prompt.includes('perimeter')) {
          form = 'perimeter-from-area';
          expected = side + side + side + side;
        } else {
          expect(q.prompt).toContain('one edge');
          form = 'side-from-area';
          expected = side;
        }
      }

      expect(q.answer).toBe(String(expected));
      expect(q.explanation).toContain(`${expected} cm`);
      expect(q.workedSteps?.some(step => Boolean(step.equation))).toBe(true);
      const observed = results.get(form) ?? new Set<number>();
      observed.add(expected);
      results.set(form, observed);
    }
  }
  expect([...results.keys()].sort()).toEqual(['edge-segment', 'perimeter-choice', 'perimeter-entry', 'perimeter-from-area', 'side-from-area']);
  for (const answers of results.values()) expect(answers.size).toBeGreaterThan(1);
});

it('recreates the same question, including labels and choice order, for the same seed and index', () => {
  for (const seed of [-10, 0, 37, 250]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 1; index <= 8; index++) {
      const question = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(question);
      expect(question.key).not.toBe(makeRagQuestion(seed, index - 1).key);
    }
  }
});
