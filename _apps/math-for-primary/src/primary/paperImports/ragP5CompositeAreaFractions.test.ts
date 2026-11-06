import { describe, expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion, RAG_PATTERN } from './ragP5CompositeAreaFractions';

type Visible = Pick<Question, 'prompt' | 'context' | 'picture'>;
type Ratio = [number, number];

function visible(q: Question): Visible {
  return { prompt: q.prompt, context: q.context?.slice(), picture: q.picture };
}

// Shoelace area on doubled coordinates gives exact integer area units.
// The unit cancels when the requested area is divided by the total.
function polygonAreaUnits(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    const [u, v] = points[(i + 1) % points.length];
    if (![x, y, u, v].every(value => Number.isInteger(value * 2))) {
      throw new Error('Expected half-grid coordinates');
    }
    sum += (2 * x) * (2 * v) - (2 * y) * (2 * u);
  }
  return Math.abs(sum);
}

// This solver receives no answer, proof, explanation, seed, or hidden parameters.
function solveVisible(q: Visible): Ratio {
  const picture = q.picture;
  if (picture?.type === 'batch9-early' && picture.layout === 'area-fraction') {
    let total = 0, shaded = 0;
    for (const piece of picture.pieces) {
      const area = polygonAreaUnits(piece.points);
      total += area;
      if (piece.shaded) shaded += area;
    }
    return [shaded, total];
  }
  const text = (q.context ?? []).join(' ');
  const matches = [...text.matchAll(/(\d+)\/(\d+) of rectangle ([AB])/g)];
  const a = matches.find(match => match[3] === 'A');
  const b = matches.find(match => match[3] === 'B');
  if (matches.length !== 2 || !a || !b) throw new Error('Missing visible rectangle fractions');
  const na = Number(a[1]), da = Number(a[2]);
  const nb = Number(b[1]), db = Number(b[2]);
  // Scale areas to satisfy both visible fraction equations independently.
  const areaA = da * nb;
  const areaB = na * db;
  const shared = na * nb;
  return [areaA - shared + areaB - shared, areaA + areaB - shared];
}

function gcd(a: number, b: number): number {
  while (b) { const next = a % b; a = b; b = next; }
  return a;
}

function sample(withPicture: boolean): Question {
  for (let i = 0; i < 6; i++) {
    const q = makeRagQuestion(27, i);
    if (Boolean(q.picture) === withPicture) return q;
  }
  throw new Error('Expected both variants');
}

function insidePolygon(x: number, y: number, points: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

describe('composite area fractions', () => {
  it('independently solves visible givens across varied seeds and indices', () => {
    const variants = new Set<string>();
    const answers = new Set<string>();
    for (let seed = -40; seed <= 40; seed++) {
      for (let index = 0; index < 6; index++) {
        const q = makeRagQuestion(seed, index);
        const [requested, total] = solveVisible(visible(q));
        const match = /^(\d+)\/(\d+)$/.exec(q.answer);
        expect(match).not.toBeNull();
        if (!match) throw new Error('Expected a fraction answer');
        const n = Number(match[1]), d = Number(match[2]);
        expect(n * total).toBe(d * requested);
        expect(n).toBeGreaterThan(0);
        expect(n).toBeLessThan(d);
        expect(gcd(n, d)).toBe(1);
        expect(q.requireSimplified).toBe(true);
        expect(q.unit).toBeUndefined();
        expect(q.workedSteps?.length).toBeGreaterThanOrEqual(4);
        expect(q.hint.length).toBeGreaterThan(20);
        expect(q.explanation.length).toBeGreaterThan(60);
        variants.add(q.picture ? 'squares' : 'overlap');
        answers.add(q.answer);
        if (!q.picture) {
          const text = q.context!.join(' ');
          expect(text).toContain('Only the part shared by both sheets is shaded');
          expect(text).toContain('shared part belongs to the figure only once');
        }
      }
    }
    expect([...variants].sort()).toEqual(['overlap', 'squares']);
    expect(answers.size).toBeGreaterThan(8);
  });

  it('draws non-overlapping equal squares and equal quarter triangles within the existing canvas', () => {
    for (let seed = 0; seed < 24; seed++) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const p = q.picture;
        if (!p || p.type !== 'batch9-early' || p.layout !== 'area-fraction') continue;
        const countMatch = /from (\d+) identical squares/.exec(q.context![0]);
        expect(countMatch).not.toBeNull();
        const squareCount = Number(countMatch![1]);
        expect(squareCount).toBeGreaterThanOrEqual(5);
        expect(squareCount).toBeLessThanOrEqual(7);
        const [shaded, total] = solveVisible(visible(q));
        expect(total).toBe(8 * squareCount);
        expect(new Set(p.pieces.map(piece => piece.label)).size).toBe(p.pieces.length);
        for (const piece of p.pieces) {
          expect(piece.points).toHaveLength(piece.kind === 'square' ? 4 : 3);
          expect(polygonAreaUnits(piece.points)).toBe(piece.kind === 'square' ? 8 : 2);
          for (const [x, y] of piece.points) {
            // Bounds include the renderer's 2-pixel strokes and fixed transform.
            expect(30 + 32 * x).toBeGreaterThanOrEqual(2);
            expect(30 + 32 * x).toBeLessThanOrEqual(318);
            expect(25 + 32 * y).toBeGreaterThanOrEqual(2);
            expect(25 + 32 * y).toBeLessThanOrEqual(133);
          }
        }
        // Unequal displayed pieces must not be treated as equal-area parts.
        const shadedPieces = p.pieces.filter(piece => piece.shaded).length;
        expect(shadedPieces * total).not.toBe(shaded * p.pieces.length);
        // Off-grid sample points avoid the diagram's diagonal boundaries.
        for (let x = 0.071; x < 8.5; x += 0.25) {
          for (let y = 0.113; y < 3; y += 0.25) {
            expect(p.pieces.filter(piece => insidePolygon(x, y, piece.points)).length).toBeLessThanOrEqual(1);
          }
        }
      }
    }
  });

  it('responds to changed visible shading and changed visible overlap fractions', () => {
    const square = visible(sample(true));
    const changedSquare: Visible = structuredClone(square);
    const p = changedSquare.picture;
    if (!p || p.type !== 'batch9-early' || p.layout !== 'area-fraction') throw new Error('Missing figure');
    const triangle = p.pieces.find(piece => piece.kind === 'triangle');
    if (!triangle) throw new Error('Missing triangle');
    triangle.shaded = !triangle.shaded;
    const before = solveVisible(square), after = solveVisible(changedSquare);
    expect(before[0] * after[1]).not.toBe(after[0] * before[1]);

    const overlap = visible(sample(false));
    const changedOverlap: Visible = {
      ...overlap,
      context: overlap.context!.map(line => line.replace(
        /1\/(\d+) of rectangle A/,
        (_match: string, denominator: string) => `1/${Number(denominator) + 1} of rectangle A`,
      )),
    };
    const first = solveVisible(overlap), second = solveVisible(changedOverlap);
    expect(first[0] * second[1]).not.toBe(second[0] * first[1]);
  });

  it('is reproducible and exports the required family metadata', () => {
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('p5-composite-area-fractions');
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    const permittedSkills = ['P5.S.AREA.03', 'P5.S.FRAC.01', 'P3.S.FRAC.02'];
    expect(RAG_PATTERN.skillIds.every(skill => permittedSkills.includes(skill))).toBe(true);
    for (const seed of [-7, 0, 1, 29, 2026, 2147483647]) {
      for (let index = 0; index < 6; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
    expect(makeRagQuestion(3).key).not.toBe(makeRagQuestion(3, 1).key);
  });
});
