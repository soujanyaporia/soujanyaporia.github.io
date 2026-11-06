import {expect, it} from 'vitest';
import {makeRagQuestion} from './ragTallyAnglesByType';
import type {Point} from './p3RafflesPicture';

// Measure the interior sweep from the two ray directions. Winding selects
// the opening inside the outline, even when that is the longer sweep.
function interiorDegrees(points: Point[]): number[] {
  const twiceArea = points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return sum + x * ny - y * nx;
  }, 0);
  expect(twiceArea).not.toBe(0);
  const degrees = points.map(([x, y], i) => {
    const [px, py] = points[(i + points.length - 1) % points.length];
    const [nx, ny] = points[(i + 1) % points.length];
    const back = Math.atan2(py - y, px - x);
    const ahead = Math.atan2(ny - y, nx - x);
    return ((back - ahead) * Math.sign(twiceArea) * 180 / Math.PI + 360) % 360;
  });
  expect(new Set(points.map(p => p.join(','))).size).toBe(points.length);
  expect(degrees.reduce((sum, d) => sum + d, 0)).toBeCloseTo((points.length - 2) * 180, 7);
  return degrees;
}

const eps = 1e-7;
const acute = (d: number) => d > eps && d < 90 - eps;
const obtuse = (d: number) => d > 90 + eps && d < 180 - eps;

it('solves the requested tallies from the drawn outline, marks and prompt', () => {
  const results = {wide: new Set<string>(), obtuse: new Set<string>(), pair: new Set<string>()};
  for (let seed = -10; seed < 110; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const pic = q.picture;
      if (pic?.type === 'raffles-p3' && pic.layout === 'angle-polygon') {
        const openings = interiorDegrees(pic.points);
        // Rigid rotation of the whole drawing preserves the openings.
        const marked = pic.angles.map(a => openings[a.vertex]);
        expect(q.prompt).toMatch(/obtuse angles first and acute angles second/);
        expect(new Set(pic.angles.map(a => a.vertex)).size).toBe(marked.length);
        expect(new Set(pic.angles.map(a => a.label)).size).toBe(marked.length);
        expect(marked.every(d => d > eps && d < 180 - eps)).toBe(true);
        expect(marked.some(d => Math.abs(d - 90) < eps)).toBe(true);
        const o = marked.filter(obtuse).length, a = marked.filter(acute).length;
        expect(Math.min(o, a)).toBeGreaterThan(0);
        expect(openings.filter(d => acute(d) || obtuse(d)).length).toBeGreaterThan(o + a);
        const expected = `${o} obtuse, ${a} acute`;
        expect(q.answer).toBe(expected);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
        results.pair.add(expected);
      } else if (pic?.type === 'batch10-middle' && pic.layout === 'concave-polygon') {
        const openings = interiorDegrees(pic.points);
        expect(openings.some(d => d > 180 + eps)).toBe(true);
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        const asksObtuse = q.prompt.includes('obtuse');
        if (!asksObtuse) expect(q.prompt).toMatch(/wider than a right angle/);
        const expected = String(openings.filter(asksObtuse ? obtuse : d => d > 90 + eps).length);
        expect(q.answer).toBe(expected);
        results[asksObtuse ? 'obtuse' : 'wide'].add(expected);
      } else {
        throw new Error('Expected a visible angle diagram');
      }
    }
  }
  for (const answers of Object.values(results)) expect(answers.size).toBeGreaterThan(1);
});

it('replays a seed and varies the visible exercise across indices', () => {
  const diagrams = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(47, index);
    expect(makeRagQuestion(47, index)).toEqual(q);
    diagrams.add(JSON.stringify(q.picture));
  }
  expect(diagrams.size).toBeGreaterThan(1);
});
