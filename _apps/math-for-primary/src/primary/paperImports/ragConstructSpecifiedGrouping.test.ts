import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { GroupingBuilder } from '../GroupingBuilder';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragConstructSpecifiedGrouping';

function solve(q: Question) {
  const match = /Make (\d+) groups\. Put (\d+) gifts in each group\./.exec(q.prompt);
  if (!match || !q.grouping) throw new Error('Expected both directions and selectable gifts');
  const count = Number(match[1]);
  const size = Number(match[2]);
  const html = renderToStaticMarkup(createElement(GroupingBuilder, {
    spec: q.grouping, value: '', onChange: () => {},
  }));
  const labels = Array.from(html.matchAll(/aria-label="Select gift (\d+)"/g), m => Number(m[1]));
  expect(labels).toEqual(Array.from({ length: count * size }, (_, i) => i + 1));
  expect(labels.length).toBeLessThanOrEqual(40);

  // Deal visible gifts to the groups in turn, so neighbours can belong to different groups.
  const groups = Array.from({ length: count }, (): number[] => []);
  labels.forEach((label, i) => groups[i % count].push(label - 1));
  expect(groups.every(group => group.length === size)).toBe(true);
  return { groups, count, size, ids: labels.map(label => label - 1) };
}

it('accepts complete partitions satisfying both visible directions', () => {
  for (let seed = 0; seed < 24; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const { groups, count, size, ids } = solve(q);
      const reordered = groups.slice().reverse().map(group => group.slice().reverse());
      expect(correctAnswer(q, JSON.stringify(reordered))).toBe(true);

      const example: number[][] = JSON.parse(q.answer);
      expect(example).toHaveLength(count);
      expect(example.every(group => group.length === size)).toBe(true);
      expect(example.flat().sort((a, b) => a - b)).toEqual(ids);

      const missing = groups.map(group => group.slice());
      missing[0].pop();
      expect(correctAnswer(q, JSON.stringify(missing))).toBe(false);
      const repeated = groups.map(group => group.slice());
      repeated[1][0] = repeated[0][0];
      expect(correctAnswer(q, JSON.stringify(repeated))).toBe(false);
      const uneven = groups.map(group => group.slice());
      uneven[0].push(uneven[1].pop()!);
      expect(correctAnswer(q, JSON.stringify(uneven))).toBe(false);
      if (count !== size) {
        const swapped = Array.from({ length: size }, (_, i) => groups.map(group => group[i]));
        expect(correctAnswer(q, JSON.stringify(swapped))).toBe(false);
      }
      expect(correctAnswer(q, String(ids.length))).toBe(false);
    }
  }
});

it('reproduces each task and varies the givens with both seed and index', () => {
  const bySeed = new Set<string>();
  const byIndex = new Set<string>();
  for (let n = 0; n < 24; n++) {
    const q = makeRagQuestion(n, 2);
    expect(makeRagQuestion(n, 2)).toEqual(q);
    bySeed.add(q.prompt);
    byIndex.add(makeRagQuestion(2, n).prompt);
  }
  expect(bySeed.size).toBeGreaterThan(2);
  expect(byIndex.size).toBeGreaterThan(2);
});
