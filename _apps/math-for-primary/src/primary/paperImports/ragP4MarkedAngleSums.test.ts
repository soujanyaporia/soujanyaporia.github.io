import { expect, it } from 'vitest';
import type { Batch11UpperPicture } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP4MarkedAngleSums';

type Point = [number, number];

function readGeometry(figure: Batch11UpperPicture) {
  const ends: Point[] = [];
  for (const m of figure.marks) {
    if (m.kind === 'line') ends.push([m.x1, m.y1], [m.x2, m.y2]);
  }
  const points = new Map<string, Point>();
  for (const m of figure.marks) {
    if (m.kind !== 'text') continue;
    const distance = ([x, y]: Point) => Math.hypot(x - m.x, y - m.y);
    const nearest = ends.reduce((a, b) => distance(a) < distance(b) ? a : b);
    expect(distance(nearest)).toBeLessThan(24);
    points.set(m.text, nearest);
  }
  const point = (name: string) => {
    const p = points.get(name);
    if (!p) throw Error('Missing point ' + name);
    return p;
  };
  const length = (a: string, b: string) => {
    const [x, y] = point(a);
    const [u, v] = point(b);
    return Math.hypot(x - u, y - v);
  };
  const angle = (name: string) => {
    const [a, b, c] = [...name].map(point);
    const ux = a[0] - b[0], uy = a[1] - b[1];
    const vx = c[0] - b[0], vy = c[1] - b[1];
    return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180 / Math.PI;
  };
  function checkArc(name: string, path: string) {
    const [start, at, end] = [...name].map(point);
    const m = /^M ([^ ]+) ([^ ]+) A ([^ ]+) ([^ ]+) 0 0 ([01]) ([^ ]+) ([^ ]+)$/.exec(path);
    if (!m) throw Error('Missing minor arc for ' + name);
    const [sx, sy, rx, ry, sweep, ex, ey] = m.slice(1).map(Number);
    expect(rx).toBeGreaterThan(0);
    expect(ry).toBe(rx);
    const direction = (p: Point) => Math.atan2(p[1] - at[1], p[0] - at[0]);
    const first = direction(start), last = direction(end);
    expect(sx).toBeCloseTo(at[0] + rx * Math.cos(first), 8);
    expect(sy).toBeCloseTo(at[1] + ry * Math.sin(first), 8);
    expect(ex).toBeCloseTo(at[0] + rx * Math.cos(last), 8);
    expect(ey).toBeCloseTo(at[1] + ry * Math.sin(last), 8);
    expect(sweep).toBe(Math.sin(last - first) > 0 ? 1 : 0);
  }
  return { angle, length, checkArc };
}

it('solves each marked sum from the printed givens and checks it against the drawn rays', () => {
  const seen = new Map<string, Set<number>>();
  for (let seed = -12; seed <= 40; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'batch11-upper') throw Error('Missing angle diagram');
      const { angle, length, checkArc } = readGeometry(q.picture);
      const context = q.context?.join(' ') ?? '';
      for (const [, shape, names] of context.matchAll(/\b(square|rectangle) ([A-Z]{4})/gi)) {
        for (let i = 0; i < 4; i++) {
          const prev = names[(i + 3) % 4], at = names[i], next = names[(i + 1) % 4];
          expect(angle(prev + at + next)).toBeCloseTo(90, 8);
          if (shape.toLowerCase() === 'square') expect(length(at, next)).toBeCloseTo(length(prev, at), 8);
        }
      }
      const targets = [...q.prompt.matchAll(/∠([A-Z]{3})/g)].map(m => m[1]);
      const signature = targets.join('/');
      const given = /∠([A-Z]{3}) is (\d+)°/.exec(context);
      if (given) expect(angle(given[1])).toBeCloseTo(Number(given[2]), 8);
      let solution: number;
      if (signature === 'WPC/APX') {
        expect(given).toBeNull();
        expect(angle('WPX')).toBeCloseTo(180, 8);
        solution = 180 - 90;
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(c => c === solution + '°')).toHaveLength(1);
        expect(q.answer).toBe(solution + '°');
      } else {
        if (!given) throw Error('Missing degree measure');
        const value = Number(given[2]);
        if (signature === 'SPT/PQT/TQR') {
          expect(given[1]).toBe('QPT');
          expect(angle('STR')).toBeCloseTo(180, 8);
          solution = 180 - value;
        } else {
          expect(signature).toBe('QPW/QRS');
          expect(given[1]).toBe('SPW');
          expect(angle('QPW')).toBeLessThan(180);
          solution = 180 + value;
        }
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(90);
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('degrees');
        expect(q.answer).toBe(String(solution));
      }
      const arcs = q.picture.marks.filter(m => m.kind === 'path');
      expect(arcs).toHaveLength(targets.length);
      arcs.forEach((arc, i) => checkArc(targets[i], arc.d));
      expect(targets.reduce((sum, name) => sum + angle(name), 0)).toBeCloseTo(solution, 8);
      expect(q.workedSteps?.at(-1)?.text).toContain(solution + '°');
      const values = seen.get(signature) ?? new Set<number>();
      values.add(solution);
      seen.set(signature, values);
    }
  }
  expect([...seen.keys()].sort()).toEqual(['QPW/QRS', 'SPT/PQT/TQR', 'WPC/APX']);
  expect(seen.get('SPT/PQT/TQR')?.size).toBeGreaterThan(5);
  expect(seen.get('QPW/QRS')?.size).toBeGreaterThan(5);
});

it('repeats the entire question for the same inputs, including the drawing and option order', () => {
  for (const seed of [-7, 0, 91]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (const index of [0, 1, 4, 9]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
