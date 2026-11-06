import { describe, expect, test } from 'vitest';
import { CURRICULUM_SKILLS } from '../../school/curriculum';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragEqualPeriodicAllocation';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;

type VisibleSolution = {
  numerator: number;
  denominator: number;
  days: number;
  answer: string;
} & (
  | { variant: 'money'; budget: number }
  | {
      variant: 'weeks';
      weeks: number;
      reducedNumerator: number;
      reducedDenominator: number;
    }
);

// This solver receives only the text shown to the pupil. Reduction uses an
// independent divisor search and never calls the application's fraction helper.
function solveVisible(question: VisibleQuestion): VisibleSolution {
  const text = [...(question.context ?? []), question.prompt].join(' ');
  const money = /sets aside \$(\d+) for supplies\./.exec(text);

  if (money) {
    const allocation = /Across (\d+) days, the club spends (\d+)\/(\d+) of that amount in total/.exec(text);
    if (!allocation) throw new Error('Missing visible money-allocation givens');
    const budget = Number(money[1]);
    const days = Number(allocation[1]);
    const numerator = Number(allocation[2]);
    const denominator = Number(allocation[3]);
    return {
      variant: 'money',
      budget,
      days,
      numerator,
      denominator,
      answer: String((budget * numerator) / (denominator * days)),
    };
  }

  const reading = /finishes (\d+)\/(\d+) of a storybook over (\d+) weeks\./.exec(text);
  if (!reading) throw new Error('Missing visible reading-allocation givens');
  const numerator = Number(reading[1]);
  const denominator = Number(reading[2]);
  const weeks = Number(reading[3]);
  const days = weeks * 7;
  const dailyDenominator = denominator * days;
  let commonFactor = 1;
  for (let factor = 2; factor <= numerator; factor += 1) {
    if (numerator % factor === 0 && dailyDenominator % factor === 0) {
      commonFactor = factor;
    }
  }
  const reducedNumerator = numerator / commonFactor;
  const reducedDenominator = dailyDenominator / commonFactor;
  return {
    variant: 'weeks',
    weeks,
    days,
    numerator,
    denominator,
    reducedNumerator,
    reducedDenominator,
    answer: `${reducedNumerator}/${reducedDenominator}`,
  };
}

const seeds = [
  -2147483648, -17, -1, 0, 1, 2, 3, 4, 5,
  6, 7, 8, 13, 29, 97, 2026, 65537, 2147483647,
];

describe('equal periodic allocation candidate', () => {
  test('metadata uses existing curriculum skills at the requested level', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-equal-periodic-allocation');
    const skills = new Map(CURRICULUM_SKILLS.map(skill => [skill.id, skill]));
    for (const id of RAG_PATTERN.skillIds) {
      expect(skills.has(id)).toBe(true);
      expect(skills.get(id)!.level).toBeLessThanOrEqual(5);
    }
  });

  test('independently solves both variants across varied seeds and indexes', () => {
    const variants = new Set<string>();
    const visibleQuestions = new Set<string>();

    for (const seed of seeds) {
      for (let index = 0; index < 12; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({ context: question.context, prompt: question.prompt });
        variants.add(solved.variant);
        visibleQuestions.add(JSON.stringify([question.context, question.prompt]));

        expect(question.answer).toBe(solved.answer);
        expect(solved.numerator).toBeGreaterThan(0);
        expect(solved.numerator).toBeLessThan(solved.denominator);
        expect(solved.denominator).toBeLessThanOrEqual(10);
        expect(question.picture).toBeUndefined();
        expect(question.hint.length).toBeGreaterThan(20);
        expect(question.workedSteps).toHaveLength(3);
        for (const step of question.workedSteps ?? []) {
          expect(step.text.length).toBeGreaterThan(10);
          expect(step.equation).toBeTruthy();
          expect(question.explanation).toContain(step.text);
          expect(question.explanation).toContain(step.equation!);
        }

        if (solved.variant === 'money') {
          const spent = solved.budget * solved.numerator / solved.denominator;
          expect(solved.budget).toBeGreaterThan(0);
          expect(solved.budget).toBeLessThanOrEqual(1080);
          expect(solved.budget).not.toBe(200);
          expect(solved.days).toBeGreaterThanOrEqual(3);
          expect(solved.days).toBeLessThanOrEqual(9);
          expect(solved.days).not.toBe(5);
          expect(solved.numerator / solved.denominator).not.toBe(4 / 5);
          expect(Number.isInteger(Number(solved.answer))).toBe(true);
          expect(question.context?.join(' ')).toContain('an equal amount each day');
          expect(question.unit).toBe('dollars');
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices?.filter(choice => choice === solved.answer)).toHaveLength(1);
          expect(question.choices?.every(choice => Number.isInteger(Number(choice)) && Number(choice) > 0)).toBe(true);
          expect(question.workedSteps?.map(step => step.equation)).toEqual([
            `$${solved.budget} ÷ ${solved.denominator} = $${solved.budget / solved.denominator}`,
            `$${solved.budget / solved.denominator} × ${solved.numerator} = $${spent}`,
            `$${spent} ÷ ${solved.days} = $${solved.answer}`,
          ]);
        } else {
          expect([3, 4]).toContain(solved.weeks);
          expect(solved.numerator / solved.denominator).not.toBe(7 / 12);
          expect(solved.reducedNumerator).toBeLessThan(solved.reducedDenominator);
          expect(solved.reducedDenominator).toBeLessThanOrEqual(280);
          for (let factor = 2; factor <= solved.reducedNumerator; factor += 1) {
            expect(solved.reducedNumerator % factor === 0 && solved.reducedDenominator % factor === 0).toBe(false);
          }
          expect(question.context?.join(' ')).toContain('the same every day, including weekends');
          expect(question.requireSimplified).toBe(true);
          expect(question.choices).toBeUndefined();
          expect(question.prompt).toContain('whole book');
          expect(question.workedSteps?.[0].equation).toBe(`${solved.weeks} × 7 = ${solved.days} days`);
          expect(question.workedSteps?.[1].equation).toBe(
            `${solved.numerator}/${solved.denominator} × 1/${solved.days} = ${solved.numerator}/${solved.denominator * solved.days}`,
          );
        }
      }
    }

    expect([...variants].sort()).toEqual(['money', 'weeks']);
    expect(visibleQuestions.size).toBeGreaterThan(40);
  });

  test('the existing answer checker accepts solved answers and rejects allocation errors', () => {
    for (const seed of seeds) {
      for (let index = 0; index < 8; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solved = solveVisible({ context: question.context, prompt: question.prompt });
        expect(correctAnswer(question, solved.answer)).toBe(true);

        if (solved.variant === 'money') {
          const spent = solved.budget * solved.numerator / solved.denominator;
          const wrongAmounts = [
            spent,
            solved.budget / solved.days,
            (solved.budget - spent) / solved.days,
          ];
          for (const wrong of wrongAmounts) {
            expect(question.choices).toContain(String(wrong));
            expect(correctAnswer(question, String(wrong))).toBe(false);
          }
        } else {
          const perWeek = `${solved.numerator}/${solved.denominator * solved.weeks}`;
          const unreduced = `${solved.reducedNumerator * 2}/${solved.reducedDenominator * 2}`;
          expect(correctAnswer(question, perWeek)).toBe(false);
          expect(correctAnswer(question, unreduced)).toBe(false);
          expect(correctAnswer(question, '0')).toBe(false);
        }
      }
    }
  });

  test('generation is reproducible and index changes produce visible variety', () => {
    const keys = new Set<string>();
    const visibleQuestions = new Set<string>();
    expect(makeRagQuestion(41)).toEqual(makeRagQuestion(41, 0));

    for (let index = 0; index < 24; index += 1) {
      const first = makeRagQuestion(41, index);
      expect(makeRagQuestion(41, index)).toEqual(first);
      keys.add(first.key);
      visibleQuestions.add(JSON.stringify([first.context, first.prompt]));
    }

    expect(keys.size).toBe(24);
    expect(visibleQuestions.size).toBeGreaterThan(8);
  });
});
