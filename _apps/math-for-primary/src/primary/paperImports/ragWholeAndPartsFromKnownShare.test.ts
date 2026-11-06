import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragWholeAndPartsFromKnownShare';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solved = {
  kind: 'complement-target' | 'direct-whole' | 'complement-whole' | 'allocation';
  total: number;
  value: number;
  known: number;
  fractions: [number, number][];
  unit: string;
};

function visible(q: Question): Visible {
  return {context: q.context, prompt: q.prompt, unit: q.unit};
}

function numbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match.slice(1).map(Number);
}

// Independently search possible integer wholes using the visible relationships.
// This does not import the generator's fraction tables, random state or helpers.
function uniqueWhole(satisfies: (total: number) => boolean): number {
  const matches: number[] = [];
  for (let total = 1; total <= 10000; total++) {
    if (satisfies(total)) matches.push(total);
  }
  if (matches.length !== 1) throw new Error(`Expected one whole, found ${matches.length}`);
  return matches[0]!;
}

function solveVisible(q: Visible): Solved {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'How many flags were put in the box?') {
    const [a, b] = numbers(text, /(\d+)\/(\d+) of all the flags were blue\./);
    const [known] = numbers(text, /There were (\d+) yellow flags\./);
    const [c, d] = numbers(text, /hung (\d+)\/(\d+) of all the flags/);
    const total = uniqueWhole(t => t * (b - a) === known * b);
    return {kind: 'complement-target', total, value: total - total * c / d,
      known, fractions: [[a, b], [c, d]], unit: 'flags'};
  }
  if (q.prompt === 'How many beads are in the jar altogether?') {
    const [a, b] = numbers(text, /(\d+)\/(\d+) of all the beads are green\./);
    const [known] = numbers(text, /There are (\d+) green beads\./);
    const total = uniqueWhole(t => t * a === known * b);
    return {kind: 'direct-whole', total, value: total,
      known, fractions: [[a, b]], unit: 'beads'};
  }
  if (q.prompt === 'How many counters are on the tray altogether?') {
    const [a, b] = numbers(text, /(\d+)\/(\d+) of all the counters are red\./);
    const [known] = numbers(text, /There are (\d+) white counters\./);
    const total = uniqueWhole(t => t * (b - a) === known * b);
    return {kind: 'complement-whole', total, value: total,
      known, fractions: [[a, b]], unit: 'counters'};
  }
  if (q.prompt === 'How many grams of clay were used for the bowls?') {
    const [a, b] = numbers(text, /(\d+)\/(\d+) of the starting mass was used for bowls\./);
    const [c, d] = numbers(text, /(\d+)\/(\d+) of the starting mass was used for tiles\./);
    const [known] = numbers(text, /left over had a mass of (\d+) g\./);
    const total = uniqueWhole(t => t * (b * d - a * d - c * b) === known * b * d);
    return {kind: 'allocation', total, value: total * a / b,
      known, fractions: [[a, b], [c, d]], unit: 'g'};
  }
  throw new Error(`Unknown visible task: ${q.prompt}`);
}

describe('whole and parts from a known share', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [-2147483648, -17, -1, 0, 1, 42, 2026, 2147483647,
      ...Array.from({length: 48}, (_, i) => 37 * i + 5)];
    const kinds = new Set<string>();
    const distinctGivens = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        distinctGivens.add(JSON.stringify(visible(q)));
        expect(q.answer).toBe(String(solved.value));
        expect(q.unit).toBe(solved.unit);
        expect(Number.isSafeInteger(solved.total)).toBe(true);
        expect(Number.isSafeInteger(solved.value)).toBe(true);
        expect(solved.total).toBeLessThanOrEqual(2000);
        expect(solved.known).toBeGreaterThan(0);
        expect(solved.known).toBeLessThan(solved.total);
        expect(solved.value).toBeGreaterThan(0);
        expect(solved.value).toBeLessThanOrEqual(solved.total);
        for (const [n, d] of solved.fractions) {
          expect(n).toBeGreaterThan(0);
          expect(n).toBeLessThan(d);
          expect(d).toBeLessThanOrEqual(12);
          expect((solved.total * n) % d).toBe(0);
        }
        if (solved.kind === 'complement-target') {
          // Prevent a degenerate item whose requested amount is already given.
          expect(solved.value).not.toBe(solved.known);
          const [n, d] = solved.fractions[1]!;
          // The later fraction applies to the original whole, not the known colour.
          expect(solved.value).not.toBe(solved.known * (d - n) / d);
        }
        if (solved.kind === 'allocation') {
          const [[a, b], [c, d]] = solved.fractions;
          expect(a * d + c * b).toBeLessThan(b * d);
          expect(solved.total * a / b + solved.total * c / d + solved.known)
            .toBe(solved.total);
          expect(solved.value).toBeLessThan(solved.total);
        }
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps!.every(step => !!step.text && !!step.equation)).toBe(true);
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
      }
    }
    expect(kinds.size).toBe(4);
    expect(distinctGivens.size).toBeGreaterThan(40);
  });

  it('is reproducible and visits all four variants over consecutive indices', () => {
    for (const seed of [-2147483648, -1, 0, 7, 2026, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<string>();
      for (let index = 0; index < 4; index++) {
        kinds.add(solveVisible(visible(makeRagQuestion(seed, index))).kind);
      }
      expect(kinds.size).toBe(4);
      for (const index of [-9, -1, 0, 3, 17, 2147483647]) {
        const q = makeRagQuestion(seed, index);
        expect(q).toEqual(makeRagQuestion(seed, index));
        expect(q.answer).toBe(String(solveVisible(visible(q)).value));
      }
    }
  });

  it('checks the independent solver against four hand-solved public examples', () => {
    const fixtures: {question: Visible; total: number; value: number}[] = [
      {
        question: {
          context: ['The flags are only blue or yellow.', '2/5 of all the flags were blue.',
            'There were 126 yellow flags.', 'The club hung 1/3 of all the flags and boxed the rest.'],
          prompt: 'How many flags were put in the box?', unit: 'flags',
        }, total: 210, value: 140,
      },
      {
        question: {
          context: ['3/7 of all the beads are green.', 'There are 81 green beads.'],
          prompt: 'How many beads are in the jar altogether?', unit: 'beads',
        }, total: 189, value: 189,
      },
      {
        question: {
          context: ['There are only red and white counters.', '5/8 of all the counters are red.',
            'There are 66 white counters.'],
          prompt: 'How many counters are on the tray altogether?', unit: 'counters',
        }, total: 176, value: 176,
      },
      {
        question: {
          context: ['2/7 of the starting mass was used for bowls.',
            '1/3 of the starting mass was used for tiles.', 'The clay left over had a mass of 320 g.'],
          prompt: 'How many grams of clay were used for the bowls?', unit: 'g',
        }, total: 840, value: 240,
      },
    ];
    for (const fixture of fixtures) {
      const solved = solveVisible(fixture.question);
      expect(solved.total).toBe(fixture.total);
      expect(solved.value).toBe(fixture.value);
    }
  });
});
