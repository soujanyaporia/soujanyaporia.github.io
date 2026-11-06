import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragOrderingAndListExtremes';

it('solves the task stated in the prompt using only the four visible numerals', () => {
  const tasks = new Set<string>();
  for (let seed = -8; seed <= 32; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const ordering = /order from largest to smallest/i.test(q.prompt);
      const tokens = ordering ? q.order ?? [] : q.display?.split(/,\s*/) ?? [];
      expect(tokens).toHaveLength(4);
      for (const token of tokens) expect(token).toMatch(/^[1-9]\d{3}$/);
      const values = tokens.map(Number);
      expect(new Set(values).size).toBe(4);
      expect(new Set(tokens.map(token => token[0])).size).toBe(1);
      const ascending = [...values].sort((a, b) => a - b);
      const descending = [...ascending].reverse();
      expect(values).not.toEqual(ascending);
      expect(values).not.toEqual(descending);

      let expected: string;
      let wrong: string;
      let equation: string;
      if (ordering) {
        tasks.add('descending');
        expected = descending.join(',');
        wrong = ascending.join(',');
        equation = descending.join(' > ');
      } else {
        expect(q.order).toBeUndefined();
        expect(q.choices).toBeUndefined();
        const largest = Math.max(...values);
        const smallest = Math.min(...values);
        wrong = String(largest);
        if (/add the largest and smallest/i.test(q.prompt)) {
          tasks.add('sum');
          expected = String(largest + smallest);
          equation = `${largest} + ${smallest} = ${expected}`;
        } else if (/how much greater is the largest number than the smallest/i.test(q.prompt)) {
          tasks.add('difference');
          expected = String(largest - smallest);
          equation = `${largest} − ${smallest} = ${expected}`;
        } else {
          throw new Error(`Cannot determine the operation from the prompt: ${q.prompt}`);
        }
        expect(Number(expected)).toBeGreaterThan(0);
        expect(Number(expected)).toBeLessThan(10000);
      }
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, wrong)).toBe(false);
      expect(q.workedSteps?.map(step => step.equation)).toContain(equation);
      expect(q.explanation).toContain(equation);
      expect(q.unit).toBeUndefined();
    }
  }
  expect([...tasks].sort()).toEqual(['descending', 'difference', 'sum']);
});

it('reproduces a question and varies the visible lists within a session', () => {
  const lists = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(405, index);
    expect(makeRagQuestion(405, index)).toEqual(question);
    lists.add(question.order?.join(', ') ?? question.display ?? '');
  }
  expect(lists.size).toBeGreaterThan(1);
  expect(makeRagQuestion(405)).toEqual(makeRagQuestion(405, 0));
});
