import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragP3ExtremeDigitCards';

function canBuild(value: number, cards: string[]): boolean {
  const digits = [...String(value)];
  return digits.length === 4 && new Set(digits).size === 4 && digits.every(d => cards.includes(d));
}

test('the keyed answer is the extreme of all numerals allowed by the visible cards and instructions', () => {
  const forms = new Set<string>();
  const minimumStarts = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (const index of [0, 3]) {
      const q = makeRagQuestion(seed, index);
      const picture = q.picture;
      if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing digit cards');
      const cards = picture.cards.map(card => card.value);
      expect(cards.every(d => /^\d$/.test(d))).toBe(true);
      expect(new Set(cards).size).toBe(cards.length);
      const rules = (q.context ?? []).join(' ');
      const useAll = rules.includes('Use all four cards once each.');
      if (!useAll) expect(rules).toContain('Pick four of the five cards. Use each chosen card once.');
      expect(cards).toHaveLength(useAll ? 4 : 5);
      const greatest = q.prompt.includes('greatest');
      expect(q.prompt).toContain(greatest ? 'greatest four-digit' : 'smallest four-digit');
      const range = /greater than (\d+) and less than (\d+)/.exec(rules);
      expect(Boolean(range)).toBe(greatest);
      const lower = range ? Number(range[1]) : 999;
      const upper = range ? Number(range[2]) : 10000;
      expect(lower).toBeGreaterThanOrEqual(999);
      expect(upper).toBeLessThanOrEqual(10000);

      // Scan whole numbers in numerical order, independently of the generator's place-value strategy.
      const possible: number[] = [];
      for (let n = lower + 1; n < upper; n++) {
        if (canBuild(n, cards)) possible.push(n);
      }
      expect(possible.length).toBeGreaterThan(1);
      const expected = String(greatest ? possible[possible.length - 1] : possible[0]);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBeUndefined();
      if (greatest) {
        expect(cards.some(d => Number(d) * 1000 >= upper)).toBe(true);
        expect(q.choices).toBeUndefined();
        forms.add(useAll ? 'bounded-all' : 'bounded-subset');
      } else {
        expect(useAll).toBe(true);
        minimumStarts.add(cards.includes('0') ? 'with zero' : 'without zero');
        forms.add(q.choices ? 'minimum-choice' : 'minimum-entry');
      }
      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        for (const option of q.choices) expect(possible).toContain(Number(option));
      } else {
        expect(rules).toContain('Show your working');
      }
    }
  }
  expect(forms).toEqual(new Set(['minimum-choice', 'minimum-entry', 'bounded-subset', 'bounded-all']));
  expect(minimumStarts).toEqual(new Set(['with zero', 'without zero']));
});

test('the same seed and index reproduce the deal, and a session has varied visible givens', () => {
  const deals = new Set<string>();
  for (let index = 0; index < 20; index++) {
    const question = makeRagQuestion(41, index);
    expect(makeRagQuestion(41, index)).toEqual(question);
    deals.add(JSON.stringify(question.picture));
  }
  expect(deals.size).toBeGreaterThan(8);
});
