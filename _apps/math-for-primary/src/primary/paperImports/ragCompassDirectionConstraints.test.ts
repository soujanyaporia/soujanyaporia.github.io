import { describe, expect, it } from 'vitest';
import { makeRagQuestion } from './ragCompassDirectionConstraints';

// Parse the visible coordinate list and solve from the prompt, without reading q.answer.
function solveVisible(q: ReturnType<typeof makeRagQuestion>): string {
  const line = q.context?.find(s => s.startsWith('On a square grid')) ?? '';
  const points = new Map<string, [number, number]>();
  for (const m of line.matchAll(/([A-D]) \((\d+), (\d+)\)/g)) points.set(m[1], [+m[2], +m[3]]);
  const direction = (dx: number, dy: number) => dy > 0 ? (dx > 0 ? 'north-east' : dx < 0 ? 'north-west' : 'north') : dy < 0 ? (dx > 0 ? 'south-east' : dx < 0 ? 'south-west' : 'south') : dx > 0 ? 'east' : 'west';
  let m = /Which labelled point is directly east of point ([A-D])/.exec(q.prompt);
  if (m) {
    const [x, y] = points.get(m[1])!;
    const found = [...points].filter(([, [u, v]]) => v === y && u > x);
    if (found.length !== 1) throw new Error('Visible east clue is not unique');
    return found[0][0];
  }
  m = /In which compass direction is point ([A-D]) from point ([A-D])/.exec(q.prompt);
  if (m) {
    const [x, y] = points.get(m[1])!, [u, v] = points.get(m[2])!;
    return direction(x - u, y - v);
  }
  m = /Point ([A-D]) is ([a-z-]+) of point ____/.exec(q.prompt);
  if (m) {
    const [x, y] = points.get(m[1])!;
    const found = [...points].filter(([name, [u, v]]) => name !== m![1] && direction(x - u, y - v) === m![2]);
    if (found.length !== 1) throw new Error('Visible reverse-direction clue is not unique');
    return found[0][0];
  }
  throw new Error(`Unrecognised visible question: ${q.prompt}`);
}

describe('compass direction constraints', () => {
  it('is independently solvable from visible positions across seeds and indices', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < 60; seed++) for (const index of [0, 1, 2]) {
      const q = makeRagQuestion(seed, index);
      expect(solveVisible(q)).toBe(q.answer);
      expect(q.workedSteps?.length).toBeGreaterThan(0);
      seen.add(q.prompt.includes('directly east') ? 'east' : q.prompt.includes('from point A') ? 'direction' : 'reverse');
    }
    expect(seen).toEqual(new Set(['east', 'direction', 'reverse']));
  });
});
