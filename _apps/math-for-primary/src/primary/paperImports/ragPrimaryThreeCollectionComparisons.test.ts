import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPrimaryThreeCollectionComparisons';

function readCount(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible count for ${pattern} in ${text}`);
  return Number(match[1]);
}

function solveVisibleStory(q: Question) {
  const text = (q.context ?? []).join(' ');
  if (q.prompt === 'How many tickets did the two stalls sell in all? Show your working.') {
    const red = readCount(text, /red stall sold (\d+) tickets at a fair/);
    const gap = readCount(text, /red stall sold (\d+) fewer tickets than the blue stall/);
    const total = 2 * red + gap;
    const blue = total - red;
    return { unit: 'tickets', total, counts: [red, gap, blue], multipleChoice: false,
      equations: [`${red} + ${gap} = ${blue}`, `${red} + ${blue} = ${total}`] };
  }
  if (q.prompt === 'How many beads were left in the yellow jar?') {
    const green = readCount(text, /green jar held (\d+) beads/);
    const gap = readCount(text, /It held (\d+) more beads than a yellow jar/);
    const used = readCount(text, /took (\d+) beads from the yellow jar/);
    const total = green - (gap + used);
    const yellow = total + used;
    return { unit: 'beads', total, counts: [green, gap, used, yellow], multipleChoice: true,
      equations: [`${green} − ${gap} = ${yellow}`, `${yellow} − ${used} = ${total}`] };
  }
  if (q.prompt === 'How many seeds did the club plant in all three patches?') {
    const beans = readCount(text, /(\d+) seeds in the bean patch/);
    const peas = readCount(text, /(\d+) seeds in the pea patch/);
    const gap = readCount(text, /(\d+) fewer seeds in the corn patch than in the bean patch/);
    const total = 2 * beans + peas - gap;
    const corn = total - beans - peas;
    return { unit: 'seeds', total, counts: [beans, peas, gap, corn], multipleChoice: true,
      equations: [`${beans} − ${gap} = ${corn}`, `${beans} + ${peas} + ${corn} = ${total}`] };
  }
  throw new Error(`Unrecognised task: ${q.prompt}`);
}

it('solves each task from its visible comparisons and checks both worked equations', () => {
  const observed = new Map<string, Set<string>>();
  for (let seed = -12; seed <= 35; seed++) {
    for (let index = 0; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      const solution = solveVisibleStory(q);
      const expected = String(solution.total);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe(solution.unit);
      expect(q.workedSteps?.map(step => step.equation)).toEqual(solution.equations);
      for (const n of [...solution.counts, solution.total]) {
        expect(Number.isInteger(n) && n > 0 && n <= 9999).toBe(true);
      }
      if (solution.multipleChoice) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(option => option === expected)).toHaveLength(1);
      } else {
        expect(q.choices).toBeUndefined();
      }
      const stories = observed.get(solution.unit) ?? new Set<string>();
      stories.add(JSON.stringify(q.context));
      observed.set(solution.unit, stories);
    }
  }
  expect([...observed.keys()].sort()).toEqual(['beads', 'seeds', 'tickets']);
  for (const stories of observed.values()) expect(stories.size).toBeGreaterThan(1);
});

it('reproduces the same question and varies its visible givens across indices', () => {
  expect(makeRagQuestion(42)).toEqual(makeRagQuestion(42, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(q);
    contexts.add(JSON.stringify(q.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
