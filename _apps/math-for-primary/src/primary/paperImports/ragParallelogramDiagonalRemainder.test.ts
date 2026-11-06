import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragParallelogramDiagonalRemainder';

function solveVisibleGivens(prompt: string, context: string[]): number {
  const text = [...context, prompt].join(' ');
  const a = /angle DAB = (\d+)°/i.exec(text);
  const e = /angle BEC = (\d+)°/i.exec(text);
  const f = /angle DFC = (\d+)°/i.exec(text);
  if (!a || !e || !f || !/parallelogram/i.test(text) || !/straight line/i.test(text)) {
    throw new Error('Visible angle givens missing');
  }
  const angleABC = 180 - Number(a[1]);
  const angleDBE = 180 - Number(e[1]) - Number(f[1]);
  return angleABC - angleDBE;
}

describe('rag parallelogram diagonal remainder', () => {
  it('generates questions whose visible givens determine the answer across seeds', () => {
    for (const [seed, index] of [[1, 0], [7, 2], [29, 4], [103, 1]]) {
      const q = makeRagQuestion(seed, index);
      expect(solveVisibleGivens(q.prompt, q.context ?? [])).toBe(Number(q.answer));
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(3);
    }
  });
});
