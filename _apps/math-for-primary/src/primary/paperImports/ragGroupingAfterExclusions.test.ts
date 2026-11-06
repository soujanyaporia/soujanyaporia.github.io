import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragGroupingAfterExclusions';

function readCount(story: string, pattern: RegExp): number {
  const match = pattern.exec(story);
  if (!match) throw new Error(`Missing visible quantity for ${pattern} in ${story}`);
  return Number(match[1]);
}

test('solves all three tasks using only the stated quantities and the question asked', () => {
  const tasks = new Set<string>();
  for (let seed = -16; seed < 48; seed++) {
    for (let index = 0; index < 6; index++) {
      const question = makeRagQuestion(seed, index);
      const story = question.context?.join(' ') ?? '';
      const total = readCount(story, /has (\d+) beads/);
      const saved = readCount(story, /saves (\d+) beads for tomorrow/);
      const today = total - saved;
      expect(saved).toBeGreaterThan(0);
      expect(today).toBeGreaterThan(0);
      expect(today).toBeLessThanOrEqual(999);
      const equations = question.workedSteps?.map(step => step.equation) ?? [];
      expect(equations[0]).toBe(`${total} − ${saved} = ${today} beads`);

      let expected: number;
      let unit: string;
      if (question.prompt.startsWith('How many beads are in each pack?')) {
        tasks.add('size');
        const packs = readCount(story, /fills (\d+) packs/);
        const loose = readCount(story, /today's beads, (\d+) stay loose/);
        const packed = today - loose;
        expect(packs).toBeGreaterThan(1);
        expect(packs).toBeLessThanOrEqual(9);
        expect(packed % packs).toBe(0);
        expected = packed / packs;
        unit = 'beads';
        expect(loose).toBeGreaterThan(0);
        expect(loose).toBeLessThan(expected);
        expect(equations.slice(1)).toEqual([
          `${today} − ${loose} = ${packed} beads`,
          `${packed} ÷ ${packs} = ${expected} beads per pack`,
        ]);
      } else {
        const size = readCount(story, /with (\d+) beads in each pack/);
        expect(size).toBeGreaterThan(1);
        expect(size).toBeLessThanOrEqual(9);
        // Fill one pack at a time independently of the generator's arithmetic.
        let packs = 0;
        let loose = today;
        while (loose >= size) {
          loose -= size;
          packs++;
        }
        if (question.prompt.startsWith('How many packs does Siti fill?')) {
          tasks.add('count');
          expect(loose).toBe(0);
          expected = packs;
          unit = 'packs';
          expect(equations[1]).toBe(`${today} ÷ ${size} = ${packs} packs`);
        } else {
          tasks.add('leftover');
          expect(question.prompt).toContain(`How many of today's beads are left`);
          expect(story).toContain('as many full packs as she can');
          expect(loose).toBeGreaterThan(0);
          expected = loose;
          unit = 'beads';
          expect(equations[1]).toBe(`${today} ÷ ${size} = ${packs} remainder ${loose}`);
        }
      }
      expect(question.answer).toBe(String(expected));
      expect(question.unit).toBe(unit);
    }
  }
  expect([...tasks].sort()).toEqual(['count', 'leftover', 'size']);
});

test('replays the same question and varies the visible givens across indices', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(73, index);
    expect(makeRagQuestion(73, index)).toEqual(question);
    stories.add(question.context?.join(' ') ?? '');
  }
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  expect(stories.size).toBeGreaterThan(1);
});
