import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragP4FreeItemOffer';

function readNumber(text: string, pattern: RegExp): number {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given for ${pattern} in ${text}`);
  return Number(match[1]);
}

it('solves each visible order by paying for one item at a time and awarding each earned bonus', () => {
  const cases = new Set<string>();
  for (let seed = 0; seed < 120; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const offer = (q.context ?? []).join(' ');
      const price = readNumber(offer, /costs \$(\d+)\./);
      const threshold = readNumber(offer, /For every (\d+) sketchbooks you pay for/);
      const bonus = readNumber(offer, /gives you (\d+) extra sketchbook free/);
      expect(price).toBeGreaterThan(0);
      expect(threshold).toBeGreaterThan(1);
      expect(bonus).toBe(1);

      let spent = 0;
      let received = 0;
      let paidSinceBonus = 0;
      function payForOne() {
        spent += price;
        received++;
        paidSinceBonus++;
        if (paidSinceBonus === threshold) {
          received += bonus;
          paidSinceBonus = 0;
        }
      }

      if (q.prompt.includes('least')) {
        const target = readNumber(q.prompt, /exactly (\d+) sketchbooks/);
        // Stop at the first purchase that reaches the target to check minimality.
        while (received < target) payForOne();
        expect(received).toBe(target);
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(String(spent));
        cases.add(paidSinceBonus === 0 ? 'exact target group' : 'target with singles');
      } else {
        const budget = readNumber(q.prompt, /spends \$(\d+) on sketchbooks/);
        expect(q.prompt).toContain('including the free ones');
        while (spent + price <= budget) payForOne();
        expect(spent).toBe(budget);
        expect(q.unit).toBe('sketchbooks');
        expect(q.answer).toBe(String(received));
        cases.add(paidSinceBonus === 0 ? 'exact paid group' : 'incomplete paid group');
      }
    }
  }
  expect(cases).toEqual(new Set(['exact target group', 'target with singles', 'exact paid group', 'incomplete paid group']));
});

it('repeats the same question for the same inputs and varies visible orders across indices', () => {
  expect(makeRagQuestion(29)).toEqual(makeRagQuestion(29, 0));
  const orders = new Set<string>();
  for (let index = 0; index < 12; index++) {
    const q = makeRagQuestion(29, index);
    expect(makeRagQuestion(29, index)).toEqual(q);
    orders.add(JSON.stringify([q.context, q.prompt]));
  }
  expect(orders.size).toBeGreaterThan(1);
});
