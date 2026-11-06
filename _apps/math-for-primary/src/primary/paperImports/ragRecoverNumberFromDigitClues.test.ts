import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragRecoverNumberFromDigitClues';

type Form = 'separate' | 'difference' | 'interval';
type Rule = (value: number, tens: number, ones: number) => boolean;

function readClues(lines: string[]): { form: Form; fits: Rule } {
  const text = lines.join(' ');
  const separate = /^My ones digit is (\d+) more than (\d+)\. My tens digit is (\d+) less than (\d+)\.$/.exec(text);
  if (separate) {
    const [, rise, startOnes, drop, startTens] = separate;
    return {
      form: 'separate',
      fits: (_, tens, ones) => ones - Number(startOnes) === Number(rise) && Number(startTens) - tens === Number(drop),
    };
  }
  const difference = /^My number ends in (\d)\. My tens digit is (\d+) more than my ones digit\.$/.exec(text);
  if (difference) {
    const [, last, gap] = difference;
    return { form: 'difference', fits: (_, tens, ones) => ones === Number(last) && tens - ones === Number(gap) };
  }
  const interval = /^My number is greater than (\d+) and less than (\d+)\. My two digits add up to (\d+)\.$/.exec(text);
  if (interval) {
    const [, lower, upper, total] = interval;
    expect(Number(lower) % 10).toBe(0);
    expect(Number(upper) - Number(lower)).toBe(10);
    return { form: 'interval', fits: (value, tens, ones) => Number(lower) < value && value < Number(upper) && tens + ones === Number(total) };
  }
  throw new Error(`Unrecognised clues: ${text}`);
}

it('finds exactly one two-digit numeral from the visible clues in every form', () => {
  const numerals = Array.from({ length: 90 }, (_, i) => String(i + 10));
  const seen: Record<Form, Set<string>> = { separate: new Set(), difference: new Set(), interval: new Set() };
  for (let seed = 0; seed < 60; seed++) {
    for (let index = 0; index < 5; index++) {
      const question = makeRagQuestion(seed, index);
      const { form, fits } = readClues(question.context ?? []);
      const matches = numerals.filter(n => fits(Number(n), Number(n[0]), Number(n[1])));
      expect(matches).toHaveLength(1);
      expect(question.answer).toBe(matches[0]);
      expect(question.unit).toBeUndefined();
      expect(question.choices).toBeUndefined();
      seen[form].add(question.answer);
    }
  }
  for (const values of Object.values(seen)) expect(values.size).toBeGreaterThan(4);
});

it('reproduces the same question for the same seed and index', () => {
  expect(makeRagQuestion(31)).toEqual(makeRagQuestion(31, 0));
  expect(makeRagQuestion(47, 3)).toEqual(makeRagQuestion(47, 3));
});
