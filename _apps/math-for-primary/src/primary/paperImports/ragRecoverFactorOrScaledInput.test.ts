import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRecoverFactorOrScaledInput';

type Visible = Pick<Question, 'prompt' | 'context' | 'display'>;
type Givens =
  | {kind: 'reverse'; multiplier: number; divisor: number; result: number}
  | {kind: 'equal-products'; left: number; scale: number; right: number}
  | {kind: 'sum'; product: number; known: number};

// Read only what the pupil sees, excluding answers, proofs and worked solutions.
function readVisible(q: Visible): Givens {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'What number did the calculation start with?') {
    const m = /^Start with a whole number\. Multiply it by (\d+), then divide by (\d+)\. The result after both steps is (\d+)\.$/.exec(text);
    if (!m) throw new Error('Incomplete reverse-calculation givens');
    return {kind: 'reverse', multiplier: Number(m[1]), divisor: Number(m[2]), result: Number(m[3])};
  }
  if (q.prompt === 'Which number belongs in □ to make both sides equal?') {
    const m = /^(\d+) × (\d+) = □ × (\d+)$/.exec(q.display ?? '');
    if (!m) throw new Error('Incomplete equal-products equation');
    return {kind: 'equal-products', left: Number(m[1]), scale: Number(m[2]), right: Number(m[3])};
  }
  if (q.prompt === 'What do the two numbers add up to?') {
    const m = /^Two whole numbers multiply to make (\d+)\. One of them is (\d+)\.$/.exec(text);
    if (!m) throw new Error('Incomplete product-and-factor givens');
    return {kind: 'sum', product: Number(m[1]), known: Number(m[2])};
  }
  throw new Error('Unrecognised visible task');
}

// Forward enumeration is independent of the generator's reverse formulas.
function solveVisible(q: Visible): number[] {
  const g = readVisible(q);
  const answers: number[] = [];
  for (let trial = 1; trial <= 10000; trial += 1) {
    if (g.kind === 'reverse' && trial * g.multiplier === g.result * g.divisor) answers.push(trial);
    if (g.kind === 'equal-products' && trial * g.right === g.left * g.scale) answers.push(trial);
    if (g.kind === 'sum' && trial * g.known === g.product) answers.push(trial + g.known);
  }
  return answers;
}

function visibleOnly(q: Question): Visible {
  return {prompt: q.prompt, context: q.context, display: q.display};
}

function checkWorkedEquations(q: Question): void {
  expect(q.workedSteps).toHaveLength(2);
  for (const step of q.workedSteps ?? []) {
    expect(step.text.trim().length).toBeGreaterThan(0);
    const m = /^(\d+) ([×÷+]) (\d+) = (\d+)$/.exec(step.equation ?? '');
    if (!m) throw new Error('Missing or malformed worked equation');
    const a = Number(m[1]), b = Number(m[3]), c = Number(m[4]);
    if (m[2] === '×') expect(a * b).toBe(c);
    if (m[2] === '÷') {
      expect(b).toBeGreaterThan(0);
      expect(a % b).toBe(0);
      expect(c * b).toBe(a);
    }
    if (m[2] === '+') expect(a + b).toBe(c);
  }
  expect(q.workedSteps?.[1].equation?.endsWith(`= ${q.answer}`)).toBe(true);
}

describe('recover a factor or scaled input', () => {
  test('the independent solver handles hand-checked visible examples', () => {
    expect(solveVisible({
      prompt: 'What number did the calculation start with?',
      context: ['Start with a whole number. Multiply it by 300, then divide by 50.', 'The result after both steps is 1278.'],
    })).toEqual([213]);
    expect(solveVisible({
      prompt: 'Which number belongs in □ to make both sides equal?',
      display: '456 × 100 = □ × 600',
    })).toEqual([76]);
    expect(solveVisible({
      prompt: 'What do the two numbers add up to?',
      context: ['Two whole numbers multiply to make 2772.', 'One of them is 42.'],
    })).toEqual([108]);
  });

  test('varied seeds yield unique whole-number solutions for all three tasks', () => {
    const seen = new Map<string, Set<string>>();
    for (let s = 0; s < 64; s += 1) {
      const seed = s * 7919 - 150000;
      for (let index = 0; index < 6; index += 1) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const g = readVisible(visible);
        const solutions = solveVisible(visible);
        expect(solutions).toHaveLength(1);
        expect(q.answer).toMatch(/^[1-9]\d*$/);
        expect(q.answer).toBe(String(solutions[0]));
        expect(q.unit).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(q.hint.trim().length).toBeGreaterThan(0);
        expect(q.explanation.trim().length).toBeGreaterThan(0);
        for (const value of Object.values(g)) {
          if (typeof value === 'number') {
            expect(Number.isSafeInteger(value)).toBe(true);
            expect(value).toBeGreaterThan(0);
            expect(value).toBeLessThan(10000000);
          }
        }
        if (g.kind === 'reverse') {
          expect(g.multiplier).toBeGreaterThan(g.divisor);
          expect(g.result * g.divisor).toBeLessThan(10000000);
          expect(g.result).not.toBe(4230);
        } else if (g.kind === 'equal-products') {
          expect(g.right).toBeGreaterThan(g.scale);
          expect(g.left * g.scale).toBeLessThan(10000000);
        } else {
          expect(g.product).toBeLessThan(10000);
          expect(g.known).toBeGreaterThanOrEqual(10);
          expect(g.known).toBeLessThan(100);
        }
        checkWorkedEquations(q);
        if (!seen.has(g.kind)) seen.set(g.kind, new Set());
        seen.get(g.kind)!.add(JSON.stringify(visible));
      }
    }
    expect([...seen.keys()].sort()).toEqual(['equal-products', 'reverse', 'sum']);
    for (const variants of seen.values()) expect(variants.size).toBeGreaterThan(20);
  });

  test('seed and index reproduce questions and cycle through the supported tasks', () => {
    for (const seed of [-17, 0, 1, 42, 123456]) {
      const kinds = new Set<string>();
      for (let index = 0; index < 3; index += 1) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        kinds.add(readVisible(visibleOnly(q)).kind);
      }
      expect(kinds.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-recover-factor-or-scaled-input');
  });
});
