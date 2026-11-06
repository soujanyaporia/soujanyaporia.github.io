import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4RectangleCornerAngles';

type Point = [number, number];

// Recover the vertices from the line ends next to the printed letters.
function readFigure(q: Question) {
  const figure = q.picture;
  if (figure?.type !== 'batch11-upper') throw Error('Missing labelled geometry');
  const ends: Point[] = [];
  for (const mark of figure.marks) {
    if (mark.kind === 'line') ends.push([mark.x1, mark.y1], [mark.x2, mark.y2]);
  }
  const vertices = new Map<string, Point>();
  for (const mark of figure.marks) {
    if (mark.kind !== 'text') continue;
    const distance = ([x, y]: Point) => Math.hypot(x - mark.x, y - mark.y);
    const nearest = ends.slice().sort((a, b) => distance(a) - distance(b))[0];
    expect(distance(nearest)).toBeLessThan(23);
    vertices.set(mark.text, nearest);
  }
  function angle(name: string) {
    const [start, at, end] = [...name].map(letter => {
      const point = vertices.get(letter);
      if (!point) throw Error('Missing vertex ' + letter);
      return point;
    });
    const ux = start[0] - at[0], uy = start[1] - at[1];
    const vx = end[0] - at[0], vy = end[1] - at[1];
    return Math.atan2(Math.abs(ux * vy - uy * vx), ux * vx + uy * vy) * 180 / Math.PI;
  }
  return angle;
}

it('solves each named angle from the pupil’s givens and checks the drawn rays', () => {
  const seen = new Map<string, Set<number>>();
  for (let seed = -12; seed <= 28; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const text = q.context?.join(' ') ?? '';
      const target = q.prompt.match(/∠([A-Z]{3})\?$/)?.[1];
      if (!target) throw Error('Missing target angle');
      const given = new Map<string, number>();
      const drawn = readFigure(q);
      for (const m of text.matchAll(/∠([A-Z]{3}) = (\d+)°/g)) {
        const value = Number(m[2]);
        expect(drawn(m[1])).toBeCloseTo(value, 7);
        given.set(m[1], value);
      }
      const read = (name: string) => {
        const value = given.get(name);
        if (value === undefined) throw Error('Missing given ∠' + name);
        return value;
      };
      expect(drawn('DAB')).toBeCloseTo(90, 7);
      let solution: number;
      if (given.has('DEA')) {
        expect(target).toBe('DAE');
        expect(text).toContain('square');
        solution = 90 - read('DEA');
      } else if (given.has('EFA')) {
        expect(target).toBe('EAF');
        expect(text).toContain('rectangle');
        solution = 90 - read('EFA') - read('DAE');
      } else {
        expect(text).toContain('rectangles');
        expect(drawn('EAG')).toBeCloseTo(90, 7);
        if (given.has('DAG')) {
          expect(target).toBe('DAE');
          solution = read('DAG') - 90;
        } else {
          expect(target).toBe('DAG');
          solution = read('DAE') + 90;
        }
      }
      expect(drawn(target)).toBeCloseTo(solution, 7);
      expect(solution).toBeGreaterThan(0);
      expect(solution).toBeLessThan(180);
      if (given.has('DAG') || target === 'DAG') {
        const expected = `${solution}°`;
        expect(q.answer).toBe(expected);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(option => option === expected)).toHaveLength(1);
      } else {
        expect(q.answer).toBe(String(solution));
        expect(q.unit).toBe('°');
        expect(q.choices).toBeUndefined();
      }
      expect(q.workedSteps?.at(-1)?.equation).toContain(`= ${solution}°`);
      const givens = [...given.keys()].sort().join('/');
      const values = seen.get(givens) ?? new Set<number>();
      values.add(solution);
      seen.set(givens, values);
    }
  }
  expect([...seen.keys()].sort()).toEqual(['DAE', 'DAE/EFA', 'DAG', 'DEA']);
  for (const values of seen.values()) expect(values.size).toBeGreaterThan(4);
});

it('repeats the same drawing, givens and option order for the same seed and index', () => {
  for (const seed of [-33, 0, 504]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (const index of [1, 4, 17]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
      expect(makeRagQuestion(seed, index).key).not.toBe(makeRagQuestion(seed, 0).key);
    }
  }
});
