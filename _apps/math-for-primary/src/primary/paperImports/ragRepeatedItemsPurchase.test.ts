import { expect, it } from 'vitest';
import { correctAnswer } from '../generate';
import { makeRagQuestion } from './ragRepeatedItemsPurchase';

function numberIn(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing quantity in: ${text}`);
  return Number(match[1]);
}

function pricesIn(text: string): number[] {
  return Array.from(text.matchAll(/\$(\d+)\.(\d{2})\b/g), match => Number(match[1]) * 100 + Number(match[2]));
}

const asDollars = (cents: number) => `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

it('solves the displayed purchases and checks the required answer fields', () => {
  const seen = new Set<string>();
  for (let seed = -5; seed < 60; seed++) {
    for (let index = 0; index < 4; index++) {
      const question = makeRagQuestion(seed, index);
      const text = question.context?.join(' ') ?? '';
      const prices = pricesIn(text);
      expect(prices).toHaveLength(2);
      const [first, second] = prices;
      const expected: string[] = [];
      let groupCost: number;
      if (text.includes('small kites')) {
        seen.add('linked');
        const count = numberIn(text, /(\d+) small kites/);
        const small = first - second;
        expect(count).toBeGreaterThan(1);
        expect(count).toBeLessThan(10);
        expect(small).toBeGreaterThan(0);
        groupCost = count * small;
        expected.push(asDollars(small), asDollars(first + groupCost));
        expect(question.prompt).toMatch(/\(a\).*one small kite\?[\s\S]*\(b\).*all her kites\?/);
        expect(question.structuredResponse).toMatchObject({ kind: 'number-pair', firstLabel: expect.stringMatching(/small kite/), secondLabel: expect.stringMatching(/All the kites/), decimal: true });
        expect(correctAnswer(question, JSON.stringify([...expected].reverse()))).toBe(false);
        expect(correctAnswer(question, JSON.stringify(expected.slice(0, 1)))).toBe(false);
      } else if (text.includes('identical badges')) {
        seen.add('subset');
        const count = numberIn(text, /(\d+) identical badges/);
        const subset = numberIn(question.prompt, /(\d+) of the badges/);
        groupCost = first - second;
        expect(count).toBeLessThan(10);
        expect(subset).toBeGreaterThan(1);
        expect(subset).toBeLessThan(count);
        expect(groupCost).toBeGreaterThan(0);
        expect(groupCost).toBeLessThan(1000);
        expect(groupCost % count).toBe(0);
        const oneBadge = groupCost / count;
        expected.push(asDollars(subset * oneBadge));
        expect(correctAnswer(question, asDollars(oneBadge))).toBe(false);
      } else {
        const sale = text.includes('plants');
        seen.add(sale ? 'sale' : 'shopping');
        const count = numberIn(text, /(\d+) (?:plants|notebooks)/);
        expect(text).toContain('each');
        expect(text).toMatch(/one (watering can|pencil case)/);
        expect(count).toBeGreaterThan(1);
        expect(count).toBeLessThan(10);
        groupCost = 0;
        for (let item = 0; item < count; item++) groupCost += first;
        expected.push(asDollars(groupCost + second));
        expect(correctAnswer(question, asDollars(groupCost))).toBe(false);
      }
      const response = expected.length === 2 ? JSON.stringify(expected) : expected[0];
      if (expected.length === 1) expect(question.structuredResponse).toBeUndefined();
      expect(question.unit).toBe('dollars');
      expect(question.answer).toBe(response);
      expect(correctAnswer(question, response)).toBe(true);
      const equations = question.workedSteps?.map(step => step.equation).join('\n') ?? '';
      expect(equations).toContain('$' + asDollars(groupCost));
      expect(equations).toContain('$' + expected[expected.length - 1]);
    }
  }
  expect(seen).toEqual(new Set(['sale', 'shopping', 'linked', 'subset']));
});

it('replays a seed and varies the visible givens across question indices', () => {
  expect(makeRagQuestion(73)).toEqual(makeRagQuestion(73, 0));
  const contexts = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const question = makeRagQuestion(73, index);
    expect(question).toEqual(makeRagQuestion(73, index));
    contexts.add(JSON.stringify(question.context));
  }
  expect(contexts.size).toBeGreaterThan(1);
});
