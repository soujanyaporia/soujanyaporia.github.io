import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP4CountAngleOpenings';

type Point = [number, number];
type Line = Extract<Batch11UpperMark, { kind: 'line' }>;
type Segment = [Point, Point];
const minus = (p: Point, q: Point): Point => [p[0] - q[0], p[1] - q[1]];
const cross = (a: Point, b: Point) => a[0] * b[1] - a[1] * b[0];
const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
const numbers = (path: string) => (path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi) ?? []).map(Number);
const near = (a: number, b: number) => Math.abs(a - b) < 1e-7;

function squareCount(lines: Line[]) {
  const segments: Segment[] = lines.map(l => [[l.x1, l.y1], [l.x2, l.y2]]);
  const vertices = new Map<string, Point>();
  const add = (p: Point) => vertices.set(p.map(n => n.toFixed(7)).join(','), p);
  for (const [i, [a, b]] of segments.entries()) {
    add(a); add(b);
    for (const [c, d] of segments.slice(i + 1)) {
      const ab = minus(b, a), cd = minus(d, c), ca = minus(c, a);
      const det = cross(ab, cd);
      if (det === 0) continue; // Ends of collinear overlaps are already included.
      const t = cross(ca, cd) / det, u = cross(ca, ab) / det;
      if (t >= 0 && t <= 1 && u >= 0 && u <= 1) add([a[0] + t * ab[0], a[1] + t * ab[1]]);
    }
  }
  let count = 0;
  for (const p of vertices.values()) {
    const arms = new Set<number>();
    for (const [a, b] of segments) {
      const pa = minus(a, p), pb = minus(b, p);
      if (!near(cross(pa, pb), 0) || dot(pa, pb) > 1e-7) continue;
      for (const [x, y] of [pa, pb]) {
        if (Math.hypot(x, y) < 1e-7) continue;
        const octant = Math.atan2(y, x) * 4 / Math.PI;
        expect(near(octant, Math.round(octant))).toBe(true);
        arms.add((Math.round(octant) + 8) % 8);
      }
    }
    // Turn in just one direction so an unordered pair contributes once.
    for (const a of arms) if (arms.has((a + 2) % 8)) count++;
  }
  return count;
}

function polygonCount(q: Question, marks: Batch11UpperMark[]) {
  const paths = marks.filter((m): m is Extract<Batch11UpperMark, {kind: 'path'}> => m.kind === 'path');
  const outline = paths.find(p => p.d.endsWith(' Z'));
  if (!outline) throw new Error('No visible closed boundary');
  const xy = numbers(outline.d), points: Point[] = [];
  for (let i = 0; i < xy.length; i += 2) points.push([xy[i], xy[i + 1]]);
  const n = points.length, next = (i: number) => points[(i + 1) % n];
  const sign = Math.sign(points.reduce((a, p, i) => a + cross(p, next(i)), 0));
  const degrees = points.map((p, i) => {
    const incoming = minus(p, points[(i + n - 1) % n]), outgoing = minus(next(i), p);
    return 180 - sign * Math.atan2(cross(incoming, outgoing), dot(incoming, outgoing)) * 180 / Math.PI;
  });
  const right = (v: number) => near(v, 90);
  if (q.prompt.includes('curved marks')) {
    const marked = paths.filter(p => p !== outline).map(p => {
      const [ax, ay, rx, ry, rotation, large, sweep, bx, by] = numbers(p.d);
      const i = points.findIndex(([x, y]) => near(Math.hypot(x - ax, y - ay), rx)
        && near(Math.hypot(x - bx, y - by), ry));
      expect(i).toBeGreaterThanOrEqual(0);
      expect(rx).toBe(ry);
      expect(rotation).toBe(0);
      expect(large).toBe(Number(degrees[i] > 180));
      expect(sweep).toBe(Number(sign < 0));
      for (const [end, neighbour] of [
        [[ax, ay], points[(i + n - 1) % n]], [[bx, by], next(i)],
      ] as [Point, Point][]) {
        const ray = minus(neighbour, points[i]), toEnd = minus(end, points[i]);
        expect(near(cross(ray, toEnd), 0) && dot(ray, toEnd) > 0).toBe(true);
      }
      return i;
    });
    expect(new Set(marked).size).toBe(marked.length);
    expect(marked.some(i => degrees[i] > 180)).toBe(true);
    const result = marked.filter(i => right(degrees[i])).length;
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(degrees.filter(right).length);
    return result;
  }
  expect(paths).toHaveLength(1);
  expect(degrees.some(v => v > 180)).toBe(true);
  if (q.prompt.includes('wider')) return degrees.filter(v => v > 90 + 1e-7).length;
  expect(q.prompt).toContain('exactly a quarter turn');
  return degrees.filter(right).length;
}

it('derives each count from the drawn sides and the scope of the prompt', () => {
  const counts = new Map<string, Set<number>>();
  for (let seed = -9; seed <= 34; seed++) {
    const prompts = new Set<string>();
    for (let i = 0; i < 4; i++) {
      const q = makeRagQuestion(seed, i);
      prompts.add(q.prompt);
      if (q.picture?.type !== 'batch11-upper') throw new Error('Missing angle diagram');
      const marks = q.picture.marks;
      const lines = marks.filter((m): m is Line => m.kind === 'line');
      const expected = lines.length ? squareCount(lines) : polygonCount(q, marks);
      expect(q.answer).toBe(String(expected));
      if (lines.length || q.prompt.includes('curved marks')) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(String(expected));
      } else expect(q.choices).toBeUndefined();
      const seen = counts.get(q.prompt) ?? new Set<number>();
      seen.add(expected);
      counts.set(q.prompt, seen);
    }
    expect(prompts.size).toBe(4);
  }
  for (const seen of counts.values()) expect(seen.size).toBeGreaterThan(1);
});

it('replays a seed and index and keeps all letter labels within the picture', () => {
  for (let i = 0; i < 48; i++) {
    const q = makeRagQuestion(29, i);
    expect(makeRagQuestion(29, i)).toEqual(q);
    if (q.picture?.type !== 'batch11-upper') throw new Error('Missing angle diagram');
    for (const m of q.picture.marks) {
      if (m.kind !== 'text') continue;
      expect(m.x).toBeGreaterThanOrEqual(0);
      expect(m.x + 14).toBeLessThan(320);
      expect(m.y).toBeGreaterThan(16);
      expect(m.y).toBeLessThan(196);
    }
  }
});
