import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragNumberNames';

const values: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function solveName(name: string): number {
  const parsed = /^([a-z]+) hundred(?: and ([a-z]+)(?:-([a-z]+))?)?$/.exec(name);
  if (!parsed) throw new Error(`Unrecognised number name: ${name}`);
  const [, head, rest, last] = parsed;
  const hundreds = values[head];
  if (!(hundreds >= 1 && hundreds <= 9)) throw new Error(`Invalid hundreds word: ${head}`);
  if (!rest) return hundreds * 100;
  const part = values[rest];
  if (!Number.isInteger(part)) throw new Error(`Unknown number word: ${rest}`);
  if (!last) return hundreds * 100 + part;
  const ones = values[last];
  if (!(part >= 20 && part % 10 === 0 && ones >= 1 && ones <= 9)) throw new Error(`Invalid compound name: ${name}`);
  return hundreds * 100 + part + ones;
}

it('solves the displayed words and checks both response forms', () => {
  const formats = new Set<string>();
  const positions = new Set<number>();
  const numbers = new Set<number>();
  const tails = new Set<number>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solveName(q.display ?? '');
      const numeral = String(expected);
      numbers.add(expected);
      tails.add(expected % 100);
      expect(numeral).toMatch(/^[1-9]\d{2}$/);
      expect([513, 713, 628]).not.toContain(expected);
      expect(q.answer).toBe(numeral);
      const hundredsPart = expected - expected % 100;
      const onesPart = expected % 10;
      const tensPart = expected - hundredsPart - onesPart;
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${hundredsPart} + ${tensPart} + ${onesPart} = ${expected}`);
      if (q.choices) {
        formats.add('choice');
        expect(q.prompt).toMatch(/which/i);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.every(c => /^[1-9]\d{0,2}$/.test(c))).toBe(true);
        expect(q.choices.filter(c => c === numeral)).toHaveLength(1);
        positions.add(q.choices.indexOf(numeral));
      } else {
        formats.add('entry');
        expect(q.prompt).toMatch(/digits/i);
      }
    }
  }
  expect(formats).toEqual(new Set(['choice', 'entry']));
  expect(positions.size).toBe(4);
  expect(numbers.size).toBeGreaterThan(30);
  expect(tails.has(0)).toBe(true);
  expect([...tails].some(n => n > 0 && n < 10)).toBe(true);
  expect([...tails].some(n => n >= 10 && n % 10 === 0)).toBe(true);
  expect([...tails].some(n => n > 10 && n < 20)).toBe(true);
  expect([...tails].some(n => n > 20 && n % 10 !== 0)).toBe(true);
});

it('reproduces a question from its seed and varies the visible name across indices', () => {
  const names = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(41, index);
    expect(makeRagQuestion(41, index)).toEqual(q);
    names.add(q.display ?? '');
  }
  expect(names.size).toBeGreaterThan(1);
});
