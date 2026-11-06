import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4FinishGridOutlines';
import {
  gridDrawingValue, parseGridDrawing, validGridDrawing,
  type GridPoint, type GridSegment, type GridDrawingSpec,
} from '../gridDrawingModel';

type Board = Extract<GridDrawingSpec, { kind: 'copy-grid' }>;
const edge = (s: GridSegment) => s.map(p => p.join(',')).sort().join(':');
const outlineKey = (sides: GridSegment[]) => sides.map(edge).sort();

// Try every dot for a corner adjacent to the first endpoint.
// Right angles, the requested side lengths, and the visible lines decide which outline fits.
function solve(board: Board, square: boolean): GridSegment[][] {
  const [a, b] = board.referenceSegments[0];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const possibilities: GridSegment[][] = [];
  for (let x = 0; x <= board.columns; x++) {
    for (let y = 0; y <= board.rows; y++) {
      const ux = x - a[0], uy = y - a[1];
      if ((ux === 0 && uy === 0) || ux * dx + uy * dy !== 0) continue;
      if (square && ux * ux + uy * uy !== dx * dx + dy * dy) continue;
      const c: GridPoint = [x + dx, y + dy];
      if (c[0] < 0 || c[0] > board.columns || c[1] < 0 || c[1] > board.rows) continue;
      const d: GridPoint = [x, y];
      const shape: GridSegment[] = [[a, b], [b, c], [c, d], [d, a]];
      const edges = outlineKey(shape);
      if (board.referenceSegments.every(s => edges.includes(edge(s)))) possibilities.push(shape);
    }
  }
  return possibilities;
}

it('finds one bounded outline from the visible sides and grades the whole drawing', () => {
  const variants = new Set<string>();
  const layouts = new Set<string>();
  for (let seed = -8; seed < 44; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const board = q.gridDrawing;
      if (board?.kind !== 'copy-grid') throw Error('Expected a drawable grid with a reference');
      const shape = /\b(square|rectangle)\b/.exec(q.prompt)?.[1];
      expect(shape).toBeDefined();
      const given = board.referenceSegments;
      for (const [a, b] of given) {
        expect(a[0]).not.toBe(b[0]);
        expect(a[1]).not.toBe(b[1]);
        for (const [x, y] of [a, b]) {
          expect(Number.isInteger(x) && x >= 0 && x <= board.columns).toBe(true);
          expect(Number.isInteger(y) && y >= 0 && y <= board.rows).toBe(true);
        }
      }
      if (given.length === 2) {
        const lengths = given.map(([[x, y], [u, v]]) => (u - x) ** 2 + (v - y) ** 2);
        expect(lengths[0] === lengths[1]).toBe(shape === 'square');
      }
      variants.add(`${given.length}:${shape}`);
      layouts.add(gridDrawingValue(given));

      const solutions = solve(board, shape === 'square');
      expect(solutions).toHaveLength(1);
      const outline = solutions[0];
      expect(outlineKey(parseGridDrawing(board, q.answer) ?? [])).toEqual(outlineKey(outline));
      const reversed: GridSegment[] = outline.slice().reverse().map(([a, b]) => [b, a]);
      expect(validGridDrawing(board, gridDrawingValue(reversed), q.answer)).toBe(true);
      expect(validGridDrawing(board, gridDrawingValue(given), q.answer)).toBe(false);
      const diagonal: GridSegment = [outline[0][0], outline[2][0]];
      expect(validGridDrawing(board, gridDrawingValue([...outline, diagonal]), q.answer)).toBe(false);
      const picture = q.workedSteps?.at(-1)?.picture;
      if (picture?.type !== 'grid-drawing') throw Error('Expected the finished drawing in the solution');
      expect(outlineKey(picture.givenSegments ?? [])).toEqual(outlineKey(given));
      expect(outlineKey([...(picture.givenSegments ?? []), ...picture.segments])).toEqual(outlineKey(outline));
    }
  }
  expect([...variants].sort()).toEqual(['1:square', '2:rectangle', '2:square']);
  expect(layouts.size).toBeGreaterThan(30);
});

it('recreates the same board and worked drawing for the same seed and index', () => {
  expect(makeRagQuestion(29, 3)).toEqual(makeRagQuestion(29, 3));
});
