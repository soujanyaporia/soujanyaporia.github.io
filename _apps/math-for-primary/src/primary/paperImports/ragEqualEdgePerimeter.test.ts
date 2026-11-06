import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragEqualEdgePerimeter';

function solve(q: Question) {
  const p = q.picture;
  const scale = /(\d+) (cm|units?)\b/.exec(q.context?.join(' ') ?? '');
  if (!scale || !p) throw new Error('Missing diagram or edge length');
  const unit = scale[2] === 'cm' ? 'cm' : 'units';
  let edges = 0;
  if (p.type === 'grid-drawing') {
    // Walk the visible segments one gap at a time, including the closing side.
    const visited = new Set<string>();
    for (let i = 0; i < p.segments.length; i++) {
      const [[x, y], [a, b]] = p.segments[i];
      expect(p.segments[(i + 1) % p.segments.length][0]).toEqual([a, b]);
      expect((a === x) !== (b === y)).toBe(true);
      const dx = Math.sign(a - x), dy = Math.sign(b - y);
      for (let col = x, row = y; col !== a || row !== b; col += dx, row += dy) {
        expect(Number.isInteger(col) && col >= 0 && col <= p.columns).toBe(true);
        expect(Number.isInteger(row) && row >= 0 && row <= p.rows).toBe(true);
        const dot = col + ',' + row;
        expect(visited.has(dot)).toBe(false);
        visited.add(dot);
      }
    }
    edges = visited.size;
  } else if (p.type === 'batch9-middle' && p.layout === 'unit-squares') {
    // Start with four sides per drawn tile. Each join hides two sides.
    const tiles = new Set(p.cells.map(([x, y]) => x + ',' + y));
    expect(tiles.size).toBe(p.cells.length);
    let joins = 0;
    for (const [x, y] of p.cells) {
      if (tiles.has((x + 1) + ',' + y)) joins++;
      if (tiles.has(x + ',' + (y + 1))) joins++;
    }
    edges = 4 * tiles.size - 2 * joins;
  } else throw new Error('Expected an outline or a tiled mat');
  return { value: Number(scale[1]) * edges, unit };
}

it('finds the answer from the diagram and its stated scale in both formats', () => {
  const formats = new Set<string>(), scales = new Set<number>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { value, unit } = solve(q);
      scales.add(Number(q.context![0].match(/\d+/)![0]));
      formats.add(q.picture!.type + ':' + (q.choices ? 'choice' : 'entry'));
      if (q.choices) {
        const label = `${value} ${unit}`;
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(label);
        expect(q.answer).toBe(label);
      } else {
        expect(q.unit).toBe(unit);
        expect(q.answer).toBe(String(value));
      }
    }
  }
  expect(formats).toEqual(new Set(['grid-drawing:choice', 'batch9-middle:entry', 'batch9-middle:choice']));
  expect(scales).toEqual(new Set([1, 2, 3]));
});

it('repeats a seed and index exactly and varies the visible geometry across indices', () => {
  const diagrams = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = makeRagQuestion(27, i);
    expect(makeRagQuestion(27, i)).toEqual(q);
    diagrams.add(JSON.stringify(q.picture));
  }
  expect(diagrams.size).toBeGreaterThan(8);
});
