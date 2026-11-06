import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragOrdinalLookupInARow';

const ranks = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
const written = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th'];

function readCards(q: Question) {
  const fig = q.picture;
  if (fig?.type !== 'paper' || fig.layout !== 'bars') throw Error('Missing card diagram');
  const shelf = fig.rows.length > 1;
  if (shelf) expect(fig.rows.every(row => row.parts.length === 1)).toBe(true);
  const physical = fig.rows.flatMap(row => row.parts.map(p => {
    const [face, mark] = p.label.split('\n');
    return {face, mark};
  }));
  expect(physical.length).toBeGreaterThanOrEqual(4);
  expect(physical.length).toBeLessThanOrEqual(7);
  const ends = shelf ? ['top', 'bottom'] : ['left', 'right'];
  const clue = (q.context ?? []).join(' ').match(/Start at the (left|right|top|bottom)\./);
  const marked = physical.filter(card => card.mark);
  expect(marked).toHaveLength(clue ? 0 : 1);
  // Try both traversals. Keep only the one consistent with all visible clues.
  const paths = [physical, [...physical].reverse()].map((list, i) => ({list, end: ends[i]}))
    .filter(({list, end}) => (!clue || end === clue[1])
      && list.every((card, i) => !card.mark || card.mark === written[i]));
  expect(paths).toHaveLength(1);
  return {...paths[0], marked};
}

it('solves each response from the displayed cards, starting clue and prompt', () => {
  const seen = new Set<string>(), singleEnds = new Set<string>();
  for (let seed = 1; seed <= 80; seed++) {
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const {list, end, marked} = readCards(q);
      const names = list.map(c => c.face);
      const starTask = q.prompt.includes('unmarked star');
      expect(new Set(names).size).toBe(names.length - Number(starTask));
      const cardAt = (word: string) => {
        const i = ranks.indexOf(word);
        expect(i).toBeGreaterThanOrEqual(0);
        expect(i).toBeLessThan(list.length);
        return names[i];
      };

      const single = /^Which card is (\w+)\?$/.exec(q.prompt);
      const pair = /^Pick the (\w+) card and the (\w+) card\.$/.exec(q.prompt);
      if (single) {
        seen.add('find');
        singleEnds.add(end);
        const expected = cardAt(single[1]);
        expect(q.answer).toBe(expected);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        expect(q.choices?.every(x => names.includes(x))).toBe(true);
      } else if (pair) {
        seen.add('pair');
        const a = cardAt(pair[1]), b = cardAt(pair[2]);
        expect(a).not.toBe(b);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw Error('Expected two selectable cards');
        expect([...spec.options].sort()).toEqual([...names].sort());
        expect(JSON.parse(q.answer).sort()).toEqual([a, b].sort());
        for (const value of [[a, b], [b, a]]) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(value))).toBe(true);
        }
        const wrong = names.find(x => x !== a && x !== b)!;
        for (const value of [[a], [a, a], [a, wrong]]) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(value))).toBe(false);
        }
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        let i: number;
        if (starTask) {
          seen.add('twin-' + end);
          expect(marked[0].face).toBe('★');
          expect(names.filter(x => x === '★')).toHaveLength(2);
          i = list.findIndex(c => c.face === '★' && !c.mark);
        } else {
          seen.add(marked.length ? 'place-marked' : 'place-directed');
          if (marked.length) expect(marked[0].mark).toBe('1st');
          const name = /^What place is the (\w+) card in\?$/.exec(q.prompt)?.[1];
          i = list.findIndex(c => c.face === name);
        }
        expect(i).toBeGreaterThanOrEqual(0);
        expect(q.answer).toBe(written[i]);
      }
    }
  }
  expect([...seen].sort()).toEqual(['find', 'pair', 'place-directed', 'place-marked', 'twin-left', 'twin-right']);
  expect([...singleEnds].sort()).toEqual(['bottom', 'left', 'right', 'top']);
});

it('replays the same seed and index and varies the displayed layouts', () => {
  const layouts = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = makeRagQuestion(71, i);
    expect(q).toEqual(makeRagQuestion(71, i));
    layouts.add(JSON.stringify(q.picture));
  }
  expect(layouts.size).toBeGreaterThan(12);
});
