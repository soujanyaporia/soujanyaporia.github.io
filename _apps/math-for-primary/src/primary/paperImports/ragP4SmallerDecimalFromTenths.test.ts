import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4SmallerDecimalFromTenths';

function solveClue(prompt: string) {
  const match = /is (\d+(?:\.\d)?)( tenths)? smaller than (\d+\.\d{2})\./.exec(prompt);
  if (!match) throw new Error(`Cannot find the two numbers in: ${prompt}`);
  const [, amount, unit, reference] = match;
  const inTenths = Boolean(unit);
  expect(amount).toMatch(inTenths ? /^\d+$/ : /^\d+\.\d$/);
  const difference = inTenths ? Number(amount) / 10 : Number(amount);
  const expected = (Number(reference) - difference).toFixed(2);
  return { expected, inTenths, reference, difference };
}

it('solves both forms from the printed comparison and checks every choice', () => {
  const modes = new Set<string>();
  const correctPositions = new Set<number>();
  const prompts = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const { expected, inTenths, reference, difference } = solveClue(question.prompt);
      expect(question.answer).toBe(expected);
      expect(Number(expected)).toBeGreaterThan(0);
      expect(expected.at(-1)).toBe(reference.at(-1));
      expect(question.workedSteps?.at(-1)?.equation).toBe(
        `${reference} − ${difference.toFixed(2)} = ${expected}`,
      );
      expect(question.picture).toBeUndefined();
      expect(question.unit).toBeUndefined();
      prompts.add(question.prompt);

      if (inTenths) {
        modes.add('entry');
        expect(question.choices).toBeUndefined();
      } else {
        modes.add('choice');
        const options = question.choices ?? [];
        expect(options).toHaveLength(4);
        expect(new Set(options.map(Number)).size).toBe(4);
        // Adding the stated difference to just one option must recover the reference.
        const matches = options.filter(value => (Number(value) + difference).toFixed(2) === reference);
        expect(matches).toEqual([expected]);
        correctPositions.add(options.indexOf(expected));
      }
    }
  }
  expect(modes.size).toBe(2);
  expect(correctPositions.size).toBe(4);
  expect(prompts.size).toBeGreaterThan(64);
});

it('reproduces the same question from the same seed and index', () => {
  expect(makeRagQuestion(19)).toEqual(makeRagQuestion(19, 0));
  expect(makeRagQuestion(-17, 8)).toEqual(makeRagQuestion(-17, 8));
});
