import { expect, test } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragExtremeNumeral';

// Scan whole numbers in order. A number qualifies if its three places can
// each be filled by a different card in the visible row.
function solveVisibleRow(display: string) {
  const cards = display.split(', ');
  expect(cards.every(card => /^\d$/.test(card))).toBe(true);
  expect(new Set(cards).size).toBe(cards.length);
  const allowed: string[] = [];
  for (let number = 100; number < 1000; number++) {
    const digits = String(number).split('');
    if (new Set(digits).size === 3 && digits.every(digit => cards.includes(digit))) {
      allowed.push(String(number));
    }
  }
  expect(allowed.length).toBeGreaterThan(1);
  return { cards, low: allowed[0], high: allowed[allowed.length - 1] };
}

test('solves single entries and both linked fields from the displayed cards', () => {
  const forms = new Set<string>();
  const deals = new Set<string>();
  let sawOddGreatest = false;
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      expect(question.prompt).toContain('three-digit');
      expect(question.prompt).toContain('smallest');
      const { cards, low, high } = solveVisibleRow(question.display ?? '');
      deals.add([...cards].sort().join(''));
      const instructions = question.context?.join(' ') ?? '';
      if (cards.length === 3) {
        expect(instructions).toMatch(/all three cards, once each/i);
      } else {
        expect(cards).toHaveLength(4);
        expect(cards).toContain('0');
        expect(instructions).toMatch(/three of the four cards/i);
        expect(low[1]).toBe('0');
      }

      if (question.prompt.includes('greatest')) {
        forms.add('linked');
        expect(cards).toHaveLength(4);
        expect(instructions).toContain('between 100 and 1000');
        expect(instructions).toContain('Put the cards back');
        const spec = question.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Expected two labelled number fields');
        expect(spec.firstLabel).toMatch(/greatest/i);
        expect(spec.secondLabel).toMatch(/smallest/i);
        expect(question.answer).toBe(JSON.stringify([high, low]));
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([high, low]))).toBe(true);
        expect(structuredResponseCorrect(spec, question.answer, JSON.stringify([low, high]))).toBe(false);
        sawOddGreatest ||= Number(high) % 2 === 1;
      } else {
        forms.add(cards.length === 3 ? 'all' : 'choose');
        expect(question.structuredResponse).toBeUndefined();
        expect(question.answer).toBe(low);
      }
    }
  }
  expect([...forms].sort()).toEqual(['all', 'choose', 'linked']);
  expect(deals.size).toBeGreaterThan(8);
  expect(sawOddGreatest).toBe(true);
});

test('replays a deal and its worked solution from its seed and index', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  for (let index = 0; index < 8; index++) {
    const first = makeRagQuestion(71, index);
    expect(makeRagQuestion(71, index)).toEqual(first);
    const { low, high } = solveVisibleRow(first.display ?? '');
    const equations = first.workedSteps?.flatMap(step => step.equation ? [step.equation] : []) ?? [];
    const expected = first.prompt.includes('greatest') ? [high, low] : [low];
    expect(equations).toEqual(expected.map(value => `${Number(value[0]) * 100} + ${Number(value[1]) * 10} + ${value[2]} = ${value}`));
  }
});
