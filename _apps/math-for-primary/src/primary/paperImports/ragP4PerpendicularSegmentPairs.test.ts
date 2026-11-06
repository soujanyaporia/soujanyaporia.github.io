import { describe, expect, it } from 'vitest';
import type { GridPoint as Point, GridSegment as Segment } from '../gridDrawingModel';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP4PerpendicularSegmentPairs';

// Work only from the strokes, end letters and reference line the pupil sees.
function side([a, b]: Segment, p: Point) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function matchingPairs(lines: Segment[]): [number, number][] {
  const pairs: [number, number][] = [];
  lines.forEach(([a, b], i) => {
    expect(a).not.toEqual(b);
    for (let j = i + 1; j < lines.length; j++) {
      const [c, d] = lines[j];
      const dot = (b[0] - a[0]) * (d[0] - c[0]) + (b[1] - a[1]) * (d[1] - c[1]);
      const meet = side([a, b], c) * side([a, b], d) <= 0 && side([c, d], a) * side([c, d], b) <= 0;
      if (dot === 0 && meet) pairs.push([i, j]);
    }
  });
  return pairs;
}

describe('perpendicular segments', () => {
  it('counts a crossing once and excludes a pair that would only meet after extension', () => {
    const lines: Segment[] = [[[0, 1], [4, 1]], [[2, 0], [2, 2]], [[5, 0], [5, 2]]];
    expect(matchingPairs(lines)).toEqual([[0, 1]]);
  });

  it('solves all four response forms from their visible diagrams', () => {
    const forms = new Set<string>(), counts = new Set<number>();
    for (let seed = 0; seed < 48; seed++) {
      for (let index = 0; index < 4; index++) {
        const q = makeRagQuestion(seed, index), p = q.picture;
        if (p?.type === 'batch10-middle' && p.layout === 'line-options') {
          forms.add('figure');
          const valid = p.options.filter(o => matchingPairs(o.segments).length > 0);
          expect(valid).toHaveLength(1);
          expect(q.choices).toEqual(p.options.map(o => o.label));
          expect(q.answer).toBe(valid[0].label);
        } else if (p?.type === 'grid-drawing') {
          forms.add('count');
          const dark = p.givenSegments ?? [];
          expect(dark.length).toBeGreaterThan(3);
          const count = matchingPairs(dark).length;
          counts.add(count);
          expect(q.choices).toBeUndefined();
          expect(q.answer).toBe(String(count));
          expect(q.unit).toBe('pairs');
        } else if (p?.type === 'batch11-upper') {
          const labels = p.marks.filter(m => m.kind === 'text');
          const strokes: Segment[] = p.marks.flatMap((m): Segment[] =>
            m.kind === 'line' ? [[[m.x1, m.y1], [m.x2, m.y2]]] : []);
          const readLetter = ([x, y]: Point) => {
            const distance = (l: (typeof labels)[number]) => Math.hypot(l.x + 5 - x, l.y - 5 - y);
            const nearest = [...labels].sort((a, b) => distance(a) - distance(b));
            expect(nearest.length).toBeGreaterThan(1);
            expect(distance(nearest[0])).toBeLessThan(distance(nearest[1]));
            return nearest[0].text;
          };
          const names = strokes.map(([a, b]) => readLetter(a) + readLetter(b));
          expect(new Set(names.join('')).size).toBe(10);
          const pairs = matchingPairs(strokes);
          expect(pairs).toHaveLength(1);
          const pair = pairs[0].map(i => names[i]);
          if (q.structuredResponse?.kind === 'named-pair') {
            forms.add('pair');
            expect([...q.structuredResponse.options].sort()).toEqual([...names].sort());
            expect(JSON.parse(q.answer).sort()).toEqual([...pair].sort());
            const score = (value: string[]) => structuredResponseCorrect(q.structuredResponse!, q.answer, JSON.stringify(value));
            expect(score(pair)).toBe(true);
            expect(score([pair[1], pair[0]])).toBe(true);
            expect(score([pair[0], pair[0]])).toBe(false);
            expect(score([pair[0], names.find(n => !pair.includes(n))!])).toBe(false);
          } else {
            forms.add('partner');
            const ref = q.prompt.match(/\b([A-Z]{2})\?$/)?.[1];
            expect(pair).toContain(ref);
            expect([...(q.choices ?? [])].sort()).toEqual(names.filter(n => n !== ref).sort());
            expect(q.answer).toBe(pair.find(n => n !== ref));
          }
        } else {
          throw new Error('Expected a diagram with visible segments');
        }
      }
    }
    expect(forms.size).toBe(4);
    expect([...counts].sort()).toEqual([3, 4, 5]);
  });

  it('reproduces the drawing and the response for the same seed and index', () => {
    for (const seed of [-17, 0, 24]) {
      for (let index = 0; index < 4; index++) {
        expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      }
    }
  });
});
