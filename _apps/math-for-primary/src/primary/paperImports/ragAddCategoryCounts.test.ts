import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragAddCategoryCounts';

it('solves each question using only the names in the prompt and the picture graph', () => {
  const arities = new Set<number>();
  const rowCombinations = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (graph?.type !== 'bars') throw new Error('Expected a labelled graph');
      expect(graph.pictures).toBe(true);
      expect(graph.scale).toBe(1);
      expect(q.context?.join(' ')).toMatch(/each picture stands for 1 shell/i);
      expect(graph.labels).toHaveLength(4);
      expect(new Set(graph.labels).size).toBe(4);
      expect(graph.values).toHaveLength(graph.labels.length);
      expect(graph.values.every(n => Number.isInteger(n) && n >= 1 && n <= 6)).toBe(true);

      const request = /^How many shells did (.+) collect in all\?$/.exec(q.prompt);
      if (!request) throw new Error('Could not read the requested names');
      const names = request[1].split(/, | and /);
      expect([2, 3]).toContain(names.length);
      expect(new Set(names).size).toBe(names.length);
      const positions = names.map(name => graph.labels.indexOf(name));
      expect(positions.every(position => position >= 0)).toBe(true);
      const counts = positions.map(position => graph.values[position]);
      const expected = counts.reduce((sum, count) => sum + count, 0);
      expect(q.answer).toBe(String(expected));
      expect(q.answer).not.toBe(String(graph.values.reduce((sum, count) => sum + count, 0)));
      expect(q.unit).toBe('shells');
      expect(q.choices).toBeUndefined();

      const pairSum = counts[0] + counts[1];
      expect(q.workedSteps?.[1]?.equation).toBe(`${counts[0]} + ${counts[1]} = ${pairSum}`);
      if (counts.length === 3) {
        expect(q.workedSteps?.[2]?.equation).toBe(`${pairSum} + ${counts[2]} = ${expected}`);
      }
      arities.add(names.length);
      rowCombinations.add([...positions].sort((a, b) => a - b).join(','));
    }
  }
  expect([...arities].sort()).toEqual([2, 3]);
  expect(rowCombinations.size).toBeGreaterThan(2);
});

it('reproduces the same question and varies visible givens across indices', () => {
  const variants = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(19, index);
    expect(makeRagQuestion(19, index)).toEqual(q);
    variants.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(variants.size).toBeGreaterThan(1);
});
