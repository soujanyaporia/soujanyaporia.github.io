import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragSharingWithDerivedRecipientCount';

function readParticipants(line: string) {
  const classmates = /Mei and (\d+) classmates/.exec(line);
  if (classmates) return { kind: 'named', counts: [1, Number(classmates[1])] };

  const tables = /(\d+) children sit at the red table and (\d+) children sit at the blue table/.exec(line);
  if (tables) return { kind: 'tables', counts: [Number(tables[1]), Number(tables[2])] };
  throw new Error(`Cannot identify who shares the beads in '${line}'`);
}

it('solves both stories using only the children and beads described to the pupil', () => {
  const kinds = new Set<string>();
  const divisors = new Set<number>();
  const shares = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const [peopleLine, beadsLine] = question.context ?? [];
      const { kind, counts } = readParticipants(peopleLine ?? '');
      const beads = /share all (\d+) beads so that every child gets the same number/.exec(beadsLine ?? '');
      if (!beads) throw new Error('The total or equal-sharing condition is missing');
      const children = counts.reduce((sum, count) => sum + count, 0);
      const total = Number(beads[1]);
      const perChild = total / children;

      expect(counts.every(count => count > 0)).toBe(true);
      expect(children).toBeLessThanOrEqual(9);
      expect(total).toBeGreaterThan(0);
      expect(total).toBeLessThanOrEqual(999);
      expect(total % children).toBe(0);
      expect(question.prompt).toMatch(/beads does each child get/);
      expect(question.answer).toBe(String(perChild));
      expect(question.unit).toBe('beads');
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${counts.join(' + ')} = ${children} children`,
        `${total} ÷ ${children} = ${perChild} beads`,
      ]);
      kinds.add(kind);
      divisors.add(children);
      shares.add(perChild);
    }
  }
  expect(kinds).toEqual(new Set(['named', 'tables']));
  expect(divisors.size).toBeGreaterThan(2);
  expect(shares.size).toBeGreaterThan(4);
});

it('reproduces a seed and varies the visible givens across question indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const stories = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(question);
    stories.add(question.context?.join(' ') ?? '');
  }
  expect(stories.size).toBeGreaterThan(1);
});
