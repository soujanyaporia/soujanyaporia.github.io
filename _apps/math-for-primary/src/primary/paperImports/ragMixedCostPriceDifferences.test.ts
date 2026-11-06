import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragMixedCostPriceDifferences';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution = {kind: 'lower' | 'subtotal' | 'higher'; answers: number[]; total: number; cheapCount: number; dearCount: number; cheapPrice: number; dearPrice: number};

function match(text: string, pattern: RegExp): RegExpMatchArray {
  const result = text.match(pattern);
  if (!result) throw new Error(`Missing visible given: ${text}`);
  return result;
}

// Search possible prices using only the printed purchase and price difference.
function prices(total: number, cheapCount: number, dearCount: number, gap: number) {
  const solutions: {cheapPrice: number; dearPrice: number}[] = [];
  for (let cheapPrice = 1; cheapPrice <= Math.floor(total / cheapCount); cheapPrice++) {
    const dearPrice = cheapPrice + gap;
    if (cheapCount * cheapPrice + dearCount * dearPrice === total) solutions.push({cheapPrice, dearPrice});
  }
  if (solutions.length !== 1) throw new Error('Visible prices must have exactly one positive whole-dollar solution');
  return solutions[0];
}

// No answer, explanation, proof, RNG state or generation parameters enter this solver.
function solveVisible(visible: Visible): Solution {
  const context = visible.context ?? [];
  if (visible.prompt.startsWith('(a)')) {
    const first = match(context[0] ?? '', /^To set up a reading corner, Dara spends (\d+)\/(\d+) of her money on 1 desk and (\d+) stools\.$/);
    const second = match(context[1] ?? '', /^She uses 1\/(\d+) of the money left after that purchase to buy a fan for \$(\d+)\.00\.$/);
    const relation = match(context[2] ?? '', /^Each stool costs \$(\d+)\.00 less than the desk\. All the stools have the same price\.$/);
    const [n, d, cheapCount] = first.slice(1).map(Number);
    const [fanDenominator, fan] = second.slice(1).map(Number);
    const gap = Number(relation[1]);
    if (!(n > 0 && n < d && d <= 8 && fanDenominator >= 2 && fanDenominator <= 4)) throw new Error('Invalid fractions');
    // Enumerate starting amounts and check the forward fraction relation exactly.
    const startingAmounts: number[] = [];
    for (let initial = 1; initial <= 10000; initial++) {
      if (initial * (d - n) === fan * d * fanDenominator) startingAmounts.push(initial);
    }
    if (startingAmounts.length !== 1) throw new Error('Starting amount is not uniquely recoverable');
    const total = startingAmounts[0] * n / d;
    if (!Number.isInteger(total)) throw new Error('Furniture total must be whole dollars');
    const found = prices(total, cheapCount, 1, gap);
    return {kind: 'higher', answers: [total, found.dearPrice], total, cheapCount, dearCount: 1, ...found};
  }
  const purchase = match(context[0] ?? '', /^Hana pays \$(\d+)\.00 for (\d+) folders and (\d+) notebooks for her class\.$/);
  const relation = match(context[2] ?? '', /^Each notebook costs \$(\d+)\.00 more than each folder\.$/);
  const [total, cheapCount, dearCount] = purchase.slice(1).map(Number);
  const found = prices(total, cheapCount, dearCount, Number(relation[1]));
  if (visible.prompt === 'What is the price of one folder?') {
    return {kind: 'lower', answers: [found.cheapPrice], total, cheapCount, dearCount, ...found};
  }
  const requested = match(visible.prompt, /^What is the total cost of the (\d+) folders\?$/);
  if (Number(requested[1]) !== cheapCount) throw new Error('Requested category count differs from purchase');
  return {kind: 'subtotal', answers: [cheapCount * found.cheapPrice], total, cheapCount, dearCount, ...found};
}

describe('mixed cost with price differences', () => {
  it('checks the independent solver against small hand-calculated visible examples', () => {
    const context = ['Hana pays $112.00 for 3 folders and 2 notebooks for her class.', 'All folders have the same price, and all notebooks have the same price.', 'Each notebook costs $6.00 more than each folder.'];
    expect(solveVisible({context, prompt: 'What is the price of one folder?'}).answers).toEqual([20]);
    expect(solveVisible({context, prompt: 'What is the total cost of the 3 folders?'}).answers).toEqual([60]);
    expect(solveVisible({
      context: ['To set up a reading corner, Dara spends 1/4 of her money on 1 desk and 3 stools.', 'She uses 1/2 of the money left after that purchase to buy a fan for $90.00.', 'Each stool costs $8.00 less than the desk. All the stools have the same price.'],
      prompt: '(a) How much does Dara spend on the desk and stools altogether? (b) What is the price of the desk?',
    }).answers).toEqual([60, 21]);
  });

  it('independently solves all three variants across varied seeds and indices', () => {
    const seeds = [-2147483648, -19, -1, 0, 1, 17, 2026, 2147483647, 4294967295, ...Array.from({length: 96}, (_, i) => i * 7919)];
    const seen = new Set<string>();
    const statements = new Set<string>();
    for (const seed of seeds) {
      const perSeed = new Set<string>();
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        seen.add(solved.kind);
        perSeed.add(solved.kind);
        statements.add(JSON.stringify([q.context, q.prompt]));
        expect(makeRagQuestion(seed, index)).toEqual(q);
        expect(q.key).toBe(`${RAG_PATTERN.id}:${seed}:${index}`);
        expect(solved.total).toBeGreaterThan(0);
        expect(solved.total).toBeLessThanOrEqual(9999);
        expect(solved.cheapCount + solved.dearCount).toBeLessThanOrEqual(9);
        expect(solved.cheapPrice).toBeGreaterThan(0);
        expect(solved.dearPrice).toBeGreaterThan(solved.cheapPrice);
        expect(solved.cheapCount * solved.cheapPrice + solved.dearCount * solved.dearPrice).toBe(solved.total);
        expect(q.picture).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(solved.kind === 'higher' ? 6 : solved.kind === 'subtotal' ? 4 : 3);
        expect(q.explanation).toBe(q.workedSteps?.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '));
        if (solved.kind === 'higher') {
          expect(q.structuredResponse?.kind).toBe('number-pair');
          const entries: string[] = JSON.parse(q.answer);
          expect(entries).toHaveLength(2);
          expect(entries.map(Number)).toEqual(solved.answers);
          expect(entries.every(entry => /^\d+\.\d{2}$/.test(entry))).toBe(true);
          if (!q.structuredResponse) throw new Error('Missing linked response fields');
          expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(solved.answers.map(String)))).toBe(true);
          expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([String(solved.answers[0]), String(solved.answers[1] + 1)]))).toBe(false);
          expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify([...solved.answers].reverse().map(String)))).toBe(false);
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(solved.cheapCount === solved.dearCount).toBe(false);
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          expect(Number(q.answer)).toBe(solved.answers[0]);
        }
      }
      expect([...perSeed].sort()).toEqual(['higher', 'lower', 'subtotal']);
    }
    expect([...seen].sort()).toEqual(['higher', 'lower', 'subtotal']);
    expect(statements.size).toBeGreaterThan(200);
  });

  it('keeps the family metadata within the supplied curriculum', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-mixed-cost-with-price-differences');
    const allowed = new Set(['P5.S.RATE.02', 'P4.S.FRAC.03']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });
});
