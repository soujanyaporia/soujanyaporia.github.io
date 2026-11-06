import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragDigitPlaceLookup';

it('solves both kinds of lookup from the displayed numeral and prompt', () => {
  const observed = new Set<string>();
  const zeroCases = new Set<string>();
  const numerals = new Set<string>();
  for (let seed = 0; seed < 128; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const shown = q.display ?? '';
      expect(shown).toMatch(/^[1-9]\d{2}$/);
      numerals.add(shown);
      const n = Number(shown);
      const reading = { ones: n % 10, tens: Math.floor(n / 10) % 10, hundreds: Math.floor(n / 100) };
      const givenDigit = /^Which place is the digit (\d) in\?$/.exec(q.prompt);
      if (givenDigit) {
        const d = Number(givenDigit[1]);
        const matches = Object.entries(reading).filter(([, value]) => value === d);
        expect(matches).toHaveLength(1);
        const [place] = matches[0];
        expect(q.answer).toBe(place);
        expect(q.choices?.slice().sort()).toEqual(['hundreds', 'ones', 'tens', 'thousands']);
        observed.add(`choice:${place}`);
        if (d === 0) zeroCases.add('choice');
      } else {
        const givenPlace = /^Look at the (ones|tens|hundreds) place\. Which digit is there\?$/.exec(q.prompt);
        if (!givenPlace) throw new Error(`Missing place in prompt: ${q.prompt}`);
        const place = givenPlace[1] as keyof typeof reading;
        expect(q.answer).toBe(String(reading[place]));
        expect(q.choices).toBeUndefined();
        observed.add(`entry:${place}`);
        if (reading[place] === 0) zeroCases.add('entry');
      }
    }
  }
  expect(observed.size).toBe(6);
  expect(zeroCases.size).toBe(2);
  expect(numerals.size).toBeGreaterThan(50);
});

it('replays a seed and offers both response forms on successive items', () => {
  for (const seed of [-7, 0, 25, 810]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    expect(Boolean(makeRagQuestion(seed, 1).choices)).toBe(!Boolean(first.choices));
  }
});
