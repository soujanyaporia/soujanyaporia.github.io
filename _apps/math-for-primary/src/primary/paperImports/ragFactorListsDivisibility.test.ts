import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {structuredResponseCorrect, structuredResponseReady} from './batch6MiddleResponse';
import {makeRagQuestion} from './ragFactorListsDivisibility';

type Visible = Pick<Question, 'prompt' | 'context' | 'display' | 'choices'>;
type Solution =
  | {kind: 'missing'; total: number; listed: number[]; missing: number[]; expected: string}
  | {kind: 'nonfactor'; total: number; candidates: number[]; expected: string}
  | {kind: 'divisible'; divisor: number; candidates: number[]; expected: string};

function positiveNumbers(values: string[]): number[] {
  if (!values.length || values.some(value => !/^\d+$/.test(value.trim()))) {
    throw new Error('Expected visible positive whole numbers');
  }
  const numbers = values.map(value => Number(value.trim()));
  if (numbers.some(value => !Number.isSafeInteger(value) || value <= 0)) {
    throw new Error('Invalid visible number');
  }
  return numbers;
}

function displayedNumbers(display: string | undefined): number[] {
  if (!display) throw new Error('Missing visible list');
  return positiveNumbers(display.split(','));
}

function solveVisible(visible: Visible): Solution {
  if (visible.prompt.includes('two missing factors')) {
    const match = /factors of (\d+)\./.exec((visible.context ?? []).join(' '));
    if (!match) throw new Error('Missing factor target');
    const total = Number(match[1]);
    const listed = displayedNumbers(visible.display);
    // Exhaustively test every positive integer, independently of the generator's pair method.
    const allFactors: number[] = [];
    for (let candidate = 1; candidate <= total; candidate++) {
      if (Number.isInteger(total / candidate)) allFactors.push(candidate);
    }
    if (new Set(listed).size !== listed.length || listed.some(value => !allFactors.includes(value))) {
      throw new Error('The unfinished list contains a duplicate or nonfactor');
    }
    const missing = allFactors.filter(value => !listed.includes(value));
    if (missing.length !== 2) throw new Error('Expected exactly two omissions');
    return {kind: 'missing', total, listed, missing, expected: JSON.stringify(missing.map(String))};
  }

  const nonfactorMatch = /Three of these numbers are factors of (\d+)\./.exec(visible.prompt);
  if (nonfactorMatch) {
    const total = Number(nonfactorMatch[1]);
    const candidates = positiveNumbers(visible.choices ?? []);
    const wrong = candidates.filter(candidate => !Number.isInteger(total / candidate));
    if (wrong.length !== 1) throw new Error('Nonfactor is not unique');
    return {kind: 'nonfactor', total, candidates, expected: String(wrong[0])};
  }

  const divisorMatch = /divided by (\d+) with no remainder/.exec(visible.prompt);
  if (divisorMatch) {
    const divisor = Number(divisorMatch[1]);
    const candidates = displayedNumbers(visible.display);
    const exact = candidates.filter(candidate => Number.isInteger(candidate / divisor));
    if (exact.length !== 1) throw new Error('Exactly divisible candidate is not unique');
    return {kind: 'divisible', divisor, candidates, expected: String(exact[0])};
  }
  throw new Error('Unrecognised visible question');
}

function visibleOnly(question: Question): Visible {
  return {
    prompt: question.prompt,
    context: question.context,
    display: question.display,
    choices: question.choices,
  };
}

const seeds = [-2147483648, -1001, -1, 0, ...Array.from({length: 96}, (_, i) => i + 1), 2147483647];

describe('factor lists and divisibility', () => {
  it('independently solves visible givens and checks constraints across varied seeds and indices', () => {
    const variants = new Set<string>();
    const totals = new Set<number>();
    const divisors = new Set<number>();
    let squareListCount = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        variants.add(solved.kind);
        expect(question.answer).toBe(solved.expected);
        expect(question.picture).toBeUndefined();
        expect(question.unit).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(question.workedSteps!.some(step => Boolean(step.equation))).toBe(true);
        expect(question.explanation.length).toBeGreaterThan(0);

        if (solved.kind === 'missing' || solved.kind === 'nonfactor') {
          totals.add(solved.total);
          expect(solved.total).toBeGreaterThanOrEqual(12);
          expect(solved.total).toBeLessThanOrEqual(100);
          expect([28, 32]).not.toContain(solved.total);
        }
        if (solved.kind === 'missing') {
          expect(question.choices).toBeUndefined();
          expect(question.structuredResponse).toEqual({
            kind: 'number-pair',
            firstLabel: 'Smaller missing factor',
            secondLabel: 'Larger missing factor',
          });
          expect(solved.listed).toEqual([...solved.listed].sort((a, b) => a - b));
          expect(solved.listed).toContain(1);
          expect(solved.listed).toContain(solved.total);
          expect(solved.missing[0]).toBeGreaterThan(1);
          expect(solved.missing[0]).toBeLessThan(solved.missing[1]);
          expect(solved.missing[0] * solved.missing[1]).toBe(solved.total);
          if (Number.isInteger(Math.sqrt(solved.total))) {
            squareListCount++;
            const root = Math.sqrt(solved.total);
            expect(solved.listed.filter(value => value === root)).toHaveLength(1);
          }
        } else {
          expect(solved.candidates).toHaveLength(4);
          expect(new Set(solved.candidates).size).toBe(4);
          expect(question.structuredResponse).toBeUndefined();
          if (solved.kind === 'nonfactor') {
            expect(solved.candidates.every(value => value > 1 && value < solved.total)).toBe(true);
            expect(solved.candidates.filter(value => Number.isInteger(solved.total / value))).toHaveLength(3);
            expect(question.choices).toContain(solved.expected);
          } else {
            divisors.add(solved.divisor);
            expect([30, 40, 50, 60, 80, 90]).toContain(solved.divisor);
            expect(question.choices).toBeUndefined();
            for (const value of solved.candidates) {
              expect(value).toBeGreaterThanOrEqual(3000);
              expect(value).toBeLessThanOrEqual(8990);
              expect(value % 10).toBe(0);
            }
          }
        }
      }
    }
    expect([...variants].sort()).toEqual(['divisible', 'missing', 'nonfactor']);
    expect(totals.size).toBeGreaterThan(10);
    expect(divisors.size).toBe(6);
    expect(squareListCount).toBeGreaterThan(0);
  });

  it('uses the existing two-number control with explicit smaller-first ordering', () => {
    let checked = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 3; index++) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible(visibleOnly(question));
        if (solved.kind !== 'missing') continue;
        const spec = question.structuredResponse;
        if (!spec || spec.kind !== 'number-pair') throw new Error('Expected number-pair control');
        const [smaller, larger] = solved.missing;
        expect(structuredResponseReady(spec, solved.expected)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, solved.expected)).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([String(larger), String(smaller)]))).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([String(smaller), String(smaller)]))).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([String(solved.listed[0]), String(larger)]))).toBe(false);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([String(smaller + 0.5), String(larger)]))).toBe(false);
        expect(structuredResponseReady(spec, JSON.stringify([String(smaller), '']))).toBe(false);
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('repeats exactly for the same seed and index and varies visible tasks across indices', () => {
    for (const seed of [-7, 0, 29, 2147483647]) {
      const visibleTasks = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 24; index++) {
        const question = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        visibleTasks.add(JSON.stringify(visibleOnly(question)));
        keys.add(question.key);
      }
      expect(keys.size).toBe(24);
      expect(visibleTasks.size).toBeGreaterThan(12);
    }
    expect(makeRagQuestion(29)).toEqual(makeRagQuestion(29, 0));
  });
});
