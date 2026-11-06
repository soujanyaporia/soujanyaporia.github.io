import { expect, test } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragP2DifferencesAmongThreeAmounts';

function dollars(text: string, clue: RegExp): number {
  const match = clue.exec(text);
  if (!match) throw new Error(`Missing money clue: ${clue}`);
  return Number(match[1]);
}

function checkAmounts(...amounts: number[]) {
  for (const amount of amounts) {
    expect(Number.isInteger(amount)).toBe(true);
    expect(amount).toBeGreaterThan(0);
    expect(amount).toBeLessThan(1000);
  }
}

test('solves the price question or both savings parts from the displayed clues', () => {
  const priceStories = new Set<string>();
  const savingsStories = new Set<string>();
  for (let seed = -10; seed <= 30; seed++) {
    for (const index of [0, 1, 2, 3]) {
      const q = makeRagQuestion(seed, index);
      const text = (q.context ?? []).join('\n');
      if (text.startsWith('The price tag')) {
        priceStories.add(text);
        expect(q.prompt).toContain('for the chair than for the stool');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.unit).toBe('dollars');
        const table = dollars(text, /tag on a table shows \$(\d+)\./);
        const reduction = dollars(text, /stool costs \$(\d+) less than the table\./);
        const chair = dollars(text, /tag on a chair shows \$(\d+)\./);
        const stool = table - reduction;
        const difference = chair - stool;
        checkAmounts(table, reduction, chair, stool, difference);
        expect(correctAnswer(q, String(difference))).toBe(true);
        expect(correctAnswer(q, String(table - stool))).toBe(false);
      } else {
        savingsStories.add(text);
        expect(q.prompt).toContain('did Tess save than Mei');
        expect(q.prompt).toContain('three children save altogether');
        expect(q.structuredResponse).toMatchObject({
          kind: 'number-pair', firstLabel: expect.stringContaining('(a)'), secondLabel: expect.stringContaining('(b)'),
        });
        const mei = dollars(text, /Mei saved \$(\d+)\./);
        const amir = mei + dollars(text, /Amir saved \$(\d+) more than Mei\./);
        const tess = amir + dollars(text, /Amir saved \$(\d+) less than Tess\./);
        const difference = tess - mei;
        const total = mei + amir + tess;
        checkAmounts(mei, amir, tess, difference, total);
        const pair = (a: number, b: number) => JSON.stringify([String(a), String(b)]);
        expect(correctAnswer(q, pair(difference, total))).toBe(true);
        expect(correctAnswer(q, pair(total, difference))).toBe(false);
        expect(correctAnswer(q, pair(difference, mei + tess))).toBe(false);
        expect(correctAnswer(q, JSON.stringify([String(difference), '']))).toBe(false);
      }
    }
  }
  expect(priceStories.size).toBeGreaterThan(10);
  expect(savingsStories.size).toBeGreaterThan(10);
});

test('replays a seed and offers both response formats on consecutive indices', () => {
  for (const seed of [-3, 0, 17, 82]) {
    const first = makeRagQuestion(seed);
    expect(makeRagQuestion(seed, 0)).toEqual(first);
    const next = makeRagQuestion(seed, 1);
    expect(next.key).not.toBe(first.key);
    expect(Boolean(next.structuredResponse)).toBe(!first.structuredResponse);
  }
});
