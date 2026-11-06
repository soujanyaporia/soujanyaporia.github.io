import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragAddSelectedEntries';

it('solves the inclusive period using only the prompt, day labels and bar heights', () => {
  const week = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const starts = new Set<string>();
  for (let seed = -4; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const graph = question.picture;
      if (graph?.type !== 'batch2-early' || graph.layout !== 'sales-bars') {
        throw new Error('Expected a scaled sales graph');
      }
      const range = /from (\w+) to (\w+)\?$/.exec(question.prompt);
      if (!range) throw new Error('Expected two named endpoints');
      const start = week.indexOf(range[1]);
      const end = week.indexOf(range[2]);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(end - start).toBe(2);
      expect(graph.days).toEqual(week);
      expect(graph.values).toHaveLength(week.length);
      expect(graph.minorStep).toBeGreaterThan(0);
      expect(graph.labelStep % graph.minorStep).toBe(0);
      starts.add(range[1]);

      let selectedTotal = 0;
      let outsideTotal = 0;
      let readsMinorMark = false;
      for (const [i, count] of graph.values.entries()) {
        expect(Number.isInteger(count)).toBe(true);
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(graph.maximum);
        expect(count % graph.minorStep).toBe(0);
        const position = week.indexOf(graph.days[i]);
        if (position >= start && position <= end) {
          selectedTotal += count;
          readsMinorMark ||= count % graph.labelStep !== 0;
        } else {
          outsideTotal += count;
        }
      }
      expect(readsMinorMark).toBe(true);
      expect(outsideTotal).toBeGreaterThan(0);
      expect(question.answer).toBe(String(selectedTotal));
      expect(question.unit).toBe('bookmarks');
      expect(question.choices).toBeUndefined();
    }
  }
  expect([...starts].sort()).toEqual(['Monday', 'Tuesday', 'Wednesday']);
});

it('repeats a seed and index exactly and varies the visible graph across indices', () => {
  const graphs = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const question = makeRagQuestion(83, index);
    expect(makeRagQuestion(83, index)).toEqual(question);
    graphs.add(JSON.stringify(question.picture));
  }
  expect(graphs.size).toBeGreaterThan(1);
});
