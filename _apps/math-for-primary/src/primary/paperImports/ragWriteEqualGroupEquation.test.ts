import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragWriteEqualGroupEquation';

function booksOnShelves(q: Question): number[] {
  if (q.picture) {
    if (q.picture.type !== 'paper' || q.picture.layout !== 'cards') throw new Error('Expected pictured shelves');
    return q.picture.cards.map((card, i) => {
      expect(card.label).toBe(`Shelf ${i + 1}`);
      expect(card.icon).toBe('book');
      if (card.count === undefined) throw new Error('Missing books on shelf');
      return card.count;
    });
  }
  const shelves = /^The bookcase has (\d+) shelves\.$/.exec(q.context?.[0] ?? '');
  const books = /^There are (\d+) books on each shelf\.$/.exec(q.context?.[1] ?? '');
  if (!shelves || !books) throw new Error('Missing shelf count or books per shelf');
  return Array.from({ length: Number(shelves[1]) }, () => Number(books[1]));
}

it('checks each equation and its total against the books on the shelves', () => {
  const forms = new Set<string>();
  const products = new Set<number>();
  for (let seed = 0; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const counts = booksOnShelves(q);
      const groups = counts.length;
      const each = counts[0];
      const total = counts.reduce((sum, n) => sum + n, 0);
      expect(groups).toBeGreaterThan(1);
      expect(each).toBeGreaterThan(1);
      expect(counts.every(n => Number.isInteger(n) && n === each)).toBe(true);
      expect(total).toBeLessThanOrEqual(40);
      products.add(total);
      const equation = `${groups} × ${each} = ${total}`;
      const steps = q.workedSteps?.map(step => step.equation);
      expect(steps).toContain(`${counts.join(' + ')} = ${total}`);
      expect(steps).toContain(equation);
      expect(correctAnswer(q, String(total))).toBe(false);

      if (q.numberSentence) {
        forms.add(q.picture ? 'picture' : 'story');
        expect(q.answer).toBe(equation);
        expect(q.numberSentence.chooseOperation).toBe(true);
        expect(q.numberSentence.missingResult).toBe(true);
        expect(q.numberSentence.freeEntry).toBe(Boolean(q.picture));
        expect([...q.numberSentence.numbers].sort((a, b) => a - b)).toEqual([groups, each].sort((a, b) => a - b));
        expect(correctAnswer(q, equation)).toBe(true);
        expect(correctAnswer(q, `${each} × ${groups} = ${total}`)).toBe(true);
        expect(correctAnswer(q, `1 × ${total} = ${total}`)).toBe(false);
        expect(correctAnswer(q, `${groups} + ${each} = ${groups + each}`)).toBe(false);
        expect(correctAnswer(q, `${groups} × ${each} = ${total + 1}`)).toBe(false);
      } else {
        forms.add('story-with-total');
        expect(q.display).toBe('□ × □ = □');
        expect(q.structuredResponse?.kind).toBe('number-fields');
        const fields = (...values: number[]) => JSON.stringify(values.map(String));
        const response = fields(groups, each, total, total);
        expect(q.answer).toBe(response);
        expect(correctAnswer(q, response)).toBe(true);
        expect(correctAnswer(q, fields(groups, each, total))).toBe(false);
        expect(correctAnswer(q, fields(groups, each, total - 1, total))).toBe(false);
        expect(correctAnswer(q, fields(groups, each, total, total - 1))).toBe(false);
        if (groups !== each) expect(correctAnswer(q, fields(each, groups, total, total))).toBe(false);
      }
    }
  }
  expect(forms).toEqual(new Set(['picture', 'story', 'story-with-total']));
  expect(products.size).toBeGreaterThan(5);
});

it('reproduces a question from its seed and varies the visible task across indices', () => {
  const seen = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(q);
    seen.add(JSON.stringify([q.prompt, q.context, q.picture]));
  }
  expect(seen.size).toBeGreaterThan(1);
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
});
