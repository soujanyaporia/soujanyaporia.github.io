import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragRoundedFractionDecimals';

function readVisible(question: Question) {
  const fraction = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(question.display ?? '');
  const accuracy = /Round to ([12]) decimal places?\./.exec(question.prompt);
  if (!fraction || !accuracy) throw new Error('Missing visible fraction or rounding precision');
  return {
    whole: Number(fraction[1] ?? 0),
    numerator: Number(fraction[2]),
    denominator: Number(fraction[3]),
    places: Number(accuracy[1]),
  };
}

function abs(value: bigint): bigint {
  return value < 0n ? -value : value;
}

// Independently find the nearest decimal on the requested grid by exact
// distance comparisons. Only the displayed number and prompt are read.
function solveVisible(question: Question): string {
  const {whole, numerator, denominator, places} = readVisible(question);
  const scale = 10n ** BigInt(places);
  const divisor = BigInt(denominator);
  const target = (BigInt(whole) * divisor + BigInt(numerator)) * scale;
  let best = 0n;
  let bestDistance = abs(target);
  for (let candidate = 1n; candidate <= BigInt(whole + 1) * scale; candidate++) {
    const distance = abs(candidate * divisor - target);
    // Ascending search chooses the larger value when exactly halfway.
    if (distance <= bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return `${best / scale}.${String(best % scale).padStart(places, '0')}`;
}

function fixture(display: string, places: number): Question {
  return {
    key: 'solver-fixture',
    display,
    prompt: `Change the number shown to a decimal. Round to ${places} decimal place${places === 1 ? '' : 's'}.`,
    answer: 'deliberately unused',
    hint: '',
    explanation: '',
  };
}

function reducedDenominator(numerator: number, denominator: number): number {
  let a = numerator;
  let b = denominator;
  while (b) [a, b] = [b, a % b];
  return denominator / a;
}

function terminates(numerator: number, denominator: number): boolean {
  let d = reducedDenominator(numerator, denominator);
  while (d % 2 === 0) d /= 2;
  while (d % 5 === 0) d /= 5;
  return d === 1;
}

describe('rounded fraction decimals', () => {
  it('anchors the independent solver with recurring values and halfway cases', () => {
    expect(solveVisible(fixture('1/8', 2))).toBe('0.13');
    expect(solveVisible(fixture('1/4', 1))).toBe('0.3');
    expect(solveVisible(fixture('1/3', 2))).toBe('0.33');
    expect(solveVisible(fixture('2/3', 1))).toBe('0.7');
    expect(solveVisible(fixture('3 7/8', 2))).toBe('3.88');
    expect(solveVisible(fixture('5 1/6', 2))).toBe('5.17');
  });

  it('solves visible givens across varied seeds and indices', () => {
    const seeds = [
      -2147483648, -9999, 2147483647, 4294967295,
      ...Array.from({length: 160}, (_, i) => i - 40),
    ];
    const forms = new Set<string>();
    const expansions = new Set<string>();
    const directions = new Set<string>();
    let halfwayCount = 0;
    for (const seed of seeds) {
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        const visible = readVisible(question);
        const {whole, numerator, denominator, places} = visible;
        const expected = solveVisible(question);
        expect(question.answer).toBe(expected);
        expect(question.answer).toMatch(new RegExp(`^\\d+\\.\\d{${places}}$`));
        expect(numerator).toBeGreaterThan(0);
        expect(numerator).toBeLessThan(denominator);
        expect(denominator).toBeGreaterThanOrEqual(3);
        expect(denominator).toBeLessThanOrEqual(9);
        expect(reducedDenominator(numerator, denominator)).toBe(denominator);
        expect((numerator * 10 ** places) % denominator).not.toBe(0);
        if (whole !== 0) {
          expect(whole).toBeGreaterThanOrEqual(3);
          expect(whole).toBeLessThanOrEqual(8);
          expect(places).toBe(2);
          expect(question.choices).toBeUndefined();
        }
        const scale = 10 ** places;
        const scaledNumerator = (whole * denominator + numerator) * scale;
        const answerUnits = Number(expected.replace('.', ''));
        directions.add(answerUnits * denominator > scaledNumerator ? 'up' : 'down');
        if (2 * (scaledNumerator % denominator) === denominator) halfwayCount++;
        expansions.add(terminates(numerator, denominator) ? 'terminating' : 'recurring');
        forms.add(`${whole ? 'mixed' : 'proper'}:${places}:${question.choices ? 'choice' : 'entry'}`);
        expect(question.picture).toBeUndefined();
        expect(question.unit).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation).toContain(expected);
        expect(question.workedSteps?.length).toBe(whole ? 4 : 3);
        expect(question.workedSteps?.at(-1)?.equation).toBe(`${question.display} ≈ ${expected}`);
        if (question.choices) {
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(new Set(question.choices.map(Number)).size).toBe(4);
          expect(question.choices.filter(choice => choice === expected)).toHaveLength(1);
          for (const choice of question.choices) {
            expect(choice).toMatch(/^\d+\.\d{2}$/);
          }
        }
      }
    }
    expect([...forms].sort()).toEqual([
      'mixed:2:entry', 'proper:1:entry', 'proper:2:choice', 'proper:2:entry',
    ]);
    expect([...expansions].sort()).toEqual(['recurring', 'terminating']);
    expect([...directions].sort()).toEqual(['down', 'up']);
    expect(halfwayCount).toBeGreaterThan(0);
  });

  it('does not let answer fields or worked solutions influence the independent solver', () => {
    for (let index = 0; index < 12; index++) {
      const question = makeRagQuestion(2026, index);
      const expected = solveVisible(question);
      expect(solveVisible({
        ...question,
        answer: '999.99',
        choices: ['999.99'],
        hint: 'unrelated',
        explanation: 'unrelated',
        workedSteps: [{text: 'unrelated'}],
      })).toBe(expected);
    }
  });

  it('is deterministic and cycles through both reasoning variants', () => {
    for (const seed of [-17, 0, 42, 1000003]) {
      const keys = new Set<string>();
      const forms = new Set<string>();
      for (let index = 0; index < 8; index++) {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        keys.add(question.key);
        forms.add(readVisible(question).whole ? 'mixed' : 'proper');
      }
      expect(keys.size).toBe(8);
      expect([...forms].sort()).toEqual(['mixed', 'proper']);
    }
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-division-and-fraction-to-decimal-conversion');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.FRAC.03', 'P4.S.DEC.04']);
  });
});
