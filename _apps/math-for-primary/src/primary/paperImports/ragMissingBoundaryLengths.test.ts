import {expect, it} from 'vitest';
import type {Batch11UpperPicture} from './batch11UpperPicture';
import {makeRagQuestion} from './ragMissingBoundaryLengths';

type Point = [number, number];
type Path = Extract<Batch11UpperPicture['marks'][number], {kind: 'path'}>;

function vertices(path: Path): Point[] {
  expect(path.d.endsWith(' Z')).toBe(true);
  return Array.from(path.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g), (m): Point => [Number(m[1]), Number(m[2])]);
}

function solve(picture: Batch11UpperPicture) {
  const paths = picture.marks.filter((m): m is Path => m.kind === 'path');
  const target = paths.filter(m => m.fill);
  expect(target).toHaveLength(1);
  const corners = vertices(target[0]);
  let drawnLength = 0;
  corners.forEach(([x, y], i) => {
    const [u, v] = corners[(i + 1) % corners.length];
    expect((x === u) !== (y === v)).toBe(true);
    drawnLength += Math.abs(u - x) + Math.abs(v - y);
  });

  const horizontal: number[] = [], vertical: number[] = [], scales: number[] = [];
  const units = new Set<string>();
  picture.marks.forEach((mark, i) => {
    if (mark.kind !== 'text') return;
    const match = /^(\d+) (cm|m)$/.exec(mark.text);
    const bar = picture.marks[i - 3]; // labelled span, two end ticks, label
    if (!match || bar?.kind !== 'line') throw Error('Missing labelled span');
    const value = Number(match[1]);
    units.add(match[2]);
    expect(value).toBeGreaterThan(0);
    expect((bar.x1 === bar.x2) !== (bar.y1 === bar.y2)).toBe(true);
    (bar.y1 === bar.y2 ? horizontal : vertical).push(value);
    scales.push(Math.hypot(bar.x2 - bar.x1, bar.y2 - bar.y1) / value);
  });
  expect(units.size).toBe(1);
  scales.forEach(s => expect(s).toBeCloseTo(scales[0], 8));

  const tiles = paths.filter(p => {
    if (p.fill) return false;
    const pts = vertices(p);
    const width = Math.max(...pts.map(p => p[0])) - Math.min(...pts.map(p => p[0]));
    const height = Math.max(...pts.map(p => p[1])) - Math.min(...pts.map(p => p[1]));
    return pts.length === 4 && Math.abs(width - height) < 1e-7;
  });
  let length: number, kind: string;
  if (vertical.length === 2) {
    kind = 'wall';
    expect(tiles).toHaveLength(5);
    expect(horizontal).toHaveLength(1);
    const h = Math.max(...vertical), side = h - Math.min(...vertical);
    const endGap = horizontal[0] - side;
    expect(endGap).toBeGreaterThan(0);
    const acrossSteps = (tiles.length - 1) * side;
    const top = acrossSteps + endGap;
    length = h + top + endGap + acrossSteps + h;
  } else if (tiles.length) {
    kind = 'tiles';
    expect(horizontal).toHaveLength(1);
    expect(vertical).toHaveLength(0);
    const row = tiles.length - 1;
    expect([3, 4, 5]).toContain(row);
    const side = horizontal[0] / row;
    expect(Number.isInteger(side)).toBe(true);
    // Each join hides a side on each of the two touching tiles.
    const joins = (row - 1) + 1;
    length = (4 * tiles.length - 2 * joins) * side;
  } else {
    expect(corners).toHaveLength(6);
    expect(vertical).toHaveLength(1);
    const w = Math.max(...horizontal), h = vertical[0];
    if (horizontal.length === 2) {
      kind = 'outline';
      const foot = Math.min(...horizontal);
      expect(foot).toBeLessThan(w);
      length = w + (w - foot) + foot + h + h;
    } else {
      kind = 'reference';
      expect(horizontal).toHaveLength(1);
      expect(picture.marks.filter(m => m.kind === 'line' && m.dashed)).toHaveLength(2);
      length = w + h + w + h;
    }
  }
  expect(drawnLength / scales[0]).toBeCloseTo(length, 7);
  return {length, kind, unit: [...units][0]};
}

it('recovers each perimeter from visible dimensions, square tiles and the shaded outline', () => {
  const kinds = new Map<string, Set<number>>();
  for (let seed = -20; seed < 80; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'batch11-upper') throw Error('Missing perimeter drawing');
      const {length, kind, unit} = solve(q.picture);
      expect(q.unit).toBe(kind === 'outline' ? 'm' : 'cm');
      expect(q.unit).toBe(unit);
      expect(q.answer).toBe(String(length));
      if (kind === 'outline' || kind === 'wall') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(length));
      } else {
        expect(q.choices).toBeUndefined();
      }
      if (!kinds.has(kind)) kinds.set(kind, new Set());
      kinds.get(kind)!.add(length);
    }
  }
  expect([...kinds.keys()].sort()).toEqual(['outline', 'reference', 'tiles', 'wall']);
  kinds.forEach(lengths => expect(lengths.size).toBeGreaterThan(3));
});

it('replays a question and varies its visible givens across a session', () => {
  const figures = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(37, i);
    expect(makeRagQuestion(37, i)).toEqual(q);
    figures.add(JSON.stringify(q.picture));
  }
  expect(figures.size).toBeGreaterThan(5);
});
