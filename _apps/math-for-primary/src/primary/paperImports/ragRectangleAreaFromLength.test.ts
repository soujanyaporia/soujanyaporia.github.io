import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragRectangleAreaFromLength';

test('the two stated givens determine the breadth, both worked steps and the single area entry', () => {
  const factors = new Set<number>();
  const areas = new Set<number>();

  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const visible = [...(question.context ?? []), question.prompt].join(' ');
      const measurement = /\bis (\d+) (m) long\b/.exec(visible);
      const comparison = /\blength is (\d+) times its breadth\b/.exec(visible);
      if (!measurement || !comparison) throw new Error(`Missing rectangle givens: ${visible}`);
      expect(visible).toMatch(/rectangular/);
      expect(question.prompt).toMatch(/area/);
      expect(visible.match(/\d+/g)).toHaveLength(2);

      const length = Number(measurement[1]);
      const unit = measurement[2];
      const factor = Number(comparison[1]);
      expect(factor).toBeGreaterThan(1);
      expect(factor).toBeLessThan(10);
      expect(length % factor).toBe(0);
      const breadth = length / factor;
      expect(breadth).toBeGreaterThan(0);
      expect(breadth).toBeLessThan(10);
      const area = length * breadth;
      expect(question.answer).toBe(String(area));
      expect(question.unit).toBe(`${unit}²`);
      expect(question.structuredResponse).toBeUndefined();
      expect(question.choices).toBeUndefined();
      expect(question.workedSteps?.map(step => step.equation)).toEqual([
        `${length} ÷ ${factor} = ${breadth} ${unit}`,
        `${length} × ${breadth} = ${area} ${unit}²`,
      ]);
      factors.add(factor);
      areas.add(area);
    }
  }

  expect(factors).toContain(2);
  expect(factors.size).toBeGreaterThan(1);
  expect(areas.size).toBeGreaterThan(4);
});

test('a seed and index reproduce a question, and the index varies the visible givens', () => {
  const contexts = new Set<string>();
  for (let index = 0; index < 32; index++) {
    const question = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(question);
    contexts.add((question.context ?? []).join(' '));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
