import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragP2TwoQuantitiesSumDifference';

function read(text: string, clue: RegExp): number {
  const match = clue.exec(text);
  if (!match) throw new Error(`Missing visible clue: ${clue}`);
  return Number(match[1]);
}

function checkPair(q: Question, labels: [string, string], first: number, second: number) {
  const spec = q.structuredResponse;
  if (spec?.kind !== 'number-pair') throw new Error('Expected two labelled entries');
  expect([spec.firstLabel, spec.secondLabel]).toEqual(labels);
  const response = (...values: number[]) => JSON.stringify(values.map(String));
  expect(q.answer).toBe(response(first, second));
  expect(structuredResponseCorrect(spec, q.answer, response(first, second))).toBe(true);
  expect(structuredResponseCorrect(spec, q.answer, response(second, first))).toBe(false);
  expect(structuredResponseCorrect(spec, q.answer, response(first))).toBe(false);
}

it('solves the visible clues and checks the requested response across seeds and indices', () => {
  const stories = new Set<string>(), chains = new Set<string>(), riddles = new Set<string>();
  for (let seed = -9; seed <= 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const text = [...(q.context ?? []), q.prompt].join(' ');
      if (text.includes('blue tin')) {
        const total = read(text, /There are (\d+) buttons altogether/);
        const gap = read(text, /red tin holds (\d+) more buttons than the blue tin/);
        expect(total).toBeLessThan(100);
        expect(gap).toBeGreaterThan(0);
        const pairs: [number, number][] = [];
        for (let blue = 1; blue < total; blue++) {
          const red = total - blue;
          if (red - blue === gap) pairs.push([blue, red]);
        }
        expect(pairs).toHaveLength(1);
        checkPair(q, ['(a) Blue tin (buttons)', '(b) Red tin (buttons)'], ...pairs[0]);
        stories.add(`${total}:${gap}`);
      } else if (text.includes('bakery')) {
        const fri = read(text, /bakery sold (\d+) buns on Friday/);
        const rise = read(text, /Saturday it sold (\d+) more buns than on Friday/);
        const drop = read(text, /sold (\d+) fewer buns on Sunday than on Saturday/);
        const sat = fri + rise, sun = sat - drop;
        expect(sat).toBeGreaterThan(fri);
        expect(sun).toBeLessThan(sat);
        expect(sun).toBeGreaterThan(0);
        expect(sat).toBeLessThan(1000);
        checkPair(q, ['(a) Saturday (buns)', '(b) Sunday (buns)'], sat, sun);
        chains.add(`${fri}:${rise}:${drop}`);
      } else {
        const h = read(text, /hundreds digit is (\d+)/);
        const sum = read(text, /tens digit and my ones digit add up to (\d+)/);
        const diff = read(text, /ones digit is (\d+) less than my tens digit/);
        expect(q.prompt).toBe('What is my three-digit number?');
        expect(q.structuredResponse).toBeUndefined();
        const matches: number[] = [];
        for (let n = 100; n <= 999; n++) {
          const t = Math.floor(n / 10) % 10, u = n % 10;
          if (Math.floor(n / 100) === h && t + u === sum && t - u === diff) matches.push(n);
        }
        expect(matches).toHaveLength(1);
        expect(q.answer).toBe(String(matches[0]));
        riddles.add(`${h}:${sum}:${diff}`);
      }
    }
  }
  for (const family of [stories, chains, riddles]) expect(family.size).toBeGreaterThan(10);
});

it('repeats a question for the same seed and index and varies the task within a session', () => {
  const questions = [0, 1, 2].map(i => makeRagQuestion(14, i));
  expect(questions).toEqual([0, 1, 2].map(i => makeRagQuestion(14, i)));
  expect(new Set(questions.map(q => q.prompt)).size).toBe(3);
  expect(new Set(questions.map(q => q.key)).size).toBe(3);
});
