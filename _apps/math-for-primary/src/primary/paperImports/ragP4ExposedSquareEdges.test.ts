import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4ExposedSquareEdges';

function readLength(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing measurement in ${text}`);
  return Number(match[1]);
}

// Trace each drawn square one pixel at a time. An edge visited by two
// tiles is inside the shape, even if only part of a side is shared.
function trace(paths: string[]) {
  const outside = new Set<string>();
  function toggle(key: string) {
    if (!outside.delete(key)) outside.add(key);
  }
  const tiles = paths.map(path => {
    const match = /^M (\d+) (\d+) h (\d+) v (\d+) h -(\d+) Z$/.exec(path);
    if (!match) throw new Error('Expected a closed square');
    const [x, y, size, down, back] = match.slice(1).map(Number);
    expect([down, back]).toEqual([size, size]);
    for (let step = 0; step < size; step++) {
      toggle(`H ${x + step} ${y}`);
      toggle(`H ${x + step} ${y + size}`);
      toggle(`V ${x} ${y + step}`);
      toggle(`V ${x + size} ${y + step}`);
    }
    return { x, y, size };
  });
  expect(tiles.length).toBeGreaterThan(1);
  expect(new Set(tiles.map(tile => tile.size)).size).toBe(1);
  return { tiles, pixels: outside.size };
}

function solve(q: Question): [string, number] {
  const clue = q.context?.join(' ') ?? '';
  const p = q.picture;
  if (!p) {
    if (clue.includes('A row of')) {
      const n = readLength(clue, /row of (\d+) equal square tiles/);
      const s = readLength(clue, /sides (\d+) cm/);
      return ['row', 2 * (n * s + s)];
    }
    expect(clue).toContain('Two equal square tiles share a whole side');
    const perimeter = readLength(clue, /perimeter .* is (\d+) cm/);
    return ['inverse', perimeter / (2 * (2 + 1))];
  }
  if (p.type !== 'batch11-upper') throw new Error('Missing tile diagram');
  const { pixels, tiles } = trace(p.marks.flatMap(m => m.kind === 'path' ? [m.d] : []));
  const size = tiles[0].size;
  const labels = p.marks.flatMap(m => m.kind === 'text' ? [m.text] : []);
  if (!labels.length) {
    return ['given side', pixels * readLength(clue, /sides (\d+) cm/) / size];
  }

  expect(labels).toHaveLength(1);
  const cm = readLength(labels[0], /^(\d+) cm$/);
  const bars = p.marks.flatMap(m => m.kind === 'line' ? [m] : []);
  const length = (b: typeof bars[number]) => Math.abs(b.x2 - b.x1) + Math.abs(b.y2 - b.y1);
  const bar = bars.sort((a, b) => length(b) - length(a))[0];
  if (!bar) throw new Error('Missing dimension mark');
  if (bar.x1 === bar.x2) {
    const left = Math.min(...tiles.map(t => t.x));
    const column = tiles.filter(t => t.x === left);
    expect(bar.x1).toBeLessThan(left);
    expect(bar.y1).toBe(Math.min(...column.map(t => t.y)));
    expect(bar.y2).toBe(Math.max(...column.map(t => t.y + size)));
    expect(length(bar)).toBe(column.length * size);
    return ['span', pixels * cm / length(bar)];
  }

  expect(tiles).toHaveLength(2);
  const [upper, lower] = tiles.sort((a, b) => a.y - b.y);
  const s = readLength(clue, /sides (\d+) cm/);
  expect(lower.y).toBe(upper.y + size);
  expect([bar.x1, bar.x2]).toEqual([upper.x, lower.x]);
  expect(bar.y1).toBe(bar.y2);
  expect(cm).toBeGreaterThan(0);
  expect(cm).toBeLessThan(s);
  expect(length(bar) * s).toBe(cm * size);
  // Six whole sides and two ledges of the labelled length.
  const perimeter = 6 * s + 2 * cm;
  expect(pixels * s / size).toBe(perimeter);
  return ['partial side', perimeter];
}

it('solves each response from the displayed tiles and lengths', () => {
  const forms = new Set<string>();
  for (let seed = 0; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const [form, value] = solve(q);
      forms.add(form);
      expect(Number.isSafeInteger(value) && value > 0).toBe(true);
      if (form === 'partial side') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(`${value} cm`);
        expect(q.answer).toBe(`${value} cm`);
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('cm');
        expect(q.answer).toBe(String(value));
      }
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(3);
    }
  }
  expect(forms).toEqual(new Set(['row', 'inverse', 'given side', 'span', 'partial side']));
});

it('replays a seed and varies what the pupil sees across indices', () => {
  const displays = new Set<string>();
  for (let i = 0; i < 24; i++) {
    const q = makeRagQuestion(43, i);
    expect(makeRagQuestion(43, i)).toEqual(q);
    displays.add(JSON.stringify([q.prompt, q.context, q.picture]));
  }
  expect(displays.size).toBeGreaterThan(8);
});
