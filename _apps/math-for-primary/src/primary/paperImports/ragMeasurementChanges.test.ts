import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion} from './ragMeasurementChanges';

type Visible = Pick<Question, 'context' | 'prompt' | 'unit'>;
type Solution = {
  kind: 'length' | 'liquid' | 'rounded';
  answer: string;
  unit: 'm' | 'L';
  remainingSmallUnits: number;
  unroundedMl?: number;
};

function capture(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing or changed visible givens: ${pattern}`);
  return match.slice(1);
}

// Read decimal digits directly; do not use floating-point multiplication.
function decimalUnits(text: string, places: number): number {
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('Invalid visible decimal');
  const [whole, fraction = ''] = text.split('.');
  if (fraction.length > places) throw new Error('Unexpected measurement precision');
  return Number(whole) * 10 ** places + Number(fraction.padEnd(places, '0'));
}

// Only visible fields enter this solver. Answers, keys, hints, worked steps,
// proofs and generation parameters are deliberately unavailable.
function solveVisible(q: Visible): Solution {
  const text = (q.context ?? []).join(' ');
  if (text.includes('cord on a roll')) {
    const [initial] = capture(text, /A craft club has (\d+\.\d{2}) m of cord on a roll\./);
    const [single, count, each] = capture(text, /uses (\d+) cm for a banner and cuts (\d+) equal pieces, each (\d+) cm long/);
    const numberOfPieces = Number(count);
    if (numberOfPieces < 2 || numberOfPieces > 9 || Number(each) <= 0 || Number(single) <= 0) {
      throw new Error('Invalid visible length deductions');
    }
    // Repeated addition provides an independent route to the total cut length.
    let remaining = decimalUnits(initial, 2) - Number(single);
    for (let piece = 0; piece < numberOfPieces; piece++) remaining -= Number(each);
    return {kind: 'length', answer: (remaining / 100).toFixed(2), unit: 'm', remainingSmallUnits: remaining};
  }

  if (text.includes('A jug holds')) {
    const [initial] = capture(text, /A jug holds (\d+\.\d{2}) L of pear juice\./);
    const [removed] = capture(text, /Kai pours (\d+) ml of juice from the jug into a bottle\./);
    if (Number(removed) <= 0) throw new Error('Invalid visible removal');
    const remaining = decimalUnits(initial, 3) - Number(removed);
    return {kind: 'liquid', answer: (remaining / 1000).toFixed(2), unit: 'L', remainingSmallUnits: remaining};
  }

  if (text.includes('A drink dispenser contains')) {
    const [initial] = capture(text, /A drink dispenser contains (\d+\.\d{3}) L of fruit punch\./);
    const [whole, numerator, denominator, added] = capture(text, /serve (\d+) (\d+)\/(\d+) L of punch, then pour (\d+) L more punch/);
    const n = Number(numerator), d = Number(denominator);
    if (n <= 0 || n >= d || d > 10 || 1000 % d !== 0 || Number(whole) <= 0 || Number(added) <= 0) {
      throw new Error('Invalid visible mixed-number volume');
    }
    const improperNumerator = Number(whole) * d + n;
    const servedMl = improperNumerator * 1000 / d;
    const remaining = decimalUnits(initial, 3) - servedMl;
    const finalMl = remaining + Number(added) * 1000;
    // Round by inspecting the displayed number's thousandths digit.
    // This does not use the generator's add-five-and-divide calculation.
    const exact = `${Math.floor(finalMl / 1000)}.${String(finalMl % 1000).padStart(3, '0')}`;
    const [integerPart, decimalPart] = exact.split('.');
    let hundredths = Number(integerPart) * 100 + Number(decimalPart.slice(0, 2));
    if (Number(decimalPart[2]) >= 5) hundredths += 1;
    if (!q.prompt.includes('rounded to 2 decimal places')) throw new Error('Missing rounding instruction');
    return {
      kind: 'rounded', answer: (hundredths / 100).toFixed(2), unit: 'L',
      remainingSmallUnits: remaining, unroundedMl: finalMl,
    };
  }
  throw new Error('Unrecognised visible question');
}

function visible(q: Question): Visible {
  return {context: q.context, prompt: q.prompt, unit: q.unit};
}

describe('measurement additions and deductions', () => {
  it('independently solves visible givens across 720 seed and index pairs', () => {
    const kinds = new Set<string>();
    const problems = new Set<string>();
    const roundingCases = new Set<string>();
    let wholeLitreCarry = false;
    for (let seed = 0; seed < 120; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible(visible(q));
        kinds.add(solved.kind);
        problems.add((q.context ?? []).join(' '));
        expect(q.answer).toBe(solved.answer);
        expect(q.unit).toBe(solved.unit);
        expect(Number.isFinite(Number(q.answer))).toBe(true);
        expect(solved.remainingSmallUnits).toBeGreaterThan(0);
        expect(Number.isInteger(solved.remainingSmallUnits)).toBe(true);
        expect(q.prompt).toContain(solved.unit === 'm' ? 'metres' : 'litres');
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
        for (const step of q.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(0);
          expect(step.equation).toBeTruthy();
          expect(q.explanation).toContain(step.text);
          expect(q.explanation).toContain(step.equation!);
        }
        if (solved.unroundedMl !== undefined) {
          expect(q.answer).toMatch(/^\d+\.\d{2}$/);
          const digit = solved.unroundedMl % 10;
          roundingCases.add(digit < 5 ? 'below-half' : digit === 5 ? 'half' : 'above-half');
          if (Math.floor(Number(solved.answer)) > Math.floor(solved.unroundedMl / 1000)) wholeLitreCarry = true;
          // These questions must require a real rounding decision.
          expect(digit).not.toBe(0);
        }
      }
    }
    expect([...kinds].sort()).toEqual(['length', 'liquid', 'rounded']);
    expect(problems.size).toBeGreaterThan(200);
    expect([...roundingCases].sort()).toEqual(['above-half', 'below-half', 'half']);
    expect(wholeLitreCarry).toBe(true);
  });

  it('is repeatable and includes all three variants in each three-index cycle', () => {
    for (const seed of [-2147483648, -19, -1, 0, 7, 2147483647]) {
      const kinds = new Set<string>();
      const keys = new Set<string>();
      for (const index of [0, 1, 2]) {
        const first = makeRagQuestion(seed, index);
        const second = makeRagQuestion(seed, index);
        expect(second).toEqual(first);
        const solved = solveVisible(visible(first));
        expect(first.answer).toBe(solved.answer);
        kinds.add(solved.kind);
        keys.add(first.key);
      }
      expect(kinds.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
