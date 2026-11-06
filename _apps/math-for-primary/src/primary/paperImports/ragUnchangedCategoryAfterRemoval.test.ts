import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragUnchangedCategoryAfterRemoval';

type Kind = 'buttons' | 'counters' | 'visitors';
type Visible = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: Kind;
  answers: number[];
  before: number[];
  after: number[];
  changed: number;
};

function read(text: string, pattern: string): number[] {
  const match = new RegExp(pattern).exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match.slice(1).map(Number);
}

// Search integer collections using only the wording shown to the pupil.
// This solver does not import generation tables or receive the stored answer.
function solveVisible(q: Visible): Solution {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  const solutions: Solution[] = [];
  if (text.includes('A craft box')) {
    const [a, b] = read(text, 'At first, ([0-9]+)/([0-9]+) of all the buttons are red');
    const [c, d] = read(text, 'Of the buttons that are not red, ([0-9]+)/([0-9]+) are blue');
    const [yellow] = read(text, 'The other ([0-9]+) buttons are yellow');
    const [e, f] = read(text, 'After that, ([0-9]+)/([0-9]+) of the buttons left in the box are red');
    for (let total = 1; total <= 5000; total++) {
      if (total * a % b !== 0) continue;
      const red = total * a / b;
      const notRed = total - red;
      if (notRed * c % d !== 0) continue;
      const blue = notRed * c / d;
      if (notRed - blue !== yellow) continue;
      for (let redLeft = 1; redLeft < red; redLeft++) {
        if (redLeft * f !== e * (notRed + redLeft)) continue;
        solutions.push({
          kind: 'buttons', answers: [red, red - redLeft],
          before: [red, blue, yellow], after: [redLeft, blue, yellow], changed: 0,
        });
      }
    }
  } else if (text.includes('A games tray')) {
    const [a, b] = read(text, 'At first, ([0-9]+)/([0-9]+) of the counters are square');
    const [removed] = read(text, '([0-9]+) round counters are taken away');
    const [c, d] = read(text, 'Now ([0-9]+)/([0-9]+) of the counters in the tray are square');
    for (let total = 1; total <= 5000; total++) {
      if (total * a % b !== 0) continue;
      const squares = total * a / b;
      const rounds = total - squares;
      if (removed <= 0 || rounds <= removed) continue;
      if (squares * d !== (total - removed) * c) continue;
      solutions.push({
        kind: 'counters', answers: [squares],
        before: [squares, rounds], after: [squares, rounds - removed], changed: 1,
      });
    }
  } else if (text.includes('A hall has')) {
    const [total] = read(text, 'A hall has ([0-9]+) visitors');
    const [a, b] = read(text, '([0-9]+)/([0-9]+) of the visitors are adults');
    const [c, d] = read(text, '([0-9]+)/([0-9]+) of the children wear caps');
    const [e, f] = read(text, 'Then ([0-9]+)/([0-9]+) of the visitors still in the hall are adults');
    const adults = total * a / b;
    const children = total - adults;
    const caps = children * c / d;
    if (!Number.isInteger(adults) || !Number.isInteger(caps)) {
      throw new Error('Visible fractions give non-integer people');
    }
    for (let finalTotal = adults + caps + 1; finalTotal < total; finalTotal++) {
      if (adults * f !== finalTotal * e) continue;
      const withoutCaps = finalTotal - adults - caps;
      solutions.push({
        kind: 'visitors', answers: [adults, withoutCaps],
        before: [adults, caps, children - caps],
        after: [adults, caps, withoutCaps], changed: 2,
      });
    }
  } else {
    throw new Error('Unrecognised visible task');
  }
  if (solutions.length !== 1) {
    throw new Error(`Expected one solution from visible givens; found ${solutions.length}`);
  }
  return solutions[0]!;
}

const sum = (values: number[]) => values.reduce((total, n) => total + n, 0);

describe('unchanged category after removal', () => {
  test('independently solves all configurations across varied seeds and indices', () => {
    const seen: Record<Kind, Set<string>> = {
      buttons: new Set(), counters: new Set(), visitors: new Set(),
    };
    const seeds = [-31, -1, 0, ...Array.from({length: 100}, (_, i) => i + 1), 2147483647];
    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({context: q.context, prompt: q.prompt});
        seen[solution.kind].add(JSON.stringify([q.context, q.prompt]));
        const expected = solution.answers.map(String);
        expect(q.answer).toBe(expected.length === 1 ? expected[0] : JSON.stringify(expected));
        expect([...solution.before, ...solution.after].every(n => Number.isSafeInteger(n) && n > 0)).toBe(true);
        expect(sum(solution.before)).toBeLessThanOrEqual(1000);
        expect(sum(solution.after)).toBeLessThan(sum(solution.before));
        const removed = sum(solution.before) - sum(solution.after);
        expect(removed).toBeGreaterThan(0);
        expect(removed).toBeLessThan(solution.before[solution.changed]);
        solution.before.forEach((count, group) => {
          expect(solution.after[group]).toBe(group === solution.changed ? count - removed : count);
        });
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(5);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation).toBe(q.workedSteps?.map(step => step.text).join(' '));
        const fractions = [...(q.context ?? []).join(' ').matchAll(/([0-9]+)\/([0-9]+)/g)];
        for (const fraction of fractions) {
          expect(Number(fraction[1])).toBeGreaterThan(0);
          expect(Number(fraction[1])).toBeLessThan(Number(fraction[2]));
          expect(Number(fraction[2])).toBeLessThanOrEqual(9);
        }
        if (expected.length === 2) {
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-pair') throw new Error('Linked parts need two numeric fields');
          expect(q.prompt).toContain('(a)');
          expect(q.prompt).toContain('(b)');
          expect(spec.firstLabel).toContain('(a)');
          expect(spec.secondLabel).toContain('(b)');
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(expected))).toBe(true);
          for (let part = 0; part < 2; part++) {
            const wrong = [...expected];
            wrong[part] = String(Number(wrong[part]) + 1);
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(wrong))).toBe(false);
          }
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0]]))).toBe(false);
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('counters');
        }
        if (solution.kind === 'buttons') expect(q.unit).toBe('buttons');
        if (solution.kind === 'visitors') expect(q.unit).toBe('people');
      }
    }
    for (const kind of ['buttons', 'counters', 'visitors'] as const) {
      expect(seen[kind].size).toBeGreaterThanOrEqual(12);
    }
  });

  test('is reproducible and cycles through all three visible configurations', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-unchanged-category-after-removal');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P3.S.FRAC.01']);
    for (const seed of [-7, 0, 17, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<Kind>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        keys.add(q.key);
        kinds.add(solveVisible({context: q.context, prompt: q.prompt}).kind);
      }
      expect(keys.size).toBe(3);
      expect(kinds.size).toBe(3);
    }
  });
});
