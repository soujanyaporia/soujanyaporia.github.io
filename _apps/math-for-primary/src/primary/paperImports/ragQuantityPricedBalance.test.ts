import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragQuantityPricedBalance';

function read(text: string, pattern: RegExp): string[] {
  const match = pattern.exec(text);
  if (!match) throw new Error(`Missing visible given ${pattern} in ${text}`);
  return match.slice(1);
}

// The displayed prices have exactly two decimal places. Read them as whole cents.
function cents(amount: string): number {
  const [whole, fraction] = read(amount, /^(\d+)\.(\d{2})$/);
  return Number(whole) * 100 + Number(fraction);
}

function countEqualAmounts(count: string, amount: string): number {
  return Array.from({ length: Number(count) }, () => cents(amount)).reduce((sum, part) => sum + part, 0);
}

function solve(prompt: string, facts: string) {
  if (prompt.includes('change')) {
    const [pineapple] = read(facts, /one pineapple for \$(\d+\.\d{2})/);
    const [kg, perKg] = read(facts, /(\d+) kg of oranges at \$(\d+\.\d{2}) per kg/);
    const [paid] = read(facts, /gives the seller \$(\d+\.\d{2})/);
    const orangeCost = countEqualAmounts(kg, perKg);
    return { form: 'change', amount: cents(paid) - cents(pineapple) - orangeCost };
  }

  const [count, each] = read(facts, /(\d+) pens at \$(\d+\.\d{2}) each/);
  const pens = countEqualAmounts(count, each);
  const [left] = read(facts, /has \$(\d+\.\d{2}) left/);
  expect(cents(left)).toBeGreaterThan(0);
  if (prompt.includes('before')) {
    const [pencilCase] = read(facts, /one pencil case for \$(\d+\.\d{2})/);
    return { form: 'start', amount: cents(left) + pens + cents(pencilCase) };
  }
  if (prompt.includes('pay for the pencil case')) {
    const [notes, face] = read(facts, /(\d+) notes worth \$(\d+\.\d{2}) each/);
    return { form: 'missing', amount: countEqualAmounts(notes, face) - pens - cents(left) };
  }
  throw new Error(`Unexpected prompt: ${prompt}`);
}

it('solves each form from the shopping story and checks the response offered to the pupil', () => {
  const stories = new Map<string, Set<string>>();
  for (let seed = -12; seed < 36; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const facts = (q.context ?? []).join(' ');
      const { form, amount } = solve(q.prompt, facts);
      expect(amount).toBeGreaterThan(0);
      const value = (amount / 100).toFixed(2);
      if (form === 'change') {
        const options = q.choices ?? [];
        expect(options).toHaveLength(4);
        expect(new Set(options).size).toBe(4);
        for (const option of options) expect(option).toMatch(/^\$(?:[1-9]\d*|0)\.\d{2}$/);
        expect(options.filter(option => option === '$' + value)).toHaveLength(1);
        expect(q.answer).toBe('$' + value);
      } else {
        expect(q.choices).toBeUndefined();
        expect(q.unit).toBe('dollars');
        expect(q.answer).toBe(value);
      }
      expect(q.workedSteps?.at(-1)?.equation?.endsWith(' = $' + value)).toBe(true);
      const examples = stories.get(form) ?? new Set<string>();
      examples.add(facts);
      stories.set(form, examples);
    }
  }
  expect([...stories.keys()].sort()).toEqual(['change', 'missing', 'start']);
  for (const examples of stories.values()) expect(examples.size).toBeGreaterThan(3);
});

it('replays a seed and index exactly and varies the visible givens across indices', () => {
  expect(makeRagQuestion(21)).toEqual(makeRagQuestion(21, 0));
  const stories = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(21, index);
    expect(makeRagQuestion(21, index)).toEqual(q);
    stories.add((q.context ?? []).join(' '));
  }
  expect(stories.size).toBeGreaterThan(3);
});
