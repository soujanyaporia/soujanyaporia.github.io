import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragMultiplicativeComparison';

function checkStory(q: Question): string {
  const facts = q.context?.join(' ') ?? '';
  const comparison = /(\w+) has (\d+) times as many (\w+) as (\w+)\./.exec(facts);
  if (!comparison) throw new Error('Missing comparison between named collections');
  const [, larger, times, item, smaller] = comparison;
  const factor = Number(times);
  expect([2, 3, 4, 5]).toContain(factor);
  expect(larger).not.toBe(smaller);

  if (q.prompt === `How many ${item} does ${smaller} have?`) {
    const model = q.picture;
    if (model?.type !== 'paper' || model.layout !== 'bars') throw new Error('Missing comparison bars');
    expect(model.rows.map(row => row.label)).toEqual([smaller, larger]);
    const [short, long] = model.rows;
    expect(short.parts).toHaveLength(1);
    expect(short.parts[0].label).toBe('?');
    expect(long.parts).toHaveLength(factor);
    expect(short.parts[0].size).toBeGreaterThan(0);
    expect(long.parts.every(part => part.size === short.parts[0].size)).toBe(true);
    const clue = new RegExp(`^The extra boxes in ${larger}’s row stand for (\\d+) ${item} altogether\\.$`).exec(model.caption ?? '');
    if (!clue) throw new Error('Missing quantity for the extra boxes');
    const gap = Number(clue[1]);
    // Try whole-number collections against both visible facts.
    const solutions: number[] = [];
    for (let count = 1; count <= gap; count++) {
      if (count + gap === factor * count) solutions.push(count);
    }
    expect(solutions).toHaveLength(1);
    expect(q.unit).toBe(item);
    expect(q.answer).toBe(String(solutions[0]));
    expect(q.workedSteps?.map(step => step.equation)).toEqual([
      `${factor} − 1 = ${factor - 1}`, `${gap} ÷ ${factor - 1} = ${solutions[0]}`,
    ]);
    return 'smaller';
  }

  const clue = new RegExp(`\\b${smaller} has (\\d+) ${item}\\.`).exec(facts);
  if (!clue) throw new Error('Missing smaller collection');
  const one = Number(clue[1]);
  expect(one).toBeGreaterThan(0);
  expect(one).toBeLessThanOrEqual(10);
  let many = 0;
  for (let part = 0; part < factor; part++) many += one;
  expect(q.picture).toBeUndefined();
  expect(q.workedSteps?.[0].equation).toBe(`${factor} × ${one} = ${many}`);

  if (q.prompt.startsWith('(a)')) {
    expect(q.prompt).toBe(`(a) How many ${item} does ${larger} have? (b) How many ${item} do the two children have altogether?`);
    const response = q.structuredResponse;
    if (response?.kind !== 'number-pair') throw new Error('Both linked counts need labelled fields');
    expect(response.firstLabel).toBe(`(a) ${larger} (${item})`);
    expect(response.secondLabel).toBe(`(b) Both children (${item})`);
    const total = one + many;
    const expected = [String(many), String(total)];
    expect(JSON.parse(q.answer)).toEqual(expected);
    expect(structuredResponseCorrect(response, q.answer, JSON.stringify(expected))).toBe(true);
    expect(structuredResponseCorrect(response, q.answer, JSON.stringify([...expected].reverse()))).toBe(false);
    expect(q.workedSteps?.[1].equation).toBe(`${many} + ${one} = ${total}`);
    return 'total';
  }

  expect(q.prompt).toBe(`How many more ${item} does ${larger} have than ${smaller}?`);
  expect(q.unit).toBe(item);
  expect(q.answer).toBe(String((factor - 1) * one));
  expect(q.workedSteps?.[1].equation).toBe(`${many} − ${one} = ${many - one}`);
  return 'difference';
}

test('solve each comparison from its visible story and model', () => {
  const variants = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 6; index++) {
      variants.add(checkStory(makeRagQuestion(seed, index)));
    }
  }
  expect([...variants].sort()).toEqual(['difference', 'smaller', 'total']);
});

test('replay a seed and vary its visible questions by index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const stories = new Set<string>();
  for (let index = 0; index < 18; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    stories.add(JSON.stringify([q.prompt, q.context, q.picture]));
  }
  expect(stories.size).toBeGreaterThan(6);
});
