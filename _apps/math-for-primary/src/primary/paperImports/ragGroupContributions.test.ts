import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragGroupContributions';

function readCounts(line: string | undefined, pattern: RegExp): number[] {
  const match = pattern.exec(line ?? '');
  if (!match) throw new Error(`Missing pupil-facing counts in ${line}`);
  return match.slice(1).map(Number);
}

function countItems(groups: number, size: number): number {
  let total = 0;
  for (let i = 0; i < groups; i++) total += size;
  return total;
}

it('grades both packing plans against the original pile, including too few and too many buttons', () => {
  const observed = new Set<string>();
  const differences = [new Set<number>(), new Set<number>()];
  const labels = ['A True, B True', 'A True, B False', 'A False, B True', 'A False, B False'];
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (!q.choices) continue;
      const [pile, sizes, planA, planB] = q.context ?? [];
      const [supply] = readCounts(pile, /^Mina has (\d+) buttons\.$/);
      const [small, large] = readCounts(sizes, /^A full small bag holds (\d+) buttons\. A full large bag holds (\d+) buttons\.$/);
      const [onlySmall] = readCounts(planA, /^Plan A: Fill (\d+) small bags only\.$/);
      const [smallBags, largeBags] = readCounts(planB, /^Plan B: Fill (\d+) small bags and (\d+) large bags\.$/);
      expect(large).toBeGreaterThan(small);
      expect(Math.min(small, onlySmall, smallBags, largeBags, supply)).toBeGreaterThan(0);
      const a = countItems(onlySmall, small);
      const b = countItems(smallBags, small) + countItems(largeBags, large);
      expect(Math.max(a, b, supply)).toBeLessThanOrEqual(40);
      const expected = `A ${a === supply ? 'True' : 'False'}, B ${b === supply ? 'True' : 'False'}`;
      expect(q.answer).toBe(expected);
      expect([...q.choices].sort()).toEqual([...labels].sort());
      expect(q.choices.filter(choice => correctAnswer(q, choice))).toEqual([expected]);
      observed.add(expected);
      differences[0].add(Math.sign(a - supply));
      differences[1].add(Math.sign(b - supply));
    }
  }
  expect(observed).toEqual(new Set(labels));
  for (const signs of differences) expect(signs).toEqual(new Set([-1, 0, 1]));
});

it('solves the sticker story from both tables and checks the equation and its result', () => {
  const totals = new Set<number>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.choices) continue;
      const [tables, materials] = q.context ?? [];
      const [red, blue] = readCounts(tables, /^There are (\d+) children at the red table and (\d+) children at the blue table\.$/);
      const [each] = readCounts(materials, /^Each child uses (\d+) stickers to make a card\.$/);
      expect(Math.min(red, blue, each)).toBeGreaterThan(0);
      const total = countItems(red, each) + countItems(blue, each);
      const children = red + blue;
      expect(total).toBeLessThanOrEqual(40);
      expect(q.unit).toBe('stickers');
      expect(q.answer).toBe(`${children} * ${each} = ${total}`);
      expect(correctAnswer(q, `${each} × ${children} = ${total}`)).toBe(true);
      expect(correctAnswer(q, `${red} × ${each} = ${red * each}`)).toBe(false);
      expect(correctAnswer(q, `${children} × ${each} = ${total + 1}`)).toBe(false);
      expect(correctAnswer(q, String(total))).toBe(false);
      totals.add(total);
    }
  }
  expect(totals.size).toBeGreaterThan(5);
});

it('reproduces a question from its seed and index', () => {
  for (const index of [0, 1, 2, 3]) {
    expect(makeRagQuestion(15, index)).toEqual(makeRagQuestion(15, index));
  }
  expect(makeRagQuestion(15)).toEqual(makeRagQuestion(15, 0));
});
