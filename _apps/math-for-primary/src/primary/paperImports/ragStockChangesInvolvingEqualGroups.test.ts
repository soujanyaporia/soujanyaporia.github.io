import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragStockChangesInvolvingEqualGroups';

function readCount(story: string, clue: RegExp): number {
  const match = clue.exec(story);
  if (!match) throw new Error(`Missing visible count for ${clue} in ${story}`);
  const value = Number(match[1]);
  expect(value).toBeGreaterThan(0);
  expect(value).toBeLessThan(1000);
  return value;
}

function countGroups(count: number, size: number): number {
  expect(count).toBeGreaterThanOrEqual(2);
  expect(count).toBeLessThanOrEqual(10);
  expect([2, 3, 4, 5, 10]).toContain(size);
  return Array.from({ length: count }, () => size).reduce((sum, group) => sum + group, 0);
}

function checkPair(q: Question, first: number, second: number, labels: [string, string]) {
  const spec = q.structuredResponse;
  if (spec?.kind !== 'number-pair') throw new Error('Both answers need ordered number fields');
  expect([spec.firstLabel, spec.secondLabel]).toEqual(labels);
  const encode = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
  expect(q.answer).toBe(encode(first, second));
  expect(structuredResponseCorrect(spec, q.answer, encode(first, second))).toBe(true);
  expect(structuredResponseCorrect(spec, q.answer, encode(first, second + 1))).toBe(false);
  expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(first)]))).toBe(false);
  if (first !== second) expect(structuredResponseCorrect(spec, q.answer, encode(second, first))).toBe(false);
}

it('solves every response and checks the working using only the story givens', () => {
  for (let seed = -8; seed < 32; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const story = (q.context ?? []).join(' ');
      const equations = q.workedSteps?.map(step => step.equation);
      if (story.includes('cracked beads')) {
        forms.add('restore');
        const cracked = readCount(story, /threw away (\d+) cracked beads/);
        const bags = readCount(story, /all the remaining beads into (\d+) bags/);
        const size = readCount(story, /Each bag held (\d+) beads/);
        const packed = countGroups(bags, size);
        const original = packed + cracked;
        expect(q.prompt).toContain('before Nila threw any away');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('beads');
        expect(q.answer).toBe(String(original));
        expect(equations).toEqual([`${bags} × ${size} = ${packed}`, `${packed} + ${cracked} = ${original}`]);
      } else if (story.includes('readers')) {
        forms.add('allocate');
        const start = readCount(story, /Ravi had (\d+) bookmarks/);
        const readers = readCount(story, /each of (\d+) readers/);
        const size = readCount(story, /gave (\d+) bookmarks to each/);
        const given = countGroups(readers, size);
        expect(start).toBeGreaterThan(given);
        checkPair(q, given, start - given, ['(a) Bookmarks given away', '(b) Bookmarks left']);
        expect(equations).toEqual([`${readers} × ${size} = ${given}`, `${start} − ${given} = ${start - given}`]);
      } else {
        forms.add('compare and allocate');
        const total = readCount(story, /Wei had (\d+) stamps altogether/);
        const lina = readCount(story, /Lina had (\d+) stamps/);
        const friends = readCount(story, /each of (\d+) friends/);
        const size = readCount(story, /gave (\d+) stamps to each/);
        const wei = total - lina;
        const given = countGroups(friends, size);
        expect(wei).toBeGreaterThan(lina);
        expect(lina).toBeGreaterThan(given);
        checkPair(q, wei - lina, lina - given, ['(a) Extra stamps Wei had at first', '(b) Stamps Lina kept']);
        expect(equations).toEqual([`${total} − ${lina} = ${wei}`, `${wei} − ${lina} = ${wei - lina}`, `${friends} × ${size} = ${given}`, `${lina} − ${given} = ${lina - given}`]);
      }
    }
    expect(forms.size).toBe(3);
  }
});

it('repeats a seed and index exactly and varies the visible givens', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 24; seed++) {
    const index = seed % 7;
    const q = makeRagQuestion(seed, index);
    expect(makeRagQuestion(seed, index)).toEqual(q);
    stories.add((q.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(12);
});
