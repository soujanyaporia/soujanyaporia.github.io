import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragIntervalValues';

// Read only what the pupil sees. Try each whole number individually.
function solve(prompt: string) {
  const inclusive = /from (\d+) to (\d+), including both ends/.exec(prompt);
  const bounds = inclusive ?? /greater than (\d+) and less than (\d+)/.exec(prompt);
  if (!bounds) throw new Error(`Missing interval in ${prompt}`);
  const lower = Number(bounds[1]);
  const upper = Number(bounds[2]);
  expect(lower).toBeGreaterThan(0);
  expect(upper).toBeGreaterThan(lower);

  const table = /the (\d+) times table/.exec(prompt);
  const multiply = /Multiply each number in a pair by (\d+)\./.exec(prompt);
  if (multiply) {
    const factor = Number(multiply[1]);
    const inputs: number[] = [];
    for (let n = 1; n <= upper; n++) {
      if (lower < n * factor && n * factor < upper) inputs.push(n);
    }
    expect(inputs).toHaveLength(2);
    expect(inputs[1]).toBeLessThanOrEqual(10);
    return { kind: 'pair', answer: inputs.join(' and '), lowerFits: lower % factor === 0, upperFits: upper % factor === 0 };
  }

  if (!table && !prompt.includes('odd')) throw new Error(`Missing number rule in ${prompt}`);
  const qualifies = table ? (n: number) => n % Number(table[1]) === 0 : (n: number) => n % 2 === 1;
  let count = 0;
  let total = 0;
  for (let n = lower; n <= upper; n++) {
    if (!inclusive && (n === lower || n === upper)) continue;
    if (qualifies(n)) {
      count++;
      total += n;
    }
  }
  const sum = prompt.startsWith('Add all');
  const kind = sum ? 'odd-sum' : table ? 'table-count' : 'odd-count';
  expect(Boolean(inclusive)).toBe(kind === 'odd-count');
  return { kind, answer: String(sum ? total : count), lowerFits: qualifies(lower), upperFits: qualifies(upper) };
}

it('solves each visible task and checks qualifying endpoints across seeds', () => {
  const lowerHits = new Set<string>();
  const upperHits = new Set<string>();
  for (let seed = -16; seed < 144; seed++) {
    const kinds = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solve(q.prompt);
      kinds.add(expected.kind);
      if (expected.lowerFits) lowerHits.add(expected.kind);
      if (expected.upperFits) upperHits.add(expected.kind);
      expect(q.answer).toBe(expected.answer);
      expect(q.choices).toHaveLength(4);
      expect(new Set(q.choices).size).toBe(4);
      expect(q.choices).toContain(expected.answer);
      expect(q.workedSteps?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect([...kinds].sort()).toEqual(['odd-count', 'odd-sum', 'pair', 'table-count']);
  }
  expect(lowerHits.size).toBe(4);
  expect(upperHits.size).toBe(4);
});

it('repeats the same question for the same inputs and varies the visible givens', () => {
  const prompts = new Map<string, Set<string>>();
  for (let seed = 40; seed < 56; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const { kind } = solve(q.prompt);
      const seen = prompts.get(kind) ?? new Set<string>();
      seen.add(q.prompt);
      prompts.set(kind, seen);
    }
  }
  expect(prompts.size).toBe(4);
  for (const seen of prompts.values()) expect(seen.size).toBeGreaterThan(4);
});
