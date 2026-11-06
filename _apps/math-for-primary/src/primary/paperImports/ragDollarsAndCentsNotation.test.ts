import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragDollarsAndCentsNotation';

const wordValues: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  thirteen: 13, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function readWords(phrase: string): number {
  let thousands = 0;
  let rest = 0;
  for (const word of phrase.split(/[ -]+/)) {
    if (word === 'and') continue;
    if (word === 'thousand') {
      thousands = rest * 1000;
      rest = 0;
      continue;
    }
    if (!(word in wordValues)) throw new Error(`Unknown number word: ${word}`);
    rest += wordValues[word];
  }
  return thousands + rest;
}

it('solves the pupil-visible amount and finds exactly one valid response', () => {
  const seen = new Set<string>();
  for (let seed = -5; seed <= 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const line = q.context?.join(' ') ?? '';
      const cheque = /^The cheque says “([a-z -]+) dollars only”\.$/.exec(line);
      if (cheque) {
        seen.add('cheque');
        const dollars = readWords(cheque[1]);
        expect(dollars).toBeGreaterThan(1000);
        expect(dollars).toBeLessThan(10000);
        expect(Math.floor(dollars / 100) % 10).toBe(0);
        expect(q.answer).toBe(dollars.toFixed(2));
        expect(q.unit).toBe('dollars');
        expect(q.choices).toBeUndefined();
        continue;
      }

      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const words = /^The price in words is ([a-z-]+) dollars and ([a-z-]+) cents?\.$/.exec(line);
      let matches: string[];
      if (words) {
        seen.add('price');
        const cents = readWords(words[2]);
        expect(cents).toBeGreaterThan(0);
        expect(cents).toBeLessThan(10);
        const expected = readWords(words[1]) * 100 + cents;
        matches = choices.filter(choice => {
          const parts = /^\$(\d+)\.(\d{2})$/.exec(choice);
          if (!parts) throw new Error(`Invalid price tag: ${choice}`);
          return Number(parts[1]) * 100 + Number(parts[2]) === expected;
        });
      } else {
        seen.add('separate units');
        const envelope = /^An envelope holds (\d+) cents\.$/.exec(line);
        if (!envelope) throw new Error(`Missing visible amount: ${line}`);
        const total = Number(envelope[1]);
        matches = choices.filter(choice => {
          const parts = /^(\d+) dollars and (\d+) cents?$/.exec(choice);
          if (!parts) throw new Error(`Invalid mixed amount: ${choice}`);
          const dollars = Number(parts[1]);
          const cents = Number(parts[2]);
          expect(cents).toBeLessThan(100);
          return dollars === Math.floor(total / 100) && cents === total % 100;
        });
      }
      expect(matches).toHaveLength(1);
      expect(q.answer).toBe(matches[0]);
    }
  }
  expect(seen).toEqual(new Set(['price', 'separate units', 'cheque']));
});

it('replays the same question and varies the visible givens in every form', () => {
  const prices = new Set<string>();
  const envelopes = new Set<string>();
  const cheques = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const line = q.context?.[0] ?? '';
      if (line.startsWith('The price')) prices.add(line);
      else if (line.startsWith('An envelope')) envelopes.add(line);
      else cheques.add(line);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
  }
  for (const givens of [prices, envelopes, cheques]) expect(givens.size).toBeGreaterThan(8);
});
