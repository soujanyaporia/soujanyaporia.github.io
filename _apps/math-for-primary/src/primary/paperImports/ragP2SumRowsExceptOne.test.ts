import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragP2SumRowsExceptOne';

// Solve from the visible prompt, key and graph, without reading the stored answer.
function solveVisibleQuestion(question: ReturnType<typeof makeRagQuestion>): number {
  const excludedMatch = question.prompt.match(/did not choose ([^?]+)\?/);
  if (!excludedMatch) throw new Error('The excluded category is not visible in the prompt.');
  const excluded = excludedMatch[1];
  const picture = question.picture;
  if (!picture || picture.type !== 'batch4-early' || picture.layout !== 'pictograph') {
    throw new Error('Expected a visible pictograph.');
  }
  const keyMatch = question.context?.join(' ').match(/Each picture stands for (\d+) pupils/);
  if (!keyMatch) throw new Error('The picture key is not visible in the question.');
  const scale = Number(keyMatch[1]);
  const excludedRow = picture.rows.find((row) => row.label === excluded);
  if (!excludedRow) throw new Error('The excluded category is missing from the graph.');
  return picture.rows
    .filter((row) => row.label !== excluded)
    .reduce((sum, row) => sum + row.wholeSymbols * scale, 0);
}

describe('sum rows except one pictograph generator', () => {
  it('matches an independent solver using only visible givens across seeds', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const question = makeRagQuestion(seed, seed % 3);
      expect(solveVisibleQuestion(question)).toBe(Number(question.answer));
      expect(question.picture?.type).toBe('batch4-early');
    }
  });
});
