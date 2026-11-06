import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragP4DecimalFromPlaceValueUnits';

const places: Record<string, number> = { tenths: 1, hundredths: 2, thousandths: 3 };

function digitFromPrompt(prompt: string, place: string): number {
  const match = prompt.match(new RegExp(`(\\d) in the ${place} place`));
  if (!match) throw new Error(`Missing ${place} digit in the prompt`);
  return Number(match[1]);
}

test('solves the pupil-facing givens for each form and checks decimal notation', () => {
  const forms = new Set<string>();
  const roundingCases = new Set<string>();
  for (let seed = -20; seed < 180; seed++) {
    for (let index = 0; index < 9; index++) {
      const q = makeRagQuestion(seed, index);
      let expected: string;
      if (q.prompt.includes('nearest tenth')) {
        const whole = digitFromPrompt(q.prompt, 'ones');
        const tenth = digitFromPrompt(q.prompt, 'tenths');
        const hundredth = digitFromPrompt(q.prompt, 'hundredths');
        const value = 100 * whole + 10 * tenth + hundredth;
        const lower = 100 * whole + 10 * tenth;
        const upper = lower + 10;
        const nearest = value - lower < upper - value ? lower : upper;
        expected = (nearest / 100).toFixed(1);
        forms.add('rounded');
        if (nearest === lower) roundingCases.add('down');
        if (hundredth === 5) roundingCases.add('half');
        if (nearest === upper && tenth === 9) roundingCases.add('carry');
      } else {
        const terms = [...q.prompt.matchAll(/(\d+) (tenths|hundredths|thousandths)\b/g)];
        expect(terms.length).toBeGreaterThan(0);
        const powers = terms.map(term => places[term[2]]);
        const sum = terms.reduce((acc, term, i) => acc + Number(term[1]) / 10 ** powers[i], 0);
        expected = sum.toFixed(Math.max(...powers));
        if (terms.length === 1) {
          forms.add(terms[0][2]);
        } else {
          expect(terms.map(term => term[2])).toEqual(terms.length === 2 ? ['tenths', 'hundredths'] : ['tenths', 'hundredths', 'thousandths']);
          expect(Number(terms[0][1])).toBeGreaterThan(9);
          if (terms.length === 3) expect(Number(terms[1][1])).toBeGreaterThan(9);
          forms.add(`${terms.length} counts`);
        }
      }
      expect(q.answer).toBe(expected);
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
    }
  }
  expect(forms).toEqual(new Set(['tenths', 'hundredths', 'thousandths', '2 counts', '3 counts', 'rounded']));
  expect(roundingCases).toEqual(new Set(['down', 'half', 'carry']));
});

test('reproduces a seeded question and varies the visible givens within a session', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  const prompts = new Set<string>();
  for (let index = 0; index < 9; index++) {
    const q = makeRagQuestion(27, index);
    expect(q).toEqual(makeRagQuestion(27, index));
    prompts.add(q.prompt);
  }
  expect(prompts.size).toBeGreaterThanOrEqual(4);
});
