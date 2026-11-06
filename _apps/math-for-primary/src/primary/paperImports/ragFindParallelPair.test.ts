import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragFindParallelPair';

function readDiagram(picture: Question['picture']) {
  if (picture?.type !== 'batch11-upper') throw new Error('Missing labelled diagram');
  const letters = picture.marks.filter(m => m.kind === 'text');
  function atEndpoint(x: number, y: number) {
    // Read the nearest printed letter regardless of the order in which the marks were drawn.
    const sorted = letters.map(t => ({ name: t.text, distance: Math.hypot(t.x + 6 - x, t.y - 6 - y) }))
      .sort((a, b) => a.distance - b.distance);
    expect(sorted[0].distance).toBeLessThan(20);
    expect(sorted[1].distance).toBeGreaterThan(sorted[0].distance + 2);
    return sorted[0].name;
  }
  const segments = picture.marks.filter(m => m.kind === 'line').map(m => ({
    name: atEndpoint(m.x1, m.y1) + atEndpoint(m.x2, m.y2),
    x: m.x1, y: m.y1, dx: m.x2 - m.x1, dy: m.y2 - m.y1,
  }));
  expect(new Set(segments.flatMap(s => s.name.split(''))).size).toBe(letters.length);
  const pairs = segments.flatMap((a, i) => segments.slice(i + 1).map(b => {
    const sameDirection = a.dx * b.dy === a.dy * b.dx;
    const differentLine = a.dx * (b.y - a.y) !== a.dy * (b.x - a.x);
    return { names: [a.name, b.name].sort(), parallel: sameDirection && differentLine };
  }));
  return { names: segments.map(s => s.name), pairs, marks: picture.marks };
}

it('finds exactly one pair from the visible strokes and grades both line names', () => {
  const formats = new Set<string>();
  for (let seed = 1; seed <= 64; seed++) {
    for (const index of [0, 1, 4]) {
      const q = makeRagQuestion(seed, index);
      const { names, pairs, marks } = readDiagram(q.picture);
      const matches = pairs.filter(p => p.parallel);
      expect(matches).toHaveLength(1);
      const expected = matches[0].names;
      if (q.choices) {
        formats.add('crossing');
        expect(names).toHaveLength(5);
        expect(new Set(q.choices).size).toBe(4);
        for (const choice of q.choices) {
          expect(pairs.some(p => p.names.join(' and ') === choice)).toBe(true);
        }
        expect(q.choices.filter(c => c === expected.join(' and '))).toHaveLength(1);
        expect(q.answer).toBe(expected.join(' and '));
      } else {
        const spec = q.structuredResponse;
        if (spec?.kind !== 'named-pair') throw new Error('Missing two-name control');
        expect([...spec.options].sort()).toEqual([...names].sort());
        for (const pair of pairs) {
          for (const selection of [pair.names, [...pair.names].reverse()]) {
            expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(selection))).toBe(pair.parallel);
          }
        }
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([expected[0], expected[0]]))).toBe(false);
        if (marks.some(m => m.kind === 'circle')) {
          formats.add('grid');
          expect(names).toHaveLength(3);
        } else {
          formats.add('shape');
          expect(names).toHaveLength(4);
          expect(marks.filter(m => m.kind === 'path')).toHaveLength(2);
        }
      }
    }
  }
  expect([...formats].sort()).toEqual(['crossing', 'grid', 'shape']);
});

it('repeats a seed and index exactly and varies the actual line geometry', () => {
  const drawings = new Set<string>();
  for (let index = 0; index < 24; index++) {
    const q = makeRagQuestion(81, index);
    expect(q).toEqual(makeRagQuestion(81, index));
    const { marks } = readDiagram(q.picture);
    drawings.add(JSON.stringify(marks.filter(m => m.kind === 'line')));
  }
  expect(drawings.size).toBeGreaterThan(8);
});
