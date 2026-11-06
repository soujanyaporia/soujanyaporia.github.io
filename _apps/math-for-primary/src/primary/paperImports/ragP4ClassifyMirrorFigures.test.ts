import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4ClassifyMirrorFigures';

type Point = [number, number];
type Stroke = [Point, Point];
const key = (values: number[]) => values.map(n => Math.round(n * 1e6)).join(',');
const strokeKey = ([a, b]: Stroke) => [key(a), key(b)].sort().join('/');

function countFolds(strokes: Stroke[]) {
  // These figures have corners or branches. A mirror must exchange at
  // least one pair of endpoints and lie on that pair's perpendicular bisector.
  const points = strokes.flat();
  const ink = new Set(strokes.map(strokeKey));
  const axes = new Set<string>();
  for (let i = 0; i < points.length; i++) {
    for (const [x2, y2] of points.slice(i + 1)) {
      const [x1, y1] = points[i];
      const length = Math.hypot(x2 - x1, y2 - y1);
      if (!length) continue;
      const nx = (x2 - x1) / length;
      const ny = (y2 - y1) / length;
      const offset = (nx * (x1 + x2) + ny * (y1 + y2)) / 2;
      const reflect = ([x, y]: Point): Point => {
        const gap = nx * x + ny * y - offset;
        return [x - 2 * nx * gap, y - 2 * ny * gap];
      };
      if (strokes.every(([a, b]) => ink.has(strokeKey([reflect(a), reflect(b)])))) {
        const sign = nx < 0 || (nx === 0 && ny < 0) ? -1 : 1;
        axes.add(key([sign * nx, sign * ny, sign * offset]));
      }
    }
  }
  return axes.size;
}

it('solves the displayed strokes and the printed condition for every answer', () => {
  const seen = new Set<string>();
  const totals = new Set<number>();
  for (let seed = -3; seed < 70; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const p = q.picture;
      if (p?.type !== 'batch10-middle' || p.layout !== 'line-options') throw Error('Missing figures');
      expect(p.options.map(o => o.label)).toEqual(['A', 'B', 'C', 'D']);
      const folds = p.options.map(o => {
        expect(o.segments.length).toBeGreaterThan(0);
        for (const n of o.segments.flat(2)) {
          expect(n).toBeGreaterThanOrEqual(0);
          expect(n).toBeLessThanOrEqual(5);
        }
        return countFolds(o.segments);
      });
      let expected: string;
      if (/^How many .*at least one line/.test(q.prompt)) {
        const count = folds.filter(n => n > 0).length;
        seen.add('count');
        totals.add(count);
        expected = String(count);
        expect(q.choices).toEqual(['1', '2', '3', '4']);
      } else {
        const target = q.prompt.includes('exactly one line') ? 1 : q.prompt.includes('no line') ? 0 : -1;
        expect([0, 1]).toContain(target);
        seen.add(String(target));
        const qualifying = p.options.filter((_, i) => folds[i] === target);
        expect(qualifying).toHaveLength(1);
        expected = qualifying[0].label;
        expect(q.choices).toEqual(p.options.map(o => o.label));
      }
      expect(q.choices).toContain(expected);
      expect(q.answer).toBe(expected);
      folds.forEach((n, i) => {
        expect(q.workedSteps?.[i].text).toContain('Figure ' + p.options[i].label + ' has ' + n + ' line');
      });
    }
  }
  expect([...seen].sort()).toEqual(['0', '1', 'count']);
  expect([...totals].sort()).toEqual([1, 2, 3, 4]);
});

it('replays each diagram and varies the visible question across indices', () => {
  const views = new Set<string>();
  for (let i = 0; i < 16; i++) {
    const q = makeRagQuestion(218, i);
    expect(makeRagQuestion(218, i)).toEqual(q);
    views.add(JSON.stringify([q.prompt, q.picture]));
  }
  expect(views.size).toBeGreaterThan(8);
});
