import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP2EqualItemMassWithAnotherLoad';

function read(text: string, pattern: RegExp): number[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Cannot read the given: ${text}`);
  return match.slice(1).map(Number);
}

function uniqueMass(limit: number, fits: (mass: number) => boolean): number {
  const matches = Array.from({ length: limit }, (_, i) => i + 1).filter(fits);
  expect(matches).toHaveLength(1);
  return matches[0];
}

// Try possible target masses against the pupil's givens, independently of the worked solution.
function solveVisible(q: Question) {
  const context = q.context ?? [];
  if (q.prompt === 'How much does the large sack weigh?') {
    const [count, pair] = read(context[0], /^(\d+) small sacks of rice weigh (\d+) kg altogether\./);
    expect(context[0]).toContain('both weigh the same');
    const [extra] = read(context[1], /^A large sack weighs (\d+) kg more than one small sack\.$/);
    expect(count).toBe(2);
    const mass = uniqueMass(pair + extra, candidate => candidate > extra && count * (candidate - extra) === pair);
    return { unit: 'kg', mass, steps: 2 };
  }

  const picture = q.picture;
  if (picture?.type !== 'paper' || picture.layout !== 'cards') throw new Error('Missing weighings');
  expect(picture.cards).toHaveLength(2);
  const [first, second] = picture.cards;
  if (q.prompt === 'How much does the long parcel weigh?') {
    expect(context.join(' ')).toContain('small parcels all weigh the same');
    const [count] = read(first.label, /^(\d+) small parcels$/);
    const [firstWeight] = read(first.value, /^(\d+) kg$/);
    expect(second.label).toBe('1 small parcel and 1 long parcel');
    const [left, right] = read(second.value, /^(\d+) kg and (\d+) kg$/);
    const mixed = left + right;
    const mass = uniqueMass(mixed, candidate => count * (mixed - candidate) === firstWeight);
    return { unit: 'kg', mass, steps: 3 };
  }

  expect(q.prompt).toBe('How much does one cube weigh?');
  expect(context.join(' ')).toContain('cubes all weigh the same');
  expect(context.join(' ')).toContain('marbles also weigh the same as each other');
  const [cubes, marbles] = read(first.label, /^(\d+) cubes and (\d+) marbles$/);
  const [total] = read(first.value, /^(\d+) g$/);
  expect(second.label).toBe('1 marble');
  const [single] = read(second.value, /^(\d+) g$/);
  const mass = uniqueMass(total, candidate => cubes * candidate + marbles * single === total);
  return { unit: 'g', mass, steps: 3 };
}

it('finds exactly one whole-number answer from the displayed relations in each variant', () => {
  for (let seed = 0; seed < 64; seed++) {
    const prompts = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const expected = solveVisible(q);
      expect(q.answer).toBe(String(expected.mass));
      expect(q.unit).toBe(expected.unit);
      expect(q.choices).toBeUndefined();
      expect(q.structuredResponse).toBeUndefined();
      expect(q.workedSteps).toHaveLength(expected.steps);
      expect(q.workedSteps?.at(-1)?.equation).toMatch(new RegExp(`= ${expected.mass} ${expected.unit}$`));
      prompts.add(q.prompt);
    }
    expect(prompts.size).toBe(3);
  }
});

it('replays each item and varies the visible masses for every prompt', () => {
  const givensByPrompt = new Map<string, Set<string>>();
  for (let seed = -8; seed <= 8; seed++) {
    for (let index = 3; index < 6; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      const givens = givensByPrompt.get(q.prompt) ?? new Set<string>();
      givens.add(JSON.stringify([q.context, q.picture]));
      givensByPrompt.set(q.prompt, givens);
    }
  }
  expect(givensByPrompt.size).toBe(3);
  for (const givens of givensByPrompt.values()) expect(givens.size).toBeGreaterThan(1);
});
