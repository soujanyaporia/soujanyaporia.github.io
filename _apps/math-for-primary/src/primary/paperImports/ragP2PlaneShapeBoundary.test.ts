import { expect, it } from 'vitest';
import type { GridDrawingPicture, GridPoint } from '../gridDrawingModel';
import { makeRagQuestion } from './ragP2PlaneShapeBoundary';

function nameFromClues(clues: string): string {
  if (/\b3 sides\b/.test(clues) && /Each side is straight/.test(clues)) return 'triangle';
  expect(clues).toContain('4 straight sides');
  expect(clues).toContain('Each corner fits exactly over the corner of a sheet of paper');
  const lengths = Array.from(clues.matchAll(/(\d+) cm\b/g), m => Number(m[1]));
  expect(lengths).toHaveLength(4);
  expect(lengths.every(n => n > 0)).toBe(true);
  expect(lengths.slice(0, 2)).toEqual(lengths.slice(2));
  return new Set(lengths).size === 1 ? 'square' : 'rectangle';
}

// Rebuild the boundary from its visible segments; a grid intersection on a straight run is not a corner.
function cornersOf(pic: GridDrawingPicture): number {
  const adjacent = new Map<string, GridPoint[]>();
  function link(p: GridPoint, q: GridPoint) {
    expect(p[0]).toBeGreaterThanOrEqual(0);
    expect(p[0]).toBeLessThanOrEqual(pic.columns);
    expect(p[1]).toBeGreaterThanOrEqual(0);
    expect(p[1]).toBeLessThanOrEqual(pic.rows);
    const k = p.join(',');
    adjacent.set(k, [...(adjacent.get(k) ?? []), q]);
  }
  for (const [a, b] of pic.segments) {
    expect(a).not.toEqual(b);
    link(a, b); link(b, a);
  }
  for (const neighbours of adjacent.values()) expect(neighbours).toHaveLength(2);
  let p = pic.segments[0][0], previous = '', count = 0;
  const start = p.join(','), visited = new Set<string>();
  while (!visited.has(p.join(','))) {
    const k = p.join(',');
    visited.add(k);
    const [a, b] = adjacent.get(k)!;
    if ((a[0] - p[0]) * (b[1] - p[1]) !== (a[1] - p[1]) * (b[0] - p[0])) count++;
    p = a.join(',') === previous ? b : a;
    previous = k;
  }
  expect(p.join(',')).toBe(start);
  expect(visited.size).toBe(adjacent.size);
  expect([3, 4]).toContain(count);
  return count;
}

it('solves from the printed clues or drawn outline across seeds and indices', () => {
  const outcomes = new Set<string>();
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(q.choices).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      let expected: string;
      if (q.picture) {
        if (q.picture.type !== 'grid-drawing') throw Error('Expected a traceable outline');
        expect(q.prompt).toMatch(/how many corners/i);
        expected = String(cornersOf(q.picture));
      } else {
        expect(q.prompt).toMatch(/name.*one word/i);
        expected = nameFromClues((q.context ?? []).join(' '));
      }
      outcomes.add(expected);
      expect(q.answer).toBe(expected);
    }
  }
  expect([...outcomes].sort()).toEqual(['3', '4', 'rectangle', 'square', 'triangle']);
});

it('reproduces the same exercise for the same seed and index', () => {
  expect(makeRagQuestion(52)).toEqual(makeRagQuestion(52, 0));
  expect(makeRagQuestion(91, 4)).toEqual(makeRagQuestion(91, 4));
});
