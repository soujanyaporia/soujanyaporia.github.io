import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragStartingMoney';

function amountsInCents(line: string): number[] {
  return Array.from(line.matchAll(/\$(\d+)(?:\.(\d{2}))?/g), match =>
    Number(match[1]) * 100 + Number(match[2] ?? 0));
}

it('recovers the starting amount from the two visible prices and the balance', () => {
  const observedForms = new Set<string>();
  for (let seed = -10; seed < 70; seed++) {
    for (const index of [0, 1, 5]) {
      const q = makeRagQuestion(seed, index);
      const [purchase = '', afterPayment = ''] = q.context ?? [];
      expect(purchase).toContain('bought');
      expect(afterPayment).toMatch(/after paying.*left/i);
      expect(q.prompt).toContain('before buying');
      const prices = amountsInCents(purchase);
      const balance = amountsInCents(afterPayment);
      expect(prices).toHaveLength(2);
      expect(balance).toHaveLength(1);
      expect([...prices, ...balance].every(cents => cents > 0)).toBe(true);

      const [first, second] = prices;
      const [left] = balance;
      const spent = first + second;
      const original = spent + left;
      const expected = `${Math.floor(original / 100)}.${String(original % 100).padStart(2, '0')}`;
      expect(original).toBeLessThan(40000);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe('dollars');
      expect(q.workedSteps?.map(step => amountsInCents(step.equation ?? ''))).toEqual([
        [first, second, spent], [spent, left, original],
      ]);
      expect(q.workedSteps?.every(step => step.equation?.includes(' + '))).toBe(true);

      if (q.choices) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices.map(Number)).size).toBe(4);
        expect(q.choices.filter(choice => choice === expected)).toHaveLength(1);
        expect(q.choices.every(choice => /^\d+\.\d{2}$/.test(choice))).toBe(true);
        if (first % 100 === 0) {
          expect(second % 100 + left % 100).toBe(100);
          observedForms.add('mixed prices with a carry');
        } else {
          expect(second % 100).toBeGreaterThan(0);
          observedForms.add('two prices with cents');
        }
      } else {
        expect([...prices, left].every(cents => cents % 100 === 0)).toBe(true);
        expect(q.prompt).toContain('Show your working');
        observedForms.add('written whole dollars');
      }
    }
  }
  expect(observedForms.size).toBe(3);
});

it('reproduces a question and varies the visible shopping trip across indices', () => {
  const trips = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(57, index);
    expect(makeRagQuestion(57, index)).toEqual(q);
    trips.add((q.context ?? []).join(' '));
  }
  expect(makeRagQuestion(57)).toEqual(makeRagQuestion(57, 0));
  expect(trips.size).toBeGreaterThan(1);
});
