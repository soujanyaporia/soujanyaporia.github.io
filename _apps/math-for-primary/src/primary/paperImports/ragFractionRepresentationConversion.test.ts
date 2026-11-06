import { describe, expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragFractionRepresentationConversion';

// This solver receives only fields available to the pupil.
function solveVisible(question: Pick<Question, 'prompt' | 'display' | 'context' | 'choices'>) {
  const display = question.display ?? '';
  const decimal = /^([1-9]\d*)\.(\d{2})$/.exec(display);
  if (decimal) {
    const whole = Number(decimal[1]);
    const hundredths = Number(decimal[2]);
    // Independently find the smallest denominator by exact integer arithmetic.
    let denominator = 1;
    while (denominator <= 100 && (hundredths * denominator) % 100 !== 0) {
      denominator += 1;
    }
    if (denominator > 100) throw new Error('Decimal has no supported fraction representation');
    const numerator = hundredths * denominator / 100;
    return {
      kind: 'decimal' as const,
      whole,
      hundredths,
      numerator,
      denominator,
      answer: `${whole} ${numerator}/${denominator}`,
    };
  }

  const regroup = /^(\d+) (\d+)\/(\d+) = (\d+) \+ □\/(\d+)$/.exec(display);
  if (!regroup) throw new Error(`Unrecognised visible givens: ${display}`);
  const whole = Number(regroup[1]);
  const numerator = Number(regroup[2]);
  const denominator = Number(regroup[3]);
  const remainingWholes = Number(regroup[4]);
  const targetDenominator = Number(regroup[5]);
  if (denominator !== targetDenominator) throw new Error('Regrouping changed the denominator');
  const totalParts = whole * denominator + numerator;
  const answer = totalParts - remainingWholes * denominator;
  return {
    kind: 'regroup' as const,
    whole,
    numerator,
    denominator,
    remainingWholes,
    answer: String(answer),
  };
}

const seeds = [-2147483648, -17, 0, 1, 2, 37, 2026, 2147483647, 4294967295];
const samples = seeds.flatMap(seed =>
  Array.from({ length: 16 }, (_, index) => makeRagQuestion(seed, index)),
);

describe('fraction representation conversion candidate', () => {
  it('independently solves every question from its visible givens', () => {
    for (const question of samples) {
      const solved = solveVisible(question);
      expect(question.answer).toBe(solved.answer);
      expect(correctAnswer(question, solved.answer)).toBe(true);
      expect(question.hint.trim().length).toBeGreaterThan(0);
      expect(question.explanation.trim().length).toBeGreaterThan(0);
      expect(question.workedSteps!.length).toBeGreaterThanOrEqual(3);
      expect(question.workedSteps!.every(step => step.text.trim().length > 0)).toBe(true);
      expect(question.picture).toBeUndefined();
      expect(question.unit).toBeUndefined();
    }
  });

  it('enforces simplified mixed-number answers and verifies each decimal choice set', () => {
    for (const question of samples) {
      const solved = solveVisible(question);
      if (solved.kind !== 'decimal') continue;
      const { whole, hundredths, numerator, denominator } = solved;
      expect(whole).toBeGreaterThanOrEqual(6);
      expect(whole).toBeLessThanOrEqual(14);
      expect(hundredths).toBeGreaterThan(0);
      expect(hundredths).toBeLessThan(100);
      expect(hundredths % 10).not.toBe(0);
      expect(numerator).toBeGreaterThan(0);
      expect(numerator).toBeLessThan(denominator);
      expect(denominator).toBeLessThan(100);
      expect(numerator * 100).toBe(hundredths * denominator);
      expect(question.requireMixed).toBe(true);
      expect(question.requireSimplified).toBe(true);
      expect(correctAnswer(question, question.display!)).toBe(false);
      expect(correctAnswer(question, `${whole * denominator + numerator}/${denominator}`)).toBe(false);
      expect(correctAnswer(question, `${whole} ${hundredths}/100`)).toBe(false);
      expect(correctAnswer(question, `${whole + 1} ${numerator}/${denominator}`)).toBe(false);
      if (question.choices) {
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices).size).toBe(4);
        expect(question.choices.filter(choice => choice === solved.answer)).toHaveLength(1);
        expect(question.choices.filter(choice => correctAnswer(question, choice))).toEqual([solved.answer]);
        expect(question.choices).toContain(`${whole} ${hundredths}/100`);
      }
    }
  });

  it('preserves the fixed denominator and exchanges one to three whole units', () => {
    for (const question of samples) {
      const solved = solveVisible(question);
      if (solved.kind !== 'regroup') continue;
      const { whole, numerator, denominator, remainingWholes } = solved;
      const answer = Number(solved.answer);
      expect(whole).toBeGreaterThanOrEqual(6);
      expect(whole).toBeLessThanOrEqual(12);
      expect(denominator).toBeGreaterThanOrEqual(2);
      expect(denominator).toBeLessThanOrEqual(12);
      expect(numerator).toBeGreaterThan(0);
      expect(numerator).toBeLessThan(denominator);
      expect(remainingWholes).toBeGreaterThan(0);
      expect(whole - remainingWholes).toBeGreaterThanOrEqual(1);
      expect(whole - remainingWholes).toBeLessThanOrEqual(3);
      expect(Number.isInteger(answer)).toBe(true);
      expect(answer).toBeGreaterThan(denominator);
      expect(remainingWholes * denominator + answer).toBe(whole * denominator + numerator);
      expect(question.choices).toBeUndefined();
      expect(question.requireMixed).toBeUndefined();
      expect(correctAnswer(question, String(numerator))).toBe(false);
      expect(correctAnswer(question, String(answer - numerator))).toBe(false);
      expect(correctAnswer(question, `${answer}/${denominator}`)).toBe(false);
    }
  });

  it('checks worked equations using independently recovered quantities', () => {
    for (const question of samples) {
      const solved = solveVisible(question);
      const equations = question.workedSteps!.map(step => step.equation);
      if (solved.kind === 'decimal') {
        expect(equations).toContain(`${question.display} = ${solved.whole} + ${solved.hundredths}/100`);
        expect(equations).toContain(`${solved.hundredths}/100 = ${solved.numerator}/${solved.denominator}`);
        expect(equations).toContain(`${question.display} = ${solved.answer}`);
      } else {
        const exchanged = solved.whole - solved.remainingWholes;
        const parts = Number(solved.answer) - solved.numerator;
        expect(equations).toContain(`${solved.whole} − ${solved.remainingWholes} = ${exchanged}`);
        expect(equations).toContain(`${exchanged} = ${parts}/${solved.denominator}`);
        expect(equations).toContain(`${parts}/${solved.denominator} + ${solved.numerator}/${solved.denominator} = ${solved.answer}/${solved.denominator}`);
        expect(equations).toContain(`${solved.whole} ${solved.numerator}/${solved.denominator} = ${solved.remainingWholes} + ${solved.answer}/${solved.denominator}`);
      }
    }
  });

  it('provides deterministic variety and the declared family metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-fraction-representation-conversion');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.FRAC.01', 'P4.S.FRAC.02', 'P3.S.FRAC.02']);
    expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
    for (const seed of seeds) {
      const questions = Array.from({ length: 16 }, (_, index) => {
        const question = makeRagQuestion(seed, index);
        expect(question).toEqual(makeRagQuestion(seed, index));
        return question;
      });
      expect(questions.filter(question => solveVisible(question).kind === 'decimal')).toHaveLength(12);
      expect(questions.filter(question => solveVisible(question).kind === 'regroup')).toHaveLength(4);
      expect(questions.filter(question => question.choices)).toHaveLength(4);
    }
    expect(new Set(samples.map(question => question.key)).size).toBe(samples.length);
    expect(new Set(samples.map(question => question.display)).size).toBeGreaterThan(12);
  });
});
