import {describe, expect, test} from 'vitest';
import {makeRagQuestion} from './ragTriangleAreaFromBaseAndHeight';

// The solver receives only the pupil-visible prompt. It cannot read an answer,
// proof tree, worked solution, seed or private generation parameters.
function solveVisible(prompt: string) {
  const heightMatch = /perpendicular height of (\d+) cm\b/.exec(prompt);
  const multiplierMatch = /base is (\d+) times this height\b/.exec(prompt);
  if (!heightMatch || !multiplierMatch) {
    throw new Error('The visible question does not specify both required givens.');
  }
  const height = Number(heightMatch[1]);
  const multiplier = Number(multiplierMatch[1]);
  let base = 0;
  for (let copy = 0; copy < multiplier; copy += 1) base += height;
  let rectangleArea = 0;
  for (let row = 0; row < height; row += 1) rectangleArea += base;
  return {height, multiplier, base, rectangleArea, area: rectangleArea / 2};
}

describe('triangle area with a derived base', () => {
  test('the independent solver handles whole and half-square-centimetre areas', () => {
    expect(solveVisible('A triangle has a perpendicular height of 7 cm. Its base is 5 times this height.').area).toBe(122.5);
    expect(solveVisible('A triangle has a perpendicular height of 8 cm. Its base is 4 times this height.').area).toBe(128);
    expect(() => solveVisible('A triangle has a height of 8 cm.')).toThrow();
  });

  test('visible givens determine every answer across varied seeds and indices', () => {
    const prompts = new Set<string>();
    const multipliers = new Set<number>();
    let wholeAreas = 0;
    let halfAreas = 0;
    for (let seed = -40; seed <= 160; seed += 1) {
      for (let index = 0; index < 8; index += 1) {
        const q = makeRagQuestion(seed, index);
        const result = solveVisible(q.prompt);
        expect(Number(q.answer)).toBe(result.area);
        expect(q.unit).toBe('cm²');
        expect(q.choices).toBeUndefined();
        expect(q.structuredResponse).toBeUndefined();
        expect(q.picture).toBeUndefined();
        expect(result.height).toBeGreaterThanOrEqual(5);
        expect(result.height).toBeLessThanOrEqual(18);
        expect(result.height).not.toBe(12);
        expect(result.multiplier).not.toBe(3);
        expect(result.base).toBeGreaterThan(result.height);
        expect(result.area).toBeGreaterThan(0);
        expect(result.area).toBeLessThanOrEqual(972);
        expect(Number.isInteger(2 * result.area)).toBe(true);
        if (Number.isInteger(result.area)) wholeAreas += 1;
        else halfAreas += 1;
        prompts.add(q.prompt);
        multipliers.add(result.multiplier);
      }
    }
    expect(prompts.size).toBeGreaterThan(30);
    expect([...multipliers].sort((a, b) => a - b)).toEqual([2, 4, 5, 6]);
    expect(wholeAreas).toBeGreaterThan(0);
    expect(halfAreas).toBeGreaterThan(0);
  });

  test('worked steps correctly derive the missing base before calculating area', () => {
    for (const seed of [-19, 0, 7, 93, 2026, 2147483647]) {
      for (let index = 0; index < 12; index += 1) {
        const q = makeRagQuestion(seed, index);
        const result = solveVisible(q.prompt);
        expect(q.workedSteps?.map(step => step.equation)).toEqual([
          `${result.multiplier} × ${result.height} = ${result.base} cm`,
          `${result.base} × ${result.height} = ${result.rectangleArea} cm²`,
          `${result.rectangleArea} ÷ 2 = ${result.area} cm²`,
        ]);
        expect(q.hint).toContain('base first');
        expect(q.explanation).toContain(`${result.rectangleArea} ÷ 2 = ${result.area} cm²`);
      }
    }
  });

  test('generation is reproducible and the index changes the visible questions', () => {
    const first = Array.from({length: 24}, (_, index) => makeRagQuestion(81, index));
    makeRagQuestion(-999, 57);
    const second = Array.from({length: 24}, (_, index) => makeRagQuestion(81, index));
    expect(second).toEqual(first);
    expect(makeRagQuestion(81)).toEqual(makeRagQuestion(81, 0));
    expect(new Set(first.map(q => q.key)).size).toBe(24);
    expect(new Set(first.map(q => q.prompt)).size).toBeGreaterThan(1);
  });
});
