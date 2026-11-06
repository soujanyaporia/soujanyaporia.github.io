import { describe, expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragCategorySharesAndDifferences';

type VisibleQuestion = Pick<Question, 'context' | 'prompt'>;
type Variant = 'whole' | 'percentage' | 'allocation';
interface Solution {
  variant: Variant;
  answer: number;
  total: number;
  counts: number[];
}

function readNumbers(text: string, expression: RegExp): number[] {
  const match = expression.exec(text);
  if (!match) throw new Error(`Missing visible givens for ${expression}`);
  return match.slice(1).map(Number);
}

// This solver receives only the displayed context and prompt.
// It reconstructs the answer from their numbers and relationships.
function solveVisible(question: VisibleQuestion): Solution {
  const text = (question.context ?? []).join(' ');

  if (question.prompt === 'How many beads are in the tub altogether?') {
    const [redPercent] = readNumbers(text, /(\d+)% of all the beads are red\./);
    const [greenParts, blueParts] = readNumbers(text, /green beads to blue beads is (\d+) : (\d+)\./);
    const [difference] = readNumbers(text, /There are (\d+) more red beads than green beads\./);
    const parts = greenParts + blueParts;
    // Clear both denominators in the visible percentage-and-ratio relationship.
    const total = difference * 100 * parts /
      (redPercent * parts - (100 - redPercent) * greenParts);
    const red = total * redPercent / 100;
    const green = (total - red) * greenParts / parts;
    const blue = total - red - green;
    expect(red - green).toBe(difference);
    expect(green * blueParts).toBe(blue * greenParts);
    return { variant: 'whole', answer: total, total, counts: [red, green, blue] };
  }

  if (question.prompt === 'What percentage of all the counters are blue?') {
    const [total] = readNumbers(text, /A tray holds (\d+) counters\./);
    const [red] = readNumbers(text, /(\d+) counters are red\./);
    const [greenParts, blueParts] = readNumbers(text, /green counters to blue counters is (\d+) : (\d+)\./);
    const blue = (total - red) * blueParts / (greenParts + blueParts);
    const green = total - red - blue;
    expect(green * blueParts).toBe(blue * greenParts);
    return {
      variant: 'percentage',
      answer: blue * 100 / total,
      total,
      counts: [red, green, blue],
    };
  }

  if (question.prompt === 'How many more stamps must Arun buy to have as many stamps as Mei gave away to all her friends?') {
    const [givenPercent] = readNumbers(text, /Mei gave (\d+)% of her stamps to her friends\./);
    const [receivedPercent] = readNumbers(text, /receiving (\d+)% of the stamps Mei gave away\./);
    const [difference] = readNumbers(text, /Arun then had (\d+) fewer stamps than Mei\./);
    expect(text).toContain('Arun had no stamps before receiving');
    // Use hundredths of hundredths to keep the nested shares exact.
    const total = difference * 10000 /
      (100 * (100 - givenPercent) - givenPercent * receivedPercent);
    const given = total * givenPercent / 100;
    const kept = total - given;
    const received = given * receivedPercent / 100;
    const othersReceived = given - received;
    expect(kept - received).toBe(difference);
    return {
      variant: 'allocation',
      answer: given - received,
      total,
      counts: [kept, received, othersReceived],
    };
  }

  throw new Error(`Unexpected response task ${question.prompt}`);
}

describe('category shares and differences candidate', () => {
  test('the independent solver handles hand-calculated visible examples', () => {
    expect(solveVisible({
      context: [
        '40% of all the beads are red.',
        'The ratio of green beads to blue beads is 2 : 3.',
        'There are 128 more red beads than green beads.',
      ],
      prompt: 'How many beads are in the tub altogether?',
    })).toEqual({
      variant: 'whole', answer: 800, total: 800, counts: [320, 192, 288],
    });

    expect(solveVisible({
      context: [
        'A tray holds 600 counters.',
        '330 counters are red.',
        'The ratio of green counters to blue counters is 1 : 2.',
      ],
      prompt: 'What percentage of all the counters are blue?',
    })).toEqual({
      variant: 'percentage', answer: 30, total: 600, counts: [330, 90, 180],
    });

    // Matching the amount given away requires 100 more stamps here.
    // Matching Mei's retained collection would instead require 600.
    expect(solveVisible({
      context: [
        'Mei gave 25% of her stamps to her friends.',
        'Arun had no stamps before receiving 60% of the stamps Mei gave away.',
        'Arun then had 600 fewer stamps than Mei.',
      ],
      prompt: 'How many more stamps must Arun buy to have as many stamps as Mei gave away to all her friends?',
    })).toEqual({
      variant: 'allocation', answer: 100, total: 1000, counts: [750, 150, 100],
    });
  });

  test('visible givens independently determine valid answers across varied seeds and indices', () => {
    const seenVariants = new Set<Variant>();
    const visibleQuestions = new Set<string>();
    const totals = new Set<number>();
    const percentageAnswers = new Set<number>();

    for (let seed = -24; seed <= 120; seed += 1) {
      for (let index = 0; index < 6; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible({ context: question.context, prompt: question.prompt });
        seenVariants.add(solution.variant);
        visibleQuestions.add(JSON.stringify([question.context, question.prompt]));
        totals.add(solution.total);
        if (solution.variant === 'percentage') percentageAnswers.add(solution.answer);

        expect(question.answer).toBe(String(solution.answer));
        expect(Number.isSafeInteger(solution.answer)).toBe(true);
        expect(solution.answer).toBeGreaterThan(0);
        expect(solution.total).toBeGreaterThanOrEqual(300);
        expect(solution.total).toBeLessThanOrEqual(2500);
        expect(solution.total % 100).toBe(0);
        expect(solution.counts.every(count => Number.isSafeInteger(count) && count > 0)).toBe(true);
        expect(solution.counts.reduce((sum, count) => sum + count, 0)).toBe(solution.total);
        expect(question.workedSteps!.length).toBeGreaterThanOrEqual(5);
        expect(question.workedSteps!.every(step => step.text.length > 0 && !!step.equation)).toBe(true);
        expect(question.hint.length).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(question.picture).toBeUndefined();
      }
    }

    expect([...seenVariants].sort()).toEqual(['allocation', 'percentage', 'whole']);
    expect(visibleQuestions.size).toBeGreaterThan(60);
    expect(totals.size).toBeGreaterThan(10);
    expect(percentageAnswers.size).toBeGreaterThanOrEqual(4);
  });

  test('preserves response units, unique choices and normal answer checking', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      for (let index = 0; index < 3; index += 1) {
        const question = makeRagQuestion(seed, index);
        const solution = solveVisible({ context: question.context, prompt: question.prompt });
        expect(correctAnswer(question, String(solution.answer))).toBe(true);
        expect(correctAnswer(question, String(solution.answer + 1))).toBe(false);
        expect(question.structuredResponse).toBeUndefined();

        if (solution.variant === 'percentage') {
          expect(question.unit).toBe('%');
          expect(question.choices).toHaveLength(4);
          expect(new Set(question.choices).size).toBe(4);
          expect(question.choices!.every(choice => {
            const value = Number(choice);
            return Number.isInteger(value) && value > 0 && value < 100;
          })).toBe(true);
          expect(question.choices!.filter(choice => correctAnswer(question, choice)))
            .toEqual([String(solution.answer)]);
        } else {
          expect(question.unit).toBe(solution.variant === 'whole' ? 'beads' : 'stamps');
          expect(question.choices).toBeUndefined();
        }
      }
    }
  });

  test('is deterministic and selects all three variants over consecutive indices', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-category-shares-and-differences');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const permittedSkills = new Set(['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03']);
    expect(RAG_PATTERN.skillIds.every(id => permittedSkills.has(id))).toBe(true);

    for (const seed of [-2147483648, -1, 0, 17, 2026, 2147483647, 4294967295]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      const variants = new Set<Variant>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index += 1) {
        const question = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(question);
        variants.add(solveVisible({ context: question.context, prompt: question.prompt }).variant);
        keys.add(question.key);
      }
      expect(variants.size).toBe(3);
      expect(keys.size).toBe(3);
    }
  });
});
