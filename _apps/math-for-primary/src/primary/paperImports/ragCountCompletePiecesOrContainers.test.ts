import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragCountCompletePiecesOrContainers';

function read(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible measurement or count for ${pattern} in ${text}`);
  return Number(match[1]);
}

// Model taking one whole piece or filling one tin at a time.
function takeGroups(total: number, size: number) {
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThan(1000);
  expect(size).toBeGreaterThan(0);
  expect(size).toBeLessThan(10);
  let count = 0;
  let left = total;
  while (left >= size) {
    left -= size;
    count++;
  }
  return { count, left };
}

function solve(context: string, prompt: string) {
  switch (prompt) {
    case 'How many centimetres of cord are left?': {
      const metres = read(context, /cord (\d+) m long/);
      const size = read(context, /pieces (\d+) cm long/);
      expect(context).toContain('too short for another piece');
      const cuts = takeGroups(metres * 100, size);
      expect(cuts.count).toBeGreaterThan(0);
      expect(cuts.left).toBeGreaterThan(0);
      expect(cuts.left).toBeLessThan(size);
      return { value: cuts.left, unit: 'cm' };
    }
    case 'How many tins of paint does the shop have left?': {
      const total = read(context, /all (\d+) L of paint/);
      const capacity = read(context, /(\d+) L in each tin/);
      const discarded = read(context, /throws away (\d+) damaged tins/);
      const tins = takeGroups(total, capacity);
      expect(tins.left).toBe(0);
      expect(discarded).toBeGreaterThan(0);
      expect(discarded).toBeLessThan(tins.count);
      return { value: tins.count - discarded, unit: 'tins' };
    }
    case 'How many more green pieces than white pieces does the shop get?': {
      const length = read(context, /green roll of cord (\d+) m long/);
      expect(context).toContain('white roll of cord is just as long');
      expect(context).toContain('cuts up both rolls completely');
      const green = takeGroups(length, read(context, /green piece is (\d+) m long/));
      const white = takeGroups(length, read(context, /white piece is (\d+) m long/));
      expect(green.left).toBe(0);
      expect(white.left).toBe(0);
      expect(green.count).toBeGreaterThan(white.count);
      return { value: green.count - white.count, unit: 'pieces' };
    }
    default:
      throw new Error(`Unexpected response task: ${prompt}`);
  }
}

it('solves all three tasks from pupil-visible givens for each seed', () => {
  for (let seed = -12; seed < 52; seed++) {
    const units = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const question = makeRagQuestion(seed, index);
      const expected = solve((question.context ?? []).join(' '), question.prompt);
      expect(question.answer).toBe(String(expected.value));
      expect(question.unit).toBe(expected.unit);
      expect(question.picture).toBeUndefined();
      units.add(expected.unit);
    }
    expect(units).toEqual(new Set(['cm', 'tins', 'pieces']));
  }
});

it('replays a seed and index and varies the visible givens within each task', () => {
  const contextsByPrompt = new Map<string, Set<string>>();
  for (let index = 0; index < 60; index++) {
    const question = makeRagQuestion(31, index);
    expect(makeRagQuestion(31, index)).toEqual(question);
    const contexts = contextsByPrompt.get(question.prompt) ?? new Set<string>();
    contexts.add((question.context ?? []).join(' '));
    contextsByPrompt.set(question.prompt, contexts);
  }
  expect(contextsByPrompt.size).toBe(3);
  for (const contexts of contextsByPrompt.values()) expect(contexts.size).toBeGreaterThan(4);
});
