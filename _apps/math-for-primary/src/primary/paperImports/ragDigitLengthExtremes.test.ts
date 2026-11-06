import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragDigitLengthExtremes';

// Search whole numbers by their written length. This oracle does not construct digits.
function findExtreme(length: number, kind: 'greatest-even' | 'least-odd' | 'least') {
  const descending = kind === 'greatest-even';
  for (let i = 0; i < 10000; i++) {
    const value = descending ? 9999 - i : i;
    if (String(value).length !== length) continue;
    if (kind === 'least' || value % 2 === (descending ? 0 : 1)) return value;
  }
  throw new Error(`No eligible number of length ${length}`);
}

function lengthIn(text: string) {
  const match = /\b([1-4])-digit\b/.exec(text);
  if (!match) throw new Error(`Missing digit count in ${text}`);
  return Number(match[1]);
}

// List every legal arrangement of the displayed cards, without reserving an ending.
function cardValues(cards: string[], prefix = ''): number[] {
  if (cards.length === 0) return [Number(prefix)];
  return cards.flatMap((digit, i) => {
    if (prefix === '' && digit === '0') return [];
    return cardValues(cards.filter((_, j) => j !== i), prefix + digit);
  });
}

it('solves the visible tasks and checks their response forms across seeds and indices', () => {
  const forms = new Set<string>();
  const evenLengths = new Set<number>();
  const oddLengths = new Set<number>();
  const shownCardSets = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.unit).toBeUndefined();
      if (q.structuredResponse) {
        forms.add('pair');
        const spec = q.structuredResponse;
        if (spec.kind !== 'number-pair') throw new Error('Expected separate answers for (a) and (b)');
        expect(q.context).toHaveLength(2);
        const [a, b] = q.context!;
        expect(a).toMatch(/^\(a\).*even.*large/);
        expect(b).toMatch(/^\(b\).*odd.*small/);
        expect(spec.firstLabel).toContain('(a)');
        expect(spec.secondLabel).toContain('(b)');
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        evenLengths.add(lengthIn(a));
        oddLengths.add(lengthIn(b));
        const pair = [String(findExtreme(lengthIn(a), 'greatest-even')), String(findExtreme(lengthIn(b), 'least-odd'))];
        expect(JSON.parse(q.answer)).toEqual(pair);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(pair))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([pair[1], pair[0]]))).toBe(false);
      } else if (q.picture) {
        forms.add('cards');
        if (q.picture.type !== 'paper' || q.picture.layout !== 'cards') throw new Error('Expected visible digit cards');
        expect(q.prompt).toMatch(/largest odd.*smallest even.*difference/i);
        expect(q.context?.join(' ')).toContain('once in each number');
        expect(q.choices).toBeUndefined();
        const digits = q.picture.cards.map(card => card.value);
        expect(digits).toHaveLength(4);
        expect(new Set(digits).size).toBe(4);
        expect(digits.every(d => /^\d$/.test(d))).toBe(true);
        expect(digits).toContain('0');
        shownCardSets.add([...digits].sort().join(''));
        const values = cardValues(digits);
        const largest = Math.max(...values.filter(value => value % 2 === 1));
        const smallest = Math.min(...values.filter(value => value % 2 === 0));
        expect(q.answer).toBe(String(largest - smallest));
        expect(q.workedSteps?.at(-1)?.equation).toBe(`${largest} − ${smallest} = ${largest - smallest}`);
      } else {
        forms.add('choice');
        const match = /^Zara writes (\d+)\.$/.exec(q.context?.[0] ?? '');
        if (!match) throw new Error('Missing the given number');
        const length = lengthIn(q.prompt);
        expect(q.prompt).toContain('smallest');
        expect(length).toBeGreaterThanOrEqual(2);
        expect(match[1]).toHaveLength(length);
        const expected = String(Number(match[1]) - findExtreme(length, 'least'));
        expect(q.answer).toBe(expected);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      }
    }
  }
  expect(forms).toEqual(new Set(['pair', 'cards', 'choice']));
  expect(evenLengths).toEqual(new Set([1, 2, 3, 4]));
  expect(oddLengths).toEqual(new Set([1, 2, 3, 4]));
  expect(shownCardSets.size).toBeGreaterThan(8);
});

it('reproduces the same question, including card or choice order, for the same seed and index', () => {
  for (const seed of [-12, 0, 71]) {
    for (let index = 0; index < 8; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
