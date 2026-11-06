import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragMultipleWithAdditiveChange';

test('solves each form from the jar counts and the timing of the visible comparison', () => {
  const stories = { forward: new Set<string>(), single: new Set<string>(), linked: new Set<string>() };
  for (let seed = -16; seed < 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      const start = /^The (green|blue) jar starts with (\d+) beads\./.exec(story);
      const change = /Mei puts (\d+) more beads into the blue jar\./.exec(story);
      const comparison = /(At first|Now), the blue jar has (\d+) times as many beads as the green jar\./.exec(story);
      if (!start || !change || !comparison) throw new Error(`Missing jar, count or comparison in ${story}`);
      const initial = Number(start[2]);
      const gain = Number(change[1]);
      const groups = Number(comparison[2]);
      expect(initial).toBeGreaterThan(0);
      expect(gain).toBeGreaterThan(0);
      expect(groups).toBeGreaterThanOrEqual(2);
      expect(groups).toBeLessThanOrEqual(9);
      const equations = q.workedSteps?.map(step => step.equation);

      if (comparison[1] === 'At first') {
        expect(start[1]).toBe('green');
        expect(comparison.index).toBeLessThan(change.index);
        expect(q.prompt).toContain('blue jar now');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('beads');
        const blueBefore = groups * initial;
        const result = blueBefore + gain;
        expect(result).toBeLessThan(10000);
        expect(q.answer).toBe(String(result));
        expect(correctAnswer(q, String(result))).toBe(true);
        expect(correctAnswer(q, String(blueBefore))).toBe(false);
        expect(equations).toEqual([`${groups} × ${initial} = ${blueBefore} beads`, `${blueBefore} + ${gain} = ${result} beads`]);
        stories.forward.add(story);
        continue;
      }

      expect(start[1]).toBe('blue');
      expect(change.index).toBeLessThan(comparison.index);
      const blue = initial + gain;
      const green = blue / groups;
      expect(blue).toBeLessThan(1000);
      expect(Number.isInteger(green)).toBe(true);
      const expectedSteps = [`${initial} + ${gain} = ${blue} beads`, `${blue} ÷ ${groups} = ${green} beads`];
      expect(q.prompt).toContain('green jar');
      if (q.prompt.includes('(b)')) {
        expect(q.prompt).toContain('two jars altogether now');
        expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: '(a) Green jar (beads)', secondLabel: '(b) Both jars now (beads)' });
        const total = blue + green;
        const pair = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
        expect(q.answer).toBe(pair(green, total));
        expect(correctAnswer(q, pair(green, total))).toBe(true);
        expect(correctAnswer(q, pair(total, green))).toBe(false);
        expect(correctAnswer(q, pair(green, initial + green))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([String(green)]))).toBe(false);
        expectedSteps.push(`${blue} + ${green} = ${total} beads`);
        stories.linked.add(story);
      } else {
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('beads');
        expect(q.answer).toBe(String(green));
        expect(correctAnswer(q, String(green))).toBe(true);
        expect(correctAnswer(q, String(blue))).toBe(false);
        stories.single.add(story);
      }
      expect(equations).toEqual(expectedSteps);
    }
  }
  for (const variants of Object.values(stories)) expect(variants.size).toBeGreaterThan(5);
});

test('replays the same seed and index and varies the givens across a session', () => {
  const session = () => Array.from({ length: 12 }, (_, index) => makeRagQuestion(72, index));
  const first = session();
  expect(session()).toEqual(first);
  expect(makeRagQuestion(72)).toEqual(first[0]);
  expect(new Set(first.map(q => q.key)).size).toBe(first.length);
  expect(new Set(first.map(q => q.context?.join(' '))).size).toBeGreaterThan(1);
});
