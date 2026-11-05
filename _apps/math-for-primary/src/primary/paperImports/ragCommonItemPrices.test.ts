import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragCommonItemPrices';

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

function cents(text: string): number {
  const match = capture(text, /^(\d+)\.(\d{2})$/);
  return Number(match[1]) * 100 + Number(match[2]);
}

function readVisibleGivens(q: Question) {
  const context = (q.context ?? []).join('\n');
  const large = capture(context, /One purchase contains 1 art box and (\d+) paintbrushes\. It costs \$(\d+\.\d{2})\./);
  const small = capture(context, /A second purchase contains 1 art box and 1 paintbrush\. It costs \$(\d+\.\d{2})\./);
  const requested = capture(q.prompt, /\(a\) What is the total price of (\d+) paintbrushes\?/);
  const difference = capture(q.prompt, /\(b\) An art box costs \$(\d+\.\d{2}) more than one paintbrush\./);
  return {
    count: Number(large[1]),
    large: cents(large[2]),
    small: cents(small[1]),
    requested: Number(requested[1]),
    gap: cents(difference[1]),
  };
}

// Independently enumerate positive cent prices using only the visible purchases
// and comparison. This does not use the generator's random parameters or helpers.
function solveVisible(q: Question) {
  const given = readVisibleGivens(q);
  const solutions: {brush: number; box: number}[] = [];
  for (let brush = 1; brush < given.small; brush += 1) {
    const box = given.small - brush;
    if (box + given.count * brush === given.large && box - brush === given.gap) {
      solutions.push({brush, box});
    }
  }
  expect(solutions).toHaveLength(1);
  const solution = solutions[0];
  return {
    given,
    ...solution,
    first: given.requested * solution.brush,
    second: solution.box,
  };
}

const seeds = [-2147483648, -17, 0, 1, 2147483647,
  ...Array.from({length: 64}, (_, i) => 101 + i * 37)];

 describe('common-item purchase prices', () => {
  test('both answers satisfy all visible givens across varied seeds and indices', () => {
    const distinct = new Set<string>();
    const counts = new Set<number>();
    for (const seed of seeds) {
      for (const index of [0, 1, 7, 23]) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(q);
        const {given, brush, box, first, second} = solved;
        const answer: unknown = JSON.parse(q.answer);
        expect(Array.isArray(answer)).toBe(true);
        const pair = answer as string[];
        expect(pair).toHaveLength(2);
        expect(pair.map(cents)).toEqual([first, second]);
        expect(given.requested).toBe(given.count - 1);
        expect(first).toBe(given.large - given.small);
        // An alternative route for part (b) must agree with the linked route.
        expect(second * 2).toBe(given.small + given.gap);
        expect(box + brush).toBe(given.small);
        expect(box + given.count * brush).toBe(given.large);
        expect(box - brush).toBe(given.gap);
        expect(box).toBeGreaterThan(brush);
        expect(given.count).toBeGreaterThanOrEqual(3);
        expect(given.count).toBeLessThanOrEqual(5);
        expect(first).toBeGreaterThan(0);
        expect(first).toBeLessThanOrEqual(999);
        expect(first % given.requested).toBe(0);
        expect(q.unit).toBe('dollars');
        expect(q.picture).toBeUndefined();
        expect(q.context?.[0]).toContain('every art box has the same price');
        expect(q.context?.[0]).toContain('Every paintbrush has the same price');
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.explanation).toBe(q.workedSteps!.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '));
        distinct.add(JSON.stringify(q.context));
        counts.add(given.requested);
      }
    }
    expect(distinct.size).toBeGreaterThan(1);
    expect([...counts].sort()).toEqual([2, 3, 4]);
  });

  test('the existing response control accepts equivalent decimals and rejects wrong or incomplete pairs', () => {
    for (const seed of seeds.slice(0, 12)) {
      const q = makeRagQuestion(seed);
      const spec = q.structuredResponse;
      if (!spec || spec.kind !== 'number-pair') throw new Error('A number-pair response is required');
      expect(spec.decimal).toBe(true);
      expect(spec.firstLabel).toContain('(a)');
      expect(spec.secondLabel).toContain('(b)');
      const {first, second} = solveVisible(q);
      const equivalent = JSON.stringify([String(first / 100), (second / 100).toFixed(3)]);
      expect(structuredResponseReady(spec, equivalent)).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, equivalent)).toBe(true);
      for (const wrong of [
        JSON.stringify([((first + 1) / 100).toFixed(2), (second / 100).toFixed(2)]),
        JSON.stringify([(first / 100).toFixed(2), ((second + 1) / 100).toFixed(2)]),
      ]) {
        expect(structuredResponseCorrect(spec, q.answer, wrong)).toBe(false);
      }
      expect(structuredResponseReady(spec, JSON.stringify(['', String(second / 100)]))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(first / 100)]))).toBe(false);
      if (first !== second) {
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(second / 100), String(first / 100)]))).toBe(false);
      }
    }
  });

  test('metadata and seeded generation retain the candidate contract', () => {
    expect(RAG_PATTERN.level).toBe(3);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('common-item-total-difference-then-unit-price-gap-pair');
    expect(RAG_PATTERN.skillIds).toEqual(['P3.S.MONEY.01', 'P3.S.MD.04']);
    for (const seed of seeds.slice(0, 12)) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      expect(makeRagQuestion(seed, 7)).toEqual(makeRagQuestion(seed, 7));
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
  });
});
