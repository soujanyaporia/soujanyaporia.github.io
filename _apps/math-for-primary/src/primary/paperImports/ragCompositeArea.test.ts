import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragCompositeArea';

function read(text: string, re: RegExp): number[] {
  const match = re.exec(text);
  if (!match) throw new Error(`Missing visible given: ${re}`);
  return match.slice(1).map(Number);
}

function area(points: [number, number][]): number {
  let twice = 0;
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i], [u, v] = points[(i + 1) % points.length];
    twice += x * v - y * u;
  }
  return Math.abs(twice) / 2;
}

// Only the prompt, context and displayed geometry enter the solution.
function solve(q: Pick<Question, 'prompt' | 'context' | 'picture'>) {
  const text = (q.context ?? []).join(' '), fig = q.picture;
  if (!fig) {
    const [length, breadth] = read(text, /(\d+) cm long and (\d+) cm wide/);
    const [left] = read(text, /left over has an area of (\d+) cm²/);
    expect(q.prompt).toMatch(/cut-out square/);
    // Try square patches that fit. Exactly one must leave the stated amount.
    const patches: number[] = [];
    for (let s = 1; s < Math.min(length, breadth); s++) {
      if (length * breadth === s * s + left) patches.push(s * s);
    }
    expect(left).toBeGreaterThan(0);
    expect(patches).toHaveLength(1);
    return { kind: 'cut-out', value: patches[0] };
  }
  if (fig.type === 'grid-drawing') {
    const [p] = read(text, /perimeter of (\d+) cm/);
    const [squareCount, longCount] = read(text, /(\d+) equal square tiles and (\d+) equal long tiles/);
    expect(p % 4).toBe(0);
    const ys = fig.segments.filter(([a,b]) => a[1] === b[1]).map(([a]) => a[1]).sort((a,b) => a-b);
    // Walk the actual horizontal bands and count the spaces between their joins.
    let squares = 0, strips = 0;
    const lengths = new Set<number>();
    for (let i = 1; i < ys.length; i++) {
      const top = ys[i-1], bottom = ys[i];
      expect(bottom - top).toBe(1);
      const xs = fig.segments.filter(([a,b]) => a[0] === b[0] && Math.min(a[1], b[1]) <= top && Math.max(a[1], b[1]) >= bottom)
        .map(([a]) => a[0]).sort((a,b) => a-b);
      expect([xs[0], xs.at(-1)]).toEqual([0, fig.columns]);
      for (let j = 1; j < xs.length; j++) {
        const span = xs[j] - xs[j-1];
        if (span === 1) squares++;
        else { expect(span).toBeGreaterThan(1); lengths.add(span); strips++; }
      }
    }
    expect([squares, strips, lengths.size]).toEqual([squareCount, longCount, 1]);
    expect(ys).toHaveLength(fig.rows + 1);
    // Measure the enclosing rectangle independently of the generator's tile-area sum.
    return { kind: 'tiles', value: fig.columns * (p / 4) * (ys.at(-1)! - ys[0]) * (p / 4) };
  }
  if (fig.type !== 'batch9-early' || fig.layout !== 'area-fraction') throw new Error('Missing shaded board');
  const [cm] = read(text, /sides of (\d+) cm/);
  const square = fig.pieces.find(piece => piece.kind === 'square');
  if (!square) throw new Error('No visible scale square');
  const cell = area(square.points);
  expect(cell).toBeGreaterThan(0);
  const shaded = !q.prompt.includes('unshaded');
  expect(q.prompt).toMatch(/unshaded|shaded patch/);
  let target = 0, all = 0;
  for (const piece of fig.pieces) {
    const a = area(piece.points);
    expect(a).toBeGreaterThan(0);
    if (piece.kind === 'square') expect(a).toBeCloseTo(cell);
    if (piece.shaded === shaded) target += a;
    all += a;
  }
  const vertices = fig.pieces.flatMap(p => p.points);
  const xs = vertices.map(p => p[0]), ys = vertices.map(p => p[1]);
  expect(all).toBeCloseTo((Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)));
  expect(target).toBeGreaterThan(0);
  expect(target).toBeLessThan(all);
  // Directly measure just the requested polygons, even for the unshaded question.
  return { kind: shaded ? 'shaded' : 'unshaded', value: target / cell * cm * cm };
}

it('recovers every area from the visible givens across seeds and all four tasks', () => {
  const seen = new Map<string, Set<string>>();
  for (let seed = -4; seed < 40; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const { kind, value } = solve(q);
      expect(Number.isSafeInteger(value)).toBe(true);
      expect(q.answer).toBe(String(value));
      expect(q.unit).toBe('cm²');
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.gridDrawing).toBeUndefined();
      expect(q.workedSteps?.length).toBeGreaterThanOrEqual(2);
      if (!seen.has(kind)) seen.set(kind, new Set());
      seen.get(kind)!.add(JSON.stringify([q.context, q.picture]));
    }
  }
  expect([...seen.keys()].sort()).toEqual(['cut-out', 'shaded', 'tiles', 'unshaded']);
  for (const cases of seen.values()) expect(cases.size).toBeGreaterThan(4);
});

it('recreates the same question from its seed and index', () => {
  for (let index = 0; index < 5; index++) {
    expect(makeRagQuestion(73, index)).toEqual(makeRagQuestion(73, index));
  }
});
