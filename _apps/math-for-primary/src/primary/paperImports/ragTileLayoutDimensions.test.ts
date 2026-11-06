import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { GridDrawingPicture } from '../gridDrawingModel';
import { makeRagQuestion } from './ragTileLayoutDimensions';

// Recover each face from the lines around it. Grid distances are drawing
// distances until the solver calibrates them against a length in the question.
function readLayout(p: GridDrawingPicture) {
  const edges = p.givenSegments ?? [];
  const points = edges.flat();
  const left = Math.min(...points.map(([x]) => x));
  const right = Math.max(...points.map(([x]) => x));
  const top = Math.min(...points.map(([, y]) => y));
  const bottom = Math.max(...points.map(([, y]) => y));

  function interval(axis: 0 | 1, along: number, across: number): [number, number] {
    const other = axis === 0 ? 1 : 0;
    const cuts = edges.filter(([a, b]) => a[axis] === b[axis]
      && Math.min(a[other], b[other]) < across && across < Math.max(a[other], b[other]))
      .map(([a]) => a[axis]);
    const lo = Math.max(...cuts.filter(n => n < along));
    const hi = Math.min(...cuts.filter(n => n > along));
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) throw Error('Open tile boundary');
    return [lo, hi];
  }

  const faces = new Map<string, { x: number; y: number; w: number; h: number; cells: number }>();
  for (let y = top; y < bottom; y++) {
    for (let x = left; x < right; x++) {
      const [x0, x1] = interval(0, x + 0.5, y + 0.5);
      const [y0, y1] = interval(1, y + 0.5, x + 0.5);
      const id = [x0, y0, x1, y1].join(',');
      const face = faces.get(id) ?? { x: x0, y: y0, w: x1 - x0, h: y1 - y0, cells: 0 };
      face.cells++;
      faces.set(id, face);
    }
  }
  for (const f of faces.values()) expect(f.cells).toBe(f.w * f.h);
  return { left, top, right, bottom, w: right - left, h: bottom - top, faces: [...faces.values()] };
}

function checkVisibleQuestion(q: Question): string {
  const p = q.picture;
  if (p?.type !== 'grid-drawing') throw Error('Missing tile layout');
  const board = readLayout(p);
  const tile = board.faces.find(f => f.x === board.left && f.y === board.top);
  if (!tile) throw Error('Missing corner tile');
  const text = q.context?.join(' ') ?? '';
  const given = /(\d+) (cm|m)\b/.exec(text);
  if (!given) throw Error('Missing length and unit');
  const measure = Number(given[1]);
  const floor = q.prompt.includes('tiles cover the floor');
  const beds = given[2] === 'm';
  const shown = floor ? board.faces.filter(f => f.x < tile.x + tile.w) : board.faces;
  for (const f of shown) {
    expect([Math.min(f.w, f.h), Math.max(f.w, f.h)])
      .toEqual([Math.min(tile.w, tile.h), Math.max(tile.w, tile.h)]);
  }

  if (floor) {
    expect(board.w).toBe(board.h);
    expect(p.segments).toEqual([
      [[board.left, board.top - 1], [board.left + tile.w, board.top - 1]],
      [[board.left - 1, board.top], [board.left - 1, board.top + tile.w]],
    ]);
    expect(board.faces.length - shown.length).toBe(1);
    expect(shown.some(f => f.h > f.w)).toBe(true);
    const cmPerGap = measure / tile.w;
    const count = (board.w * board.h) / (tile.w * tile.h);
    const perimeter = (board.w + board.h) * 2 * cmPerGap;
    expect(Number.isInteger(count)).toBe(true);
    expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Tiles', secondLabel: '(b) Perimeter (cm)' });
    expect(q.answer).toBe(JSON.stringify([String(count), String(perimeter)]));
    return 'floor';
  }

  const pieceCount = /(\d+) identical rectangular/.exec(text);
  expect(board.faces).toHaveLength(Number(pieceCount?.[1]));
  if (beds) {
    expect(board.w).toBe(board.h);
    expect(tile.w).toBe(board.w);
    expect(p.segments).toHaveLength(0);
    const metresPerGap = measure / (2 * (board.w + board.h));
    const side = board.w * metresPerGap;
    const bedPerimeter = 2 * (tile.w + tile.h) * metresPerGap;
    expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Side of garden (m)', secondLabel: '(b) Perimeter of bed (m)' });
    expect(q.answer).toBe(JSON.stringify([String(side), String(bedPerimeter)]));
    return 'beds';
  }

  expect(p.segments).toEqual([[[board.right + 1, board.top], [board.right + 1, board.bottom]]]);
  expect(shown.filter(f => f.h === board.h)).toHaveLength(2);
  const cmPerGap = measure / board.h;
  const width = tile.w * cmPerGap;
  const height = tile.h * cmPerGap;
  expect(Number.isInteger(width) && Number.isInteger(height)).toBe(true);
  if (q.prompt.includes('square centimetres')) {
    const expected = String(width * height);
    expect(q.unit).toBe('cm²');
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices).toContain(expected);
    expect(q.answer).toBe(expected);
    return 'area';
  }
  expect(q.prompt).toContain('perimeter of one tile');
  expect(q.unit).toBe('cm');
  expect(q.answer).toBe(String(2 * (width + height)));
  return 'perimeter';
}

it('solves each response from the drawn regions and the stated measurement', () => {
  for (let seed = 0; seed < 48; seed++) {
    const variants = new Set<string>();
    for (let index = 0; index < 4; index++) {
      variants.add(checkVisibleQuestion(makeRagQuestion(seed, index)));
    }
    expect(variants).toEqual(new Set(['floor', 'beds', 'area', 'perimeter']));
  }
});

it('repeats the same question for the same seed and index and varies the visible givens', () => {
  const givens = new Set<string>();
  for (let seed = 10; seed < 26; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      givens.add(JSON.stringify([q.context, q.picture]));
    }
  }
  expect(givens.size).toBeGreaterThan(20);
});
