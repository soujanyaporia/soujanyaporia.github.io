import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2ProductAndQuotientFacts';

it('grades both entries against the visible picture and the two number sentences', () => {
  const counts = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (const index of [0, 1, 4]) {
      const question = makeRagQuestion(seed, index);
      const fields = question.structuredResponse;
      const picture = question.picture;
      if (fields?.kind !== 'number-pair' || picture?.type !== 'paper' || picture.layout !== 'cards') {
        throw new Error('Expected two equation fields beside the pictured groups');
      }
      const product = /^□ × (\d+) = (\d+)$/.exec(fields.firstLabel);
      const division = /^(\d+) ÷ □ = (\d+)$/.exec(fields.secondLabel);
      if (!product || !division) throw new Error('The factor and divisor must be the blank positions');

      const size = Number(product[1]);
      const total = Number(product[2]);
      const factor = picture.cards.length;
      expect(size).toBe(2);
      expect(factor).toBeGreaterThanOrEqual(3);
      expect(factor).toBeLessThanOrEqual(9);
      expect(total).not.toBe(10);
      for (const card of picture.cards) expect(card.count).toBe(size);
      expect(factor * size).toBe(total);
      expect(question.context?.join(' ')).toContain(`There are ${total} `);

      const dividend = Number(division[1]);
      const quotient = Number(division[2]);
      expect(dividend).toBe(total);
      expect(quotient).toBe(size);
      const divisor = dividend / quotient;
      expect(divisor).toBe(factor);
      const entry = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
      expect(correctAnswer(question, entry(factor, divisor))).toBe(true);
      expect(correctAnswer(question, entry(size, divisor))).toBe(false);
      expect(correctAnswer(question, entry(factor, size))).toBe(false);
      expect(correctAnswer(question, JSON.stringify([String(factor)]))).toBe(false);
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${factor} × ${size} = ${total}`, `${dividend} ÷ ${divisor} = ${quotient}`,
      ]);
      counts.add(factor);
    }
  }
  expect(counts.size).toBeGreaterThan(3);
});

it('reproduces the picture and both fields for the same seed and index', () => {
  expect(makeRagQuestion(41, 3)).toEqual(makeRagQuestion(41, 3));
});
