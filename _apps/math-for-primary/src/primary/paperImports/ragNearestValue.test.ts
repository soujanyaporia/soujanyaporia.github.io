import {describe, expect, it} from 'vitest';
import {makeRagQuestion, RAG_PATTERN} from './ragNearestValue';

type Rational = {n: number; d: number};

function readNumber(text: string): Rational {
  const whole = /^(\d+)$/.exec(text);
  if (whole) return {n: Number(whole[1]), d: 1};
  const fraction = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text);
  if (!fraction) throw new Error(`Unreadable visible number: ${text}`);
  const w = Number(fraction[1] ?? 0);
  const n = Number(fraction[2]);
  const d = Number(fraction[3]);
  if (d < 2 || n <= 0 || n >= d) throw new Error(`Invalid fractional part: ${text}`);
  return {n: w * d + n, d};
}

// This solver receives only the visible prompt and choices. It converts them
// to integer positions on a common scale, independently of generation data.
function solveVisible(prompt: string, choices: readonly string[]) {
  const match = /\bnearest to (\d+)\.$/.exec(prompt);
  if (!match || choices.length !== 4) throw new Error('Incomplete visible question');
  const target = Number(match[1]);
  const values = choices.map(readNumber);
  const scale = values.reduce((product, value) => product * value.d, 1);
  const positions = values.map(value => value.n * (scale / value.d));
  const distances = positions.map(position => Math.abs(position - target * scale));
  const minimum = Math.min(...distances);
  const winnerIndices = distances.flatMap((distance, i) => distance === minimum ? [i] : []);
  return {target, values, scale, positions, distances, winnerIndices};
}

const seeds = [
  ...Array.from({length: 80}, (_, i) => i - 40),
  -2147483648, 2147483647, 4294967295,
];

describe('nearest fractional value', () => {
  it('independently recognises nearest choices below and above a target', () => {
    const fixtures = [
      {target: 1, choices: ['7/12', '5/6', '1 3/8', '1 1/4'], winner: 1},
      {target: 1, choices: ['3/4', '7/10', '1 1/8', '1 2/5'], winner: 2},
      {target: 3, choices: ['2 7/8', '3 1/6', '2 4/5', '3 1/4'], winner: 0},
    ];
    for (const fixture of fixtures) {
      const solved = solveVisible(`Choose the number nearest to ${fixture.target}.`, fixture.choices);
      expect(solved.winnerIndices).toEqual([fixture.winner]);
    }
  });

  it('solves varied generated questions from their visible givens and checks bounds', () => {
    const targets = new Set<number>();
    const winningPositions = new Set<number>();
    const winningSides = new Set<string>();
    const visibleQuestions = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const q = makeRagQuestion(seed, index);
        const choices = q.choices ?? [];
        const solved = solveVisible(q.prompt, choices);
        expect(solved.winnerIndices).toHaveLength(1);
        const winnerIndex = solved.winnerIndices[0];
        expect(q.answer).toBe(choices[winnerIndex]);
        expect(new Set(solved.positions).size).toBe(4);
        expect(new Set(solved.distances).size).toBe(4);
        expect(solved.target).toBeGreaterThanOrEqual(1);
        expect(solved.target).toBeLessThanOrEqual(5);
        expect(solved.positions.filter(p => p < solved.target * solved.scale)).toHaveLength(2);
        expect(solved.positions.filter(p => p > solved.target * solved.scale)).toHaveLength(2);

        for (let i = 0; i < choices.length; i++) {
          const value = solved.values[i];
          expect(value.d).toBeLessThanOrEqual(12);
          expect(solved.positions[i]).toBeGreaterThan(0);
          expect(solved.distances[i]).toBeGreaterThan(0);
          expect(solved.distances[i]).toBeLessThan(solved.scale);
          // A simplified value has no common integer divisor greater than 1.
          for (let divisor = 2; divisor <= value.d; divisor++) {
            expect(value.n % divisor === 0 && value.d % divisor === 0).toBe(false);
          }
        }
        // Verify that these displayed fractions admit a small common denominator.
        const commonDenominators = Array.from({length: 24}, (_, i) => i + 1)
          .filter(d => solved.values.every(value => d % value.d === 0));
        expect(commonDenominators.length).toBeGreaterThan(0);
        expect(q.picture).toBeUndefined();
        expect(q.unit).toBeUndefined();
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation).toContain(q.answer);

        targets.add(solved.target);
        winningPositions.add(winnerIndex);
        winningSides.add(solved.positions[winnerIndex] < solved.target * solved.scale ? 'below' : 'above');
        visibleQuestions.add(JSON.stringify([q.prompt, choices]));
      }
    }
    expect([...targets].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect([...winningPositions].sort()).toEqual([0, 1, 2, 3]);
    expect([...winningSides].sort()).toEqual(['above', 'below']);
    expect(visibleQuestions.size).toBeGreaterThan(120);
  });

  it('gives correct subtraction steps for every displayed choice', () => {
    for (const seed of seeds.slice(0, 24)) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const choices = q.choices ?? [];
        const solved = solveVisible(q.prompt, choices);
        expect(q.workedSteps).toHaveLength(6);
        for (let i = 0; i < choices.length; i++) {
          const equation = q.workedSteps?.[i].equation ?? '';
          const match = /^(.+) − (.+) = (.+)$/.exec(equation);
          if (!match) throw new Error(`Missing subtraction step: ${equation}`);
          const below = solved.positions[i] < solved.target * solved.scale;
          expect(match[1]).toBe(below ? String(solved.target) : choices[i]);
          expect(match[2]).toBe(below ? choices[i] : String(solved.target));
          const gap = readNumber(match[3]);
          expect(gap.n * solved.scale).toBe(solved.distances[i] * gap.d);
        }
        const comparison = q.workedSteps?.[4].equation ?? '';
        const orderedGaps = comparison.split(' < ').map(readNumber);
        expect(orderedGaps).toHaveLength(4);
        const expected = solved.distances.slice().sort((a, b) => a - b);
        orderedGaps.forEach((gap, i) => {
          expect(gap.n * solved.scale).toBe(expected[i] * gap.d);
        });
        expect(q.workedSteps?.[5].text).toContain(choices[solved.winnerIndices[0]]);
      }
    }
  });

  it('is deterministic for seed and index and exports the required identity', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-nearest-value');
    for (const seed of [0, -17, 2026, 4294967295]) {
      for (const index of [0, 1, 7]) {
        const first = makeRagQuestion(seed, index);
        makeRagQuestion(seed + 1, index + 1);
        expect(makeRagQuestion(seed, index)).toEqual(first);
      }
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });
});
