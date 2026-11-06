import {describe, expect, test} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CURRICULUM_SKILLS} from '../../school/curriculum';
import {correctAnswer, type Question} from '../generate';
import {Picture} from '../Picture';
import {makeRagQuestion, RAG_PATTERN} from './ragEqualPartFractionDiagrams';

type VisibleQuestion = Pick<Question, 'prompt' | 'context' | 'picture'>;
type AreaPicture = Extract<NonNullable<Question['picture']>, {
  type: 'batch9-early';
  layout: 'area-fraction';
}>;
type Point = AreaPicture['pieces'][number]['points'][number];

function areaPicture(q: VisibleQuestion): AreaPicture {
  const picture = q.picture;
  if (picture?.type !== 'batch9-early' || picture.layout !== 'area-fraction') {
    throw new Error('Expected a visible polygon diagram');
  }
  return picture;
}

// Polygon coordinates are visible geometry. The oracle never receives an answer,
// a proof, worked steps, a seed or generation parameters.
function twiceArea(points: Point[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    sum += points[i][0] * next[1] - next[0] * points[i][1];
  }
  return Math.abs(sum);
}

function reducedFraction(numerator: number, denominator: number): string {
  for (let divisor = Math.min(numerator, denominator); divisor >= 1; divisor--) {
    if (numerator % divisor === 0 && denominator % divisor === 0) {
      const n = numerator / divisor;
      const d = denominator / divisor;
      return d === 1 ? String(n) : `${n}/${d}`;
    }
  }
  throw new Error('Expected positive whole-number area units');
}

function solveVisible(q: VisibleQuestion) {
  const picture = areaPicture(q);
  const whole = picture.pieces.reduce((sum, piece) => sum + twiceArea(piece.points), 0);
  const shaded = picture.pieces.reduce((sum, piece) => sum + (piece.shaded ? twiceArea(piece.points) : 0), 0);
  const unshaded = whole - shaded;
  let numerator: number;
  let denominator: number;
  let mode: string;

  if (q.prompt.includes('unshaded area as a fraction of the shaded area')) {
    numerator = unshaded;
    denominator = shaded;
    mode = 'relative';
  } else {
    denominator = whole;
    if (q.prompt.includes('rectangle is unshaded')) numerator = unshaded;
    else if (q.prompt.includes('rectangle is shaded')) numerator = shaded;
    else throw new Error('Unknown visible request');
    mode = picture.pieces.some(piece => piece.points.length === 3) ? 'area' : 'count';
  }
  return {whole, shaded, numerator, denominator, mode, answer: reducedFraction(numerator, denominator)};
}

function visibleOnly(q: Question): VisibleQuestion {
  return {prompt: q.prompt, context: q.context, picture: q.picture};
}

function checkTiling(picture: AreaPicture) {
  const points = picture.pieces.flatMap(piece => piece.points);
  const columns = Math.max(...points.map(point => point[0]));
  const rows = Math.max(...points.map(point => point[1]));
  const cells = new Map<string, AreaPicture['pieces']>();
  expect(Math.min(...points.map(point => point[0]))).toBe(0);
  expect(Math.min(...points.map(point => point[1]))).toBe(0);
  expect([4, 5]).toContain(columns);
  expect([2, 3]).toContain(rows);

  for (const piece of picture.pieces) {
    expect(piece.points.every(point => point.every(Number.isInteger))).toBe(true);
    expect(new Set(piece.points.map(point => point.join(','))).size).toBe(piece.points.length);
    const x = Math.min(...piece.points.map(point => point[0]));
    const y = Math.min(...piece.points.map(point => point[1]));
    expect(Math.max(...piece.points.map(point => point[0])) - x).toBe(1);
    expect(Math.max(...piece.points.map(point => point[1])) - y).toBe(1);
    expect(piece.points.length).toBe(piece.kind === 'square' ? 4 : 3);
    expect(twiceArea(piece.points)).toBe(piece.kind === 'square' ? 2 : 1);
    const key = `${x},${y}`;
    const group = cells.get(key) ?? [];
    group.push(piece);
    cells.set(key, group);
  }

  expect(cells.size).toBe(columns * rows);
  expect(new Set(picture.pieces.map(piece => piece.label)).size).toBe(picture.pieces.length);
  for (const pieces of cells.values()) {
    expect(pieces.reduce((sum, piece) => sum + twiceArea(piece.points), 0)).toBe(2);
    if (pieces.length === 1) {
      expect(pieces[0].kind).toBe('square');
    } else {
      expect(pieces).toHaveLength(2);
      expect(pieces.every(piece => piece.kind === 'triangle')).toBe(true);
      expect(pieces.filter(piece => piece.shaded)).toHaveLength(1);
      const second = new Set(pieces[1].points.map(point => point.join(',')));
      const shared = pieces[0].points.filter(point => second.has(point.join(',')));
      expect(shared).toHaveLength(2);
      // A common diagonal and four distinct corners establish an exact partition.
      expect(Math.abs(shared[0][0] - shared[1][0])).toBe(1);
      expect(Math.abs(shared[0][1] - shared[1][1])).toBe(1);
      expect(new Set(pieces.flatMap(piece => piece.points.map(point => point.join(',')))).size).toBe(4);
    }
  }
  return columns * rows;
}

const fixture: AreaPicture = {
  type: 'batch9-early',
  layout: 'area-fraction',
  pieces: [
    {label: 'Left', kind: 'square', points: [[0, 0], [1, 0], [1, 1], [0, 1]], shaded: true},
    {label: 'Right upper', kind: 'triangle', points: [[1, 0], [2, 0], [2, 1]], shaded: true},
    {label: 'Right lower', kind: 'triangle', points: [[1, 0], [2, 1], [1, 1]], shaded: false},
  ],
};

describe('equal-part fraction diagrams', () => {
  test('independent geometry solver distinguishes whole and shaded reference areas', () => {
    expect(solveVisible({picture: fixture, prompt: 'How much of the rectangle is shaded?'}).answer).toBe('3/4');
    expect(solveVisible({picture: fixture, prompt: 'How much of the rectangle is unshaded?'}).answer).toBe('1/4');
    expect(solveVisible({picture: fixture, prompt: 'Write the unshaded area as a fraction of the shaded area.'}).answer).toBe('1/3');
  });

  test('varied seeds produce valid partitions and independently correct simplified answers', () => {
    const signatures = new Map<string, Set<string>>();
    const countTargets = new Set<string>();
    let reducible = 0;
    const seeds = [...Array.from({length: 101}, (_, i) => i - 50), -2147483648, 2147483647];

    for (const seed of seeds) {
      for (let index = 0; index < 9; index++) {
        const q = makeRagQuestion(seed, index);
        const visible = visibleOnly(q);
        const solved = solveVisible(visible);
        const picture = areaPicture(visible);
        const total = checkTiling(picture);
        const seen = signatures.get(solved.mode) ?? new Set<string>();
        seen.add(JSON.stringify(visible));
        signatures.set(solved.mode, seen);

        expect([8, 10, 12, 15]).toContain(total);
        expect(q.context?.[0]).toBe(`All ${total} small squares have the same size.`);
        expect(solved.whole).toBe(total * 2);
        expect(solved.shaded).toBeGreaterThan(0);
        expect(solved.shaded).toBeLessThan(solved.whole);
        expect(solved.numerator).toBeGreaterThan(0);
        expect(solved.numerator).toBeLessThan(solved.denominator);
        expect(q.answer).toBe(solved.answer);
        expect(q.requireSimplified).toBe(true);
        expect(correctAnswer(q, solved.answer)).toBe(true);
        expect(correctAnswer(q, `${solved.numerator * 2}/${solved.denominator * 2}`)).toBe(false);
        expect(q.unit).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.fractionBuilder).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.workedSteps!.length).toBeGreaterThanOrEqual(4);
        expect(q.workedSteps!.at(-1)!.equation).toContain(`= ${solved.answer}`);
        expect(q.hint.length).toBeGreaterThan(0);
        expect(q.explanation).toContain(solved.answer);

        const answerDenominator = Number(solved.answer.split('/')[1] ?? 1);
        if (answerDenominator < solved.denominator / 2) reducible++;

        if (solved.mode === 'area') {
          expect([6, 10]).toContain(picture.pieces.filter(piece => piece.kind === 'triangle').length);
          const shadedPieces = picture.pieces.filter(piece => piece.shaded).length;
          // Counting unequal polygons as if they were equal must give a different value.
          expect(shadedPieces * solved.whole).not.toBe(solved.shaded * picture.pieces.length);
        }
        if (solved.mode === 'count') {
          countTargets.add(q.prompt.includes('rectangle is unshaded') ? 'unshaded' : 'shaded');
        }
        if (solved.mode === 'relative') {
          expect(correctAnswer(q, reducedFraction(solved.numerator, solved.whole))).toBe(false);
        }
      }
    }
    expect([...signatures.keys()].sort()).toEqual(['area', 'count', 'relative']);
    expect([...countTargets].sort()).toEqual(['shaded', 'unshaded']);
    for (const seen of signatures.values()) expect(seen.size).toBeGreaterThan(10);
    expect(reducible).toBeGreaterThan(0);
  });

  test('metadata is valid and consecutive indices deterministically cover the family', () => {
    expect(RAG_PATTERN.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    expect(RAG_PATTERN.level).toBe(5);
    expect(RAG_PATTERN.canonicalPatternId).toBe('equal-part-fraction-diagrams');
    for (const skillId of RAG_PATTERN.skillIds) {
      expect(CURRICULUM_SKILLS.some(skill => skill.id === skillId)).toBe(true);
    }
    for (const seed of [-31, 0, 17, 2026]) {
      const modes = new Set<string>();
      const keys = new Set<string>();
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        expect(makeRagQuestion(seed, index)).toEqual(q);
        modes.add(solveVisible(visibleOnly(q)).mode);
        keys.add(q.key);
      }
      expect(modes.size).toBe(3);
      expect(keys.size).toBe(3);
      expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    }
  });

  test('the normal picture renderer keeps every polygon inside its viewport', () => {
    for (const seed of [0, 7, 91]) {
      for (let index = 0; index < 3; index++) {
        const q = makeRagQuestion(seed, index);
        const picture = areaPicture(visibleOnly(q));
        const html = renderToStaticMarkup(createElement(Picture, {model: picture}));
        expect(html).toContain('role="img"');
        expect(html).not.toMatch(/NaN|undefined/);
        const polygons = [...html.matchAll(/<polygon\b[^>]*points="([^"]+)"/g)];
        expect(polygons).toHaveLength(picture.pieces.length);
        expect((html.match(/data-shaded="yes"/g) ?? []).length).toBe(picture.pieces.filter(piece => piece.shaded).length);
        for (const polygon of polygons) {
          for (const pair of polygon[1].split(' ')) {
            const [x, y] = pair.split(',').map(Number);
            expect(x).toBeGreaterThan(1);
            expect(x).toBeLessThan(319);
            expect(y).toBeGreaterThan(1);
            expect(y).toBeLessThan(134);
          }
        }
      }
    }
  });
});
