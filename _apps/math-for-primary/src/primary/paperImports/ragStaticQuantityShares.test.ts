import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragStaticQuantityShares';

type Pair = [number, number];
type Kind = 'combined' | 'share' | 'category';
type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution = {kind: Kind; value: Pair; givenFraction: Pair; factor?: number; total?: number};

function rational(text: string): Pair {
  const match = /^(\d+)(?:\/([1-9]\d*))?$/.exec(text.trim());
  if (!match) throw new Error(`Not a non-negative rational: ${text}`);
  return [Number(match[1]), Number(match[2] ?? '1')];
}

function same(a: Pair, b: Pair): boolean {
  return a[0] * b[1] === b[0] * a[1];
}

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

// This solver receives only pupil-visible text. It never receives the answer,
// worked steps, proof, random state or any generation parameters.
function solveVisible(visible: Visible): Solution {
  const text = (visible.context ?? []).join(' ');
  if (visible.prompt === 'What is the total length of the two pieces, in metres?') {
    const length = capture(text, /The first piece is (\d+)\/(\d+) m long\./);
    const multiple = capture(text, /The second piece is (\d+) times as long as the first\./);
    const n = Number(length[1]);
    const d = Number(length[2]);
    const factor = Number(multiple[1]);
    // Count d-ths of a metre by repeated addition, including the first piece.
    let units = n;
    for (let copy = 0; copy < factor; copy++) units += n;
    return {kind: 'combined', value: [units, d], givenFraction: [n, d], factor};
  }
  if (visible.prompt === 'How much money has Marcus saved?') {
    const sum = capture(text, /Together, Isha and Marcus have \$(\d+) in their savings jars\./);
    const relation = capture(text, /Isha has (\d+)\/(\d+) as much money as Marcus\./);
    const total = Number(sum[1]);
    const n = Number(relation[1]);
    const d = Number(relation[2]);
    // Independently search whole-dollar allocations satisfying both givens.
    const allocations: number[] = [];
    for (let marcus = 1; marcus < total; marcus++) {
      const isha = total - marcus;
      if (isha * d === marcus * n) allocations.push(marcus);
    }
    if (allocations.length !== 1) throw new Error('Expected exactly one whole-dollar allocation');
    return {kind: 'share', value: [allocations[0]!, 1], givenFraction: [n, d], total};
  }
  if (visible.prompt === 'What fraction of all the stickers are purple?') {
    if (!text.includes('A sheet holds green, purple and orange stickers only.')) {
      throw new Error('The three categories must exhaust the whole');
    }
    const green = capture(text, /(\d+)\/(\d+) of all the stickers are green\./);
    const relation = capture(text, /There are (\d+) times as many purple stickers as orange stickers\./);
    const n = Number(green[1]);
    const d = Number(green[2]);
    const factor = Number(relation[1]);
    // Construct an integer collection satisfying the visible relations.
    // Its purple-to-total fraction does not depend on the collection's scale.
    for (let total = 1; total <= 5000; total++) {
      if (total * n % d !== 0) continue;
      const greenCount = total * n / d;
      for (let orange = 1; orange < total - greenCount; orange++) {
        const purple = factor * orange;
        if (greenCount + orange + purple === total) {
          return {kind: 'category', value: [purple, total], givenFraction: [n, d], factor, total};
        }
      }
    }
    throw new Error('No positive integer collection satisfies the visible givens');
  }
  throw new Error(`Unrecognised visible task: ${visible.prompt}`);
}

function checkReduced(text: string): void {
  const [n, d] = rational(text);
  for (let divisor = 2; divisor <= Math.min(n, d); divisor++) {
    expect(n % divisor === 0 && d % divisor === 0).toBe(false);
  }
}

describe('static quantity relationships and shares', () => {
  it('checks the independent solver against hand-calculated visible examples', () => {
    expect(same(solveVisible({
      prompt: 'What is the total length of the two pieces, in metres?',
      context: ['The first piece is 5/6 m long.', 'The second piece is 3 times as long as the first.'],
    }).value, [10, 3])).toBe(true);
    expect(same(solveVisible({
      prompt: 'How much money has Marcus saved?',
      context: ['Together, Isha and Marcus have $2700 in their savings jars.', 'Isha has 2/7 as much money as Marcus.'],
    }).value, [2100, 1])).toBe(true);
    expect(same(solveVisible({
      prompt: 'What fraction of all the stickers are purple?',
      context: [
        'A sheet holds green, purple and orange stickers only.',
        '2/5 of all the stickers are green.',
        'There are 3 times as many purple stickers as orange stickers.',
      ],
    }).value, [9, 20])).toBe(true);
  });

  it('independently solves visible givens across varied seeds and indices', () => {
    const seeds = [-2147483648, -81, -1, 0, ...Array.from({length: 96}, (_, i) => i + 1), 2147483647];
    const counts: Record<Kind, number> = {combined: 0, share: 0, category: 0};
    const choicePositions = new Set<number>();
    for (const seed of seeds) {
      for (let index = 0; index < 5; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({prompt: q.prompt, context: q.context});
        counts[solution.kind]++;
        const answer = rational(q.answer);
        expect(same(answer, solution.value)).toBe(true);
        checkReduced(q.answer);
        const [n, d] = solution.givenFraction;
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThan(d);
        expect(d).toBeLessThanOrEqual(12);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
        expect(q.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();

        if (solution.kind === 'share') {
          expect(q.choices).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(answer[1]).toBe(1);
          const total = solution.total!;
          const marcus = answer[0];
          expect(marcus).toBeGreaterThan(total - marcus);
          expect(marcus).toBeLessThan(total);
          expect((total - marcus) * d).toBe(marcus * n);
          expect(total).not.toBe(7800);
        } else {
          expect(solution.factor).toBeGreaterThanOrEqual(2);
          expect(solution.factor).toBeLessThanOrEqual(4);
          expect(q.choices).toHaveLength(4);
          const choices = q.choices!.map(rational);
          expect(choices.filter(choice => same(choice, solution.value))).toHaveLength(1);
          for (let i = 0; i < choices.length; i++) {
            checkReduced(q.choices![i]!);
            expect(choices[i]![0]).toBeGreaterThan(0);
            for (let j = i + 1; j < choices.length; j++) {
              expect(same(choices[i]!, choices[j]!)).toBe(false);
            }
          }
          choicePositions.add(choices.findIndex(choice => same(choice, solution.value)));
          if (solution.kind === 'combined') {
            expect(q.unit).toBe('m');
            expect(same(solution.givenFraction, [7, 8])).toBe(false);
            expect(answer[0] / answer[1]).toBeGreaterThan(n / d);
          } else {
            expect(q.unit).toBeUndefined();
            expect(same(solution.givenFraction, [1, 3])).toBe(false);
            for (const [numerator, denominator] of choices) {
              expect(numerator).toBeLessThan(denominator);
            }
            expect(answer[0] / answer[1]).toBeLessThan((d - n) / d);
          }
        }
      }
    }
    for (const count of Object.values(counts)) expect(count).toBeGreaterThan(30);
    expect(choicePositions.size).toBe(4);
  });

  it('is reproducible and varies its visible numerical givens', () => {
    const visibleQuestions = new Set<string>();
    const keys = new Set<string>();
    for (let seed = 0; seed < 64; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        keys.add(q.key);
      }
    }
    expect(makeRagQuestion(23)).toEqual(makeRagQuestion(23, 0));
    expect(keys.size).toBe(256);
    expect(visibleQuestions.size).toBeGreaterThan(30);
  });

  it('declares the required level, family and supported curriculum skills', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-static-quantity-relationships-and-shares');
    const supported = new Set(['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P6.S.RATIO.03', 'P6.S.RATIO.05']);
    expect(RAG_PATTERN.skillIds.every(id => supported.has(id))).toBe(true);
    expect(RAG_PATTERN.title.length).toBeGreaterThan(0);
    expect(RAG_PATTERN.objective.length).toBeGreaterThan(0);
  });
});
