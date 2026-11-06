import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragDeriveDivisorBeforeSharing';

function readGivens(text: string) {
  const friends = /Mei has (\d+) beads\. She shares all of them equally among herself and her (\d+) friends\./.exec(text);
  if (friends) {
    const companions = Number(friends[2]);
    return { form: 'friends', total: Number(friends[1]), count: companions + 1, unit: 'beads', countWork: `${companions} + 1 = ${companions + 1}` };
  }

  const tables = /There are (\d+) pupils at the round table and (\d+) pupils at the square table\. Their teacher shares all (\d+) bookmarks equally among the pupils at both tables\./.exec(text);
  if (tables) {
    const round = Number(tables[1]);
    const square = Number(tables[2]);
    expect(Math.min(round, square)).toBeGreaterThan(0);
    return { form: 'tables', total: Number(tables[3]), count: round + square, unit: 'bookmarks', countWork: `${round} + ${square} = ${round + square}` };
  }

  const interval = /every day from (\w+) to (\w+) in the same week\. She folded (\d+) cranes altogether, with the same number each day\./.exec(text);
  if (!interval) throw new Error(`Cannot identify the equal shares in: ${text}`);
  const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const first = week.indexOf(interval[1]);
  const last = week.indexOf(interval[2]);
  expect(first).toBeGreaterThanOrEqual(0);
  expect(last).toBeGreaterThan(first);
  const count = last - first + 1;
  const countedDays = week.slice(first, last + 1);
  return { form: 'days', total: Number(interval[3]), count, unit: 'cranes', countWork: `${countedDays.join(', ')} → ${count} days` };
}

test('the visible people or days determine one whole share in every form', () => {
  const forms = new Set<string>();
  for (let seed = -12; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const given = readGivens((q.context ?? []).join(' '));
      forms.add(given.form);
      const share = given.total / given.count;
      expect([2, 3, 4, 5, 10]).toContain(given.count);
      expect(Number.isInteger(share)).toBe(true);
      expect(share).toBeGreaterThan(0);
      expect(share).toBeLessThanOrEqual(10);
      expect(q.answer).toBe(String(share));
      expect(q.unit).toBe(given.unit);
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        given.countWork,
        `${given.total} ÷ ${given.count} = ${share}`,
      ]);
      if (given.form === 'friends') {
        const ignoringMei = given.total / (given.count - 1);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(share));
        expect(q.choices).toContain(String(ignoringMei));
      } else {
        expect(q.choices).toBeUndefined();
        if (given.form === 'tables') expect(q.prompt).toMatch(/two number sentences/);
      }
    }
  }
  expect([...forms].sort()).toEqual(['days', 'friends', 'tables']);
});

test('seed and index reproduce a question and allow different visible givens', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const stories = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    stories.add((q.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(3);
});
