import { expect, test } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4StartingMoneySpendingBalance';

function readCents(line: string): number {
  const amount = /\$(\d+)(?:\.(\d{2}))?/.exec(line);
  if (!amount) throw new Error(`Missing dollar amount in: ${line}`);
  return 100 * Number(amount[1]) + Number(amount[2] ?? 0);
}

function solve(q: Question) {
  const [first = '', second = '', third = ''] = q.context ?? [];
  if (q.picture?.type === 'paper' && q.picture.layout === 'cards') {
    const cards = q.picture.cards;
    const order = /^Leela buys one (.+?) and one (.+?)\.$/.exec(first);
    if (!order) throw new Error('Cannot identify the two purchases');
    expect(q.prompt).toMatch(/change/);
    expect(cards).toHaveLength(4);
    expect(new Set(cards.map(card => card.label)).size).toBe(4);
    expect(order[1]).not.toBe(order[2]);
    const prices = order.slice(1).map(name => {
      const card = cards.find(item => item.label === name);
      if (!card) throw new Error(`No displayed price for ${name}`);
      expect(card.value).toMatch(/^\$\d+\.\d{2}$/);
      return readCents(card.value);
    });
    const cost = prices[0] + prices[1];
    const change = readCents(second) - cost;
    expect(q.workedSteps?.[0].equation).toContain(`= $${(cost / 100).toFixed(2)}`);
    return { kind: 'menu', cents: change };
  }
  if (q.prompt.includes('before she bought')) {
    expect(first).toMatch(/paid/);
    expect(second).toMatch(/left in her purse/);
    return { kind: 'start', cents: readCents(first) + readCents(second) };
  }
  const recipientList = /^The (.+) clubs share a grant/.exec(first);
  if (recipientList) {
    const clubs = recipientList[1].split(/, | and /);
    const spender = /^The (.+?) club spends/.exec(second);
    if (!spender) throw new Error('Missing spending club');
    expect(clubs).toContain(spender[1]);
    expect(new Set(clubs).size).toBe(clubs.length);
    expect(clubs.length).toBeGreaterThan(1);
    expect(clubs.length).toBeLessThan(10);
    expect(first).toContain('equally');
    expect(q.prompt).toContain(`${spender[1]} club have left`);
    const grant = readCents(first) / 100;
    expect(grant).toBeLessThan(10000);
    expect(grant).toBeGreaterThanOrEqual(1000);
    expect(grant % clubs.length).toBe(0);
    const share = grant / clubs.length;
    expect(q.workedSteps?.[0].equation).toContain(`= $${share}`);
    return { kind: 'share', cents: 100 * share - readCents(second) };
  }
  if (q.prompt.includes('allowance')) {
    expect(first).toContain('saved the rest');
    expect(second).toContain('brother saved');
    expect(third).toContain('Together they saved');
    const ownSavings = readCents(third) - readCents(second);
    expect(ownSavings).toBeGreaterThan(0);
    expect(q.workedSteps?.[0].equation).toContain(`= $${(ownSavings / 100).toFixed(2)}`);
    return { kind: 'savings', cents: readCents(first) - ownSavings };
  }
  throw new Error(`Unknown pupil task: ${q.prompt}`);
}

test('solve each question from its story and any displayed prices', () => {
  for (let seed = -20; seed <= 40; seed++) {
    const kinds = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { kind, cents } = solve(q);
      kinds.add(kind);
      expect(Number.isSafeInteger(cents)).toBe(true);
      expect(cents).toBeGreaterThan(0);
      const amount = (cents / 100).toFixed(2);
      if (kind === 'menu') {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(choice => readCents(choice) === cents)).toEqual(['$' + amount]);
        expect(q.answer).toBe('$' + amount);
      } else {
        expect(q.picture).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(kind === 'share' ? String(cents / 100) : amount);
      }
    }
    expect(kinds).toEqual(new Set(['menu', 'start', 'share', 'savings']));
  }
});

test('repeat a seed and index exactly while varying the visible problems', () => {
  const stories = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(17, index);
    expect(makeRagQuestion(17, index)).toEqual(q);
    stories.add(JSON.stringify([q.context, q.picture]));
  }
  expect(stories.size).toBeGreaterThan(12);
});
