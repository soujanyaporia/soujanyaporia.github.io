import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragP5AdditionalShading';

type VisibleGivens = Pick<Question, 'picture' | 'display'>;

function readVisible(q: VisibleGivens) {
  if (!q.picture || q.picture.type !== 'fraction') {
    throw new Error('An equal-part diagram is required.');
  }
  const target = /^Target: (\d+)\/(\d+) of the whole (shaded|left unshaded)$/.exec(q.display ?? '');
  if (!target) throw new Error('A visible target fraction is required.');
  return {
    total: q.picture.parts,
    filled: q.picture.filled,
    numerator: Number(target[1]),
    denominator: Number(target[2]),
    unshaded: target[3] === 'left unshaded',
  };
}

// Enumerate possible additions and compare the resulting visible fraction.
// This solver receives no answer, proof, worked steps or generation parameters.
function solveVisible(q: VisibleGivens): number[] {
  const g = readVisible(q);
  const solutions: number[] = [];
  for (let extra = 0; extra <= g.total - g.filled; extra++) {
    const shadedAfter = g.filled + extra;
    const countedAfter = g.unshaded ? g.total - shadedAfter : shadedAfter;
    if (countedAfter * g.denominator === g.total * g.numerator) {
      solutions.push(extra);
    }
  }
  return solutions;
}

const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);

describe('additional shading candidate', () => {
  it('independently solves both visible target forms across varied seeds and indices', () => {
    const modes = new Set<boolean>();
    const diagrams = new Set<string>();
    const fractions = new Set<string>();
    const seeds = [-2147483648, -17, -1, ...Array.from({ length: 128 }, (_, i) => i), 2147483647];

    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const visible: VisibleGivens = { picture: q.picture, display: q.display };
        const g = readVisible(visible);
        const solutions = solveVisible(visible);

        expect(solutions).toHaveLength(1);
        const extra = solutions[0]!;
        expect(q.answer).toBe(String(extra));
        expect(extra).toBeGreaterThan(0);
        expect(Number.isInteger(extra)).toBe(true);
        expect(extra).toBeLessThan(g.total - g.filled);
        expect(Number.isInteger(g.total)).toBe(true);
        expect(Number.isInteger(g.filled)).toBe(true);
        expect(g.total).toBeGreaterThanOrEqual(12);
        expect(g.total).toBeLessThanOrEqual(30);
        expect([16, 21]).not.toContain(g.total);
        expect(g.filled).toBeGreaterThan(0);
        expect(g.filled).toBeLessThan(g.total);
        expect(g.numerator).toBeGreaterThan(0);
        expect(g.numerator).toBeLessThan(g.denominator);
        expect(g.denominator).toBeLessThanOrEqual(12);
        expect(g.total % g.denominator).toBe(0);
        expect(gcd(g.numerator, g.denominator)).toBe(1);
        expect(q.unit).toBe('parts');
        expect(q.choices).toBeUndefined();
        expect(q.fractionBuilder).toBeUndefined();
        expect(q.workedSteps).toHaveLength(g.unshaded ? 4 : 3);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation.length).toBeGreaterThan(0);

        modes.add(g.unshaded);
        diagrams.add(`${g.total}:${g.filled}`);
        fractions.add(`${g.numerator}/${g.denominator}`);
      }
    }
    expect(modes.size).toBe(2);
    expect(diagrams.size).toBeGreaterThan(20);
    expect(fractions.size).toBeGreaterThan(5);
  });

  it('distinguishes a shaded target from an unshaded target', () => {
    const picture: NonNullable<Question['picture']> = { type: 'fraction', parts: 20, filled: 2 };
    expect(solveVisible({ picture, display: 'Target: 1/4 of the whole shaded' })).toEqual([3]);
    expect(solveVisible({ picture, display: 'Target: 1/4 of the whole left unshaded' })).toEqual([13]);
  });

  it('makes worked arithmetic agree with the independently solved diagram', () => {
    for (let seed = 0; seed < 24; seed++) {
      for (let index = 0; index < 2; index++) {
        const q = makeRagQuestion(seed, index);
        const g = readVisible(q);
        const extra = solveVisible({ picture: q.picture, display: q.display })[0]!;
        const finalShading = g.filled + extra;
        const steps = q.workedSteps!;
        const targetNumerator = g.unshaded ? g.denominator - g.numerator : g.numerator;
        expect(steps[0].equation).toBe(`${g.total} parts in all; ${g.filled} already shaded`);
        if (g.unshaded) {
          expect(steps[1].equation).toBe(`1 − ${g.numerator}/${g.denominator} = ${targetNumerator}/${g.denominator}`);
        }
        expect(steps[steps.length - 2].equation).toBe(`${g.total} ÷ ${g.denominator} × ${targetNumerator} = ${finalShading}`);
        expect(steps[steps.length - 1].equation).toBe(`${finalShading} − ${g.filled} = ${extra}`);
      }
    }
  });

  it('is deterministic, defaults to index zero and includes both variants per seed', () => {
    for (const seed of [-9, 0, 1, 42, 2026]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const first = makeRagQuestion(seed, 0);
      const second = makeRagQuestion(seed, 1);
      expect(first).toEqual(makeRagQuestion(seed, 0));
      expect(second).toEqual(makeRagQuestion(seed, 1));
      expect(first.key).not.toBe(second.key);
      expect(readVisible(first).unshaded).not.toBe(readVisible(second).unshaded);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-additional-shading');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.05', 'P4.S.FRAC.03']);
  });
});
