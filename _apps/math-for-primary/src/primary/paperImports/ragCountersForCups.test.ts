import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCountersForCups';

function fillCupsFromGivens(question: Question) {
  const mat = question.picture;
  if (mat?.type !== 'counters') throw new Error('The starting collection must be visible.');
  const instructions = question.context?.join(' ') ?? '';
  const match = /There are (\d+) cups to fill\. Each cup needs (\d+) counters\./.exec(instructions);
  if (!match) throw new Error('Both cup givens must be visible.');
  const cups = Number(match[1]);
  const perCup = Number(match[2]);
  let left = mat.count;
  for (let cup = 0; cup < cups; cup++) left -= perCup;
  return { mat, cups, perCup, left };
}

it('solves both response forms by filling the cups from the pictured supply', () => {
  const forms = new Set<string>();
  const amounts = new Set<number>();
  let sawAWholeExtraGroup = false;
  for (let seed = 0; seed < 48; seed++) {
    for (const index of [0, 1]) {
      const question = makeRagQuestion(seed, index);
      const { mat, cups, perCup, left } = fillCupsFromGivens(question);
      expect(mat).toEqual({ type: 'counters', count: mat.count });
      expect(Number.isInteger(mat.count)).toBe(true);
      expect(mat.count).toBeLessThanOrEqual(20);
      expect(cups).toBeGreaterThanOrEqual(2);
      expect(perCup).toBeGreaterThanOrEqual(2);
      expect(left).toBeGreaterThan(0);
      expect(question.answer).toBe(String(left));
      expect(question.unit).toBe('counters');
      amounts.add(left);

      const used = mat.count - left;
      expect(question.workedSteps?.[1]?.picture).toEqual({ type: 'counters', count: used, group: perCup });
      expect(question.workedSteps?.[2]?.equation).toBe(`${mat.count} − ${used} = ${left}`);
      if (question.prompt.includes('put away')) {
        forms.add('entry');
        expect(question.choices).toBeUndefined();
        if (left >= perCup) sawAWholeExtraGroup = true;
      } else {
        forms.add('choice');
        expect(question.prompt).toContain('still on the mat');
        expect(left).toBeLessThan(perCup);
        const choices = question.choices ?? [];
        expect(choices).toHaveLength(4);
        expect(new Set(choices).size).toBe(4);
        expect(choices.every(value => /^\d+$/.test(value))).toBe(true);
        expect(choices.filter(value => Number(value) === left)).toHaveLength(1);
      }
    }
  }
  expect(forms).toEqual(new Set(['entry', 'choice']));
  expect(amounts.size).toBeGreaterThan(1);
  expect(sawAWholeExtraGroup).toBe(true);
});

it('reproduces each question and varies its visible givens across seeds', () => {
  const givens = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const next = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 1)).toEqual(next);
    expect(next.prompt).not.toBe(first.prompt);
    givens.add(JSON.stringify([first.context, first.picture]));
  }
  expect(givens.size).toBeGreaterThan(4);
});
