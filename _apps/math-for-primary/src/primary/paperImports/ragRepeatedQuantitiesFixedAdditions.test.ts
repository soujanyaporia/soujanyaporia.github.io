import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragRepeatedQuantitiesFixedAdditions';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Solution = {
  kind: 'length' | 'remaining-mass' | 'total-mass';
  answer: string;
  unit: 'm' | 'kg';
  exactAmount: number;
  roundingStep?: number;
};

function decimalToSmallUnits(value: string, decimalPlaces: number): number {
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 10 ** decimalPlaces + Number(fraction.padEnd(decimalPlaces, '0'));
}

function addCopies(count: number, amount: number): number {
  let total = 0;
  for (let copy = 0; copy < count; copy += 1) total += amount;
  return total;
}

function roundToNearest(amount: number, step: number): number {
  const lower = amount - amount % step;
  const upper = lower + step;
  return amount - lower < upper - amount ? lower : upper;
}

// This solver receives only the text a pupil sees.
function solveVisible(question: VisibleQuestion): Solution {
  const text = [...(question.context ?? []), question.prompt].join(' ');
  const cut = /cuts off (\d+\.\d{2}) m/.exec(text);
  if (cut) {
    const pieces = /into (\d+) equal pieces, each (\d+) cm long/.exec(text);
    if (!pieces) throw new Error('Missing visible piece measurements');
    const usedCm = decimalToSmallUnits(cut[1], 2);
    const count = Number(pieces[1]);
    const pieceCm = Number(pieces[2]);
    expect(count).toBeGreaterThanOrEqual(4);
    expect(count).toBeLessThanOrEqual(16);
    expect(pieceCm).toBeGreaterThan(0);
    expect(pieceCm).toBeLessThan(100);
    expect(usedCm).toBeGreaterThan(0);
    expect(question.prompt).toContain('at first');
    expect(question.prompt).toContain('metres');
    const originalCm = usedCm + addCopies(count, pieceCm);
    return {
      kind: 'length',
      answer: (originalCm / 100).toFixed(2),
      unit: 'm',
      exactAmount: originalCm,
    };
  }

  const packed = /packs (\d+) identical tiles/.exec(text);
  if (packed) {
    const mass = /Each tile has a mass of (\d+\.\d{3}) kg/.exec(text);
    const removal = /(\d+) tiles break and are taken out/.exec(text);
    if (!mass || !removal) throw new Error('Missing visible delivery measurements');
    const initial = Number(packed[1]);
    const removed = Number(removal[1]);
    const grams = decimalToSmallUnits(mass[1], 3);
    expect(initial).toBeLessThanOrEqual(200);
    expect(removed).toBeGreaterThan(0);
    expect(removed).toBeLessThan(initial);
    expect(grams).toBeGreaterThan(1000);
    expect(grams).toBeLessThan(3000);
    expect(question.prompt).toContain('1 decimal place');
    expect(question.prompt).toContain('may use a calculator');
    const exactGrams = addCopies(initial - removed, grams);
    return {
      kind: 'remaining-mass',
      answer: (roundToNearest(exactGrams, 100) / 1000).toFixed(1),
      unit: 'kg',
      exactAmount: exactGrams,
      roundingStep: 100,
    };
  }

  const portion = /uses (\d+) g of rice for each meal/.exec(text);
  const meals = /prepares (\d+) meals/.exec(text);
  if (!portion || !meals) throw new Error('Unrecognised visible measurement problem');
  const grams = Number(portion[1]);
  const count = Number(meals[1]);
  expect(grams).toBeGreaterThan(0);
  expect(grams).toBeLessThan(100);
  expect(count).toBeGreaterThan(100);
  expect(count).toBeLessThan(300);
  expect(question.prompt).toContain('nearest kilogram');
  const exactGrams = addCopies(count, grams);
  return {
    kind: 'total-mass',
    answer: String(roundToNearest(exactGrams, 1000) / 1000),
    unit: 'kg',
    exactAmount: exactGrams,
    roundingStep: 1000,
  };
}

describe('repeated quantities and fixed additions candidate', () => {
  it('independently solves visible givens across seeds and indices', () => {
    const kinds = new Set<string>();
    const visibleQuestions = new Set<string>();
    for (let seed = -32; seed < 96; seed += 1) {
      const kindsForSeed = new Set<string>();
      for (let index = 0; index < 6; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({ context: question.context, prompt: question.prompt });
        kinds.add(solved.kind);
        kindsForSeed.add(solved.kind);
        visibleQuestions.add(JSON.stringify([question.context, question.prompt]));
        expect(question.answer).toBe(solved.answer);
        expect(question.unit).toBe(solved.unit);
        expect(Number(question.answer)).toBeGreaterThan(0);
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps).toHaveLength(3);
        for (const step of question.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation?.length).toBeGreaterThan(5);
        }
        expect(question.explanation).toContain(solved.answer);
        expect(question.picture).toBeUndefined();
        if (solved.kind === 'length') {
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices?.filter(choice => Number(choice) === Number(solved.answer))).toHaveLength(1);
          expect(question.choices?.every(choice => /^\d+\.\d{2}$/.test(choice))).toBe(true);
        } else {
          expect(question.choices).toBeUndefined();
        }
      }
      expect(kindsForSeed.size).toBe(3);
    }
    expect([...kinds].sort()).toEqual(['length', 'remaining-mass', 'total-mass']);
    expect(visibleQuestions.size).toBeGreaterThan(100);
  });

  it('is deterministic and exposes the required metadata', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-repeated-quantities-fixed-additions');
    expect(RAG_PATTERN.skillIds).toEqual([
      'P5.S.RATE.02', 'P5.S.DEC.02', 'P4.S.DEC.04', 'P4.S.DEC.05',
    ]);
    for (const seed of [-2147483648, -1, 0, 1, 42, 2147483647]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (let index = 0; index < 9; index += 1) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
  });

  it('checks final rounding below, above and exactly at halfway boundaries', () => {
    const covered = new Set<string>();
    for (let seed = 0; seed < 512; seed += 1) {
      for (let index = 0; index < 3; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({ context: question.context, prompt: question.prompt });
        if (solved.roundingStep === undefined) continue;
        const remainder = solved.exactAmount % solved.roundingStep;
        const half = solved.roundingStep / 2;
        const position = remainder === half ? 'halfway' : remainder < half ? 'below' : 'above';
        covered.add(`${solved.kind}:${position}`);
        expect(question.answer).toBe(solved.answer);
        const roundedGrams = decimalToSmallUnits(question.answer, 3);
        expect(Math.abs(roundedGrams - solved.exactAmount)).toBeLessThanOrEqual(half);
        if (remainder === half) expect(roundedGrams).toBe(solved.exactAmount + half);
      }
    }
    expect([...covered].sort()).toEqual([
      'remaining-mass:above',
      'remaining-mass:below',
      'remaining-mass:halfway',
      'total-mass:above',
      'total-mass:below',
      'total-mass:halfway',
    ]);
  });
});
