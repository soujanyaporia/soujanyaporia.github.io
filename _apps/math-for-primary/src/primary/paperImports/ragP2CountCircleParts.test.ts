import {expect, it} from 'vitest';
import type {Batch11UpperMark} from './batch11UpperPicture';
import {makeRagQuestion} from './ragP2CountCircleParts';

// Recover the arc angle from its drawn chord, radii and SVG large-arc flag.
function arcQuarters(d: string) {
  const tokens = d.split(' ');
  expect([tokens[0], tokens[3], tokens.at(-1)]).toEqual(['M', 'A', 'Z']);
  const [x, y] = tokens.slice(1, 3).map(Number);
  const [rx, ry, rotation, large, sweep, endX, endY] = tokens.slice(4, 11).map(Number);
  expect(rx).toBeGreaterThan(0);
  expect(ry).toBe(rx);
  expect(rotation).toBe(0);
  expect([0, 1]).toContain(large);
  expect(sweep).toBe(1);
  const chord = Math.hypot(endX - x, endY - y);
  const minor = 2 * Math.asin(chord / (2 * rx));
  const angle = large ? 2 * Math.PI - minor : minor;
  const units = angle / (Math.PI / 2);
  const quarters = Math.round(units);
  expect(units).toBeCloseTo(quarters);
  expect([1, 2, 3]).toContain(quarters);
  if (quarters === 2) {
    expect(tokens.slice(11)).toEqual(['Z']);
  } else {
    expect(tokens[11]).toBe('L');
    expect(tokens).toHaveLength(15);
    const [cx, cy] = tokens.slice(12, 14).map(Number);
    expect(Math.hypot(x - cx, y - cy)).toBeCloseTo(rx);
    expect(Math.hypot(endX - cx, endY - cy)).toBeCloseTo(rx);
    const cross = (x - cx) * (endY - cy) - (y - cy) * (endX - cx);
    expect(Math.sign(cross)).toBe(quarters === 1 ? 1 : -1);
  }
  return quarters;
}

function visibleCounts(marks: Batch11UpperMark[]) {
  const pieces: number[] = [];
  for (const mark of marks) {
    if (mark.kind === 'circle') pieces.push(4);
    if (mark.kind === 'path' && mark.d.includes(' A ')) pieces.push(arcQuarters(mark.d));
  }
  return pieces;
}

it('recovers one choice from the geometry and the requested counting rule', () => {
  const halfTotals = new Set<number>();
  const quarterTotals = new Set<number>();
  for (let seed = -12; seed < 36; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      if (q.picture?.type !== 'batch11-upper') throw Error('Missing geometry');
      const pieces = visibleCounts(q.picture.marks);
      let expected: number;
      if (q.prompt.includes('semicircles')) {
        expect(pieces).toContain(1);
        expect(pieces).toContain(4);
        expected = pieces.filter(size => size === 2).length;
        halfTotals.add(expected);
      } else {
        expect(q.prompt).toContain('quarter circles');
        expect(pieces).toContain(3);
        expect(pieces).toContain(4);
        expected = pieces.reduce((sum, n) => sum + n, 0);
        quarterTotals.add(expected);
      }
      expect(q.answer).toBe(String(expected));
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices?.filter(choice => Number(choice) === expected)).toHaveLength(1);
    }
  }
  expect(halfTotals.size).toBeGreaterThan(2);
  expect(quarterTotals.size).toBeGreaterThan(2);
});

it('reproduces each diagram and varies the visible geometry within a seed', () => {
  const pictures = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(42, index);
    expect(makeRagQuestion(42, index)).toEqual(q);
    pictures.add(JSON.stringify(q.picture));
  }
  expect(pictures.size).toBeGreaterThan(4);
});
