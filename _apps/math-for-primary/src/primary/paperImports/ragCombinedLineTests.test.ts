import { expect, test } from 'vitest';
import type { GridPoint as Point, GridSegment as Stroke } from '../gridDrawingModel';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import type { Batch11UpperMark } from './batch11UpperPicture';
import { makeRagQuestion } from './ragCombinedLineTests';

const delta = ([[x, y], [u, v]]: Stroke): Point => [u - x, v - y];
const cross = ([x, y]: Point, [u, v]: Point) => x * v - y * u;
const side = (s: Stroke, p: Point) => cross(delta(s), [p[0] - s[0][0], p[1] - s[0][1]]);

function parallel(a: Stroke, b: Stroke) {
  return cross(delta(a), delta(b)) === 0 && side(a, b[0]) !== 0;
}

function meetAtRightAngle(a: Stroke, b: Stroke) {
  const [x, y] = delta(a), [u, v] = delta(b);
  return x * u + y * v === 0
    && side(a, b[0]) * side(a, b[1]) <= 0
    && side(b, a[0]) * side(b, a[1]) <= 0;
}

function properties(strokes: Stroke[]) {
  const pairs = strokes.flatMap((s, i) => strokes.slice(i + 1).map(t => [s, t]));
  return {
    parallel: pairs.some(([s, t]) => parallel(s, t)),
    right: pairs.some(([s, t]) => meetAtRightAngle(s, t)),
  };
}

function drawnLines(marks: Batch11UpperMark[]): Stroke[] {
  return marks.flatMap((m): Stroke[] => m.kind === 'line' ? [[[m.x1, m.y1], [m.x2, m.y2]]] : []);
}

// Split a row of lettering at the blank horizontal gaps between glyphs.
function letterGroups(strokes: Stroke[]) {
  const left = (s: Stroke) => Math.min(s[0][0], s[1][0]);
  const groups: Stroke[][] = [];
  let right = -Infinity;
  for (const s of strokes.slice().sort((a, b) => left(a) - left(b))) {
    if (left(s) > right) groups.push([]);
    groups[groups.length - 1].push(s);
    right = Math.max(right, s[0][0], s[1][0]);
  }
  return groups;
}

function readNamedLines(marks: Batch11UpperMark[]) {
  const text = marks.filter((m): m is Extract<Batch11UpperMark, {kind: 'text'}> => m.kind === 'text');
  const nearest = ([x, y]: Point) => {
    const distance = (t: typeof text[number]) => Math.hypot(t.x - x, t.y - y);
    return text.slice().sort((a, b) => distance(a) - distance(b))[0].text;
  };
  const lines = new Map<string, Stroke>();
  for (const s of drawnLines(marks)) lines.set(nearest(s[0]) + nearest(s[1]), s);
  expect(new Set(text.map(t => t.text)).size).toBe(12);
  expect(lines.size).toBe(6);
  return lines;
}

test('solve each selection from the drawn sides, strokes or labelled endpoints', () => {
  const forms = new Set<string>();
  for (let seed = -8; seed < 32; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index), p = q.picture;
      if (p?.type === 'batch10-middle' && p.layout === 'line-options') {
        forms.add('shape');
        expect(p.options).toHaveLength(4);
        const results = p.options.map(o => ({ label: o.label, ...properties(o.segments) }));
        expect(q.choices).toEqual(p.options.map(o => o.label));
        expect(results.some(o => o.parallel && !o.right)).toBe(true);
        expect(results.some(o => !o.parallel && o.right)).toBe(true);
        const winners = results.filter(o => o.parallel && o.right);
        expect(winners).toHaveLength(1);
        expect(q.answer).toBe(winners[0].label);
      } else if (p?.type === 'batch11-upper' && q.structuredResponse?.kind === 'named-pair') {
        forms.add('letters');
        const spec = q.structuredResponse;
        const groups = letterGroups(drawnLines(p.marks));
        expect(groups).toHaveLength(6);
        expect(new Set(spec.options).size).toBe(6);
        const winners: string[] = [];
        groups.forEach((g, i) => {
          const result = properties(g);
          if (result.parallel && result.right) {
            // Among the pictured capitals, H, F and E have one, two and three crossbars.
            const bars = g.filter(s => delta(s)[1] === 0).length;
            const name = ['', 'H', 'F', 'E'][bars];
            expect(spec.options[i]).toBe(name);
            winners.push(name);
          }
        });
        expect(winners).toHaveLength(2);
        expect(JSON.parse(q.answer).sort()).toEqual([...winners].sort());
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify(winners))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([...winners].reverse()))).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([winners[0], winners[0]]))).toBe(false);
        const wrong = spec.options.find(name => !winners.includes(name));
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([winners[0], wrong]))).toBe(false);
      } else {
        if (p?.type !== 'batch11-upper') throw Error('Expected a labelled line diagram');
        const refs = /parallel to ([A-Z]{2}) and crosses ([A-Z]{2}) at a right angle/.exec(q.prompt);
        if (!refs || !q.choices) throw Error('Missing reference or choices');
        const lines = readNamedLines(p.marks);
        const first = lines.get(refs[1]), second = lines.get(refs[2]);
        if (!first || !second) throw Error('A reference has no drawn endpoints');
        forms.add(delta(first)[0] === 0 ? 'vertical reference' : 'horizontal reference');
        expect(meetAtRightAngle(first, second)).toBe(true);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).not.toContain(refs[1]);
        expect(q.choices).not.toContain(refs[2]);
        const winners = q.choices.filter(name => {
          const s = lines.get(name);
          if (!s) throw Error('A choice has no drawn endpoints');
          return parallel(s, first) && meetAtRightAngle(s, second);
        });
        expect(winners).toHaveLength(1);
        expect(q.answer).toBe(winners[0]);
      }
    }
  }
  expect(forms).toEqual(new Set(['shape', 'letters', 'vertical reference', 'horizontal reference']));
});

test('a seed and index reproduce the same board, and a session varies the visible givens', () => {
  for (const seed of [0, 41, -17]) {
    const pictures = new Set<string>();
    for (let index = 0; index < 12; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      expect(q.workedSteps!.length).toBeGreaterThanOrEqual(2);
      pictures.add(JSON.stringify(q.picture));
    }
    expect(pictures.size).toBeGreaterThanOrEqual(8);
  }
});
