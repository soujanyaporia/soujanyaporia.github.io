import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragPictureGraphRemovals';

// Select rows from the child's question, total their symbols, then deduct the
// quantities in the story. This solver has no seed, variant or answer input.
function solve({ prompt, context, picture }: Pick<Question, 'prompt' | 'context' | 'picture'>) {
  if (picture?.type !== 'bars' || !picture.pictures || picture.scale !== 1) throw new Error('Expected a one-symbol-per-sticker graph');
  expect(context?.[0]).toContain('Each symbol stands for 1 sticker');
  expect(picture.labels).toHaveLength(4);
  expect(picture.values).toHaveLength(picture.labels.length);
  const stock = new Map<string, number>();
  picture.labels.forEach((label, i) => {
    const count = picture.values[i];
    expect(Number.isInteger(count) && count >= 1 && count <= 8).toBe(true);
    stock.set(label.toLowerCase(), count);
  });
  expect(stock.size).toBe(4);

  let scope: string[];
  if (prompt === 'How many stickers are left on the whole sheet?') scope = [...stock.keys()];
  else {
    const pair = /^How many (\w+) stickers and (\w+) stickers are left altogether\?$/.exec(prompt);
    const single = /^How many (\w+) stickers are left on the sheet\?$/.exec(prompt);
    if (pair) scope = [pair[1], pair[2]];
    else if (single) scope = [single[1]];
    else throw new Error(`Unclear scope: ${prompt}`);
  }
  expect(new Set(scope).size).toBe(scope.length);
  let remaining = 0;
  for (const label of scope) {
    const count = stock.get(label);
    if (count === undefined) throw new Error(`No row for ${label}`);
    remaining += count;
  }

  const story = /^Lina peels off (.+)\.$/.exec(context?.[1] ?? '');
  if (!story) throw new Error('No visible removal');
  const removedRows = new Set<string>();
  for (const phrase of story[1].split(' and ')) {
    const item = /^(\d+) (\w+) stickers?$/.exec(phrase);
    if (!item) throw new Error(`Unclear removal: ${phrase}`);
    const n = Number(item[1]), label = item[2];
    expect(scope).toContain(label);
    expect(removedRows.has(label)).toBe(false);
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThanOrEqual(stock.get(label)!);
    removedRows.add(label);
    remaining -= n;
  }
  expect(removedRows.size).toBe(scope.length === 2 ? 2 : 1);
  return { width: scope.length, remaining };
}

it('solves each scope from the visible graph, question and removal sentence', () => {
  const answers = new Set<number>();
  for (let seed = -12; seed <= 48; seed++) {
    const widths = new Set<number>();
    for (let index = 0; index < 3; index++) {
      const q = makeRagQuestion(seed, index);
      const { width, remaining } = solve(q);
      expect(q.answer).toBe(String(remaining));
      expect(q.unit).toBe('stickers');
      expect(q.choices).toBeUndefined();
      widths.add(width);
      answers.add(remaining);
    }
    expect([...widths].sort((a, b) => a - b)).toEqual([1, 2, 4]);
  }
  expect(answers.size).toBeGreaterThan(5);
});

it('reproduces the same graph and story when a question is reopened', () => {
  expect(makeRagQuestion(31, 4)).toEqual(makeRagQuestion(31, 4));
});
