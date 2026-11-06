import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragAlternativeQuantities';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Mode = 'unit-price' | 'original-money' | 'larger-purchase' | 'mixed-sizes';
type Solution = {mode: Mode; answers: number[]};

function match(text: string, expression: RegExp): RegExpMatchArray {
  const result = text.match(expression);
  if (!result) throw new Error(`Missing visible given: ${expression}`);
  return result;
}

function cents(text: string): number {
  const parts = match(text, /^(\d+)\.(\d{2})$/);
  return Number(parts[1]) * 100 + Number(parts[2]);
}

function dollars(value: number): string {
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, '0')}`;
}

// Only pupil-visible context and prompt enter this solver. No answer, hint,
// worked steps, seed, or generator parameters are available here.
function solveVisible(q: VisibleQuestion): Solution {
  const text = (q.context ?? []).join(' ');
  if (text.includes('Amina')) {
    const high = match(text, /needs \$(\d+\.\d{2}) more to pay for (\d+) notebooks/);
    const low = match(text, /buys (\d+) notebooks instead, she will have \$(\d+\.\d{2}) left/);
    const short = cents(high[1]);
    const wanted = Number(high[2]);
    const bought = Number(low[1]);
    const left = cents(low[2]);
    expect(wanted).toBeGreaterThan(bought);
    expect(bought).toBeGreaterThan(0);
    expect(short).toBeGreaterThan(0);
    expect(left).toBeGreaterThan(0);

    // Enumerate cent prices and require BOTH budget statements to agree.
    // The sum of the balances bounds a positive unit price because there
    // is at least one extra notebook in the larger plan.
    const solutions: {price: number; funds: number}[] = [];
    for (let price = 1; price <= short + left; price++) {
      const fundsFromSmall = bought * price + left;
      const fundsFromLarge = wanted * price - short;
      if (fundsFromSmall === fundsFromLarge) {
        solutions.push({price, funds: fundsFromSmall});
      }
    }
    expect(solutions).toHaveLength(1);
    const solution = solutions[0]!;
    expect(solution.funds).toBeGreaterThan(bought * solution.price);
    expect(solution.funds).toBeLessThan(wanted * solution.price);
    if (q.prompt === 'What is the price of one notebook?') {
      return {mode: 'unit-price', answers: [solution.price]};
    }
    expect(q.prompt).toBe('How much money does Amina have before buying any notebooks?');
    return {mode: 'original-money', answers: [solution.funds]};
  }

  if (text.includes('Farah')) {
    const offer = match(text, /charges \$(\d+\.\d{2}) for every (\d+) m of cord/);
    const purchase = match(text, /Farah buys (\d+) m of cord and has \$(\d+\.\d{2}) left/);
    const target = match(q.prompt, /buy (\d+) m of cord in total with her original money/);
    const offerCost = cents(offer[1]);
    const offerLength = Number(offer[2]);
    const boughtLength = Number(purchase[1]);
    const left = cents(purchase[2]);
    const targetLength = Number(target[1]);
    expect(offerLength).toBeGreaterThan(0);
    expect(offerCost % offerLength).toBe(0);
    expect(boughtLength).toBeGreaterThan(0);
    expect(targetLength).toBeGreaterThan(boughtLength);
    expect(left).toBeGreaterThan(0);
    const unitPrice = offerCost / offerLength;
    const funds = boughtLength * unitPrice + left;
    const needed = targetLength * unitPrice - funds;
    expect(needed).toBeGreaterThan(0);
    expect(Number.isSafeInteger(needed)).toBe(true);
    // Verify the minimal extra amount using the larger total cost.
    expect(funds + needed).toBe(targetLength * unitPrice);
    expect(funds + needed - 1).toBeLessThan(targetLength * unitPrice);
    return {mode: 'larger-purchase', answers: [needed]};
  }

  expect(text).toContain('Leela');
  const purchase = match(text, /pays \$(\d+\.\d{2}) for (\d+) large sketchbooks and (\d+) small sketchbooks/);
  const shortage = match(text, /needs \$(\d+\.\d{2}) more to afford one more large sketchbook/);
  const balance = match(text, /buys one more small sketchbook instead and has \$(\d+\.\d{2}) left/);
  const total = cents(purchase[1]);
  const largeCount = Number(purchase[2]);
  const smallCount = Number(purchase[3]);
  const short = cents(shortage[1]);
  const left = cents(balance[1]);
  expect(largeCount).toBeGreaterThan(0);
  expect(smallCount).toBeGreaterThan(0);
  expect(short).toBeGreaterThan(0);
  expect(left).toBeGreaterThan(0);
  expect(q.prompt).toContain('(a)');
  expect(q.prompt).toContain('(b)');

  // Enumerate possible small prices, recover the large price from the
  // first bill, then check the subsequent purchase and failed purchase.
  const solutions: {small: number; large: number; remaining: number}[] = [];
  for (let small = 1; small <= Math.floor(total / smallCount); small++) {
    const largeTotal = total - smallCount * small;
    if (largeTotal <= 0 || largeTotal % largeCount !== 0) continue;
    const large = largeTotal / largeCount;
    const remaining = small + left;
    if (large > small && large - remaining === short) {
      solutions.push({small, large, remaining});
    }
  }
  expect(solutions).toHaveLength(1);
  const solution = solutions[0]!;
  expect(solution.remaining).toBeGreaterThan(solution.small);
  expect(solution.remaining).toBeLessThan(solution.large);
  const initial = total + solution.remaining;
  expect(initial - total - solution.small).toBe(left);
  expect(initial - total + short).toBe(solution.large);
  return {mode: 'mixed-sizes', answers: [solution.large - solution.small, initial]};
}

const seeds = [-2147483648, -73, -1, 0, 2147483647, 4294967295,
  ...Array.from({length: 48}, (_, i) => 97 * (i + 1))];

describe('alternative quantities with one price', () => {
  it('has the requested P5 family metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-alternative-quantities-one-price');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.RATE.02', 'P4.S.DEC.05', 'P4.S.DEC.06']);
  });

  it('independently solves every mode from visible givens across varied seeds', () => {
    const counts: Record<Mode, number> = {
      'unit-price': 0, 'original-money': 0, 'larger-purchase': 0, 'mixed-sizes': 0,
    };
    const visibleQuestions = new Set<string>();
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({context: q.context, prompt: q.prompt});
        counts[solution.mode]++;
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        expect(solution.answers.every(value => Number.isSafeInteger(value) && value > 0)).toBe(true);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.workedSteps!.every(step => step.text.length > 0 && Boolean(step.equation))).toBe(true);
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        if (solution.mode === 'mixed-sizes') {
          expect(q.structuredResponse).toMatchObject({kind: 'number-pair', decimal: true});
          expect(JSON.parse(q.answer)).toEqual(solution.answers.map(dollars));
        } else {
          expect(q.structuredResponse).toBeUndefined();
          expect(q.unit).toBe('dollars');
          expect(q.answer).toBe(dollars(solution.answers[0]!));
        }
      }
    }
    for (const count of Object.values(counts)) expect(count).toBeGreaterThan(40);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('preserves both linked answers and accepts equivalent decimal entry', () => {
    let checked = 0;
    for (const seed of seeds.slice(0, 12)) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({context: q.context, prompt: q.prompt});
        if (solution.mode !== 'mixed-sizes') continue;
        checked++;
        const spec = q.structuredResponse!;
        const [difference, initial] = solution.answers as [number, number];
        const equivalent = JSON.stringify([String(difference / 100), String(initial / 100)]);
        expect(structuredResponseCorrect(spec, q.answer, equivalent)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([dollars(initial), dollars(difference)]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([dollars(difference), dollars(initial + 1)]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([dollars(difference)]))).toBe(false);
      }
    }
    expect(checked).toBe(12);
  });

  it('is deterministic and selects all four modes within four consecutive indices', () => {
    for (const seed of seeds.slice(0, 16)) {
      const modes = new Set<Mode>();
      for (let index = 0; index < 4; index++) {
        const first = makeRagQuestion(seed, index);
        makeRagQuestion(seed + 1, index + 11);
        expect(makeRagQuestion(seed, index)).toEqual(first);
        modes.add(solveVisible({context: first.context, prompt: first.prompt}).mode);
      }
      expect(modes.size).toBe(4);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
