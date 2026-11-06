import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragSquareSideAreaPerimeter';

test('solves each response form using only the printed shape, area, piece count and requested length', () => {
  const seen = { pieces: new Set<number>(), choice: new Set<number>(), entry: new Set<number>() };
  for (let seed = 0; seed < 80; seed++) {
    for (let index = 0; index < 5; index++) {
      const q = makeRagQuestion(seed, index);
      const givens = (q.context ?? []).join(' ');
      expect(givens).toMatch(/square/i);
      const label = givens.match(/(\d+) (cm|m)²/);
      if (!label) throw new Error(`Missing area label in ${givens}`);
      const givenArea = Number(label[1]);
      const unit = label[2];
      const pieces = givens.match(/(\d+) identical rectangular pieces/);
      const squareArea = givenArea * (pieces ? Number(pieces[1]) : 1);
      const side = Math.sqrt(squareArea);
      expect(givenArea).toBeGreaterThan(0);
      expect(Number.isInteger(side)).toBe(true);
      expect(side).toBeLessThanOrEqual(10);
      expect(q.unit).toBe(unit);
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations).toContain(`${side} × ${side} = ${squareArea} ${unit}²`);

      if (pieces) {
        expect(Number(pieces[1])).toBe(2);
        expect(givens).toContain('Each piece has an area');
        expect(givens).toContain('no gaps or overlaps');
        expect(q.prompt).toMatch(/one side.*centimetres/);
        expect(unit).toBe('cm');
        expect(q.choices).toBeUndefined();
        expect(equations?.[0]).toBe(`${givenArea} + ${givenArea} = ${squareArea} cm²`);
        expect(q.answer).toBe(String(side));
        seen.pieces.add(givenArea);
        continue;
      }

      expect(q.prompt).toMatch(/perimeter/);
      const perimeter = side + side + side + side;
      expect(q.answer).toBe(String(perimeter));
      expect(equations).toContain(`4 × ${side} = ${perimeter} ${unit}`);
      if (unit === 'm') {
        expect(q.prompt).toContain('in metres');
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(value => Number(value) === perimeter)).toHaveLength(1);
        seen.choice.add(givenArea);
      } else {
        expect(q.prompt).toContain('in centimetres');
        expect(q.choices).toBeUndefined();
        seen.entry.add(givenArea);
      }
    }
  }
  for (const areas of Object.values(seen)) expect(areas.size).toBeGreaterThan(1);
});

test('replays the same question and choice order for the same seed and index', () => {
  for (const seed of [0, 17, 2048]) {
    for (const index of [0, 1, 7]) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
  }
});
