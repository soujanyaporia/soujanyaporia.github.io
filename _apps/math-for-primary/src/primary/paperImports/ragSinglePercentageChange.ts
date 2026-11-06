import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-single-percentage-change',
  level: 5,
  title: 'Work out a shopping discount',
  objective: 'Find a combined usual cost, then calculate the discount and amount paid.',
  skillIds: ['P5.S.PCT.03', 'P5.S.PCT.04', 'P5.S.RATE.02'],
  canonicalPatternId: 'single-percentage-change',
} as const;

const cash = (cents: number): string => (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  // Alternate response variants across consecutive indices for any seed.
  const paired = ((seed & 1) ^ (index & 1)) === 0;
  const percent = r.pick([5, 10, 20, 25, 30, 40]);
  let context: string[];
  let totalCents: number;
  let firstStep: {text: string; equation: string};

  if (paired) {
    const paintCents = 100 * r.pick([18, 24, 28, 32, 38, 42, 48, 52]);
    const padCents = 100 * r.pick([7, 11, 13, 17, 19, 23, 29]);
    totalCents = paintCents + padCents;
    context = [
      'Leena buys 1 paint set and 1 drawing pad.',
      `The paint set costs $${cash(paintCents)} before the discount.`,
      `The drawing pad costs $${cash(padCents)} before the discount.`,
      `The shop gives a ${percent}% discount on both items.`,
    ];
    firstStep = {
      text: 'Add the two usual prices.',
      equation: `$${cash(paintCents)} + $${cash(padCents)} = $${cash(totalCents)}`,
    };
  } else {
    const unitCents = 100 * r.pick([14, 18, 22, 26, 34, 38, 42, 46]);
    const quantity = r.int(3, 7);
    totalCents = unitCents * quantity;
    context = [
      `One sketchbook costs $${cash(unitCents)} before the discount.`,
      `Idris buys ${quantity} sketchbooks.`,
      `The shop gives a ${percent}% discount on every sketchbook.`,
    ];
    firstStep = {
      text: 'Find the usual cost of all the sketchbooks.',
      equation: `${quantity} × $${cash(unitCents)} = $${cash(totalCents)}`,
    };
  }

  // Whole-dollar usual prices and integer percentages give exact cent amounts.
  const discountCents = totalCents * percent / 100;
  const paidCents = totalCents - discountCents;
  const workedSteps = [
    firstStep,
    {
      text: 'Find the discount on the total usual cost.',
      equation: `${percent}/100 × $${cash(totalCents)} = $${cash(discountCents)}`,
    },
    {
      text: 'Subtract the discount to find the amount paid.',
      equation: `$${cash(totalCents)} − $${cash(discountCents)} = $${cash(paidCents)}`,
    },
  ];
  const common = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    hint: 'First find the total usual cost. Find the discount on that total, then subtract it.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };

  if (paired) {
    return {
      ...common,
      prompt: '(a) What is the total discount? (b) How much does Leena pay for both items?',
      answer: JSON.stringify([cash(discountCents), cash(paidCents)]),
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Discount ($)',
        secondLabel: '(b) Amount paid ($)',
        decimal: true,
      },
    };
  }
  return {
    ...common,
    prompt: 'How much does Idris pay for all the sketchbooks?',
    answer: cash(paidCents),
    unit: 'dollars',
  };
}
