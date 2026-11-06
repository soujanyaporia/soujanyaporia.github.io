import { expect, it } from 'vitest';
import { makeRagQuestion } from './ragRegroupTensAndOnes';

it('solves both response formats by counting from the two quantities in the prompt', () => {
  const formats = new Set<string>();
  const counts = new Set<number>();
  const totals = new Set<number>();
  for (let seed = -12; seed <= 48; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const given = q.prompt.match(/\b(\d+) tens and (\d+) ones\b/);
      if (!given) throw new Error(`Missing place-value counts in ${q.prompt}`);
      const tens = Number(given[1]);
      const ones = Number(given[2]);
      expect(tens).toBeGreaterThan(0);
      expect(ones).toBeGreaterThanOrEqual(10);
      expect(ones).toBeLessThan(20);

      // Count on by tens from the loose ones, independently of the worked method.
      let expected = ones;
      for (let group = 0; group < tens; group++) expected += 10;
      expect(expected).toBeLessThan(100);
      expect(q.answer).toBe(String(expected));
      const digit = expected % 10;
      const tensDigit = Math.floor(expected / 10);
      expect(q.workedSteps?.map(step => step.equation)).toEqual([
        `${ones} − 10 = ${digit}`,
        `${tens} + 1 = ${tensDigit}`,
        `${expected - digit} + ${digit} = ${expected}`,
      ]);

      if (q.choices) {
        expect(q.prompt).toMatch(/^Which number/);
        expect(q.choices).toHaveLength(4);
        expect(new Set(q.choices).size).toBe(4);
        expect(q.choices.filter(value => Number(value) === expected)).toHaveLength(1);
        for (const value of q.choices) expect(value).toMatch(/^[1-9]\d?$/);
      } else {
        expect(q.prompt).toMatch(/^Write the number/);
      }
      formats.add(q.choices ? 'choice' : 'entry');
      counts.add(ones);
      totals.add(expected);
    }
  }
  expect(formats.size).toBe(2);
  expect(counts.has(10)).toBe(true);
  expect(counts.has(19)).toBe(true);
  expect(totals.size).toBeGreaterThan(10);
});

it('replays each indexed question and varies its visible givens across a session', () => {
  const prompts = new Set<string>();
  for (let index = 0; index < 16; index++) {
    const q = makeRagQuestion(72, index);
    expect(makeRagQuestion(72, index)).toEqual(q);
    prompts.add(q.prompt);
  }
  expect(prompts.size).toBeGreaterThan(4);
  expect(makeRagQuestion(72)).toEqual(makeRagQuestion(72, 0));
});
