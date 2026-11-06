import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragCurrencySetValue';

function readCents(text: string): number {
  const cent = /^(\d+)¢$/.exec(text);
  if (cent) return Number(cent[1]);
  const dollar = /^\$(\d+)(?:\.(\d{2}))?$/.exec(text);
  if (!dollar) throw new Error('Unreadable amount: ' + text);
  return 100 * Number(dollar[1]) + Number(dollar[2] ?? 0);
}

function solve(q: Question) {
  const board = q.picture;
  if (board?.type !== 'paper' || board.layout !== 'cards') throw new Error('Missing cards');
  const fields = q.structuredResponse;
  if (fields) {
    if (fields.kind !== 'number-fields') throw new Error('Expected labelled answers');
    expect(board.cards).toHaveLength(2);
    expect(fields.fields.map(f => f.label).sort()).toEqual(board.cards.map(c => c.label).sort());
    const sums = (q.context ?? []).map(line => {
      const parts = /^Card ([1-4]): (\d+¢) \+ (\d+¢)$/.exec(line);
      if (!parts) throw new Error('Unreadable sum: ' + line);
      return { number: parts[1], cents: readCents(parts[2]) + readCents(parts[3]) };
    });
    expect(sums.map(s => s.number).sort()).toEqual(['1', '2', '3', '4']);
    expect(new Set(sums.map(s => s.cents)).size).toBe(4);
    const numbers = fields.fields.map(f => {
      const price = board.cards.find(c => c.label === f.label)!.value;
      const matching = sums.filter(card => card.cents === readCents(price));
      expect(matching).toHaveLength(1);
      return matching[0].number;
    });
    expect(new Set(numbers).size).toBe(2);
    return { kind: 'tags', answer: JSON.stringify(numbers) };
  }

  const totals = board.cards.map(card => {
    const tokens = card.value.split(', ');
    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.length).toBeLessThanOrEqual(8);
    for (const token of tokens) expect(['5¢', '10¢', '20¢', '50¢', '$1', '$2', '$5', '$10', '$50']).toContain(token);
    return tokens.reduce((sum, token) => sum + readCents(token), 0);
  });
  expect(new Set(totals).size).toBe(totals.length);
  expect(q.choices).toEqual(board.cards.map(c => c.label));
  expect(new Set(q.choices).size).toBe(totals.length);
  const target = /\$\d+\.\d{2}/.exec(q.prompt);
  let kind: string;
  let needed: number;
  if (target) {
    kind = 'target';
    needed = readCents(target[0]);
    expect(needed).toBeLessThan(100);
    expect(totals).toContain(100 * needed);
  } else if (/\bmost\b/.test(q.prompt)) {
    kind = 'most';
    needed = Math.max(...totals);
    expect(board.cards.some(c => c.value.includes('$') && c.value.includes('¢'))).toBe(true);
  } else if (/\bleast\b/.test(q.prompt)) {
    kind = 'least';
    needed = Math.min(...totals);
    expect(board.cards.every(c => c.value.split(', ').every(token => readCents(token) <= 100))).toBe(true);
  } else {
    throw new Error('Missing selection rule');
  }
  expect(board.cards).toHaveLength(kind === 'most' ? 3 : 4);
  const matching = board.cards.filter((_, i) => totals[i] === needed);
  expect(matching).toHaveLength(1);
  return { kind, answer: matching[0].label };
}

it('solves all four tasks from the displayed amounts and the requested comparison', () => {
  const variants = new Map<string, Set<string>>();
  for (let seed = -8; seed < 40; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const solved = solve(q);
      expect(q.answer).toBe(solved.answer);
      if (!variants.has(solved.kind)) variants.set(solved.kind, new Set());
      variants.get(solved.kind)!.add(JSON.stringify([q.picture, q.context]));
      if (q.structuredResponse) {
        const swapped = JSON.stringify((JSON.parse(solved.answer) as string[]).reverse());
        expect(structuredResponseCorrect(q.structuredResponse, solved.answer, swapped)).toBe(false);
      }
    }
  }
  expect([...variants.keys()].sort()).toEqual(['least', 'most', 'tags', 'target']);
  for (const forms of variants.values()) expect(forms.size).toBeGreaterThan(8);
});

it('replays the same cards and solution for the same seed and index', () => {
  for (const seed of [0, 19, 101, -33]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    for (let index = 0; index < 4; index++) {
      expect(makeRagQuestion(seed, index)).toEqual(makeRagQuestion(seed, index));
    }
  }
});

it('keeps every worked equality and money comparison true in cents', () => {
  for (let seed = 0; seed < 12; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const steps = q.workedSteps ?? [];
      expect(steps.length).toBeGreaterThanOrEqual(4);
      for (const { equation } of steps) {
        if (!equation) continue;
        const comparison = equation.includes(' < ');
        const sides = equation.split(comparison ? ' < ' : ' = ').map(side =>
          side.split(' + ').reduce((value, term) => value + readCents(term), 0));
        expect(sides.length).toBeGreaterThan(1);
        for (let i = 1; i < sides.length; i++) {
          if (comparison) expect(sides[i]).toBeGreaterThan(sides[i - 1]);
          else expect(sides[i]).toBe(sides[0]);
        }
      }
    }
  }
});
