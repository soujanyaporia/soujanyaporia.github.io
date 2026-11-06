import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPlaceValueUnitArithmetic';

const numbers = Array.from({ length: 1000 }, (_, n) => n);

function uniqueValue(fits: (n: number) => boolean): number {
  const matches = numbers.filter(fits);
  expect(matches).toHaveLength(1);
  return matches[0];
}

// Find the numeral that makes the pupil's statement true using only its visible givens.
function solve(prompt: string) {
  const forward = /^Start at (\d+) and count on (\d+) tens\. Where do you finish\? Show your working\.$/.exec(prompt);
  if (forward) {
    const [start, tens] = forward.slice(1).map(Number);
    const value = uniqueValue(n => n - start === 10 * tens);
    expect(Math.floor(value / 100)).toBe(Math.floor(start / 100) + 1);
    return { form: 'count on', value };
  }

  const mixed = /^Start with (\d+)\. Take away (\d+) hundreds and (\d+) tens\. How much is left\?$/.exec(prompt);
  if (mixed) {
    const [start, hundreds, tens] = mixed.slice(1).map(Number);
    expect(tens).toBeGreaterThanOrEqual(10);
    const value = uniqueValue(n => n + 10 * tens + 100 * hundreds === start);
    return { form: 'take both away', value };
  }

  const inverse = /^I added (\d+) hundreds to my number and got (\d+)\. What was my number\?$/.exec(prompt);
  if (inverse) {
    const [hundreds, finish] = inverse.slice(1).map(Number);
    const value = uniqueValue(n => n + 100 * hundreds === finish);
    expect(value % 100).toBe(finish % 100);
    return { form: 'recover start', value };
  }

  const difference = /^Find the difference between (\d+) tens and (\d+) tens\. Give your answer in ones\.$/.exec(prompt);
  if (difference) {
    const [more, fewer] = difference.slice(1).map(Number);
    expect(more).toBeGreaterThan(fewer);
    const value = uniqueValue(n => fewer * 10 + n === more * 10);
    return { form: 'compare tens', value };
  }
  throw new Error(`Cannot solve the visible prompt: ${prompt}`);
}

it('finds one whole-number answer from the visible givens in each form', () => {
  const prompts = new Set<string>();
  for (let seed = -8; seed <= 32; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const { form, value } = solve(question.prompt);
      expect(question.answer).toBe(String(value));
      expect(question.choices).toBeUndefined();
      expect(question.picture).toBeUndefined();
      forms.add(form);
      prompts.add(question.prompt);
    }
    expect(forms).toEqual(new Set(['count on', 'take both away', 'recover start', 'compare tens']));
  }
  expect(prompts.size).toBeGreaterThan(40);
});

it('reproduces each question and gives arithmetically correct worked equations', () => {
  for (let seed = 0; seed < 16; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 8; index++) {
      const question = makeRagQuestion(seed, index);
      expect(question).toEqual(makeRagQuestion(seed, index));
      const steps = question.workedSteps ?? [];
      expect(steps.length).toBeGreaterThanOrEqual(2);
      for (const step of steps) {
        const equation = /^(\d+) ([+×−]) (\d+) = (\d+)$/.exec(step.equation ?? '');
        if (!equation) throw new Error(`Unreadable worked equation: ${step.equation}`);
        const [, first, op, second, result] = equation;
        const a = Number(first), b = Number(second);
        const evaluated = op === '×' ? a * b : op === '+' ? a + b : a - b;
        expect(evaluated).toBe(Number(result));
        expect(evaluated).toBeGreaterThanOrEqual(0);
        expect(evaluated).toBeLessThan(1000);
      }
    }
  }
});
