import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragDistanceOverRepeatedLaps';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given matching ${pattern} in ${text}`);
  return Number(match[1]);
}

function solveFromGivens(q: Question) {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  const laps = readNumber(text, /(\d+) full laps/);
  let length: number;
  let width: number;
  if (q.picture) {
    const plan = q.picture;
    if (plan.type !== 'shape' || plan.shape !== 'rectangle' || plan.labels?.length !== 2) {
      throw new Error('The field plan needs two labelled sides.');
    }
    length = readNumber(plan.labels[0], /^(\d+) m$/);
    width = readNumber(plan.labels[1], /^(\d+) m$/);
    expect(text).not.toMatch(/\d+ m\b/);
  } else {
    width = readNumber(text, /(\d+) m wide/);
    const multiple = /(\d+) times its width/.exec(text);
    length = multiple ? width * Number(multiple[1]) : readNumber(text, /(\d+) m long/);
  }
  const sides = [length, width, length, width];
  const circuit = sides.reduce((sum, side) => sum + side, 0);
  let distance = 0;
  for (let lap = 0; lap < laps; lap++) {
    for (const side of sides) distance += side;
  }
  return { text, length, width, laps, circuit, distance };
}

it('solves the route from the visible sides and lap count for every answer form', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 64; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { text, length, width, laps, circuit, distance } = solveFromGivens(q);
      expect(length).toBeGreaterThan(width);
      expect(width).toBeGreaterThan(0);
      expect(circuit).toBeLessThan(1000);
      expect(laps).toBeGreaterThanOrEqual(2);
      expect(laps).toBeLessThanOrEqual(4);
      const equations = q.workedSteps?.map(step => step.equation);
      expect(equations).toContain(`2 × (${length} + ${width}) = ${circuit} m`);
      expect(equations).toContain(`${circuit} × ${laps} = ${distance} m`);

      if (text.includes('times its width')) {
        seen.add('side-multiple');
        expect(q.prompt).toContain('kilometres and metres');
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Kilometres', secondLabel: 'Metres' });
        expect(q.choices).toBeUndefined();
        const km = Math.floor(distance / 1000);
        const metres = distance - 1000 * km;
        expect(km).toBeGreaterThan(0);
        expect(metres).toBeGreaterThan(0);
        expect(q.answer).toBe(JSON.stringify([String(km), String(metres)]));
      } else {
        expect(q.prompt).toContain('metres');
        expect(q.unit).toBe('m');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.answer).toBe(String(distance));
        seen.add(`${q.picture ? 'plan' : 'stated'}-${q.choices ? 'choice' : 'entry'}`);
        if (q.choices) {
          expect(q.choices).toHaveLength(4);
          expect(new Set(q.choices).size).toBe(4);
          expect(q.choices).toContain(String(distance));
          expect(q.choices).toContain(String(circuit));
        }
      }
    }
  }
  expect([...seen].sort()).toEqual(['plan-choice', 'plan-entry', 'side-multiple', 'stated-choice']);
});

it('reproduces a question and varies its visible givens across indices', () => {
  const givens = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(71, index);
    expect(makeRagQuestion(71, index)).toEqual(q);
    givens.add(JSON.stringify([q.context, q.picture]));
  }
  expect(makeRagQuestion(71)).toEqual(makeRagQuestion(71, 0));
  expect(givens.size).toBeGreaterThan(1);
});
