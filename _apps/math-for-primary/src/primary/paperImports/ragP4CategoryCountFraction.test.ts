import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP4CategoryCountFraction';

function readCounts(text: string, pattern: RegExp) {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing pupil-facing counts in: ${text}`);
  return match.slice(1).map(Number);
}

function solve(q: Question) {
  const text = (q.context ?? []).join(' ');
  if (q.prompt.includes('tiles show a tree')) {
    const [total, leaves, flowers] = readCounts(text, /holds (\d+) tiles.*?(\d+) tiles show a leaf and (\d+) show a flower/);
    expect(text).toContain('All the other tiles show a tree');
    return {target: total - leaves - flowers, total};
  }
  if (q.prompt.includes('postcards')) {
    const [total, mira, dan] = readCounts(text, /box holds (\d+) postcards.*?Mira takes (\d+) postcards.*?Dan then takes (\d+) postcards/);
    return {target: total - mira - dan, total};
  }
  if (q.prompt.includes('stickers')) {
    const [total, left] = readCounts(text, /roll held (\d+) stickers.*?There are (\d+) stickers left/);
    return {target: left, total};
  }
  if (q.prompt.includes('badges show a train')) {
    const [kites, boats, gap] = readCounts(text, /are (\d+) kite badges and (\d+) boat badges.*?are (\d+) more train badges than kite badges/);
    const trains = kites + gap;
    return {target: trains, total: kites + boats + trains};
  }
  throw new Error(`Unknown question: ${q.prompt}`);
}

// Find the first denominator that represents the visible share exactly.
function simplest(target: number, total: number) {
  for (let d = 2; d <= total; d++) {
    if ((target * d) % total === 0) return `${target * d / total}/${d}`;
  }
  throw new Error('Expected a proper fraction');
}

it('solves each story using the counts a pupil sees and enforces simplest form', () => {
  const prompts = new Set<string>();
  const fractions = new Set<string>();
  for (let seed = -8; seed < 32; seed++) {
    for (const index of [0, 1, 4, 11]) {
      const q = makeRagQuestion(seed, index);
      const {target, total} = solve(q);
      expect(target).toBeGreaterThan(0);
      expect(target).toBeLessThan(total);
      const expected = simplest(target, total);
      expect(q.prompt).toContain('simplest form');
      expect(q.answer).toBe(expected);
      expect(q.requireSimplified).toBe(true);
      expect(q.unit).toBeUndefined();
      expect(q.choices).toBeUndefined();
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, `${target}/${total}`)).toBe(false);
      expect(correctAnswer(q, String(target))).toBe(false);
      prompts.add(q.prompt);
      fractions.add(expected);
    }
  }
  expect(prompts.size).toBe(4);
  expect(fractions.size).toBeGreaterThan(4);
});

it('repeats a question for the same inputs and varies the visible givens across indices', () => {
  expect(makeRagQuestion(17)).toEqual(makeRagQuestion(17, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    contexts.add(q.context!.join(' '));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
