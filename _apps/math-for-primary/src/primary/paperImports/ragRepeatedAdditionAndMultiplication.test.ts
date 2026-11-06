import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragRepeatedAdditionAndMultiplication';

type Givens = { form: 'jars' | 'product' | 'sum'; groups: number; size: number };

function readGivens(q: Question): Givens {
  if (!q.display) {
    const jars = /(\d+) jars\b/.exec(q.prompt);
    const perJar = /Each jar holds (\d+) buttons/.exec(q.prompt);
    if (!jars || !perJar) throw new Error('Both jar counts must be visible');
    return { form: 'jars', groups: Number(jars[1]), size: Number(perJar[1]) };
  }
  const product = /^(\d+) × (\d+)$/.exec(q.display);
  if (product) return { form: 'product', groups: Number(product[1]), size: Number(product[2]) };
  expect(q.display).toMatch(/^\d+(?: \+ \d+)+$/);
  const terms = q.display.split(' + ').map(Number);
  expect(new Set(terms).size).toBe(1);
  return { form: 'sum', groups: terms.length, size: terms[0] };
}

function valueOfChoice(choice: string): number {
  if (/^\d+(?: × \d+)+$/.test(choice)) {
    return choice.split(' × ').map(Number).reduce((product, n) => product * n, 1);
  }
  expect(choice).toMatch(/^\d+(?: \+ \d+)+$/);
  return choice.split(' + ').map(Number).reduce((sum, n) => sum + n, 0);
}

test('visible givens select exactly one expression in each direction', () => {
  const forms = new Set<string>();
  const pairs = new Set<string>();
  const answerPositions = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 10; index++) {
      const q = makeRagQuestion(seed, index);
      const { form, groups, size } = readGivens(q);
      forms.add(form);
      pairs.add(`${groups},${size}`);
      expect(groups).toBeGreaterThanOrEqual(3);
      expect(groups).toBeLessThanOrEqual(7);
      expect([2, 3, 4, 5, 10]).toContain(size);
      expect(size).not.toBe(groups);
      expect(q.prompt).toMatch(form === 'sum' ? /multiplication/i : /addition/i);

      const choices = q.choices ?? [];
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      const matches = choices.filter(choice => {
        if (form === 'sum') {
          const factors = choice.split(' × ').map(Number);
          return factors.length === 2 && factors[0] === groups && factors[1] === size;
        }
        const terms = choice.split(' + ').map(Number);
        return terms.length === groups && terms.every(term => term === size);
      });
      expect(matches).toHaveLength(1);
      const total = groups * size;
      expect(choices.filter(choice => valueOfChoice(choice) === total)).toEqual(matches);
      expect(q.answer).toBe(matches[0]);
      expect(q.workedSteps?.at(-1)?.equation).toBe(`${matches[0]} = ${total}`);
      answerPositions.add(choices.indexOf(matches[0]));
    }
  }
  expect(forms).toEqual(new Set(['jars', 'product', 'sum']));
  expect(pairs.size).toBeGreaterThan(8);
  expect(answerPositions.size).toBe(4);
});

test('a seed and index reproduce the givens and the choice order', () => {
  expect(makeRagQuestion(37)).toEqual(makeRagQuestion(37, 0));
  expect(makeRagQuestion(37, 4)).toEqual(makeRagQuestion(37, 4));
});
