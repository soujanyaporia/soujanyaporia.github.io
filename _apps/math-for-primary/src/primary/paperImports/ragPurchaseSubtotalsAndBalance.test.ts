import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragPurchaseSubtotalsAndBalance';

function readCents(label: string): number {
  const match = /^\$(\d+)(?:\.(\d{2}))?$/.exec(label);
  if (!match) throw new Error(`Unreadable price: ${label}`);
  return Number(match[1]) * 100 + Number(match[2] ?? 0);
}

it('solves each basket from the displayed quantities, prices and cash', () => {
  for (let seed = -12; seed <= 36; seed++) {
    const forms = new Set<string>();
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const story = q.context?.join(' ') ?? '';
      const group = /bought (\d+) ([a-z ]+) at (\$[\d.]+) each\./.exec(story);
      if (!group) throw new Error(`Missing quantity or unit price: ${story}`);
      const count = Number(group[1]);
      expect(count).toBeGreaterThanOrEqual(2);
      expect(count).toBeLessThanOrEqual(4);
      const prices = Array<number>(count).fill(readCents(group[3]));
      const single = /also bought one ([a-z ]+) for (\$\d+(?:\.\d{2})?)\./.exec(story);
      if (single) prices.push(readCents(single[2]));
      const spent = prices.reduce((total, price) => total + price, 0);

      const opening = /before she went shopping/.test(q.prompt);
      const change = /change/.test(q.prompt);
      const cents = /answer in cents/.test(q.prompt);
      if (!opening && !change) expect(q.prompt).toContain('left after she paid');
      const cashLine = opening ? /had (\$[\d.]+) left after shopping/.exec(story)
        : change ? /paid with a (\$\d+) note/.exec(story) : /took (\$\d+) to the shop/.exec(story);
      if (!cashLine) throw new Error(`Missing cash amount for: ${q.prompt}`);
      const cash = readCents(cashLine[1]);
      const expectedCents = opening ? spent + cash : cash - spent;
      expect(expectedCents).toBeGreaterThan(0);
      expect(Boolean(single)).toBe(cents || change);
      if (change) expect([1000, 5000]).toContain(cash);
      if (cents) {
        expect(opening).toBe(true);
        expect(group[3]).toMatch(/^\$0\.\d{2}$/);
        expect(single?.[2]).toMatch(/^\$1\.\d{2}$/);
      } else {
        expect(expectedCents % 100).toBe(0);
      }
      const expected = cents ? expectedCents : expectedCents / 100;
      expect(expected).toBeLessThan(1000);
      if (opening && !cents) {
        const correct = `$${expected}`;
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices?.filter(label => readCents(label) === expectedCents)).toEqual([correct]);
        expect(q.answer).toBe(correct);
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe(cents ? 'cents' : 'dollars');
        expect(q.answer).toBe(String(expected));
      }
      const lastStep = q.workedSteps?.at(-1)?.equation;
      expect(lastStep?.split(' = ').at(-1)).toBe(cents ? `${expected}¢` : `$${expected}`);
      forms.add(cents ? 'opening-cents' : opening ? 'opening' : change ? 'change' : 'balance');
    }
    expect(forms.size).toBe(4);
  }
});

it('reproduces a question for the same inputs and varies the visible purchases', () => {
  const stories = new Set<string>();
  for (let seed = 0; seed < 32; seed++) {
    const index = seed % 7;
    const q = makeRagQuestion(seed, index);
    expect(makeRagQuestion(seed, index)).toEqual(q);
    stories.add(q.context!.join(' '));
  }
  expect(stories.size).toBeGreaterThan(20);
});
