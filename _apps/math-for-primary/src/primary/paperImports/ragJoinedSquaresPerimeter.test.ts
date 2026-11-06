import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragJoinedSquaresPerimeter';

function traceOutside(q: Question) {
  const pic = q.picture;
  if (pic?.type !== 'batch11-upper') throw new Error('Missing diagram');
  const lines = pic.marks.flatMap(m => m.kind === 'line' ? [m] : []);
  const labels = pic.marks.flatMap(m => m.kind === 'text' ? [m] : []).sort((a, b) => a.x - b.x);
  expect(labels).toHaveLength(2);
  const [big, small] = labels.map(label => {
    const cm = /^(\d+) cm$/.exec(label.text);
    if (!cm) throw new Error('Side label must be a length in cm');
    return Number(cm[1]);
  });
  expect(big).toBeGreaterThan(small);
  expect(small).toBeGreaterThan(0);
  const xs = [...new Set(lines.flatMap(l => [l.x1, l.x2]))].sort((a,b) => a-b);
  expect(xs).toHaveLength(3);
  const [left, join, right] = xs;
  const base = Math.max(...lines.flatMap(l => [l.y1, l.y2]));
  const pxPerCm = (join-left)/big;
  expect((right-join)/pxPerCm).toBeCloseTo(small);
  const top = base - (join-left), step = base - (right-join);
  expect(labels[0].x).toBeGreaterThan(left);
  expect(labels[0].x).toBeLessThan(join);
  expect(labels[0].y).toBeLessThan(top);
  expect(labels[1].x).toBeGreaterThan(right);
  expect(labels[1].y).toBeGreaterThan(step);
  expect(labels[1].y).toBeLessThan(base);

  // Walk the outline using the three x positions and the two square heights.
  // Match each step to an actual drawn line, allowing either endpoint order.
  const near = (a: number, b: number) => Math.abs(a-b) < 1e-6;
  function edge(x: number, y: number, u: number, v: number) {
    const matches = lines.filter(l =>
      (near(l.x1,x) && near(l.y1,y) && near(l.x2,u) && near(l.y2,v)) ||
      (near(l.x2,x) && near(l.y2,y) && near(l.x1,u) && near(l.y1,v)));
    expect(matches).toHaveLength(1);
    return Math.hypot(matches[0].x2-matches[0].x1, matches[0].y2-matches[0].y1)/pxPerCm;
  }
  const corners = [[left,base],[left,top],[join,top],[join,step],[right,step],[right,base]];
  const measured = corners.reduce((sum, [x,y], i) => {
    const [u,v] = corners[(i+1) % corners.length];
    return sum + edge(x,y,u,v);
  }, 0);
  expect(lines).toHaveLength(7);
  expect(edge(join, step, join, base)).toBeCloseTo(small);
  expect(measured).toBeCloseTo(Math.round(measured));
  return { expected: `${Math.round(measured)} cm`, pair: `${big}:${small}` };
}

it('offers exactly one length equal to the traced outer boundary', () => {
  const pairs = new Set<string>();
  for (let seed = -8; seed <= 16; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { expected, pair } = traceOutside(q);
      pairs.add(pair);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices?.every(s => /^\d+ cm$/.test(s))).toBe(true);
      expect(q.choices).toContain(expected);
      expect(q.answer).toBe(expected);
    }
  }
  expect(pairs.size).toBeGreaterThan(8);
  expect(pairs.has('8:5')).toBe(false);
});

it('replays the same diagram, choices and working for the same inputs', () => {
  expect(makeRagQuestion(27, 3)).toEqual(makeRagQuestion(27, 3));
});
