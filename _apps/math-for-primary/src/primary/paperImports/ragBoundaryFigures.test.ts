import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragBoundaryFigures';

type Point = [number, number];
type Outline = Exclude<Batch11UpperMark, { kind: 'text' } | { kind: 'line' }>;
const cross = (a: Point, b: Point, c: Point) =>
  (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

// Read the same closed paths the pupil sees, independently of their generator names.
function readOutline(mark: Outline) {
  if (mark.kind === 'circle') {
    expect(mark.r).toBeGreaterThan(0);
    return { x: mark.cx, y: mark.cy, straight: false, lengths: [], corners: 0 };
  }
  const tokens = mark.d.trim().split(/\s+/);
  let pos = 0;
  function point(): Point {
    const x = Number(tokens[pos++]), y = Number(tokens[pos++]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new Error('Missing path coordinate');
    return [x, y];
  }
  expect(tokens[pos++]).toBe('M');
  const vertices = [point()];
  let straight = true;
  while (pos < tokens.length - 1) {
    const command = tokens[pos++];
    if (command === 'L') vertices.push(point());
    else if (command === 'Q') {
      const control = point(), end = point();
      if (Math.abs(cross(vertices[vertices.length - 1], control, end)) > 1e-7) straight = false;
      vertices.push(end);
    } else throw new Error('Unexpected outline command ' + command);
  }
  expect(tokens[pos++]).toBe('Z');
  const last = vertices[vertices.length - 1];
  if (last[0] === vertices[0][0] && last[1] === vertices[0][1]) vertices.pop();
  const n = vertices.length;
  const lengths = vertices.map(([x, y], i) => {
    const next = vertices[(i + 1) % n];
    return Math.hypot(next[0] - x, next[1] - y);
  });
  expect(Math.min(...lengths)).toBeGreaterThan(0);
  // Only all-straight outlines need a corner count for these conditions.
  const corners = straight ? vertices.filter((p, i) =>
    Math.abs(cross(vertices[(i + n - 1) % n], p, vertices[(i + 1) % n])) > 1e-7).length : 0;
  return { x: vertices.reduce((sum, p) => sum + p[0], 0) / n,
    y: vertices.reduce((sum, p) => sum + p[1], 0) / n, straight, corners, lengths };
}

function readBoard(q: Question) {
  if (q.picture?.type !== 'batch11-upper') throw new Error('Missing figure board');
  const labels = q.picture.marks.flatMap(m => m.kind === 'text' ? [m] : []);
  const figures = q.picture.marks.flatMap(m => {
    if (m.kind === 'text') return [];
    if (m.kind === 'line') throw new Error('Expected a closed figure');
    const figure = readOutline(m);
    const distance = (p: { x: number; y: number }) => Math.hypot(p.x - figure.x, p.y - figure.y);
    const label = labels.filter(p => p.y > figure.y).sort((a, b) => distance(a) - distance(b))[0];
    if (!label) throw new Error('Figure has no label below it');
    return [{ ...figure, label: label.text }];
  });
  expect(figures.map(f => f.label).sort()).toEqual(labels.map(l => l.text).sort());
  expect(new Set(figures.map(f => f.label)).size).toBe(figures.length);
  return figures;
}

it('solves every selection from the prompt, the drawn boundaries and their printed labels', () => {
  const prompts = new Set<string>();
  for (let seed = -8; seed < 24; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const figures = readBoard(q);
      const sides = /(\d+) sides/.exec(q.prompt);
      const corners = /(\d+) corners/.exec(q.prompt);
      const pair = q.prompt.startsWith('Pick every shape');
      let hits = figures.filter(f => f.straight);
      if (sides) {
        prompts.add(`${sides[1]} sides${corners ? ' and corners' : ''}`);
        expect(q.prompt).toContain('every side the same length');
        hits = hits.filter(f => f.lengths.length === Number(sides[1]) && (!corners || f.corners === Number(corners[1])));
        expect(hits).toHaveLength(2); // Counting alone should leave a genuine choice.
        hits = hits.filter(f => Math.max(...f.lengths) - Math.min(...f.lengths) < 1e-7);
      } else if (pair) {
        prompts.add('all matches');
        expect(q.prompt).toContain('corners and straight sides');
        hits = hits.filter(f => f.corners > 0);
      } else {
        prompts.add('one outline');
        expect(q.prompt).toContain('just straight lines');
      }
      const labels = figures.map(f => f.label).sort();
      const expected = hits.map(f => f.label).sort();
      expect(expected).toHaveLength(pair ? 2 : 1);
      if (pair) {
        expect(q.structuredResponse).toEqual({ kind: 'named-pair', options: labels });
        expect(JSON.parse(q.answer).sort()).toEqual(expected);
        expect(correctAnswer(q, JSON.stringify(expected.slice().reverse()))).toBe(true);
        for (const a of labels) {
          for (const b of labels) {
            const valid = a !== b && expected.includes(a) && expected.includes(b);
            expect(correctAnswer(q, JSON.stringify([a, b]))).toBe(valid);
          }
        }
        expect(correctAnswer(q, JSON.stringify([expected[0]]))).toBe(false);
      } else {
        expect(q.choices).toEqual(labels);
        expect(q.answer).toBe(expected[0]);
      }
    }
  }
  expect([...prompts].sort()).toEqual([
    '3 sides', '3 sides and corners', '4 sides', '4 sides and corners', 'all matches', 'one outline',
  ]);
});

it('repeats a given seed and index and varies the visible boards', () => {
  const boards = new Set<string>();
  for (let i = 0; i < 12; i++) {
    const q = makeRagQuestion(17, i);
    expect(makeRagQuestion(17, i)).toEqual(q);
    boards.add(JSON.stringify(q.picture));
  }
  expect(boards.size).toBe(12);
});
