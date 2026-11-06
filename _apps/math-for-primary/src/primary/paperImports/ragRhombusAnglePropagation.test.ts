import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragRhombusAnglePropagation';

/** Solve from the visible question statements, without reading answer or generator state. */
function solveVisibleGivens(q: ReturnType<typeof makeRagQuestion>): number {
  const visible = [...(q.context ?? []), q.prompt].join(' ');
  const match = /(?:angle ADP is (\d+)° and angle PDC is (\d+)°|angle EDC is (\d+)°|is (\d+)°\.)/i.exec(visible);
  if (!match) throw new Error(`Could not read visible givens: ${visible}`);
  if (match[1] && match[2]) return Number(match[1]) + Number(match[2]);
  if (match[3]) return 180 - Number(match[3]);
  return Number(match[4]);
}

describe('rhombus angle propagation', () => {
  it('has answerable visible givens across varied seeds and indices', () => {
    const cases = Array.from({ length: 60 }, (_, i) => makeRagQuestion(i * 19 - 240, i % 11));
    expect(new Set(cases.map(q => q.context?.[0])).size).toBeGreaterThan(1);
    for (const q of cases) {
      expect(Number(q.answer)).toBe(solveVisibleGivens(q));
      expect(q.workedSteps?.length).toBeGreaterThan(0);
    }
  });
});
