import { expect, it } from 'vitest';
import type { Batch11UpperMark as Mark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragP1PlaneOutline';

type Point = [number, number];
type ClosedMark = Extract<Mark, { kind: 'circle' | 'path' }>;

function corners(path: Extract<Mark, { kind: 'path' }>): Point[] {
  expect(path.d.trim()).toMatch(/Z$/);
  return Array.from(path.d.matchAll(/[ML](-?[\d.]+)\s+(-?[\d.]+)/g),
    m => [Number(m[1]), Number(m[2])] as Point);
}

function boundary(mark: ClosedMark) {
  if (mark.kind === 'circle') {
    return { shape: 'circle', x: mark.cx, y: mark.cy, area: Math.PI * mark.r ** 2 };
  }
  const points = corners(mark);
  const edges = points.map(([x, y], i) => {
    const [u, v] = points[(i + 1) % points.length];
    return [u - x, v - y];
  });
  const area = Math.abs(points.reduce((sum, [x, y], i) => {
    const [u, v] = points[(i + 1) % points.length];
    return sum + x * v - y * u;
  }, 0)) / 2;
  expect(area).toBeGreaterThan(0);
  let shape = 'triangle';
  if (points.length !== 3) {
    expect(points).toHaveLength(4);
    for (const [i, [dx, dy]] of edges.entries()) {
      const [ex, ey] = edges[(i + 1) % 4];
      expect(Math.abs(dx * ex + dy * ey)).toBe(0);
    }
    const lengths = edges.map(([dx, dy]) => dx * dx + dy * dy);
    shape = new Set(lengths).size === 1 ? 'square' : 'rectangle';
  }
  return { shape, area, x: points.reduce((sum, p) => sum + p[0], 0) / points.length,
    y: points.reduce((sum, p) => sum + p[1], 0) / points.length };
}

it('finds the object from its outer edge and the number printed below it', () => {
  const targets = new Set<string>(), positions = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      if (!q.choices) continue;
      if (q.picture?.type !== 'batch11-upper') throw new Error('Missing object pictures');
      const labels = q.picture.marks.filter((m): m is Extract<Mark, { kind: 'text' }> => m.kind === 'text');
      expect(labels.map(m => m.text).sort()).toEqual(['1', '2', '3', '4']);
      expect(q.choices).toEqual(['1', '2', '3', '4']);
      const target = /\b(circle|triangle|rectangle|square)\b/.exec(q.prompt)?.[1];
      if (!target) throw new Error('Missing target shape');
      if (target === 'rectangle') expect(q.prompt).toContain('two long sides and two short sides');
      const outlines = new Map<string, ReturnType<typeof boundary>>();
      for (const mark of q.picture.marks) {
        if (mark.kind !== 'path' && mark.kind !== 'circle') continue;
        const edge = boundary(mark);
        const distance = (label: typeof labels[number]) => Math.hypot(label.x - edge.x, label.y - edge.y);
        const below = labels.filter(label => label.y > edge.y).sort((a, b) => distance(a) - distance(b));
        const label = below[0].text;
        // Clock hands, cracker holes and other internal details do not define the outline.
        if (edge.area > (outlines.get(label)?.area ?? 0)) outlines.set(label, edge);
      }
      expect(outlines.size).toBe(4);
      const matches = [...outlines].filter(([, edge]) => edge.shape === target);
      expect(matches).toHaveLength(1);
      const number = matches[0][0];
      expect(q.answer).toBe(number);
      targets.add(target);
      positions.add(number);
    }
  }
  expect(targets.size).toBe(4);
  expect(positions.size).toBe(4);
});

it('names the one shaded face from its corners and sides', () => {
  const names = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (const index of [0, 1, 2]) {
      const q = makeRagQuestion(seed, index);
      if (q.choices) continue;
      if (q.picture?.type !== 'batch11-upper') throw new Error('Missing box');
      expect(q.prompt).toMatch(/shaded face/);
      const faces = q.picture.marks.filter((m): m is Extract<Mark, { kind: 'path' }> => m.kind === 'path');
      expect(faces).toHaveLength(3);
      const shaded = faces.filter(m => m.fill && m.fill !== 'none');
      expect(shaded).toHaveLength(1);
      const front = corners(shaded[0]);
      for (const other of faces.filter(face => face !== shaded[0])) {
        const common = corners(other).filter(([x, y]) => front.some(([u, v]) => u === x && v === y));
        expect(common).toHaveLength(2);
      }
      const shape = boundary(shaded[0]).shape;
      expect(q.answer).toBe(shape);
      names.add(shape);
    }
  }
  expect([...names].sort()).toEqual(['rectangle', 'square']);
});

it('reproduces the same question for the same seed and index', () => {
  for (const seed of [-7, 0, 34]) {
    for (const index of [0, 1, 5]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
