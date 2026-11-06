import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragFractionRelationship';

const integers = Array.from({ length: 24 }, (_, i) => i + 1);
const partNames: Record<string, number> = { thirds: 3, quarters: 4, fifths: 5, sevenths: 7, eighths: 8, tenths: 10, twelfths: 12 };

function onlySolution(predicate: (value: number) => boolean): number {
  const solutions = integers.filter(predicate);
  expect(solutions).toHaveLength(1);
  return solutions[0];
}

function checkVisibleProblem(q: Question): string {
  const display = q.display ?? '';
  const whole = /^1 whole = □\/(\d+)$/.exec(display);
  if (whole) {
    const bottom = Number(whole[1]);
    const name = Object.keys(partNames).find(word => q.prompt.split(' ').includes(word));
    expect(name && partNames[name]).toBe(bottom);
    const top = onlySolution(n => n / bottom === 1);
    expect(q.answer).toBe(String(top));
    expect(correctAnswer(q, String(top))).toBe(true);
    expect(correctAnswer(q, String(top - 1))).toBe(false);
    expect(q.choices).toBeUndefined();
    return 'whole';
  }

  const pair = /^(\d+)\/A = (\d+)\/(\d+) = B\/(\d+)$/.exec(display);
  if (pair) {
    const [leftTop, middleTop, middleBottom, rightBottom] = pair.slice(1).map(Number);
    const a = onlySolution(value => leftTop * middleBottom === value * middleTop);
    const b = onlySolution(value => value * middleBottom === rightBottom * middleTop);
    expect(middleBottom).toBeLessThanOrEqual(24);
    expect(rightBottom).toBeLessThanOrEqual(24);
    expect(leftTop).toBeLessThan(a);
    expect(b).toBeLessThan(rightBottom);
    expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'A', secondLabel: 'B' });
    const response = JSON.stringify([String(a), String(b)]);
    expect(q.answer).toBe(response);
    expect(correctAnswer(q, response)).toBe(true);
    expect(correctAnswer(q, JSON.stringify([String(a)]))).toBe(false);
    expect(correctAnswer(q, JSON.stringify([String(b), String(a)]))).toBe(false);
    expect(correctAnswer(q, JSON.stringify([String(a), String(b + 1)]))).toBe(false);
    return 'pair';
  }

  const single = /^(\d+)\/(\d+) = (\d+)\/□$/.exec(display);
  if (!single) throw new Error(`Unrecognised fraction relationship: ${display}`);
  const [top, bottom, newTop] = single.slice(1).map(Number);
  const answer = onlySolution(value => top * value === bottom * newTop);
  expect(top).toBeLessThan(bottom);
  expect(bottom).toBeLessThanOrEqual(24);
  expect(q.answer).toBe(String(answer));
  expect(correctAnswer(q, String(answer))).toBe(true);
  expect(correctAnswer(q, String(answer + 1))).toBe(false);
  if (q.choices) {
    expect(newTop).toBeLessThan(top);
    expect(top % newTop).not.toBe(0);
    expect(q.choices).toHaveLength(4);
    expect(new Set(q.choices).size).toBe(4);
    expect(q.choices.filter(value => top * Number(value) === bottom * newTop)).toEqual([String(answer)]);
    return 'choice';
  }
  expect(newTop).toBeGreaterThan(top);
  expect(newTop % top).toBe(0);
  return 'entry';
}

it('solves every displayed gap independently and checks each response format', () => {
  const displays = new Map<string, Set<string>>();
  for (let seed = -12; seed <= 48; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const form = checkVisibleProblem(q);
      forms.add(form);
      const seen = displays.get(form) ?? new Set<string>();
      seen.add(q.display!);
      displays.set(form, seen);
    }
    expect([...forms].sort()).toEqual(['choice', 'entry', 'pair', 'whole']);
  }
  for (const seen of displays.values()) expect(seen.size).toBeGreaterThanOrEqual(4);
});

it('replays the same question for the same seed and index', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  for (let index = 0; index < 8; index++) {
    expect(makeRagQuestion(-31, index)).toEqual(makeRagQuestion(-31, index));
  }
});
