import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragFractionalRelationships';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;
type Givens =
  | {kind: 'part-total'; total: number; n: number; d: number}
  | {kind: 'price-difference'; differenceCents: number; n: number; d: number}
  | {kind: 'fractional-equality'; total: number; a: number; b: number; c: number; d: number};

type Solution = {smaller: number; larger: number; answer: string};

function match(text: string, expression: RegExp): RegExpExecArray {
  const result = expression.exec(text);
  if (!result) throw new Error(`Cannot read visible givens: ${text}`);
  return result;
}

function readVisible(q: VisibleQuestion): Givens {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'How many purple counters are in the box?') {
    const total = Number(match(text, /There are (\d+) counters altogether\./)[1]);
    const fraction = match(text, /The number of green counters is (\d+)\/(\d+) of the number of purple counters\./);
    return {kind: 'part-total', total, n: Number(fraction[1]), d: Number(fraction[2])};
  }
  if (q.prompt === 'What is the price of the scooter, in dollars?') {
    const fraction = match(text, /A board game costs (\d+)\/(\d+) as much as a scooter\./);
    const money = match(text, /The scooter costs \$(\d+)\.(\d{2}) more than the board game\./);
    return {
      kind: 'price-difference',
      n: Number(fraction[1]),
      d: Number(fraction[2]),
      differenceCents: Number(money[1]) * 100 + Number(money[2]),
    };
  }
  if (q.prompt === 'How many more yellow beads than red beads are in the jar?') {
    const total = Number(match(text, /There are (\d+) beads altogether\./)[1]);
    const fraction = match(text, /equal: (\d+)\/(\d+) of the red beads and (\d+)\/(\d+) of the yellow beads\./);
    return {
      kind: 'fractional-equality', total,
      a: Number(fraction[1]), b: Number(fraction[2]),
      c: Number(fraction[3]), d: Number(fraction[4]),
    };
  }
  throw new Error(`Unexpected visible task: ${q.prompt}`);
}

// Enumerate possible counts or cent amounts. This solver receives only visible
// givens; it never reads answers, worked steps, seeds or generation parameters.
function solve(g: Givens): Solution {
  const solutions: Array<[number, number]> = [];
  if (g.kind === 'part-total') {
    for (let purple = 1; purple < g.total; purple += 1) {
      const green = g.total - purple;
      if (green * g.d === purple * g.n) solutions.push([green, purple]);
    }
  } else if (g.kind === 'price-difference') {
    // For a proper n/d, (d-n) is at least one, so this visible-data bound
    // includes every possible positive solution, measured in cents.
    for (let scooter = g.differenceCents + 1; scooter <= g.differenceCents * g.d; scooter += 1) {
      const boardGame = scooter - g.differenceCents;
      if (boardGame * g.d === scooter * g.n) solutions.push([boardGame, scooter]);
    }
  } else {
    for (let red = 1; red < g.total; red += 1) {
      const yellow = g.total - red;
      if (g.a * red * g.d === g.c * yellow * g.b) solutions.push([red, yellow]);
    }
  }
  if (solutions.length !== 1) throw new Error(`Expected one solution, found ${solutions.length}`);
  const [smaller, larger] = solutions[0];
  const answer = g.kind === 'price-difference'
    ? (larger / 100).toFixed(2)
    : String(g.kind === 'fractional-equality' ? larger - smaller : larger);
  return {smaller, larger, answer};
}

function checkProperReducedFraction(n: number, d: number): void {
  expect(Number.isInteger(n)).toBe(true);
  expect(Number.isInteger(d)).toBe(true);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(d);
  expect(d).toBeLessThanOrEqual(10);
  for (let factor = 2; factor <= n; factor += 1) {
    expect(n % factor === 0 && d % factor === 0).toBe(false);
  }
}

const seeds = [
  -2147483648, -17, -1, 0, 1, 2, 2147483647, 4294967295,
  ...Array.from({length: 96}, (_, i) => i * 37 + 11),
];

describe('fractional relationships candidate', () => {
  it('checks the independent solver against three hand-calculated visible examples', () => {
    const count = readVisible({
      prompt: 'How many purple counters are in the box?',
      context: [
        'An art box holds only green counters and purple counters.',
        'There are 98 counters altogether.',
        'The number of green counters is 2/5 of the number of purple counters.',
      ],
    });
    expect(solve(count)).toEqual({smaller: 28, larger: 70, answer: '70'});

    const price = readVisible({
      prompt: 'What is the price of the scooter, in dollars?',
      context: [
        'A board game costs 3/8 as much as a scooter.',
        'The scooter costs $35.00 more than the board game.',
      ],
    });
    expect(solve(price)).toEqual({smaller: 2100, larger: 5600, answer: '56.00'});

    const difference = readVisible({
      prompt: 'How many more yellow beads than red beads are in the jar?',
      context: [
        'A jar contains only red beads and yellow beads.',
        'There are 99 beads altogether.',
        'The numbers of beads in these two groups are equal: 2/3 of the red beads and 1/4 of the yellow beads.',
      ],
    });
    expect(solve(difference)).toEqual({smaller: 27, larger: 72, answer: '45'});
  });

  it('independently solves varied seeds and indices and checks response and quantity constraints', () => {
    const seen: Record<Givens['kind'], Set<string>> = {
      'part-total': new Set(),
      'price-difference': new Set(),
      'fractional-equality': new Set(),
    };
    for (const seed of seeds) {
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        // Pass a fresh object containing only the pupil-visible information.
        const givens = readVisible({prompt: q.prompt, context: q.context});
        const solution = solve(givens);
        expect(q.answer).toBe(solution.answer);
        expect(solution.smaller).toBeGreaterThan(0);
        expect(solution.larger).toBeGreaterThan(solution.smaller);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.gridDrawing).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        seen[givens.kind].add(JSON.stringify(givens));

        if (givens.kind === 'price-difference') {
          checkProperReducedFraction(givens.n, givens.d);
          expect(givens.differenceCents).toBeGreaterThan(0);
          expect(solution.larger).toBeLessThanOrEqual(20000);
          expect(solution.smaller % 100).toBe(0);
          expect(solution.larger % 100).toBe(0);
          expect(q.unit).toBe('dollars');
          expect(q.choices).toHaveLength(4);
          const choices = q.choices ?? [];
          expect(new Set(choices.map(Number)).size).toBe(4);
          expect(choices.filter(value => value === solution.answer)).toHaveLength(1);
          for (const choice of choices) {
            expect(choice).toMatch(/^\d+\.\d{2}$/);
            expect(Number(choice)).toBeGreaterThan(0);
          }
        } else {
          expect(givens.total).toBeLessThan(500);
          expect(solution.smaller + solution.larger).toBe(givens.total);
          expect(q.answer).toMatch(/^[1-9]\d*$/);
          expect(q.choices).toBeUndefined();
          if (givens.kind === 'part-total') {
            checkProperReducedFraction(givens.n, givens.d);
            expect((givens.n * solution.larger) % givens.d).toBe(0);
            expect(q.unit).toBe('counters');
          } else {
            checkProperReducedFraction(givens.a, givens.b);
            checkProperReducedFraction(givens.c, givens.d);
            expect((givens.a * solution.smaller) % givens.b).toBe(0);
            expect((givens.c * solution.larger) % givens.d).toBe(0);
            expect(q.unit).toBe('beads');
          }
        }
      }
    }
    for (const variants of Object.values(seen)) {
      expect(variants.size).toBeGreaterThan(20);
    }
  });

  it('reproduces complete questions deterministically and supports the default index', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('ratio-from-fractional-relationships');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    for (const seed of [-17, 0, 1, 57, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const keys = new Set<string>();
      const kinds = new Set<string>();
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        keys.add(q.key);
        kinds.add(readVisible({prompt: q.prompt, context: q.context}).kind);
      }
      expect(keys.size).toBe(6);
      expect(kinds.size).toBe(3);
    }
  });
});
