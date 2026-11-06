import { expect, test } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { gridDrawingValue, gridEdges, type GridPoint, type GridSegment } from '../gridDrawingModel';
import { makeRagQuestion } from './ragP4ExtendTessellation';

const shift = ([x, y]: GridPoint, dx: number): GridPoint => [x + dx, y];
const slide = (side: GridSegment[], dx: number): GridSegment[] =>
  side.map(([a, b]) => [shift(a, dx), shift(b, dx)]);

// Read the outlines on the reference grid and follow the outermost bent side.
function solve(prompt: string, board: NonNullable<Question['gridDrawing']>) {
  const instruction = /with (\d+) more tiles? on the (left|right)/.exec(prompt);
  if (!instruction || board.kind !== 'copy-grid') throw new Error('Expected a directed row on a copy grid');
  const count = Number(instruction[1]);
  const given = board.referenceSegments;
  const top = Math.min(...given.flat().map(p => p[1]));
  const bottom = Math.max(...given.flat().map(p => p[1]));
  const sloping = given.filter(([a, b]) => a[1] !== b[1])
    .map(([a, b]): GridSegment => a[1] < b[1] ? [a, b] : [b, a]);
  const sides = sloping.filter(([a]) => a[1] === top)
    .sort(([a], [b]) => a[0] - b[0])
    .map(([start, tip]) => {
      const lower = sloping.find(([a, b]) => a[0] === tip[0] && a[1] === tip[1] && b[1] === bottom);
      if (!lower) throw new Error('Open side in the starter');
      const end = lower[1];
      const lines: GridSegment[] = [[start, tip], [tip, end]];
      return { start, end, lines };
    });
  expect(sides.length).toBeGreaterThanOrEqual(3);
  const pitch = sides[1].start[0] - sides[0].start[0];
  expect(pitch).toBeGreaterThan(0);
  for (let i = 1; i < sides.length; i++) {
    expect(sides[i].lines).toEqual(slide(sides[i - 1].lines, pitch));
  }
  const left = sides[0], right = sides[sides.length - 1];
  const rails: GridSegment[] = [[left.start, right.start], [left.end, right.end]];
  expect(gridEdges(given)).toEqual(gridEdges([...rails, ...sides.flatMap(side => side.lines)]));

  const movingRight = instruction[2] === 'right';
  const edge = movingRight ? right : left;
  const dx = movingRight ? pitch : -pitch;
  const added: GridSegment[] = [
    [edge.start, shift(edge.start, count * dx)],
    [edge.end, shift(edge.end, count * dx)],
  ];
  for (let i = 1; i <= count; i++) added.push(...slide(edge.lines, i * dx));
  return { given, added, count, direction: instruction[2] };
}

test('the directed slide of the visible tile solves the drawing across seeds and indices', () => {
  const counts = new Set<number>();
  const directions = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (const index of [0, 1, 3]) {
      const q = makeRagQuestion(seed, index);
      const board = q.gridDrawing!;
      const { given, added, count, direction } = solve(q.prompt, board);
      counts.add(count);
      directions.add(direction);
      const drawing = [...given, ...added];
      for (const [x, y] of drawing.flat()) {
        expect(Number.isInteger(x) && x >= 0 && x <= board.columns).toBe(true);
        expect(Number.isInteger(y) && y >= 0 && y <= board.rows).toBe(true);
      }
      expect(drawing.length).toBeLessThanOrEqual(16);
      const reversed = [...drawing].reverse().map(([a, b]): GridSegment => [b, a]);
      const response = gridDrawingValue(reversed);
      expect(response.length).toBeLessThanOrEqual(200);
      expect(correctAnswer(q, response)).toBe(true);
      expect(correctAnswer(q, gridDrawingValue(given))).toBe(false);
      expect(correctAnswer(q, gridDrawingValue(drawing.slice(0, -1)))).toBe(false);

      // Reverse the last bend while keeping its two end dots and the tile count.
      const [[a, tip], [, b]] = added.slice(-2);
      const wrongTip: GridPoint = [2 * a[0] - tip[0], tip[1]];
      const wrong: GridSegment[] = [...drawing.slice(0, -2), [a, wrongTip], [wrongTip, b]];
      expect(correctAnswer(q, gridDrawingValue(wrong))).toBe(false);

      const worked = q.workedSteps?.at(-1)?.picture;
      if (worked?.type !== 'grid-drawing') throw new Error('Missing worked drawing');
      expect(gridEdges(worked.givenSegments ?? [])).toEqual(gridEdges(given));
      expect(gridEdges(worked.segments)).toEqual(gridEdges(added));
    }
  }
  expect([...counts].sort()).toEqual([1, 2, 3]);
  expect([...directions].sort()).toEqual(['left', 'right']);
});

test('a seed and index reproduce the same board and solution', () => {
  expect(makeRagQuestion(17, 4)).toEqual(makeRagQuestion(17, 4));
  expect(makeRagQuestion(-9)).toEqual(makeRagQuestion(-9, 0));
});
