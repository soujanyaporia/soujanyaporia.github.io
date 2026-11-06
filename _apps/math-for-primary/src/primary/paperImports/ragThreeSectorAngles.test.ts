import {describe, expect, it} from 'vitest';
import type {Question} from '../generate';
import {makeRagQuestion, RAG_PATTERN} from './ragThreeSectorAngles';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'picture'>;
function diagram(q: VisibleQuestion) {
  if (!q.picture || q.picture.type !== 'batch11-upper') {
    throw new Error('A supported angle diagram is required');
  }
  return q.picture;
}

// Read only pupil-visible wording and marks. No answer, explanation,
// generation parameters, or generator helpers are available to this solver.
function solveVisible(q: VisibleQuestion) {
  if (!q.context?.some(text => text.includes('full turn'))) {
    throw new Error('The full-turn relationship is missing');
  }
  const picture = diagram(q);
  const given = picture.marks.flatMap(mark => {
    if (mark.kind !== 'text') return [];
    const match = /^(\d+)°$/.exec(mark.text);
    return match ? [Number(match[1])] : [];
  });
  const rightAngle = q.context.some(text => text === 'The square marks a right angle.');
  const corners = picture.marks.filter(mark => mark.kind === 'path' && / L /.test(mark.d));
  if (corners.length !== (rightAngle ? 1 : 0)) throw new Error('Right-angle evidence disagrees');
  if (given.length !== (rightAngle ? 1 : 2)) throw new Error('Expected two known angles');
  const known = [...given, ...(rightAngle ? [90] : [])];
  const possibilities = Array.from({length: 359}, (_, i) => i + 1)
    .filter(value => known.reduce((sum, angle) => sum + angle, value) === 360);
  if (possibilities.length !== 1) throw new Error('The visible givens do not determine one angle');
  return {answer: possibilities[0], known, rightAngle};
}

const normalise = (angle: number) => (angle % 360 + 360) % 360;
const heading = (x: number, y: number, cx: number, cy: number) =>
  normalise(Math.atan2(y - cy, x - cx) * 180 / Math.PI);
const numbers = (path: string) => (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);

function checkGeometry(q: Question) {
  const visible = {prompt: q.prompt, context: q.context, picture: q.picture};
  const solved = solveVisible(visible);
  const picture = diagram(visible);
  const rays = picture.marks.filter(mark => mark.kind === 'line');
  expect(rays).toHaveLength(3);
  const cx = rays[0].x1;
  const cy = rays[0].y1;
  for (const ray of rays) {
    expect([ray.x1, ray.y1]).toEqual([cx, cy]);
    expect(Math.hypot(ray.x2 - cx, ray.y2 - cy)).toBeGreaterThan(70);
    expect(ray.x2).toBeGreaterThan(0);
    expect(ray.x2).toBeLessThan(320);
    expect(ray.y2).toBeGreaterThan(0);
    expect(ray.y2).toBeLessThan(200);
  }
  const headings = rays.map(ray => heading(ray.x2, ray.y2, cx, cy)).sort((a, b) => a - b);
  const sectors = headings.map((start, i) => ({
    start,
    width: normalise(headings[(i + 1) % headings.length] - start),
  }));
  const widths = sectors.map(sector => sector.width).sort((a, b) => a - b);
  const expected = [...solved.known, solved.answer].sort((a, b) => a - b);
  widths.forEach((width, i) => expect(width).toBeCloseTo(expected[i], 1));

  const labels = picture.marks.filter(mark => mark.kind === 'text');
  expect(labels.filter(mark => mark.text === 'x')).toHaveLength(1);
  for (const mark of labels) {
    // Estimate the centre of the displayed text, compensating for its baseline.
    const direction = heading(mark.x + mark.text.length * 3.5, mark.y - 5, cx, cy);
    const sector = sectors.find(part => normalise(direction - part.start) < part.width);
    expect(sector).toBeDefined();
    const value = mark.text === 'x' ? solved.answer : Number(mark.text.replace('°', ''));
    expect(sector!.width).toBeCloseTo(value, 1);
  }

  const paths = picture.marks.filter(mark => mark.kind === 'path');
  const arcs = paths.filter(mark => / A /.test(mark.d));
  expect(arcs).toHaveLength(solved.rightAngle ? 2 : 3);
  const drawnWidths: number[] = [];
  for (const arc of arcs) {
    const values = numbers(arc.d);
    expect(values).toHaveLength(9);
    const [sx, sy, rx, ry, rotation, large, sweep, ex, ey] = values;
    expect(rx).toBe(ry);
    expect(rotation).toBe(0);
    expect(sweep).toBe(1);
    expect(Math.hypot(sx - cx, sy - cy)).toBeCloseTo(rx, 2);
    expect(Math.hypot(ex - cx, ey - cy)).toBeCloseTo(rx, 2);
    const width = normalise(heading(ex, ey, cx, cy) - heading(sx, sy, cx, cy));
    expect(large).toBe(width > 180 ? 1 : 0);
    for (const [x, y] of [[sx, sy], [ex, ey]]) {
      const direction = heading(x, y, cx, cy);
      const distance = Math.min(...headings.map(h => Math.min(normalise(direction - h), normalise(h - direction))));
      expect(distance).toBeLessThan(0.02);
    }
    drawnWidths.push(width);
  }
  const arcExpected = solved.rightAngle
    ? [solved.answer, ...solved.known.filter(value => value !== 90)]
    : expected;
  drawnWidths.sort((a, b) => a - b);
  arcExpected.sort((a, b) => a - b);
  drawnWidths.forEach((width, i) => expect(width).toBeCloseTo(arcExpected[i], 1));

  if (solved.rightAngle) {
    const corner = paths.find(mark => / L /.test(mark.d));
    expect(corner).toBeDefined();
    const [ax, ay, bx, by, dx, dy] = numbers(corner!.d);
    expect((ax - cx) * (dx - cx) + (ay - cy) * (dy - cy)).toBeCloseTo(0, 1);
    expect(bx).toBeCloseTo(ax + dx - cx, 2);
    expect(by).toBeCloseTo(ay + dy - cy, 2);
    expect(Math.hypot(ax - cx, ay - cy)).toBeCloseTo(Math.hypot(dx - cx, dy - cy), 2);
  }
}

describe('three sectors around a point', () => {
  it('independently solves visible givens across seeds and checks both response forms', () => {
    const forms = new Set<string>();
    const variants = new Set<string>();
    const seeds = [-2147483648, -17, 0, 1, 4294967295, ...Array.from({length: 80}, (_, i) => i + 2)];
    for (const seed of seeds) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context, picture: q.picture});
        expect(q.answer).toBe(String(solved.answer));
        expect(q.unit).toBe('degrees');
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
        expect(q.explanation).toBe(q.workedSteps!.map(step => step.text).join(' '));
        expect(q.hint.length).toBeGreaterThan(0);
        for (const angle of solved.known) {
          expect(Number.isInteger(angle)).toBe(true);
          expect(angle).toBeGreaterThan(0);
          expect(angle).toBeLessThan(180);
          expect([65, 140, 63, 75, 127]).not.toContain(angle);
        }
        expect(solved.answer).toBeGreaterThan(solved.rightAngle ? 180 : 90);
        expect(solved.answer).toBeLessThan(solved.rightAngle ? 360 : 180);
        if (solved.rightAngle) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices!.filter(value => Number(value) === solved.answer)).toHaveLength(1);
          for (const choice of q.choices!) {
            expect(Number(choice)).toBeGreaterThan(0);
            expect(Number(choice)).toBeLessThan(360);
          }
          forms.add('choice');
        } else {
          expect(q.choices).toBeUndefined();
          forms.add('entry');
        }
        variants.add(JSON.stringify([solved.known, solved.rightAngle]));
      }
    }
    expect([...forms].sort()).toEqual(['choice', 'entry']);
    expect(variants.size).toBeGreaterThan(25);
  });

  it('draws sectors, labels, right-angle markers and reflex arcs consistently', () => {
    for (let seed = 0; seed < 40; seed++) {
      for (let index = 0; index < 4; index++) checkGeometry(makeRagQuestion(seed, index));
    }
  });

  it('is deterministic and exposes the required curriculum metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.canonicalPatternId).toBe('angles-around-point-three-sectors-two-known');
    expect(RAG_PATTERN.skillIds).toEqual(['P5.S.ANGLE.02', 'P5.S.ANGLE.04']);
    for (const seed of [-9, 0, 17, 123456789]) {
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
      for (let index = 0; index < 6; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
        expect(makeRagQuestion(seed, index).key).not.toBe(makeRagQuestion(seed, index + 1).key);
        expect(Boolean(makeRagQuestion(seed, index).choices))
          .not.toBe(Boolean(makeRagQuestion(seed, index + 1).choices));
      }
    }
  });
});
