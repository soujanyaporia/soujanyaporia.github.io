import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragTriangleAltitude';

type Point = { x: number; y: number };
type Line = Extract<Batch11UpperMark, { kind: 'line' }>;
type Visible = Pick<Question, 'prompt' | 'picture' | 'choices'>;
const difference = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-6;
const endpoints = (line: Line): [Point, Point] => [{ x: line.x1, y: line.y1 }, { x: line.x2, y: line.y2 }];

function readVisible(q: Visible) {
  const match = /^Triangle ([A-Z]{3}) has base ([A-Z]{2})\./.exec(q.prompt);
  if (!match || q.picture?.type !== 'batch11-upper') throw new Error('Missing named triangle, base or diagram.');
  const picture = q.picture;
  const dots = picture.marks.filter(m => m.kind === 'circle');
  const texts = picture.marks.filter(m => m.kind === 'text');
  const points: Record<string, Point> = {};
  for (const text of texts) {
    if (!/^[A-Z]$/.test(text.text)) throw new Error('Expected a single-letter point label.');
    // Match each rendered label to its nearest visible point dot.
    // The offset estimates the centre of the renderer's upright 17px letter.
    const centre = { x: text.x + 5, y: text.y - 6 };
    const ranked = dots.map(d => ({ point: { x: d.cx, y: d.cy }, distance: Math.hypot(centre.x - d.cx, centre.y - d.cy) }))
      .sort((a, b) => a.distance - b.distance);
    if (!ranked.length || ranked[0].distance > 20 || points[text.text]) throw new Error('Unreadable or repeated point label.');
    points[text.text] = ranked[0].point;
  }
  if (new Set(Object.values(points).map(p => `${p.x}:${p.y}`)).size !== dots.length) {
    throw new Error('Point labels do not identify distinct dots.');
  }
  return { triangle: match[1], base: match[2], points, picture, lines: picture.marks.filter(m => m.kind === 'line') };
}

function isDrawn(lines: Line[], a: Point, b: Point) {
  return lines.some(line => {
    const [u, v] = endpoints(line);
    return (near(a, u) && near(b, v)) || (near(a, v) && near(b, u));
  });
}

function onSegment(p: Point, a: Point, b: Point) {
  const direction = difference(b, a);
  const offset = difference(p, a);
  return Math.abs(cross(direction, offset)) < 1e-6 && dot(offset, direction) >= -1e-6
    && dot(offset, direction) <= dot(direction, direction) + 1e-6;
}

// This solver accepts only pupil-visible fields. It has no access to the answer,
// worked solution, RNG, selected drop or generation parameters.
function solveVisible(q: Visible) {
  const visible = readVisible(q);
  const { triangle, base, points, lines } = visible;
  const opposite = [...triangle].filter(letter => !base.includes(letter));
  if (opposite.length !== 1 || !points[base[0]] || !points[base[1]]) throw new Error('Invalid triangle/base labels.');
  const a = points[base[0]];
  const b = points[base[1]];
  const direction = difference(b, a);
  const valid = (q.choices ?? []).filter(choice => {
    if (!/^[A-Z]{2}$/.test(choice) || !choice.includes(opposite[0])) return false;
    const other = [...choice].find(letter => letter !== opposite[0]);
    if (!other || !points[other]) return false;
    const vertex = points[opposite[0]];
    const foot = points[other];
    const altitude = difference(foot, vertex);
    return dot(altitude, altitude) > 1 && isDrawn(lines, vertex, foot)
      && Math.abs(cross(difference(foot, a), direction)) < 1e-6
      && Math.abs(dot(altitude, direction)) < 1e-6;
  });
  if (valid.length !== 1) throw new Error(`Expected one geometric solution, found ${valid.length}.`);
  const footLabel = [...valid[0]].find(letter => letter !== opposite[0])!;
  const position = dot(difference(points[footLabel], a), direction) / dot(direction, direction);
  return { ...visible, answer: valid[0], position, direction };
}

it('independently identifies one height from visible geometry across seeds and indices', () => {
  const locations = new Set<string>();
  const interiorBases = new Set<number>();
  const directions = new Set<number>();
  for (let seed = -3; seed < 96; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const solved = solveVisible({ prompt: q.prompt, picture: q.picture, choices: q.choices });
      expect(q.answer).toBe(solved.answer);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices!.map(s => [...s].sort().join(''))).size).toBe(4);
      expect(q.unit).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.workedSteps).toHaveLength(3);
      expect(q.hint.trim().length).toBeGreaterThan(0);
      expect(q.explanation).toContain(solved.answer);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const inside = solved.position > 0 && solved.position < 1;
      locations.add(inside ? 'inside' : 'outside');
      if (inside) interiorBases.add(solved.triangle.indexOf(solved.base[0]));
      else {
        expect(solved.position).toBeGreaterThan(1);
        expect(q.context?.join(' ')).toContain('lie on one straight line');
      }
      directions.add(Math.round(Math.atan2(solved.direction.y, solved.direction.x) * 180 / Math.PI));
      for (let i = 0; i < 3; i++) {
        const a = solved.points[solved.triangle[i]];
        const b = solved.points[solved.triangle[(i + 1) % 3]];
        expect(isDrawn(solved.lines.filter(line => !line.dashed), a, b)).toBe(true);
      }
    }
  }
  expect([...locations].sort()).toEqual(['inside', 'outside']);
  expect(interiorBases.size).toBe(3);
  expect(directions.size).toBeGreaterThan(5);
});

it('changes the correct segment when another base is specified on the same interior diagram', () => {
  let checked = 0;
  for (let seed = 0; seed < 48; seed++) {
    const q = makeRagQuestion(seed);
    const original = solveVisible(q);
    if (!(original.position > 0 && original.position < 1)) continue;
    const { triangle, base } = original;
    const sides = [triangle[0] + triangle[1], triangle[1] + triangle[2], triangle[2] + triangle[0]];
    const nextBase = sides.find(side => [...side].sort().join('') !== [...base].sort().join(''))!;
    const changed = solveVisible({
      prompt: q.prompt.replace(`base ${base}.`, `base ${nextBase}.`),
      picture: q.picture,
      choices: q.choices,
    });
    expect(changed.answer).not.toBe(original.answer);
    checked++;
  }
  expect(checked).toBeGreaterThan(0);
});

it('keeps right-angle markers aligned with drawn lines and labels within the supported viewBox', () => {
  for (let seed = 0; seed < 48; seed++) {
    for (const index of [0, 3]) {
      const { picture, points, lines } = readVisible(makeRagQuestion(seed, index));
      const labels = picture.marks.filter(m => m.kind === 'text');
      for (const label of labels) {
        expect(label.x).toBeGreaterThanOrEqual(0);
        expect(label.x + 17).toBeLessThanOrEqual(320);
        expect(label.y - 17).toBeGreaterThanOrEqual(0);
        expect(label.y + 4).toBeLessThanOrEqual(200);
      }
      for (let i = 0; i < labels.length; i++) {
        for (let j = 0; j < i; j++) {
          expect(Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y)).toBeGreaterThan(30);
        }
      }
      for (const line of lines) {
        for (const point of endpoints(line)) {
          expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(320);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(200);
        }
      }
      const markers = picture.marks.filter(m => m.kind === 'path');
      expect(markers.length).toBeGreaterThanOrEqual(2);
      for (const marker of markers) {
        const numbers = marker.d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
        expect(numbers).toHaveLength(6);
        const first = { x: numbers[0], y: numbers[1] };
        const middle = { x: numbers[2], y: numbers[3] };
        const last = { x: numbers[4], y: numbers[5] };
        const corner = { x: first.x + last.x - middle.x, y: first.y + last.y - middle.y };
        expect(Object.values(points).some(point => near(point, corner))).toBe(true);
        const arms = [difference(first, corner), difference(last, corner)];
        expect(Math.abs(dot(arms[0], arms[1]))).toBeLessThan(1e-6);
        for (const arm of arms) {
          expect(Math.hypot(arm.x, arm.y)).toBeCloseTo(7, 7);
          expect(lines.some(line => {
            const [a, b] = endpoints(line);
            return onSegment(corner, a, b) && Math.abs(cross(arm, difference(b, a))) < 1e-6;
          })).toBe(true);
        }
      }
    }
  }
});
