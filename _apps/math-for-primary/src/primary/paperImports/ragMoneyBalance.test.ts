import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragMoneyBalance';

type Visible = Pick<Question, 'prompt' | 'context'>;
type Solution = {
  kind: 'cash' | 'instalments' | 'addition';
  expectedCents: number;
  firstStepCents: number;
  amounts: number[];
  count?: number;
};

function cents(text: string): number {
  const match = /^(\d+)\.(\d{2})$/.exec(text);
  if (!match) throw new Error(`Invalid money amount: ${text}`);
  return Number(match[1]) * 100 + Number(match[2]);
}

function capture(text: string, pattern: RegExp): RegExpExecArray {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given: ${pattern}`);
  return match;
}

// Only pupil-visible text enters this solver. It receives no answer, seed,
// worked solution, proof or private generation parameters.
function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'How much cash did Samir hand to the cashier?') {
    const purchase = capture(text, /buys (\d+) notebooks for \$(\d+\.\d{2}) each\./);
    const change = cents(capture(text, /receives \$(\d+\.\d{2}) in change\./)[1]);
    const count = Number(purchase[1]);
    const price = cents(purchase[2]);
    let totalCost = 0;
    for (let item = 0; item < count; item++) totalCost += price;
    return {kind: 'cash', expectedCents: totalCost + change, firstStepCents: totalCost, amounts: [price, change], count};
  }
  if (q.prompt === 'What is the full price of the bicycle?') {
    const payment = cents(capture(text, /monthly instalments of \$(\d+\.\d{2})\./)[1]);
    const balance = capture(text, /After (\d+) instalments, \$(\d+\.\d{2}) is still unpaid\./);
    const count = Number(balance[1]);
    const unpaid = cents(balance[2]);
    let paid = 0;
    for (let month = 0; month < count; month++) paid += payment;
    return {kind: 'instalments', expectedCents: paid + unpaid, firstStepCents: paid, amounts: [payment, unpaid], count};
  }
  if (q.prompt === 'How much money did Nadia have before her uncle gave her more?') {
    const added = cents(capture(text, /gives her \$(\d+\.\d{2}) more/)[1]);
    const spending = capture(text, /spends \$(\d+\.\d{2}) and has \$(\d+\.\d{2}) left/);
    const spent = cents(spending[1]);
    const left = cents(spending[2]);
    return {kind: 'addition', expectedCents: spent + left - added, firstStepCents: spent + left, amounts: [added, spent, left]};
  }
  throw new Error('Unknown visible question');
}

function verifyEquation(equation: string): number {
  const m = capture(equation, /^(?:(\d+) × )?\$(\d+\.\d{2})(?: ([+−]) \$(\d+\.\d{2}))? = \$(\d+\.\d{2})$/);
  let value = (m[1] ? Number(m[1]) : 1) * cents(m[2]);
  if (m[3] === '+') value += cents(m[4]);
  if (m[3] === '−') value -= cents(m[4]);
  const result = cents(m[5]);
  expect(result).toBe(value);
  return result;
}

describe('reconstructing a money balance', () => {
  it('solves independently written visible examples', () => {
    const cashQuestion: Visible = {
      prompt: 'How much cash did Samir hand to the cashier?',
      context: ['Samir buys 24 notebooks for $1.35 each.', 'He receives $17.60 in change. He pays only for the notebooks.'],
    };
    const instalmentQuestion: Visible = {
      prompt: 'What is the full price of the bicycle?',
      context: ['A family pays for a bicycle in monthly instalments of $55.00.', 'After 18 instalments, $275.00 is still unpaid. There was no deposit or extra charge.'],
    };
    const additionQuestion: Visible = {
      prompt: 'How much money did Nadia have before her uncle gave her more?',
      context: ['Nadia has some money for an outing. Her uncle gives her $24.00 more before she buys anything.', 'She spends $43.75 and has $6.50 left after the outing.'],
    };
    expect(solveVisible(cashQuestion).expectedCents).toBe(5000);
    expect(solveVisible(instalmentQuestion).expectedCents).toBe(126500);
    expect(solveVisible(additionQuestion).expectedCents).toBe(2625);
  });

  it('solves visible givens and verifies responses and worked steps across varied seeds', () => {
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (let seed = -25; seed <= 75; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const result = solveVisible({prompt: q.prompt, context: q.context});
        kinds.add(result.kind);
        visibleQuestions.add(JSON.stringify([q.prompt, q.context]));
        expect(q.answer).toBe((result.expectedCents / 100).toFixed(2));
        expect(result.expectedCents).toBeGreaterThan(0);
        expect(result.expectedCents).toBeLessThan(500000);
        expect(result.amounts.every(n => Number.isSafeInteger(n) && n > 0)).toBe(true);
        if (result.count !== undefined) {
          expect(Number.isInteger(result.count)).toBe(true);
          expect(result.count).toBeGreaterThan(1);
          expect(result.count).toBeLessThanOrEqual(60);
        }
        expect(q.unit).toBe('dollars');
        expect(q.picture).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps).toHaveLength(2);
        const steps = q.workedSteps ?? [];
        const results = steps.map(step => verifyEquation(step.equation ?? ''));
        expect(results).toEqual([result.firstStepCents, result.expectedCents]);
        for (const step of steps) {
          expect(step.text.length).toBeGreaterThan(15);
          expect(q.explanation).toContain(step.text);
          expect(q.explanation).toContain(step.equation);
        }
        if (result.kind === 'instalments') {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices?.filter(value => cents(value) === result.expectedCents)).toHaveLength(1);
          expect(q.choices?.every(value => cents(value) > 0)).toBe(true);
          expect(q.context?.join(' ')).toContain('no deposit or extra charge');
        } else {
          expect(q.choices).toBeUndefined();
        }
        if (result.kind === 'addition') {
          const [added, spent, left] = result.amounts;
          expect(result.expectedCents + added - spent).toBe(left);
          expect(result.expectedCents).toBeLessThan(spent);
          expect(added).toBeGreaterThan(left);
        }
        if (result.kind === 'cash') {
          expect(result.expectedCents - result.firstStepCents).toBe(result.amounts[1]);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['addition', 'cash', 'instalments']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('repeats deterministically and reaches all contexts through the index', () => {
    for (const seed of [-2147483648, -1, 0, 1, 42, 2147483647]) {
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible({prompt: q.prompt, context: q.context}).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('reconstructing-money-balance');
  });
});
