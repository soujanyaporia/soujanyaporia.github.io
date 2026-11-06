import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRankExpressionValues';

function readCard(text: string) {
  const match = /^(\d+) ([+−]) (\d+)$/.exec(text);
  if (!match) throw new Error(`Expected a calculation on the card: ${text}`);
  const left = Number(match[1]);
  const right = Number(match[3]);
  const value = match[2] === '+' ? left + right : left - right;
  return { text, left, right, value };
}

it('solves the displayed cards and checks the requested response across seeds and indices', () => {
  const forms = new Set<string>();
  const ranges = new Set<string>();
  const winningPositions = new Set<number>();
  for (let seed = -8; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const cards = (q.choices ?? q.context ?? []).map(readCard);
      const values = cards.map(card => card.value);
      expect(new Set(values).size).toBe(cards.length);
      for (const [i, card] of cards.entries()) {
        for (const n of [card.left, card.right, card.value]) {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(100);
        }
        expect(q.workedSteps?.[i]?.equation).toBe(`${card.text} = ${card.value}`);
      }
      const descending = [...cards].sort((a, b) => b.value - a.value);
      if (q.choices) {
        expect(cards).toHaveLength(3);
        expect(q.prompt).toMatch(/smallest|greatest/);
        const least = q.prompt.includes('smallest');
        forms.add(least ? 'least' : 'greatest');
        const winner = least ? descending[2] : descending[0];
        winningPositions.add(cards.indexOf(winner));
        expect(q.answer).toBe(winner.text);
        for (const card of cards) expect(correctAnswer(q, card.text)).toBe(card === winner);
        if (cards.some(card => card.left > 10)) {
          ranges.add('larger subtraction');
          expect(cards.every(card => card.text.includes('−'))).toBe(true);
        } else {
          ranges.add('small mixed');
          expect(cards.some(card => card.text.includes('+'))).toBe(true);
          expect(cards.some(card => card.text.includes('−'))).toBe(true);
        }
      } else {
        forms.add('order');
        expect(cards).toHaveLength(4);
        expect(q.prompt).toContain('starting with the greatest');
        expect(cards.every(card => Math.max(card.left, card.right, card.value) <= 10)).toBe(true);
        expect(q.structuredResponse).toMatchObject({ kind: 'number-fields' });
        if (q.structuredResponse?.kind !== 'number-fields') throw new Error('Expected numeric answer boxes');
        expect(q.structuredResponse.fields).toHaveLength(4);
        const expected = descending.map(card => String(card.value));
        expect(q.answer).toBe(JSON.stringify(expected));
        expect(correctAnswer(q, JSON.stringify(expected))).toBe(true);
        expect(correctAnswer(q, JSON.stringify([...expected].reverse()))).toBe(false);
        expect(correctAnswer(q, JSON.stringify(expected.slice(0, 3)))).toBe(false);
        expect(values.map(String)).not.toEqual(expected);
      }
    }
  }
  expect([...forms].sort()).toEqual(['greatest', 'least', 'order']);
  expect(ranges.size).toBe(2);
  expect(winningPositions.size).toBe(3);
});

it('replays a seed and index while producing different visible cards across indices', () => {
  const seen = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(23, index);
    expect(makeRagQuestion(23, index)).toEqual(q);
    seen.add(JSON.stringify(q.choices ?? q.context));
  }
  expect(seen.size).toBeGreaterThan(8);
});
