import { expect, it } from 'vitest';
import { numberEntry } from '../answerFormat';
import { makeRagQuestion } from './ragP4FiveDigitNumberNameToNumeral';

const values: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20,
  thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};

function readName(name: string): number {
  if (!/^[a-z]+(?:[ -][a-z]+)*$/.test(name)) throw new Error(`Expected a number in words: ${name}`);
  let thousands = 0;
  let group = 0;
  for (const word of name.split(/[ -]/)) {
    if (word === 'thousand') {
      thousands = group * 1000;
      group = 0;
    } else if (word === 'hundred') {
      group *= 100;
    } else if (word !== 'and') {
      if (!Object.hasOwn(values, word)) throw new Error(`Unknown number word: ${word}`);
      group += values[word];
    }
  }
  return thousands + group;
}

it('recovers the numeral from the visible words, including empty places', () => {
  const hundredsCases = new Set<boolean>();
  const names = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const name = question.context?.[0];
      if (!name) throw new Error('The pupil needs a visible number name');
      const expected = readName(name);
      const digits = String(expected);
      expect(digits).toMatch(/^[1-9]\d{4}$/);
      expect(question.answer).toBe(digits);
      expect(numberEntry(question)).toBe(true);
      expect(question.choices).toBeUndefined();
      expect(question.picture).toBeUndefined();
      expect(question.unit).toBeUndefined();

      const namesHundreds = name.includes(' hundred');
      expect(namesHundreds).toBe(digits[2] !== '0');
      expect(name).toMatch(namesHundreds ? / thousand [a-z]+ hundred and / : / thousand and /);
      const thousandsValue = Math.floor(expected / 1000) * 1000;
      expect(question.workedSteps?.at(-1)?.equation).toBe(`${thousandsValue} + ${expected % 1000} = ${expected}`);
      expect(question.workedSteps?.some(step => step.text.includes(digits.slice(-3)))).toBe(true);
      hundredsCases.add(namesHundreds);
      names.add(name);
    }
  }
  expect(hundredsCases.size).toBe(2);
  expect(names.size).toBeGreaterThan(40);
});

it('repeats the same question for the same inputs and varies the words across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const names = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(question);
    names.add(question.context![0]);
  }
  expect(names.size).toBeGreaterThan(1);
});
