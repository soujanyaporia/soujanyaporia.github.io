import { expect, it } from 'vitest';
import { structuredResponseCorrect } from './batch6MiddleResponse';
import { makeRagQuestion } from './ragSameUnitPriceTotal';

function readPrice(line: string) {
  const match = /^A (.+) costs \$(\d+)\.(\d{2})\.$/.exec(line);
  if (!match) throw new Error(`Cannot read the item price from ${line}`);
  return { item: match[1], cents: Number(match[2]) * 100 + Number(match[3]) };
}

function writeDollars(cents: number) {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
}

it('solves each requested part from the purchase and prices shown to the pupil', () => {
  const forms = new Set<string>();
  const carries = new Set<boolean>();
  const totals = new Set<string>();
  for (let seed = -8; seed < 56; seed++) {
    for (let index = 0; index < 4; index++) {
      const q = makeRagQuestion(seed, index);
      const [purchase, ...tags] = q.context ?? [];
      expect(tags).toHaveLength(2);
      const [first, second] = tags.map(readPrice);
      expect(purchase).toBe(`Mina buys one ${first.item} and one ${second.item}.`);
      expect(first.cents).toBeGreaterThan(second.cents);
      expect(second.cents).toBeGreaterThan(0);
      const total = writeDollars(first.cents + second.cents);
      totals.add(total);
      carries.add(first.cents % 100 + second.cents % 100 >= 100);
      expect(q.unit).toBe('dollars');
      expect(q.prompt).toContain('How much does Mina spend on the two items?');
      const equations = q.workedSteps?.map(step => step.equation);
      const firstPrice = `$${writeDollars(first.cents)}`;
      const secondPrice = `$${writeDollars(second.cents)}`;
      expect(equations).toContain(`${firstPrice} + ${secondPrice} = $${total}`);

      if (q.prompt.includes('(b)')) {
        forms.add('pair');
        expect(q.prompt).toMatch(/^\(a\)/);
        expect(q.prompt).toContain(`(b) How much more does the ${first.item} cost than the ${second.item}?`);
        const difference = writeDollars(first.cents - second.cents);
        expect(equations).toContain(`${firstPrice} − ${secondPrice} = $${difference}`);
        const spec = q.structuredResponse;
        if (spec?.kind !== 'number-pair') throw new Error('Two dollar fields are required');
        expect(spec.decimal).toBe(true);
        expect(spec.firstLabel).toContain('Total');
        expect(spec.secondLabel).toContain('difference');
        const expected = JSON.stringify([total, difference]);
        expect(q.answer).toBe(expected);
        expect(structuredResponseCorrect(spec, q.answer, expected)).toBe(true);
        expect(structuredResponseCorrect(spec, q.answer, JSON.stringify([difference, total]))).toBe(false);
      } else {
        forms.add('single');
        expect(q.structuredResponse).toBeUndefined();
        expect(q.choices).toBeUndefined();
        expect(q.answer).toBe(total);
      }
    }
  }
  expect(forms).toEqual(new Set(['single', 'pair']));
  expect(carries).toEqual(new Set([true, false]));
  expect(totals.size).toBeGreaterThan(32);
});

it('reproduces a question for the same inputs and varies visible prices across indices', () => {
  expect(makeRagQuestion(27)).toEqual(makeRagQuestion(27, 0));
  expect(makeRagQuestion(27, 5)).toEqual(makeRagQuestion(27, 5));
  const priceLists = Array.from({ length: 12 }, (_, index) =>
    makeRagQuestion(27, index).context?.slice(1).join(' '));
  expect(new Set(priceLists).size).toBeGreaterThan(1);
});
