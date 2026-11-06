import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP2CompareAndOrderFractions';

type Visible = Pick<Question, 'prompt' | 'order' | 'choices'>;

function readFraction(label: string) {
  const match = /^(\d+)\/(\d+)$/.exec(label);
  if (!match) throw new Error(`Unreadable fraction: ${label}`);
  const n = Number(match[1]);
  const d = Number(match[2]);
  expect(n).toBeGreaterThan(0);
  expect(n).toBeLessThan(d);
  expect(d).toBeLessThanOrEqual(12);
  return { label, n, d };
}

function solveVisible({ prompt, order, choices }: Visible): string {
  const labels = order ?? choices;
  if (!labels || (order && choices)) throw new Error('Expected one set of visible fractions');
  const fractions = labels.map(readFraction);
  const ranked = fractions.sort((a, b) => a.n * b.d - b.n * a.d);
  for (let i = 1; i < ranked.length; i++) {
    const a = ranked[i - 1], b = ranked[i];
    expect(a.n * b.d).toBeLessThan(b.n * a.d);
  }
  const increasing = ranked.map(f => f.label);
  if (order) {
    expect(order).toHaveLength(3);
    expect(ranked.every(f => f.n === 1)).toBe(true);
    if (prompt.includes('smallest to greatest')) return increasing.join(',');
    if (prompt.includes('greatest to smallest')) return increasing.reverse().join(',');
  } else {
    expect(choices).toHaveLength(4);
    expect(new Set(ranked.map(f => f.d)).size).toBe(1);
    if (prompt.includes('smallest')) return increasing[0];
    if (prompt.includes('greatest')) return increasing[increasing.length - 1];
  }
  throw new Error(`Unclear direction in prompt: ${prompt}`);
}

it('solves every order and choice using only the displayed fractions and instruction', () => {
  for (const seed of [-97, -1, 0, 1, 8, 19, 71, 200, 417, 9021]) {
    const tasks = new Set<string>();
    for (let index = 0; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solveVisible({ prompt: q.prompt, choices: q.choices, order: q.order });
      const leastFirst = q.order ? q.prompt.includes('smallest to greatest') : q.prompt.includes('smallest');
      tasks.add(`${q.order ? 'order' : 'choose'}-${leastFirst ? 'least' : 'greatest'}`);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      if (q.order) {
        expect(q.order.join(',')).not.toBe(expected);
        expect(correctAnswer(q, expected.split(',').reverse().join(','))).toBe(false);
        expect(correctAnswer(q, expected.split(',')[0])).toBe(false);
      } else {
        for (const option of q.choices!) {
          expect(correctAnswer(q, option)).toBe(option === expected);
        }
      }
    }
    expect(tasks).toEqual(new Set(['order-least', 'order-greatest', 'choose-least', 'choose-greatest']));
  }
});

it('replays the same inputs and varies the fraction sets within each task', () => {
  const setsByPrompt = new Map<string, Set<string>>();
  for (let seed = 0; seed < 16; seed++) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const pool = setsByPrompt.get(q.prompt) ?? new Set<string>();
      pool.add([...(q.order ?? q.choices!)].sort().join(','));
      setsByPrompt.set(q.prompt, pool);
    }
  }
  expect(setsByPrompt.size).toBe(4);
  for (const pool of setsByPrompt.values()) expect(pool.size).toBeGreaterThan(1);
});
