import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragBalanceDifferencesAfterChanges';

function match(text: string, pattern: RegExp): RegExpExecArray {
  const result = pattern.exec(text);
  if (!result) throw new Error(`Missing visible given: ${pattern.source}`);
  return result;
}

function cents(value: string): number {
  if (!/^\d+\.\d{2}$/.test(value)) throw new Error(`Invalid visible money: ${value}`);
  const [whole, fraction] = value.split('.');
  return Number(whole) * 100 + Number(fraction);
}

const dollars = (value: number): string => (value / 100).toFixed(2);

// Only visible context and prompt are accepted. Answers, explanations, choices
// and private generation parameters are unavailable to this solver.
function solveVisible(q: Pick<Question, 'context' | 'prompt'>) {
  const text = (q.context ?? []).join('\n');
  if (q.prompt.includes('before the fair')) {
    const gap = cents(match(text, /savings were \$(\d+\.\d{2}) greater/)[1]);
    const gift = cents(match(text, /aunt added \$(\d+\.\d{2})/)[1]);
    const spent = cents(match(text, /Ravi used \$(\d+\.\d{2})/)[1]);
    const multiple = Number(match(text, /Lena had (\d+) times/)[1]);
    // Solve for Ravi's ORIGINAL balance directly:
    // RaviStart + gap + gift = multiple * (RaviStart - spent).
    const raviStart = (multiple * spent + gap + gift) / (multiple - 1);
    const lenaStart = raviStart + gap;
    const raviEnd = raviStart - spent;
    const lenaEnd = lenaStart + gift;
    // Equal balances split the unchanged combined total equally.
    const equalBalance = (lenaEnd + raviEnd) / 2;
    const transfer = lenaEnd - equalBalance;
    return {
      kind: 'fair' as const,
      gap, gift, spent, multiple, raviStart, lenaStart,
      raviEnd, lenaEnd, equalBalance, transfer,
    };
  }
  if (!q.prompt.includes('model kit')) throw new Error('Unrecognised visible task');
  const gap = cents(match(text, /with \$(\d+\.\d{2}) more than Zaki/)[1]);
  const priceMultiple = Number(match(text, /model kit cost (\d+) times/)[1]);
  const purchases = match(text, /Isha bought (\d+) model kits and (\d+) paintbrushes\. Zaki bought (\d+) model kits and (\d+) paintbrushes/);
  const [ishaKits, ishaBrushes, zakiKits, zakiBrushes] = purchases.slice(1).map(Number);
  const ishaStart = cents(match(text, /Isha brought \$(\d+\.\d{2})/)[1]);
  const startingMultiple = Number(match(text, /starting amount was (\d+) times/)[1]);
  const zakiStart = ishaStart - gap;
  const zakiLeft = zakiStart / startingMultiple;
  const zakiSpent = zakiStart - zakiLeft;
  const brushPrice = zakiSpent / (zakiKits * priceMultiple + zakiBrushes);
  const kitPrice = priceMultiple * brushPrice;
  const ishaSpent = ishaKits * kitPrice + ishaBrushes * brushPrice;
  const ishaLeft = ishaStart - ishaSpent;
  // Compare actual balances, independently of the generator's unit-offset rule.
  const finalGap = Math.abs(ishaLeft - zakiLeft);
  const direction = finalGap > gap ? 'Increase' : finalGap < gap ? 'Decrease' : 'Stay the same';
  return {
    kind: 'stall' as const,
    gap, priceMultiple, startingMultiple, ishaStart, zakiStart,
    ishaKits, ishaBrushes, zakiKits, zakiBrushes,
    ishaSpent, zakiSpent, ishaLeft, zakiLeft, brushPrice, kitPrice,
    finalGap, direction,
  };
}

const seeds = [
  -2147483648, -17, 0, 1, 2, 17, 2026, 2147483647,
  ...Array.from({length: 80}, (_, i) => 97 * i + 3),
];

describe('balance differences after changes', () => {
  it('independently solves both linked responses from visible givens across varied seeds', () => {
    const templates = new Set<string>();
    const directions = new Set<string>();
    const transferCents = new Set<number>();
    const visibleQuestions = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solution = solveVisible({context: q.context, prompt: q.prompt});
        templates.add(solution.kind);
        visibleQuestions.add(JSON.stringify([q.context, q.prompt]));
        expect(q.prompt).toContain('(a)');
        expect(q.prompt).toContain('(b)');
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(6);
        expect(q.explanation).toBe(q.workedSteps!.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '));
        expect(q.picture).toBeUndefined();

        if (solution.kind === 'fair') {
          const s = solution;
          for (const amount of [s.gap, s.gift, s.spent, s.raviStart, s.lenaStart, s.raviEnd, s.lenaEnd, s.transfer]) {
            expect(Number.isSafeInteger(amount)).toBe(true);
            expect(amount).toBeGreaterThan(0);
          }
          expect(s.multiple).toBeGreaterThan(1);
          expect(s.gift).not.toBe(s.spent);
          expect(s.raviStart).toBeGreaterThan(s.spent);
          expect(s.lenaStart - s.raviStart).toBe(s.gap);
          expect(s.lenaEnd).toBe(s.multiple * s.raviEnd);
          expect(s.lenaEnd - s.transfer).toBe(s.raviEnd + s.transfer);
          expect(s.lenaEnd - s.transfer).toBe(s.equalBalance);
          expect(s.transfer).toBeLessThan(s.lenaEnd);
          transferCents.add(s.transfer % 100);

          const expected = JSON.stringify([dollars(s.lenaStart), dollars(s.transfer)]);
          expect(q.answer).toBe(expected);
          expect(q.unit).toBe('dollars');
          expect(q.choices).toBeUndefined();
          const spec = q.structuredResponse;
          if (!spec || spec.kind !== 'number-pair') throw new Error('Both money responses need paired fields');
          expect(spec.decimal).toBe(true);
          expect(spec.firstLabel).toContain('(a)');
          expect(spec.secondLabel).toContain('(b)');
          expect(structuredResponseReady(spec, expected)).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([dollars(s.lenaStart), dollars(2 * s.transfer)]))).toBe(false);
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([dollars(s.lenaStart + 1), dollars(s.transfer)]))).toBe(false);
          expect(structuredResponseReady(spec, JSON.stringify([dollars(s.lenaStart)]))).toBe(false);
        } else {
          const s = solution;
          directions.add(s.direction);
          for (const count of [s.ishaKits, s.ishaBrushes, s.zakiKits, s.zakiBrushes]) {
            expect(Number.isSafeInteger(count)).toBe(true);
            expect(count).toBeGreaterThan(0);
          }
          for (const amount of [s.gap, s.ishaStart, s.zakiStart, s.ishaSpent, s.zakiSpent, s.ishaLeft, s.zakiLeft, s.brushPrice, s.kitPrice]) {
            expect(Number.isSafeInteger(amount)).toBe(true);
            expect(amount).toBeGreaterThan(0);
          }
          expect(s.ishaLeft).toBeGreaterThan(s.zakiLeft);
          expect(s.zakiStart).toBe(s.startingMultiple * s.zakiLeft);
          expect(s.kitPrice).toBe(s.priceMultiple * s.brushPrice);
          expect(s.ishaSpent).toBeLessThan(s.ishaStart);
          expect(s.zakiSpent).toBeLessThan(s.zakiStart);
          const expected = `(a) ${s.direction}; (b) $${dollars(s.kitPrice)}`;
          expect(q.answer).toBe(expected);
          expect(q.structuredResponse).toBeUndefined();
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(choice => choice === expected)).toHaveLength(1);
          // Both answers matter: one distractor retains the correct price
          // but changes the comparison, and another does the reverse.
          expect(q.choices!.some(choice => choice.endsWith(`$${dollars(s.kitPrice)}`) && choice !== expected)).toBe(true);
          expect(q.choices!.some(choice => choice.startsWith(`(a) ${s.direction};`) && choice !== expected)).toBe(true);
        }
      }
    }
    expect([...templates].sort()).toEqual(['fair', 'stall']);
    expect([...directions].sort()).toEqual(['Decrease', 'Increase', 'Stay the same']);
    expect([...transferCents].sort((a, b) => a - b)).toEqual([0, 50]);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is repeatable, defaults to index zero and selects both templates for each seed', () => {
    for (const seed of [-17, 0, 23, 987654321]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(solveVisible({context: q.context, prompt: q.prompt}).kind);
        keys.add(q.key);
      }
      expect(kinds.size).toBe(2);
      expect(keys.size).toBe(4);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-balance-differences-after-changes');
  });
});
