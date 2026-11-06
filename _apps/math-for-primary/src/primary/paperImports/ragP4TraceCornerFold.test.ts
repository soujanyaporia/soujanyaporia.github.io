import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4TraceCornerFold';

// t is the angle from OB to the crease. Reflection puts OM at twice t.
// This model uses the named rays in the question, independently of the picture code.
function opening(name: string, t: number) {
  const rays: Record<string, number> = { A: 90, B: 0, F: t, M: 2 * t };
  if (!/^[ABFM]O[ABFM]$/.test(name)) throw new Error('Unexpected angle ' + name);
  return Math.abs(rays[name[0]] - rays[name[2]]);
}

function visibleGiven(q: Question) {
  return (q.context ?? []).join(' ').match(/∠([ABFM]O[ABFM]) is (\d+)°\./);
}

function solve(q: Question): string {
  const given = visibleGiven(q);
  let tilt: number | undefined;
  if (given) {
    const atZero = opening(given[1], 0);
    tilt = (Number(given[2]) - atZero) / (opening(given[1], 1) - atZero);
    expect(tilt).toBeGreaterThan(0);
    expect(tilt).toBeLessThan(45);
  }
  const numeric = /^How large is ∠(\w{3})\?$/.exec(q.prompt);
  if (numeric) {
    if (tilt === undefined) throw new Error('Missing angle clue');
    const size = opening(numeric[1], tilt);
    return q.choices ? `${size}°` : String(size);
  }
  const measure = /“∠(\w{3}) is (\d+)°\.”/.exec(q.prompt);
  const pair = /“∠(\w{3}) and ∠(\w{3}) are equal\.”/.exec(q.prompt);
  if (!measure && !pair) throw new Error('Unreadable claim');
  expect(q.context?.join(' ')).toContain('square');
  const difference = (t: number) => measure ? opening(measure[1], t) - Number(measure[2])
    : opening(pair![1], t) - opening(pair![2], t);
  if (tilt !== undefined) return difference(tilt) === 0 ? 'Must be true' : 'Cannot be true';
  // F can be anywhere strictly inside the opposite edge of a square.
  // On 0 < t < 45 the order of the rays is fixed, so the difference is linear.
  const low = difference(0);
  const high = difference(45);
  if (low === 0 && high === 0) return 'Must be true';
  return low * high < 0 ? 'Need more information' : 'Cannot be true';
}

test('the visible clues determine the keyed response, including when a claim needs another clue', () => {
  const forms = new Set<string>();
  const measureVerdicts = new Set<string>();
  const equalityVerdicts = new Set<string>();
  const entrySizes = new Set<string>();
  for (let seed = 0; seed < 96; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const result = solve(q);
      expect(q.answer).toBe(result);
      if (q.choices) {
        expect(q.choices.filter(option => option === result)).toHaveLength(1);
        expect(new Set(q.choices).size).toBe(q.choices.length);
      }
      if (q.prompt.startsWith('How large')) {
        forms.add(q.prompt + (q.choices ? ' choice' : ' entry'));
        if (!q.choices) {
          expect(q.unit).toBe('°');
          entrySizes.add(result);
        }
      } else {
        (q.prompt.includes('are equal') ? equalityVerdicts : measureVerdicts).add(result);
      }
    }
  }
  expect(forms.size).toBe(3);
  expect(entrySizes.size).toBeGreaterThan(5);
  const verdicts = new Set(['Must be true', 'Cannot be true', 'Need more information']);
  expect(measureVerdicts).toEqual(verdicts);
  expect(equalityVerdicts).toEqual(verdicts);
});

test('the drawn flap is the reflection of the corner, and each printed measure fits its rays', () => {
  for (let seed = 0; seed < 96; seed++) {
    const q = makeRagQuestion(seed, 2);
    const pic = q.picture;
    if (pic?.type !== 'batch11-upper') throw new Error('Missing fold diagram');
    expect(pic.marks.filter(m => m.kind === 'text').map(m => m.text).sort()).toEqual(['A', 'B', 'F', 'M', 'O']);
    const crease = pic.marks.find(m => m.kind === 'line' && m.dashed);
    const flap = pic.marks.find(m => m.kind === 'path' && m.fill);
    const border = pic.marks.find(m => m.kind === 'path' && m.d.includes(' H '));
    if (crease?.kind !== 'line' || flap?.kind !== 'path' || border?.kind !== 'path') throw new Error('Incomplete drawing');
    const coords = (path: string) => path.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    const [ox, oy, mx, my, fx, fy] = coords(flap.d);
    const [left, bottom, right, top] = coords(border.d);
    expect([ox, oy, fx, fy]).toEqual([crease.x1, crease.y1, crease.x2, crease.y2]);
    expect([ox, oy, fx]).toEqual([left, bottom, right]);
    expect(fy).toBeGreaterThanOrEqual(top);
    expect(fy).toBeLessThan(bottom);
    const width = right - left;
    if (q.context?.join(' ').includes('square')) expect(bottom - top).toBeCloseTo(width, 9);
    expect(Math.hypot(mx - ox, my - oy)).toBeCloseTo(width, 8);
    const bearing = (x: number, y: number) => Math.atan2(oy - y, x - ox) * 180 / Math.PI;
    const creaseAngle = bearing(fx, fy);
    const foldedAngle = bearing(mx, my);
    expect(foldedAngle).toBeCloseTo(2 * creaseAngle, 8);
    const given = visibleGiven(q);
    if (given) expect(opening(given[1], creaseAngle)).toBeCloseTo(Number(given[2]), 8);
    const target = /^How large is ∠(\w{3})\?$/.exec(q.prompt);
    if (target) {
      const arc = pic.marks.find(m => m.kind === 'path' && m.d.includes(' A '));
      if (arc?.kind !== 'path') throw new Error('Missing target arc');
      const points = coords(arc.d);
      const limits = target[1] === 'FOM' ? [creaseAngle, foldedAngle] : [foldedAngle, 90];
      expect(bearing(points[0], points[1])).toBeCloseTo(limits[0], 8);
      expect(bearing(points.at(-2)!, points.at(-1)!)).toBeCloseTo(limits[1], 8);
    }
    expect(makeRagQuestion(seed, 2)).toEqual(q);
  }
});
