import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragExtremeDigitCards';

function visibleTask(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Expected visible digit cards');
  const digits = picture.cards.map(card => card.value);
  const parity = /three-digit (odd|even) number/.exec(q.prompt)?.[1];
  const extreme = /the (smallest|largest) one/.exec(q.prompt)?.[1];
  if (!parity || !extreme) throw new Error('The prompt must specify the parity and the goal');
  return { digits, parity, extreme };
}

it('finds the requested extreme independently from the visible cards and prompt', () => {
  const modes = new Set<string>();
  for (let seed = -8; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { digits, parity, extreme } = visibleTask(q);
      expect(digits.every(digit => /^\d$/.test(digit))).toBe(true);
      expect(new Set(digits).size).toBe(digits.length);
      expect(q.context).toContain('Use each chosen card once. The first digit must be greater than zero.');
      expect(q.context).toContain(digits.length === 4 ? 'Pick three of the four cards.' : 'Use all three cards.');
      modes.add(`${extreme}-${parity}-${digits.length}`);

      // Scan whole numbers in order, independently of how the generator arranges cards.
      const legal: number[] = [];
      for (let n = 100; n <= 999; n++) {
        const used = String(n).split('');
        if (n % 2 === (parity === 'even' ? 0 : 1) && new Set(used).size === 3 && used.every(d => digits.includes(d))) legal.push(n);
      }
      expect(legal.length).toBeGreaterThan(0);
      const expected = extreme === 'smallest' ? legal[0] : legal[legal.length - 1];
      expect(q.answer).toBe(String(expected));
    }
  }
  expect([...modes].sort()).toEqual(['largest-odd-3', 'smallest-even-3', 'smallest-odd-4']);
});

it('replays a seed and includes both forced-zero and competing even endings', () => {
  expect(makeRagQuestion(21)).toEqual(makeRagQuestion(21, 0));
  const endingsSeen = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    for (let index = 0; index < 4; index++) {
      const { digits, parity } = visibleTask(makeRagQuestion(seed, index));
      if (parity === 'even') {
        const endings = digits.filter(digit => Number(digit) % 2 === 0);
        if (endings.length === 1 && endings[0] === '0') endingsSeen.add('zero only');
        if (endings.length === 2) endingsSeen.add('two choices');
      }
    }
  }
  expect(endingsSeen).toEqual(new Set(['zero only', 'two choices']));
});
