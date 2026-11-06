import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragWeightedRatioBundles';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  kind: 'individual' | 'purchase' | 'linked';
  values: string[];
  unit: string;
};

function readNumbers(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${pattern}`);
  return match.slice(1).map(Number);
}

function only<T>(values: T[]): T {
  expect(values).toHaveLength(1);
  return values[0]!;
}

// This solver receives only pupil-visible text. It enumerates integer solutions
// to the stated constraints rather than using generation data or worked steps.
function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join('\n');
  if (text.includes('large tubs')) {
    const [large, small, total] = readNumbers(text,
      /filled (\d+) large tubs and (\d+) small tubs with (\d+) counters altogether\./);
    const [multiple] = readNumbers(text,
      /Each large tub contains (\d+) times as many counters as each small tub\./);
    expect(text).toContain('All large tubs contain the same number of counters.');
    expect(text).toContain('All small tubs contain the same number of counters.');
    expect(q.prompt).toBe('How many counters are in each small tub?');
    const candidates: number[] = [];
    for (let smallAmount = 1; smallAmount <= total; smallAmount++) {
      const largeAmount = smallAmount * multiple;
      if (large * largeAmount + small * smallAmount === total) candidates.push(smallAmount);
    }
    return {kind: 'individual', values: [String(only(candidates))], unit: 'counters'};
  }

  if (text.includes('art club')) {
    const [total] = readNumbers(text, /paid \$(\d+) for marker pens and rulers\./);
    const [penParts, rulerParts] = readNumbers(text,
      /ratio of the number of marker pens to the number of rulers was (\d+):(\d+)\./);
    const [penPrice, rulerPrice] = readNumbers(text,
      /Each marker pen cost \$(\d+)\. Each ruler cost \$(\d+)\./);
    const candidates: {pens: number; rulers: number}[] = [];
    for (let rulers = 1; rulers * rulerPrice < total; rulers++) {
      const moneyForPens = total - rulers * rulerPrice;
      if (moneyForPens % penPrice !== 0) continue;
      const pens = moneyForPens / penPrice;
      if (pens * rulerParts === rulers * penParts) candidates.push({pens, rulers});
    }
    const counts = only(candidates);
    const target = /^How many (marker pens|rulers) did the art club buy\?$/.exec(q.prompt)?.[1];
    if (!target) throw new Error('Missing purchase target');
    return {
      kind: 'purchase',
      values: [String(target === 'marker pens' ? counts.pens : counts.rulers)],
      unit: target,
    };
  }

  if (text.includes('small flags')) {
    const [numerator, denominator, small, large] = readNumbers(text,
      /used (\d+)\/(\d+) of her sequins to decorate (\d+) small flags and (\d+) large flags\./);
    const [left] = readNumbers(text, /She had (\d+) sequins left\./);
    const [multiple] = readNumbers(text,
      /Each small flag had 1\/(\d+) as many sequins as each large flag\./);
    expect(numerator).toBeGreaterThan(0);
    expect(numerator).toBeLessThan(denominator);
    expect(denominator).toBeLessThanOrEqual(12);
    expect(text).toContain('Every small flag had the same number of sequins.');
    expect(text).toContain('Every large flag had the same number of sequins.');
    expect(q.prompt).toContain('(a) How many sequins did Siti use altogether?');
    expect(q.prompt).toContain('(b) How many sequins were on each large flag?');

    const possibleUsed: number[] = [];
    // Since the remainder is at least 1/denominator, this bounds the original total.
    for (let original = left + 1; original <= left * denominator; original++) {
      const used = original - left;
      if (used * denominator === original * numerator) possibleUsed.push(used);
    }
    const used = only(possibleUsed);
    const possibleLarge: number[] = [];
    for (let onLarge = 1; onLarge <= used; onLarge++) {
      if (onLarge % multiple !== 0) continue;
      const onSmall = onLarge / multiple;
      if (small * onSmall + large * onLarge === used) possibleLarge.push(onLarge);
    }
    return {kind: 'linked', values: [String(used), String(only(possibleLarge))], unit: 'sequins'};
  }
  throw new Error('Unknown visible question form');
}

const seeds = [-2147483648, -701, -1, 0, 1, 2147483647,
  ...Array.from({length: 40}, (_,i) => 17 * i + 3)];

function questions(): Question[] {
  return seeds.flatMap(seed => Array.from({length: 6}, (_,index) => makeRagQuestion(seed, index)));
}

describe('weighted ratio bundles', () => {
  it('has one P6 family with supported ratio skills', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-weighted-ratio-bundles');
    const supported = new Set(['P6.S.RATIO.01', 'P6.S.RATIO.02', 'P6.S.RATIO.03', 'P6.S.RATIO.04', 'P6.S.RATIO.05']);
    for (const skill of RAG_PATTERN.skillIds) expect(supported.has(skill)).toBe(true);
  });

  it('independently solves visible constraints across varied seeds and indices', () => {
    const kinds = new Set<string>();
    const purchaseTargets = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (const q of questions()) {
      const solved = solveVisible({prompt: q.prompt, context: q.context});
      kinds.add(solved.kind);
      if (solved.kind === 'purchase') purchaseTargets.add(solved.unit);
      visibleQuestions.add(JSON.stringify([q.prompt, q.context]));
      const actual: unknown = q.structuredResponse ? JSON.parse(q.answer) : [q.answer];
      expect(actual).toEqual(solved.values);
      expect(q.unit).toBe(solved.unit);
      for (const value of solved.values) {
        expect(Number.isSafeInteger(Number(value))).toBe(true);
        expect(Number(value)).toBeGreaterThan(0);
        expect(Number(value)).toBeLessThan(10000);
      }
      expect(q.structuredResponse?.kind).toBe(solved.kind === 'linked' ? 'number-pair' : undefined);
      expect(q.picture).toBeUndefined();
      expect(q.choices).toBeUndefined();
      expect(q.hint.trim().length).toBeGreaterThan(20);
      expect(q.explanation.trim().length).toBeGreaterThan(60);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(solved.kind === 'linked' ? 7 : 4);
    }
    expect([...kinds].sort()).toEqual(['individual', 'linked', 'purchase']);
    expect([...purchaseTargets].sort()).toEqual(['marker pens', 'rulers']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('retains both linked responses and grades them in the stated order', () => {
    let checked = 0;
    for (const q of questions()) {
      if (!q.structuredResponse) continue;
      const solved = solveVisible({prompt: q.prompt, context: q.context});
      const correct = JSON.stringify(solved.values);
      expect(structuredResponseCorrect(q.structuredResponse, q.answer, correct)).toBe(true);
      expect(structuredResponseCorrect(q.structuredResponse, q.answer,
        JSON.stringify([...solved.values].reverse()))).toBe(false);
      expect(structuredResponseCorrect(q.structuredResponse, q.answer,
        JSON.stringify([solved.values[0]]))).toBe(false);
      for (let field = 0; field < 2; field++) {
        const wrong = [...solved.values];
        wrong[field] = String(Number(wrong[field]) + 1);
        expect(structuredResponseCorrect(q.structuredResponse, q.answer, JSON.stringify(wrong))).toBe(false);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('is deterministic and uses index zero by default', () => {
    for (const seed of [-99, 0, 7, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (const index of [0, 1, 2, 8]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      const keys = Array.from({length: 8}, (_,index) => makeRagQuestion(seed, index).key);
      expect(new Set(keys).size).toBe(8);
    }
  });
});
