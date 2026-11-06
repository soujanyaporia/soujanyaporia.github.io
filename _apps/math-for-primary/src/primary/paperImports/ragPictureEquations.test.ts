import { expect, it } from 'vitest';
import { validNumberSentence } from '../answerFormat';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragPictureEquations';

function visibleCards(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw Error('Expected countable picture cards');
  return picture.cards.map(card => {
    if (card.count === undefined || !Number.isSafeInteger(card.count) || card.count < 1) {
      throw Error('Each card must show individual objects');
    }
    return { ...card, count: card.count };
  });
}

it('solves the two-part whole from the pictures and accepts either subtraction', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let i = 0; i < 3; i++) {
      const q = makeRagQuestion(seed, i);
      if (!q.numberSentence) continue;
      const cards = visibleCards(q);
      expect(cards).toHaveLength(2);
      const [a, b] = cards.map(card => card.count);
      const whole = a + b;
      expect(whole).toBeLessThanOrEqual(9);
      const equations = [`${whole} - ${a} = ${b}`, `${whole} - ${b} = ${a}`];
      expect(q.numberSentence.freeEntry).toBe(true);
      expect(q.numberSentence.chooseOperation).toBeFalsy();
      expect(q.numberSentence.operation).toBe('-');
      expect(equations).toContain(q.answer);
      for (const equation of equations) expect(validNumberSentence(q.numberSentence, equation)).toBe(true);
      expect(validNumberSentence(q.numberSentence, `${a} + ${b} = ${whole}`)).toBe(false);
      expect(validNumberSentence(q.numberSentence, `${whole} - 0 = ${whole}`)).toBe(false);
      seen.add(cards.map(c => c.count).join(','));
    }
  }
  expect(seen.size).toBeGreaterThan(4);
});

it('counts each shelf and solves both complete equations, including their separate totals', () => {
  const sizes = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    for (let i = 0; i < 3; i++) {
      const q = makeRagQuestion(seed, i);
      const spec = q.structuredResponse;
      if (!spec) continue;
      if (spec.kind !== 'number-fields') throw Error('Expected labelled equation slots');
      expect(q.display?.replace(/\s/g, '')).toBe('□+□=□and□×□=□');
      const cards = visibleCards(q);
      expect(cards.map(c => c.label)).toEqual(['Shelf A', 'Shelf B']);
      const counts = cards.map(c => c.count);
      const each = counts[0];
      expect(counts.every(n => n === each)).toBe(true);
      const total = counts.reduce((a, b) => a + b, 0);
      expect(total).toBeLessThanOrEqual(40);
      const slots = [...counts, total, cards.length, each, total].map(String);
      expect(spec.fields.map(f => f.label)).toEqual(['Books on shelf A', 'Books on shelf B', 'Total using +',
        'Number of shelves', 'Books on one shelf', 'Total using ×']);
      const accepts = (values: string[]) => structuredResponseCorrect(spec, q.answer, JSON.stringify(values));
      expect(accepts(slots)).toBe(true);
      expect(accepts(slots.slice(0, 3))).toBe(false);
      for (let j = 0; j < slots.length; j++) {
        expect(accepts(slots.map((v, k) => k === j ? String(Number(v) + 1) : v))).toBe(false);
      }
      sizes.add(each);
    }
  }
  expect(sizes.size).toBeGreaterThan(2);
});

it('finds the unique choice by counting all tickets, used tickets and unused tickets', () => {
  const positions = new Set<number>();
  for (let seed = 0; seed < 40; seed++) {
    for (let i = 0; i < 3; i++) {
      const q = makeRagQuestion(seed, i);
      if (!q.choices) continue;
      const cards = visibleCards(q);
      expect(cards).toHaveLength(1);
      const { count, removed } = cards[0];
      if (!removed || removed >= count) throw Error('Expected both crossed and uncrossed tickets');
      expect(count).toBeLessThanOrEqual(10);
      const unused = count - removed;
      expect(new Set(q.choices).size).toBe(4);
      const matches = q.choices.filter(option => {
        const match = /^(\d+) ([+−]) (\d+) = (\d+)$/.exec(option);
        if (!match) throw Error('Expected a complete equation');
        const [, start, sign, part, result] = match;
        expect(sign === '+' ? +start + +part : +start - +part).toBe(+result);
        return +start === count && sign === '−' && +part === removed && +result === unused;
      });
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
      positions.add(q.choices.indexOf(matches[0]));
    }
  }
  expect(positions.size).toBeGreaterThan(1);
});

it('repeats the same givens for a key and visits all three response forms in three consecutive questions', () => {
  for (const seed of [-31, 0, 42, 2025]) {
    const forms = new Set<string>();
    for (const index of [7, 8, 9]) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      forms.add(q.numberSentence ? 'sentence' : q.structuredResponse ? 'fields' : q.choices ? 'choice' : 'other');
    }
    expect(forms).toEqual(new Set(['sentence', 'fields', 'choice']));
  }
});
