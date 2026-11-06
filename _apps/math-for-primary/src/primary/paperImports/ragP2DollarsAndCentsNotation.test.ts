import { expect, it } from 'vitest';
import { correctAnswer, type Question } from '../generate';
import { makeRagQuestion } from './ragP2DollarsAndCentsNotation';

type Kind = 'tag' | 'box' | 'words';
type Reading = { kind: Kind; dollars: number; cents: number };
const values: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
function readName(name: string): number {
  const parts = name.split('-').map(word => values[word]);
  if (parts.some(n => n === undefined) || parts.length > 2 || (parts.length === 2 &&
      (parts[0] < 20 || parts[0] % 10 !== 0 || parts[1] < 1 || parts[1] > 9))) throw Error(`Invalid number name: ${name}`);
  return parts.reduce((a, b) => a + b, 0);
}
// Read only what the child sees before answering.
function solve(q: Question): Reading {
  const text = [...(q.context ?? []), q.prompt].join(' ');
  const tag = /\$(\d+)\.(\d{2})(?!\d)/.exec(text);
  if (tag) return { kind: 'tag', dollars: Number(tag[1]), cents: Number(tag[2]) };
  const box = /\b(\d+) cents\b/.exec(text);
  if (box) {
    const total = Number(box[1]);
    expect(total).toBeGreaterThanOrEqual(100);
    expect(total).toBeLessThan(1000);
    return { kind: 'box', dollars: Math.floor(total / 100), cents: total % 100 };
  }
  const spoken = /\b([a-z-]+) dollars? and ([a-z-]+) cents?\b/i.exec(text);
  if (!spoken) throw Error(`Cannot read amount: ${text}`);
  return { kind: 'words', dollars: readName(spoken[1]), cents: readName(spoken[2]) };
}

it('solves each visible amount and checks the response in the requested form', () => {
  const seen: Record<Kind, Set<string>> = { tag: new Set(), box: new Set(), words: new Set() };
  for (let seed = -6; seed <= 24; seed++) for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(seed, index);
    const { kind, dollars, cents } = solve(q);
    expect(dollars).toBeGreaterThan(0);
    expect(dollars).toBeLessThan(100);
    expect(cents).toBeGreaterThanOrEqual(0);
    expect(cents).toBeLessThan(100);
    seen[kind].add(cents === 0 ? 'zero' : cents < 10 ? 'single digit' : cents % 10 === 0 ? 'ends in zero' : 'two digits');
    expect(q.picture).toBeUndefined();
    expect(q.choices).toBeUndefined();
    if (kind === 'words') {
      const expected = '$' + ((dollars * 100 + cents) / 100).toFixed(2);
      expect(q.structuredResponse).toBeUndefined();
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      if (cents < 10) expect(correctAnswer(q, `$${dollars}.${cents}`)).toBe(false);
      if (cents % 10 === 0) expect(correctAnswer(q, expected.slice(0, -1))).toBe(false);
    } else {
      expect(q.structuredResponse).toEqual({ kind: 'number-pair', firstLabel: 'Whole dollars', secondLabel: 'Remaining cents' });
      const expected = JSON.stringify([String(dollars), String(cents)]);
      expect(q.answer).toBe(expected);
      expect(correctAnswer(q, expected)).toBe(true);
      expect(correctAnswer(q, JSON.stringify([String(dollars), String(cents + 1)]))).toBe(false);
      if (dollars !== cents) expect(correctAnswer(q, JSON.stringify([String(cents), String(dollars)]))).toBe(false);
    }
  }
  for (const kinds of Object.values(seen)) expect(kinds.size).toBe(4);
});

it('repeats a seed and index exactly and offers all three tasks over consecutive indices', () => {
  for (const seed of [-17, 0, 7, 42]) {
    const kinds = new Set<Kind>();
    for (let i = 0; i < 3; i++) {
      const q = makeRagQuestion(seed, i);
      expect(makeRagQuestion(seed, i)).toEqual(q);
      kinds.add(solve(q).kind);
    }
    expect(kinds.size).toBe(3);
  }
});
