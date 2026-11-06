import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragInverseAreaTriangleRelationships';

type VisibleQuestion = Pick<Question, 'prompt' | 'context'>;

function readVisibleGivens(question: VisibleQuestion) {
  const text = [question.prompt, ...(question.context ?? [])].join(' ');
  const rectangle = /rectangle measuring (\d+) cm by (\d+) cm/.exec(text);
  const triangle = /chosen base of the triangle is (\d+) cm long/.exec(text);
  if (!rectangle || !triangle || !text.includes('same area as the rectangle')) {
    throw new Error('Missing visible area relationship or dimensions');
  }
  return {
    length: Number(rectangle[1]),
    width: Number(rectangle[2]),
    base: Number(triangle[1]),
  };
}

function solveFromVisibleGivens(question: VisibleQuestion): number {
  const {length, width, base} = readVisibleGivens(question);
  // Search possible whole-centimetre heights using area equality.
  // Neither the stored answer nor any generation parameters are read.
  const matches = Array.from({length: 100}, (_, i) => i + 1)
    .filter(height => base * height === 2 * length * width);
  if (matches.length !== 1) throw new Error('Expected one whole-centimetre height');
  return matches[0];
}

function visibleOnly(question: Question): VisibleQuestion {
  return {prompt: question.prompt, context: question.context};
}

describe('inverse area from equal rectangle and triangle areas', () => {
  it('solves an independently supplied set of visible measurements', () => {
    expect(solveFromVisibleGivens({
      prompt: 'Find the perpendicular height.',
      context: [
        'A rectangle measuring 28 cm by 7 cm is reshaped into a triangle.',
        'The triangle has the same area as the rectangle.',
        'The chosen base of the triangle is 28 cm long.',
      ],
    })).toBe(14);
  });

  it('independently solves varied seeds and verifies unchanged-wire feasibility', () => {
    const seenGivens = new Set<string>();
    const seenHeights = new Set<number>();
    for (let seed = -32; seed < 64; seed++) {
      for (let index = 0; index < 6; index++) {
        const question = makeRagQuestion(seed, index);
        const visible = visibleOnly(question);
        const {length, width, base} = readVisibleGivens(visible);
        const height = solveFromVisibleGivens(visible);
        expect(question.answer).toBe(String(height));
        expect(question.unit).toBe('cm');
        expect(question.choices).toBeUndefined();
        expect(question.context?.join(' ')).toContain('without cutting or stretching');
        expect(question.workedSteps).toHaveLength(3);
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(length).toBeGreaterThan(width);
        expect(width).toBeGreaterThan(0);
        expect(base).toBeGreaterThan(0);
        expect(height).toBeGreaterThanOrEqual(4);
        expect(height).toBeLessThanOrEqual(36);
        expect(length * width).toBe(base * height / 2);

        // Independent geometric check using Heron's maximum-area bound.
        // For fixed perimeter and base, equal remaining sides maximise area.
        const area = length * width;
        const semiperimeter = length + width;
        expect(base).toBeLessThan(semiperimeter);
        const maximumAreaSquared = semiperimeter * (semiperimeter - base) * base * base / 4;
        expect(area * area).toBeLessThanOrEqual(maximumAreaSquared);

        // The original measurement triple is never reproduced.
        expect(length).not.toBe(15);
        expect(width).not.toBe(6);
        expect(base).not.toBe(18);
        seenGivens.add(`${length}:${width}:${base}`);
        seenHeights.add(height);
      }
    }
    expect(seenGivens.size).toBeGreaterThan(40);
    expect(seenHeights.size).toBeGreaterThan(6);
  }, 30_000);

  it('is repeatable, uses index in its key, and declares supported skills', () => {
    for (const seed of [-2147483648, -1, 0, 42, 987654321, Number.MAX_SAFE_INTEGER]) {
      for (const index of [0, 1, 9]) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
      expect(makeRagQuestion(seed, 0).key).not.toBe(makeRagQuestion(seed, 1).key);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-inverse-area-triangle-relationships');
    const allowed = new Set(['P3.S.AREA.03', 'P5.S.AREA.01', 'P5.S.AREA.02']);
    expect(RAG_PATTERN.skillIds.every(id => allowed.has(id))).toBe(true);
  });
});
