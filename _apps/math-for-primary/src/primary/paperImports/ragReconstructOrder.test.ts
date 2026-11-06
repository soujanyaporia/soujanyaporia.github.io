import { expect, test } from 'vitest';
import { makeRagQuestion } from './ragReconstructOrder';

const ranks = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth'];
type Rule = (row: string[]) => boolean;

function position(row: string[], name: string, fromRight = false): number {
  const i = row.indexOf(name);
  if (i < 0) throw new Error(`Unknown name in a clue: ${name}`);
  return fromRight ? row.length - i : i + 1;
}

function readClue(clue: string): Rule {
  const fixed = /^(\w+) is (\w+) (in the queue|from the left|from the right)\.$/.exec(clue);
  if (fixed) {
    const [, name, word, end] = fixed;
    const rank = ranks.indexOf(word) + 1;
    if (!rank) throw new Error(`Unknown position: ${word}`);
    return row => position(row, name, end === 'from the right') === rank;
  }
  const between = /^(\w+) is between (\w+) and (\w+)\.$/.exec(clue);
  if (between) {
    const [, name, a, b] = between;
    return row => {
      const p = position(row, name), left = position(row, a), right = position(row, b);
      return Math.min(left, right) < p && p < Math.max(left, right);
    };
  }
  const pair = /^(\w+) is (next to|ahead of|behind|immediately ahead of|immediately behind) (\w+)\.$/.exec(clue);
  if (!pair) throw new Error(`Unrecognised clue: ${clue}`);
  const [, a, relation, b] = pair;
  return row => {
    const delta = position(row, a) - position(row, b);
    switch (relation) {
      case 'next to': return Math.abs(delta) === 1;
      case 'ahead of': return delta < 0;
      case 'behind': return delta > 0;
      case 'immediately ahead of': return delta === -1;
      case 'immediately behind': return delta === 1;
      default: throw new Error(`Unknown relation: ${relation}`);
    }
  };
}

function permutations(names: string[]): string[][] {
  if (!names.length) return [[]];
  return names.flatMap(name => permutations(names.filter(other => other !== name)).map(rest => [name, ...rest]));
}

function solve(names: string[], clues: string[]): string[][] {
  const rules = clues.map(readClue);
  return permutations(names).filter(row => rules.every(rule => rule(row)));
}

test('the visible clues force one row and each response asks for the corresponding result', () => {
  const remainingRanks = new Set<number>();
  const bearRanks = new Set<number>();
  const bearEnds = new Set<string>();
  for (let seed = -4; seed <= 24; seed++) {
    const tasks = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const [setting, roster, ...clues] = q.context ?? [];
      const list = /^Their names are (.+)\.$/.exec(roster);
      if (!list) throw new Error('Missing visible list of names');
      const names = list[1].split(/, | and /);
      expect(new Set(names).size).toBe(names.length);
      const shelf = setting === 'Five toy bears sit side by side on a shelf.';
      if (!shelf) expect(setting).toBe('Six children are in a queue for the slide. Count from the front.');
      expect(names).toHaveLength(shelf ? 5 : 6);
      const rows = solve(names, clues);
      expect(rows).toHaveLength(1);
      const [row] = rows;

      if (q.prompt === 'Put all the names in order from the front of the queue to the back.') {
        tasks.add('whole order');
        expect(shelf).toBe(false);
        expect([...(q.order ?? [])].sort()).toEqual([...names].sort());
        expect(q.order).not.toEqual(row);
        expect(q.answer).toBe(row.join(','));
        // With ordinary precedence instead of adjacency, two placements fit.
        expect(solve(names, clues.map(clue => clue.replace('immediately ', ''))).length).toBeGreaterThan(1);
      } else {
        const request = /^What is (\w+)'s position from the (front|left|right)\? Write the number\.$/.exec(q.prompt);
        if (!request) throw new Error(`Cannot read the requested position: ${q.prompt}`);
        const [, target, end] = request;
        expect(q.order).toBeUndefined();
        expect(end === 'front').toBe(!shelf);
        const result = position(row, target, end === 'right');
        expect(q.answer).toBe(String(result));
        if (shelf) {
          tasks.add('named position');
          expect(clues.some(clue => clue.startsWith(`${target} is between `))).toBe(true);
          bearRanks.add(result);
          bearEnds.add(end);
        } else {
          tasks.add('remaining place');
          expect(clues.join(' ').split(/\W+/)).not.toContain(target);
          remainingRanks.add(result);
        }
      }
    }
    expect(tasks.size).toBe(3);
  }
  expect(remainingRanks.size).toBeGreaterThan(1);
  expect(bearRanks.size).toBeGreaterThan(1);
  expect(bearEnds).toEqual(new Set(['left', 'right']));
});

test('the same seed and index reproduce the clues, controls and worked answer', () => {
  for (const seed of [-7, 0, 804]) {
    for (let index = 6; index < 9; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});
