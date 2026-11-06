import {describe, expect, test} from 'vitest';
import type {Question} from '../generate';
import type {Batch11UpperMark, Batch11UpperPicture} from './batch11UpperPicture';
import {structuredResponseCorrect} from './batch6MiddleResponse';
import {makeRagQuestion, RAG_PATTERN} from './ragCircularTriangularArea';

// The oracle receives only pupil-visible wording, never an answer or seed.
type Visible = Pick<Question, 'prompt' | 'context'>;
type Family = 'midpoints' | 'square-circles' | 'diameters';
const round = (n: number): number => Math.round(n * 100) / 100;
function lengthFrom(text: string, expression: RegExp): number {
  const match = expression.exec(text);
  if (!match) throw new Error('A necessary visible length is missing');
  return Number(match[1]);
}
function solveVisible(q: Visible): {family: Family; size: number; answers: number[]} {
  const wording = [...(q.context ?? []), q.prompt].join(' ');
  const piMatch = /Use π = (3\.14|22\/7)\./.exec(wording);
  if (!piMatch) throw new Error('The visible pi instruction is missing');
  const pi = piMatch[1] === '22/7' ? 22 / 7 : Number(piMatch[1]);
  if (wording.includes('midpoints of WX and ZY')) {
    const side = lengthFrom(wording, /side length (\d+) cm/);
    // The lower half-square and upper semicircle form the outer shaded envelope.
    // Removing the central triangle cancels the lower half-square area.
    const envelope = side * side / 2 + pi * (side / 2) ** 2 / 2;
    return {family: 'midpoints', size: side, answers: [round(envelope - side * side / 2)]};
  }
  if (wording.includes('ABCD is a square')) {
    const radius = lengthFrom(wording, /AB = (\d+) cm/);
    // In each circle: a 3/4-circle plus its right triangle minus the opposite
    // circular segment leaves an exclusive area of (pi/2 + 1) * radius².
    const exclusive = (pi / 2 + 1) * radius * radius;
    return {family: 'square-circles', size: radius, answers: [round(pi * radius), round(2 * exclusive)]};
  }
  if (wording.includes('AB and AC are diameters')) {
    const radius = lengthFrom(wording, /radius (\d+) cm/);
    // Solve through union minus white area, independently of the generator's
    // direct two-circle-minus-triangle calculation.
    const lens = 2 * (pi * radius * radius / 4 - radius * radius / 2);
    const union = 2 * pi * radius * radius - lens;
    const white = (2 * radius) ** 2 / 2 - lens;
    return {family: 'diameters', size: radius, answers: [round(union - white)]};
  }
  throw new Error('Unrecognised visible geometry');
}

function diagram(q: Question): Batch11UpperPicture {
  if (!q.picture || q.picture.type !== 'batch11-upper') throw new Error('Expected a supported diagram');
  return q.picture;
}
type Point = [number, number];
type CircleMark = Extract<Batch11UpperMark, {kind: 'circle'}>;
function circles(fig: Batch11UpperPicture): CircleMark[] {
  const marks = fig.marks.filter((m): m is CircleMark => m.kind === 'circle');
  return [...new Map(marks.map(m => [`${m.cx}:${m.cy}:${m.r}`, m])).values()];
}
function polygon(fig: Batch11UpperPicture, vertices: number, fill?: string): Point[] {
  for (const m of fig.marks) {
    if (m.kind !== 'path' || m.fill !== fill || /[AHVQCST]/.test(m.d)) continue;
    const values = (m.d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    if (values.length === vertices * 2) {
      return Array.from({length: vertices}, (_, i): Point => [values[2 * i], values[2 * i + 1]]);
    }
  }
  throw new Error('Expected a visible polygon boundary');
}
const distance = (a: Point, b: Point): number => Math.hypot(a[0] - b[0], a[1] - b[1]);
function expectSamePoint(a: Point, b: Point): void {
  expect(a[0]).toBeCloseTo(b[0], 8);
  expect(a[1]).toBeCloseTo(b[1], 8);
}
function lensCount(fig: Batch11UpperPicture, fill: string): number {
  return fig.marks.filter(m => m.kind === 'path' && m.fill === fill && (m.d.match(/ A /g) ?? []).length === 2).length;
}

describe('circular and triangular area decomposition', () => {
  test('independently solves visible givens across seeds, indices and all three variants', () => {
    const sizes: Record<Family, Set<number>> = {
      midpoints: new Set(), 'square-circles': new Set(), diameters: new Set(),
    };
    for (let seed = -8; seed < 24; seed++) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        sizes[solved.family].add(solved.size);
        const actual: number[] = q.structuredResponse ? (JSON.parse(q.answer) as string[]).map(Number) : [Number(q.answer)];
        expect(actual).toEqual(solved.answers);
        expect(actual.every(n => Number.isFinite(n) && n > 0)).toBe(true);
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.explanation).toBe(q.workedSteps!.map(s => s.text).join(' '));
        expect(q.hint.length).toBeGreaterThan(20);
        expect(diagram(q).label.length).toBeGreaterThan(40);
        if (solved.family === 'square-circles') {
          expect(solved.size).not.toBe(15);
          expect(solved.size).toBeGreaterThanOrEqual(8);
          expect(solved.size).toBeLessThanOrEqual(24);
          expect(q.structuredResponse).toMatchObject({kind: 'number-pair', decimal: true});
          expect(q.unit).toBeUndefined();
          expect(actual[1]).toBeLessThan(2 * 3.14 * solved.size ** 2);
        } else {
          expect(q.unit).toBe('cm²');
          expect(q.structuredResponse).toBeUndefined();
          if (solved.family === 'midpoints') {
            expect(solved.size).not.toBe(40);
            expect(solved.size % 4).toBe(0);
            expect(solved.size).toBeGreaterThanOrEqual(12);
            expect(solved.size).toBeLessThanOrEqual(44);
            expect(actual[0]).toBeLessThan(solved.size ** 2);
          } else {
            expect(solved.size).not.toBe(14);
            expect(solved.size % 7).toBe(0);
            expect(solved.size).toBeGreaterThanOrEqual(7);
            expect(solved.size).toBeLessThanOrEqual(35);
            expect(actual[0]).toBeLessThan(2 * 22 / 7 * solved.size ** 2);
          }
        }
      }
    }
    for (const values of Object.values(sizes)) expect(values.size).toBeGreaterThan(2);
  });

  test('preserves both linked answers and their units in the supported response control', () => {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(42, index);
      const solved = solveVisible({prompt: q.prompt, context: q.context});
      if (solved.family !== 'square-circles') continue;
      const spec = q.structuredResponse;
      if (!spec || spec.kind !== 'number-pair') throw new Error('Missing linked response');
      expect(spec.firstLabel).toContain('(cm)');
      expect(spec.secondLabel).toContain('(cm²)');
      const [perimeter, area] = solved.answers;
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([perimeter.toFixed(2), area.toFixed(2)]))).toBe(true);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(area), String(perimeter)]))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(perimeter), String(area + 1)]))).toBe(false);
      expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([String(perimeter)]))).toBe(false);
    }
  });

  test('draws the stated tangencies, intersections, equal diameters and shading', () => {
    for (const seed of [-9, 0, 8]) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const solved = solveVisible({prompt: q.prompt, context: q.context});
        const fig = diagram(q);
        const cs = circles(fig);
        for (const c of cs) {
          expect(c.r).toBeGreaterThan(0);
          expect(c.cx - c.r).toBeGreaterThanOrEqual(0);
          expect(c.cx + c.r).toBeLessThanOrEqual(320);
          expect(c.cy - c.r).toBeGreaterThanOrEqual(0);
          expect(c.cy + c.r).toBeLessThanOrEqual(200);
        }
        if (solved.family === 'midpoints') {
          expect(cs).toHaveLength(1);
          const square = polygon(fig, 4);
          const [p, z, y] = polygon(fig, 3, 'white');
          const xs = square.map(v => v[0]), ys = square.map(v => v[1]);
          const left = Math.min(...xs), right = Math.max(...xs);
          const top = Math.min(...ys), bottom = Math.max(...ys);
          expect(right - left).toBe(bottom - top);
          expectSamePoint([cs[0].cx, cs[0].cy], [(left + right) / 2, (top + bottom) / 2]);
          expect(cs[0].r * 2).toBe(right - left);
          expectSamePoint(p, [(left + right) / 2, top]);
          expectSamePoint(z, [left, bottom]);
          expectSamePoint(y, [right, bottom]);
          const envelope = fig.marks.find(m => m.kind === 'path' && m.fill === '#d7e8de');
          if (!envelope || envelope.kind !== 'path') throw new Error('Missing shaded envelope');
          // The filled envelope must reach both lower corners, beyond the circle.
          expect(envelope.d).toContain(`L ${right} ${bottom}`);
          expect(envelope.d).toContain(`L ${left} ${bottom}`);
          for (const label of ['W', 'X', 'Y', 'Z', 'P', 'Q']) {
            expect(fig.marks.some(m => m.kind === 'text' && m.text === label)).toBe(true);
          }
        } else if (solved.family === 'square-circles') {
          expect(cs).toHaveLength(2);
          const square = polygon(fig, 4);
          const side = distance(square[0], square[1]);
          for (let i = 0; i < 4; i++) expect(distance(square[i], square[(i + 1) % 4])).toBeCloseTo(side, 8);
          expectSamePoint([cs[0].cx, cs[0].cy], square[0]);
          expectSamePoint([cs[1].cx, cs[1].cy], square[2]);
          for (const c of cs) {
            expect(c.r).toBeCloseTo(side, 8);
            for (const intersection of [square[1], square[3]]) expect(distance([c.cx, c.cy], intersection)).toBeCloseTo(c.r, 8);
          }
          expect(lensCount(fig, 'white')).toBe(1);
        } else {
          expect(cs).toHaveLength(2);
          const [a, c, b] = polygon(fig, 3, 'white');
          expect((c[0] - a[0]) * (b[0] - a[0]) + (c[1] - a[1]) * (b[1] - a[1])).toBeCloseTo(0, 8);
          expect(distance(a, c)).toBeCloseTo(distance(a, b), 8);
          for (const endpoint of [c, b]) {
            const midpoint: Point = [(a[0] + endpoint[0]) / 2, (a[1] + endpoint[1]) / 2];
            const matching = cs.find(item => distance([item.cx, item.cy], midpoint) < 1e-8);
            if (!matching) throw new Error('A diameter does not pass through its circle centre');
            expect(distance(a, endpoint)).toBeCloseTo(2 * matching.r, 8);
          }
          expect(lensCount(fig, '#d7e8de')).toBe(1);
        }
      }
    }
  });

  test('is deterministic and exports one level-six family', () => {
    expect(RAG_PATTERN.level).toBe(6);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p6-circular-triangular-area-decomposition');
    expect(RAG_PATTERN.skillIds).toEqual(['P6.S.CIRCLE.03']);
    expect(makeRagQuestion(13)).toEqual(makeRagQuestion(13, 0));
    for (let index = 0; index < 9; index++) expect(makeRagQuestion(-23, index)).toEqual(makeRagQuestion(-23, index));
    const families = [0, 1, 2].map(index => {
      const q = makeRagQuestion(13, index);
      return solveVisible({prompt: q.prompt, context: q.context}).family;
    });
    expect(new Set(families).size).toBe(3);
  });
});
