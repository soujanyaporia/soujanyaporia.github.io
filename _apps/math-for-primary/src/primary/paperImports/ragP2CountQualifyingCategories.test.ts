import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2CountQualifyingCategories';

it('solves both prompts from the graph labels, drawn dots, key and printed wording', () => {
  const gameAnswers = new Set<number>();
  const starAnswers = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const graph = q.picture;
      if (graph?.type !== 'batch4-early' || graph.layout !== 'pictograph') throw new Error('Expected a picture graph');
      expect(graph.scale).toBeGreaterThan(1);
      expect(graph.rows.every(row => row.label.trim() && !row.halfSymbol && Number.isInteger(row.wholeSymbols) && row.wholeSymbols >= 0)).toBe(true);
      const labels = new Set(graph.rows.map(row => row.label));
      expect(labels.size).toBe(graph.rows.length);
      expect(q.choices).toBeUndefined();

      const threshold = /more than (\d+) stars/.exec(q.prompt);
      let expected: number;
      if (threshold) {
        expect(q.unit).toBe('children');
        expect(graph.rows).toHaveLength(4);
        const limit = Number(threshold[1]);
        const totals = graph.rows.map(row => row.wholeSymbols * graph.scale);
        expect(totals).toContain(limit);
        expect(Math.min(...totals)).toBeLessThan(limit);
        expect(Math.max(...totals)).toBeGreaterThan(limit);
        // Start with every child and cross out each total at or below the limit.
        expected = labels.size - totals.filter(total => total <= limit).length;
        starAnswers.add(expected);
      } else {
        expect(q.prompt).toMatch(/how many different games/i);
        expect(q.unit).toBe('games');
        const blank = graph.rows.filter(row => row.wholeSymbols === 0);
        expect(blank).toHaveLength(1);
        const story = q.context?.join(' ') ?? '';
        expect(story).toContain(`dots for ${blank[0].label} are missing`);
        const statedTotal = /(\d+) children each voted for one game/.exec(story);
        if (!statedTotal) throw new Error('Missing vote total');
        const shownVotes = graph.rows.reduce((sum, row) => sum + row.wholeSymbols * graph.scale, 0);
        const missingVotes = Number(statedTotal[1]) - shownVotes;
        expect(missingVotes).toBeGreaterThan(0);
        expect(missingVotes % graph.scale).toBe(0);
        expected = labels.size;
        gameAnswers.add(expected);
      }
      expect(q.answer).toBe(String(expected));
    }
  }
  expect([...gameAnswers].sort()).toEqual([3, 4, 5]);
  expect(starAnswers.size).toBeGreaterThan(1);
});

it('reproduces a seed and supplies both kinds of question at adjacent indices', () => {
  for (const seed of [-7, 0, 19, 83]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const second = makeRagQuestion(seed, 1);
    expect(makeRagQuestion(seed, 1)).toEqual(second);
    expect(new Set([first.unit, second.unit])).toEqual(new Set(['games', 'children']));
  }
});
