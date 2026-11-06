import { expect, it } from 'vitest';
import type { Question } from '../generate';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragShapeSortingRule';

type ShapeMark = Extract<Batch11UpperMark, {kind: 'circle' | 'path'}>;

// Infer each tile's features from its drawn outline, dimensions and fill.
function readTile(mark: ShapeMark) {
  expect(['white', 'royalblue']).toContain(mark.fill);
  const colour = mark.fill!;
  if (mark.kind === 'circle') {
    expect(mark.r).toBeGreaterThan(0);
    return {shape: 'circle', size: 2 * mark.r, colour, x: mark.cx, y: mark.cy};
  }
  const points = Array.from(mark.d.matchAll(/[ML]\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)/g),
    match => [Number(match[1]), Number(match[2])]);
  expect(mark.d.trim().endsWith('Z')).toBe(true);
  expect([3, 4]).toContain(points.length);
  expect(new Set(points.map(p => p.join(','))).size).toBe(points.length);
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const left = Math.min(...xs), top = Math.min(...ys);
  const size = Math.max(...xs) - left;
  expect(size).toBeGreaterThan(0);
  expect(Math.max(...ys) - top).toBe(size);
  if (points.length === 4) {
    expect(new Set(xs).size).toBe(2);
    expect(new Set(ys).size).toBe(2);
  } else {
    const [a, b, c] = points;
    expect((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])).not.toBe(0);
  }
  return {shape: points.length === 3 ? 'triangle' : 'square', size, colour,
    x: left + size / 2, y: top + size / 2};
}

function readRows(q: Question) {
  const picture = q.picture;
  if (picture?.type !== 'batch11-upper') throw Error('Expected a drawing of the sets');
  const tiles = picture.marks.flatMap(m => m.kind === 'path' || m.kind === 'circle' ? [readTile(m)] : []);
  const dividers = picture.marks.flatMap(m => m.kind === 'line' ? [m.y1] : []).sort((a, b) => a - b);
  const bounds = [0, ...dividers, 200];
  const rows = bounds.slice(1).map((bottom, i) => {
    const top = bounds[i];
    const labels = picture.marks.flatMap(m => m.kind === 'text' && m.y > top && m.y < bottom ? [m.text] : []);
    expect(labels).toHaveLength(1);
    const pieces = tiles.filter(t => t.y > top && t.y < bottom).sort((a, b) => a.x - b.x);
    expect([3, 5]).toContain(pieces.length);
    let right = 0;
    for (const t of pieces) {
      expect(t.x - t.size / 2).toBeGreaterThan(right);
      right = t.x + t.size / 2;
      expect(right).toBeLessThan(320);
      expect(t.y - t.size / 2).toBeGreaterThan(top);
      expect(t.y + t.size / 2).toBeLessThan(bottom);
    }
    return {label: labels[0], pieces};
  });
  expect(new Set(rows.map(row => row.pieces.length)).size).toBe(1);
  expect(rows.flatMap(row => row.pieces)).toHaveLength(tiles.length);
  return rows;
}

const features = ['shape', 'size', 'colour'] as const;
type Row = ReturnType<typeof readRows>[number];
const values = (row: Row, f: typeof features[number]) => new Set(row.pieces.map(tile => tile[f]));

it('solves every response from the pictured rows', () => {
  const forms = new Set<string>();
  const letters = new Set<string>();
  for (let seed = -4; seed < 28; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const rows = readRows(q);
      if (rows.length === 4) {
        const matches = rows.filter(row => values(row, 'shape').size === 1);
        expect(matches).toHaveLength(1);
        const winner = matches[0];
        expect(values(winner, 'size').size).toBe(2);
        expect(values(winner, 'colour').size).toBe(2);
        expect(rows.map(row => row.label)).toEqual(['A', 'B', 'C', 'D']);
        expect(q.choices).toEqual(rows.map(row => row.label));
        expect(q.answer).toBe(winner.label);
        letters.add(winner.label);
        forms.add('find');
        continue;
      }
      expect(rows.map(row => row.label)).toEqual(['A', 'B']);
      const rules = features.filter(f => {
        const a = values(rows[0], f), b = values(rows[1], f);
        return a.size === 1 && b.size === 1 && !b.has([...a][0]);
      });
      for (const f of features.filter(f => !rules.includes(f))) {
        expect(values(rows[0], f)).toEqual(values(rows[1], f));
      }
      if (rules.length === 1) {
        expect(q.structuredResponse).toBeUndefined();
        expect(new Set(q.choices)).toEqual(new Set(features));
        expect(q.answer).toBe(rules[0]);
      } else {
        expect(rules).toHaveLength(2);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw Error('Expected two word selections');
        expect(new Set(spec.options)).toEqual(new Set(features));
        for (const order of [rules, rules.slice().reverse()]) {
          expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(order))).toBe(true);
        }
        const unused = features.find(f => !rules.includes(f));
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([rules[0], unused]))).toBe(false);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([rules[0], rules[0]]))).toBe(false);
      }
      forms.add(rules.join('+'));
    }
  }
  expect(forms).toEqual(new Set(['find', 'shape', 'size', 'shape+size', 'shape+colour', 'size+colour']));
  expect(letters).toEqual(new Set(['A', 'B', 'C', 'D']));
});

it('reproduces the full question for the same seed and index', () => {
  for (const seed of [0, 17, 203]) {
    for (let i = 0; i < 4; i++) expect(makeRagQuestion(seed, i)).toEqual(makeRagQuestion(seed, i));
  }
});
