import { expect, it } from 'vitest';
import type { Question } from '../generate';
import { makeRagQuestion } from './ragP4PricedCategoryTotals';

function fields(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given for ${pattern} in ${text}`);
  return match.slice(1);
}

function cents(value: string): number {
  const [whole, fraction] = fields(value, /^(\d+)\.(\d{2})$/);
  return 100 * Number(whole) + Number(fraction);
}

function solve({ context, picture, prompt }: Pick<Question, 'context' | 'picture' | 'prompt'>) {
  const text = (context ?? []).join(' ');
  if (text.includes('paint set')) {
    expect(prompt).toMatch(/spend on the art supplies/);
    const [pens, sets] = fields(text, /buys (\d+) pens and (\d+) paint sets/).map(Number);
    const [price, factor] = fields(text, /One pen costs \$(\d+\.\d{2})\. One paint set costs as much as (\d+) pens/);
    return { scenario: 'art', amount: (pens + sets * Number(factor)) * cents(price) };
  }
  if (text.includes('bread rolls')) {
    expect(prompt).toMatch(/change/);
    const [rolls, rollPrice, buns, bunPrice] = fields(text, /(\d+) bread rolls at \$(\d+\.\d{2}) each and (\d+) fruit buns at \$(\d+\.\d{2}) each/);
    const [paid] = fields(text, /pays \$(\d+\.\d{2}) in cash/);
    return { scenario: 'bread', amount: cents(paid) - Number(rolls) * cents(rollPrice) - Number(buns) * cents(bunPrice) };
  }

  if (picture?.type !== 'nanyang-p4' || picture.layout !== 'table') throw new Error('Missing price table');
  const [day, adultsText] = fields(text, /On (Wednesday|Friday|Saturday|Sunday), (\d+) adults/);
  const adults = Number(adultsText);
  const period = ['Saturday', 'Sunday'].includes(day) ? 'Weekend' : 'Weekday';
  const column = picture.columns.indexOf(period);
  expect(column).toBeGreaterThanOrEqual(0);
  const readPrice = (label: string) => {
    const value = picture.rows.find(row => row.label === label)?.values[column];
    if (typeof value !== 'number' || value <= 0) throw new Error(`Missing price for ${label} on ${day}`);
    return Math.round(value * 100);
  };

  if (text.includes('children are aged')) {
    expect(prompt).toMatch(/pay for the tickets/);
    const ages = fields(text, /aged (\d+), (\d+) and (\d+)/).map(Number);
    const [tickets] = fields(text, /group buys (\d+) tickets/).map(Number);
    expect(tickets).toBe(adults + ages.length);
    const label = picture.rows.find(row => row.label.includes('younger'))?.label ?? '';
    const [limit] = fields(label, /^Age (\d+) or younger$/).map(Number);
    expect(ages).toContain(limit);
    expect(ages).toContain(limit + 1);
    const low = readPrice(label);
    const high = readPrice(`Over age ${limit}`);
    const amount = ages.reduce((sum, age) => sum + (age <= limit ? low : high), adults * high);
    return { scenario: `admission-${period}`, amount };
  }

  expect(prompt).toMatch(/save by buying the pass/);
  const [children] = fields(text, /adults and (\d+) children visit/).map(Number);
  const [passAdults, passChildren, price] = fields(text, /pass for (\d+) adults and (\d+) children costs \$(\d+\.\d{2})/);
  expect([Number(passAdults), Number(passChildren)]).toEqual([adults, children]);
  const amount = adults * readPrice('Adult') + children * readPrice('Child') - cents(price);
  return { scenario: `pass-${period}`, amount };
}

it('solves the displayed purchases and ticket tables across seeds and checks the pupil response', () => {
  const scenarios = new Set<string>();
  for (let seed = -8; seed <= 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const { scenario, amount } = solve(q);
      scenarios.add(scenario);
      expect(amount).toBeGreaterThan(0);
      const expected = (amount / 100).toFixed(2);
      expect(q.answer).toBe(expected);
      expect(q.unit).toBe('dollars');
      if (scenario.startsWith('pass-')) {
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices).toContain(expected);
      } else {
        expect(q.choices).toBeUndefined();
      }
    }
  }
  expect(scenarios).toEqual(new Set(['art', 'bread', 'admission-Weekday', 'admission-Weekend', 'pass-Weekday', 'pass-Weekend']));
});

it('reproduces a question for the same seed and index and rotates through four tasks', () => {
  for (const seed of [0, 17, -35]) {
    expect(makeRagQuestion(seed)).toEqual(makeRagQuestion(seed, 0));
    const prompts = new Set<string>();
    for (let index = 4; index < 8; index++) {
      const q = makeRagQuestion(seed, index);
      expect(makeRagQuestion(seed, index)).toEqual(q);
      prompts.add(q.prompt);
    }
    expect(prompts.size).toBe(4);
  }
});
