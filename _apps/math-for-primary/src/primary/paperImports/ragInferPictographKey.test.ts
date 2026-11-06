import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragInferPictographKey';

function readRows(picture: Question['picture']) {
  if (picture?.type !== 'paper' || picture.layout !== 'bars') throw new Error('Missing graph');
  return picture.rows.map(({ label, parts }) => {
    for (const cell of parts) {
      expect(cell.label).toBe('○');
      expect(cell.size).toBe(1);
    }
    return { label, n: parts.length };
  });
}

function solve({ context, picture }: Pick<Question, 'context' | 'picture'>) {
  const rows = readRows(picture);
  const clue = context?.[0] ?? '';
  const together = /^(\w+) and (\w+) sorted (\d+) beads altogether\.$/.exec(clue);
  const more = /^(\w+) sorted (\d+) more beads than (\w+)\.$/.exec(clue);
  function count(name: string) {
    const row = rows.find(r => r.label === name);
    if (!row || !row.n) throw new Error('Clue refers to a missing row');
    return row.n;
  }

  function infer(form: string, beads: number, circles: number) {
    expect(circles).toBeGreaterThan(1);
    expect(beads % circles).toBe(0);
    return { form, answer: String(beads / circles) };
  }
  if (together) {
    expect(rows).toHaveLength(2);
    return infer('total', Number(together[3]), count(together[1]) + count(together[2]));
  }
  if (more) {
    expect(rows).toHaveLength(3);
    return infer('difference', Number(more[2]), count(more[1]) - count(more[3]));
  }

  throw new Error('Unknown total/difference clue');
}

it('solves the displayed graph and checks every requested part', () => {
  const forms = new Set<string>();
  const scales = new Set<number>();
  for (let seed = -12; seed < 50; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solve(q);
      const scale = Number(solved.answer.split(' ')[0]);
      forms.add(solved.form);
      scales.add(scale);
      expect([2, 3, 4, 5, 10]).toContain(scale);
      expect(q.answer).toBe(solved.answer);
      expect(correctAnswer(q, solved.answer)).toBe(true);
      const graph = q.picture;
      if (graph?.type !== 'paper' || graph.layout !== 'bars') throw new Error('Missing graph');
      expect(graph.caption).toBe('Every circle stands for the same number of beads.');
      expect(q.unit).toBe('beads');
      expect(correctAnswer(q, String(scale + 1))).toBe(false);
    }
  }
  expect([...forms].sort()).toEqual(['difference', 'total']);
  expect(scales.size).toBe(5);
});

it('reproduces a question and varies the visible givens across indices', () => {
  const visible = new Set<string>();
  for (let i = 0; i < 16; i++) {
    const q = makeRagQuestion(25, i);
    expect(makeRagQuestion(25, i)).toEqual(q);
    visible.add(JSON.stringify([q.context, q.picture]));
  }
  expect(visible.size).toBeGreaterThan(8);
});
