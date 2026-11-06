import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragPictographMissingPart';

test('exactly one name satisfies the printed clue and the one-boat key', () => {
  for (let seed = -8; seed < 56; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (graph?.type !== 'bars') throw new Error('Expected a picture graph');
      expect(graph.pictures).toBe(true);
      expect(graph.scale).toBe(1);
      expect(q.context?.[0]).toContain('Each symbol stands for 1 boat.');
      expect(graph.values).toHaveLength(4);
      expect(graph.labels).toHaveLength(4);
      expect(new Set(graph.labels).size).toBe(4);
      expect(graph.values.every(n => Number.isInteger(n) && n >= 2 && n <= 8)).toBe(true);
      expect([...(q.choices ?? [])].sort()).toEqual([...graph.labels].sort());

      const clue = /^(\w+) and one other child folded boats\. Together they folded (\d+) more boats? than (\w+) did\.$/.exec(q.context?.[1] ?? '');
      if (!clue) throw new Error('Missing the names or the more-than clue');
      const [, known, extra, reference] = clue;
      expect(known).not.toBe(reference);
      expect(graph.labels).toContain(known);
      expect(graph.labels).toContain(reference);
      const knownCount = graph.values[graph.labels.indexOf(known)];
      const referenceCount = graph.values[graph.labels.indexOf(reference)];
      const target = referenceCount + Number(extra);

      // Try every printed name by adding its row to the known child's row.
      const matches = graph.labels.filter((_, i) => knownCount + graph.values[i] === target);
      expect(matches).toHaveLength(1);
      expect(matches[0]).not.toBe(known);
      expect(matches[0]).not.toBe(reference);
      expect(q.answer).toBe(matches[0]);
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations).toContain(`${referenceCount} + ${Number(extra)} = ${target}`);
      expect(equations).toContain(`${target} − ${knownCount} = ${graph.values[graph.labels.indexOf(matches[0])]}`);
    }
  }
});

test('a seed and index reproduce the question, while new indices vary the visible givens', () => {
  const layouts = new Set<string>();
  const correctPositions = new Set<number>();
  for (let index = 0; index < 48; index++) {
    const q = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(q);
    layouts.add(JSON.stringify([q.picture, q.context]));
    correctPositions.add((q.choices ?? []).indexOf(q.answer));
  }
  expect(layouts.size).toBeGreaterThan(8);
  expect(correctPositions.size).toBeGreaterThan(1);
});
