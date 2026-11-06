import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import type {GridPoint, GridSegment, GridDrawingPicture} from '../gridDrawingModel';
import {makeRagQuestion, RAG_PATTERN} from './ragPrismPyramidNetRecognitionRepair';

const pointKey = (p: GridPoint) => p.join(',');
const edgeKey = (a: GridPoint, b: GridPoint) => [pointKey(a), pointKey(b)].sort().join('|');
const samePoint = (a: GridPoint, b: GridPoint) => pointKey(a) === pointKey(b);
const distance = (a: GridPoint, b: GridPoint) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const close = (a: number, b: number) => Math.abs(a - b) < 1e-8;

function diagram(q: Question): GridDrawingPicture {
  if (q.picture?.type !== 'grid-drawing') throw new Error('Missing visible net diagrams');
  return q.picture;
}

function panels(picture: GridDrawingPicture): Map<string, GridSegment[]> {
  if (picture.caption !== 'A: upper left; B: upper right; C: lower left; D: lower right.') {
    throw new Error('Missing visible position labels');
  }
  const neighbours = new Map<string, Set<string>>();
  for (const [a, b] of picture.segments) {
    const ak = pointKey(a), bk = pointKey(b);
    if (!neighbours.has(ak)) neighbours.set(ak, new Set());
    if (!neighbours.has(bk)) neighbours.set(bk, new Set());
    neighbours.get(ak)!.add(bk);
    neighbours.get(bk)!.add(ak);
  }
  const seen = new Set<string>();
  const result = new Map<string, GridSegment[]>();
  for (const start of neighbours.keys()) {
    if (seen.has(start)) continue;
    const queue = [start], component = new Set<string>();
    while (queue.length) {
      const key = queue.pop()!;
      if (component.has(key)) continue;
      component.add(key);
      seen.add(key);
      for (const next of neighbours.get(key)!) if (!component.has(next)) queue.push(next);
    }
    const edges = picture.segments.filter(([a]) => component.has(pointKey(a)));
    const xs = edges.flatMap(edge => edge.map(point => point[0]));
    const ys = edges.flatMap(edge => edge.map(point => point[1]));
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const slot = (cy > picture.rows / 2 ? 2 : 0) + (cx > picture.columns / 2 ? 1 : 0);
    const label = ['A', 'B', 'C', 'D'][slot];
    if (result.has(label)) throw new Error('Ambiguous panel placement');
    result.set(label, edges);
  }
  if (result.size !== 4) throw new Error('Expected four connected diagrams');
  return result;
}

type Rectangle = {left: number; right: number; top: number; bottom: number};
function extractFaces(segments: GridSegment[]): {rectangles: Rectangle[]; triangles: GridPoint[][]} {
  const vertices = new Map<string, GridPoint>();
  const edges = new Set<string>();
  for (const [a, b] of segments) {
    vertices.set(pointKey(a), a);
    vertices.set(pointKey(b), b);
    edges.add(edgeKey(a, b));
  }
  const points = [...vertices.values()];
  const linked = (a: GridPoint, b: GridPoint) => edges.has(edgeKey(a, b));
  const triangles: GridPoint[][] = [];
  for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
    for (let c = b + 1; c < points.length; c++) {
      const u = points[a], v = points[b], w = points[c];
      const area2 = (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
      if (area2 !== 0 && linked(u, v) && linked(v, w) && linked(w, u)) triangles.push([u, v, w]);
    }
  }
  const xs = [...new Set(points.map(p => p[0]))].sort((a, b) => a - b);
  const ys = [...new Set(points.map(p => p[1]))].sort((a, b) => a - b);
  const rectangles: Rectangle[] = [];
  for (let a = 0; a < xs.length; a++) for (let b = a + 1; b < xs.length; b++) {
    for (let c = 0; c < ys.length; c++) for (let d = c + 1; d < ys.length; d++) {
      const corners: GridPoint[] = [[xs[a], ys[c]], [xs[b], ys[c]], [xs[b], ys[d]], [xs[a], ys[d]]];
      if (corners.every((p, i) => linked(p, corners[(i + 1) % 4]))) {
        rectangles.push({left: xs[a], right: xs[b], top: ys[c], bottom: ys[d]});
      }
    }
  }
  return {rectangles, triangles};
}

// This solver uses only visible text, diagram edges and position labels.
// For a rectangular strip, closure requires matching cyclic edge lengths
// and one congruent triangular face at each of its two ends.
function solveVisible(q: Question): string[] {
  const text = (q.context ?? []).join(' ');
  const sideMatch = /side lengths (\d+) cm, (\d+) cm and (\d+) cm/.exec(text);
  const scaleMatch = /Each grid step represents (\d+) cm/.exec(text);
  const lengthMatch = /Its length is (\d+) cm/.exec(text);
  if (!sideMatch || !scaleMatch || !lengthMatch) throw new Error('Incomplete visible dimensions');
  const sides = sideMatch.slice(1).map(Number).sort((a, b) => a - b);
  const scale = Number(scaleMatch[1]), length = Number(lengthMatch[1]);
  const answers: string[] = [];
  for (const [label, segments] of panels(diagram(q))) {
    const {rectangles, triangles} = extractFaces(segments);
    if (rectangles.length !== 3 || triangles.length !== 2) continue;
    rectangles.sort((a, b) => a.left - b.left);
    const top = rectangles[0].top, bottom = rectangles[0].bottom;
    if (rectangles.some(rect => rect.top !== top || rect.bottom !== bottom)) continue;
    if (!close((bottom - top) * scale, length)) continue;
    if (rectangles.slice(1).some((rect, i) => rectangles[i].right !== rect.left)) continue;
    const widths = rectangles.map(rect => rect.right - rect.left);
    const sortedWidths = widths.map(width => width * scale).sort((a, b) => a - b);
    if (sortedWidths.some((width, i) => !close(width, sides[i]))) continue;
    const ends = new Set<string>();
    let valid = true;
    for (const triangle of triangles) {
      const triangleSides = triangle.map((p, i) => distance(p, triangle[(i + 1) % 3]) * scale).sort((a, b) => a - b);
      if (triangleSides.some((side, i) => !close(side, sides[i]))) {valid = false; break;}
      const attachments: {panel: number; side: 'top' | 'bottom'; left: GridPoint; right: GridPoint}[] = [];
      rectangles.forEach((rect, panel) => {
        for (const side of ['top', 'bottom'] as const) {
          const y = rect[side];
          const left: GridPoint = [rect.left, y], right: GridPoint = [rect.right, y];
          if (triangle.some(p => samePoint(p, left)) && triangle.some(p => samePoint(p, right))) {
            attachments.push({panel, side, left, right});
          }
        }
      });
      if (attachments.length !== 1) {valid = false; break;}
      const attachment = attachments[0];
      const apex = triangle.find(p => !samePoint(p, attachment.left) && !samePoint(p, attachment.right))!;
      if (attachment.side === 'top' ? apex[1] >= top : apex[1] <= bottom) {valid = false; break;}
      const previousWidth = widths[(attachment.panel + 2) % 3];
      const nextWidth = widths[(attachment.panel + 1) % 3];
      if (!close(distance(attachment.left, apex), previousWidth) || !close(distance(attachment.right, apex), nextWidth)) {
        valid = false;
        break;
      }
      ends.add(attachment.side);
    }
    if (valid && ends.size === 2) answers.push(label);
  }
  return answers.sort();
}

describe('triangular-prism net pair candidate', () => {
  it('independently solves visible geometry across varied seeds and indices', () => {
    const seeds = [-2147483648, -1, 0, 1, 2147483647, ...Array.from({length: 128}, (_, i) => 7919 * i + 37)];
    const seenPairs = new Set<string>();
    for (const seed of seeds) for (const index of [0, 1, 7]) {
      const q = makeRagQuestion(seed, index);
      const labels = solveVisible(q);
      expect(labels).toHaveLength(2);
      const expected = labels.join(' and ');
      expect(q.answer).toBe(expected);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices!.filter(choice => choice === expected)).toHaveLength(1);
      expect(q.gridDrawing).toBeUndefined();
      expect(q.unit).toBeUndefined();
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
      const p = diagram(q);
      for (const edge of p.segments) for (const [x, y] of edge) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(p.columns);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(p.rows);
      }
      seenPairs.add(expected);
    }
    expect(seenPairs.size).toBe(6);
  });

  it('is deterministic and varies diagrams and visible dimensions', () => {
    const signatures = new Set<string>();
    for (let seed = 0; seed < 80; seed++) {
      const q = makeRagQuestion(seed, 3);
      expect(makeRagQuestion(seed, 3)).toEqual(q);
      signatures.add(JSON.stringify([q.context, q.picture]));
    }
    expect(signatures.size).toBeGreaterThan(20);
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('prism-pyramid-net-recognition-repair');
    expect(RAG_PATTERN.skillIds).toEqual(['P4.S.SOLID.03']);
  });

  it('does not use stored answers, explanations or keys to solve', () => {
    const q = makeRagQuestion(27, 2);
    const expected = solveVisible(q);
    const altered: Question = {...q, key: 'opaque', answer: 'unrelated', choices: [], hint: '', explanation: '', workedSteps: []};
    expect(solveVisible(altered)).toEqual(expected);
  });

  it('rejects a formerly valid net when a visible triangular edge is removed', () => {
    const q = makeRagQuestion(91, 4);
    const expected = solveVisible(q);
    const target = expected[0];
    const p = diagram(q);
    const component = panels(p).get(target)!;
    const diagonal = component.find(([a, b]) => a[0] !== b[0] && a[1] !== b[1])!;
    expect(diagonal).toBeDefined();
    const removedKey = edgeKey(diagonal[0], diagonal[1]);
    const altered: Question = {
      ...q,
      picture: {...p, segments: p.segments.filter(([a, b]) => edgeKey(a, b) !== removedKey)},
    };
    expect(solveVisible(altered)).toEqual(expected.filter(label => label !== target));
  });
});
