import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragShapeGroups';

type Point = [number, number];
type Shape = { x: number; y: number; points: Point[]; label?: string };

function readShapes(q: Question): Shape[] {
  const pic = q.picture;
  if (pic?.type !== 'batch11-upper') throw new Error('Missing shape diagram');
  const shapes: Shape[] = [];
  for (const mark of pic.marks) {
    if (mark.kind === 'circle') {
      expect(mark.r).toBeGreaterThan(0);
      shapes.push({ x: mark.cx, y: mark.cy, points: [] });
    }
    if (mark.kind === 'path') {
      expect(mark.d).toMatch(/Z$/);
      const points: Point[] = [...mark.d.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)]
        .map(match => [Number(match[1]), Number(match[2])]);
      expect(points.length).toBeGreaterThanOrEqual(3);
      for (const [x, y] of points) {
        expect(x > 0 && x < 320 && y > 0 && y < 200).toBe(true);
      }
      const x = points.reduce((sum, p) => sum + p[0], 0) / points.length;
      const y = points.reduce((sum, p) => sum + p[1], 0) / points.length;
      shapes.push({ x, y, points });
    }
  }
  // Associate each printed letter with the outline above it, independently of mark order.
  for (const mark of pic.marks) {
    if (mark.kind !== 'text') continue;
    const above = shapes.filter(s => Math.abs(s.x - mark.x) < 26 && mark.y > s.y && mark.y - s.y < 55);
    expect(above).toHaveLength(1);
    expect(above[0].label).toBeUndefined();
    above[0].label = mark.text;
  }
  return shapes;
}

function solve(shapes: Shape[]) {
  const examples = shapes.filter(s => !s.label);
  const choices = shapes.filter(s => s.label);
  let count: number;
  if (examples.length) {
    expect(Math.max(...examples.map(s => s.y))).toBeLessThan(Math.min(...choices.map(s => s.y)));
    const rule = new Set(examples.map(s => s.points.length));
    expect(rule.size).toBe(1);
    count = examples[0].points.length;
  } else {
    const groups = new Map<number, number>();
    for (const s of choices) groups.set(s.points.length, (groups.get(s.points.length) ?? 0) + 1);
    const repeats = [...groups].filter(([, size]) => size > 1);
    expect(repeats).toHaveLength(1);
    expect(repeats[0][1]).toBe(2);
    count = repeats[0][0];
  }
  return {
    count,
    labels: choices.map(s => s.label!),
    expected: choices.filter(s => s.points.length === count).map(s => s.label!).sort(),
    mode: examples.length ? 'set' : 'pair',
  };
}

it('solves both tasks from the drawn outlines and checks every possible label selection', () => {
  const coverage = new Set<string>();
  for (let seed = -5; seed < 35; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { count, labels, expected, mode } = solve(readShapes(q));
      const single = q.prompt.startsWith('Which shape ');
      expect(expected).toHaveLength(single ? 1 : 2);
      coverage.add([mode, count, expected.length].join('/'));
      if (single) {
        expect(q.choices).toEqual(labels);
        expect(q.answer).toBe(expected[0]);
      } else {
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw new Error('Two selections required');
        expect(spec.options).toEqual(labels);
        expect(JSON.parse(q.answer).sort()).toEqual(expected);
        for (const a of labels) {
          for (const b of labels) {
            const shouldAccept = a !== b && expected.includes(a) && expected.includes(b);
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([a, b]))).toBe(shouldAccept);
          }
        }
      }
    }
  }
  expect([...coverage].sort()).toEqual(['pair/3/2', 'pair/4/2', 'set/3/1', 'set/3/2', 'set/4/1', 'set/4/2']);
});

it('keeps square corners and includes a turned square among the rectangular matches', () => {
  let checked = 0;
  for (let seed = 0; seed < 48; seed++) {
    const shapes = readShapes(makeRagQuestion(seed));
    if (!shapes.some(s => !s.label && s.points.length === 4)) continue;
    const quads = shapes.filter(s => s.points.length === 4);
    let turnedSquare = false;
    for (const { label, points } of quads) {
      const edges = points.map(([x, y], i) => {
        const next = points[(i + 1) % points.length];
        return [next[0] - x, next[1] - y];
      });
      const lengths = edges.map(([dx, dy]) => Math.hypot(dx, dy));
      edges.forEach(([dx, dy], i) => {
        const j = (i + 1) % 4;
        const cosine = (dx * edges[j][0] + dy * edges[j][1]) / (lengths[i] * lengths[j]);
        expect(Math.abs(cosine)).toBeLessThan(0.002);
      });
      if (label && Math.max(...lengths) - Math.min(...lengths) < 0.04 && edges.every(([dx, dy]) => Math.min(Math.abs(dx), Math.abs(dy)) > 1)) {
        turnedSquare = true;
      }
    }
    expect(turnedSquare).toBe(true);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
});

it('repeats a seed and index exactly and varies the visible diagrams across indices', () => {
  const diagrams = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(23, i);
    expect(q).toEqual(makeRagQuestion(23, i));
    diagrams.add(JSON.stringify(q.picture));
  }
  expect(diagrams.size).toBeGreaterThan(1);
});
