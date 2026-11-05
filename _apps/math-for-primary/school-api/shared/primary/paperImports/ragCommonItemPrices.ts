import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-common-item-prices',
  level: 3,
  title: 'Find prices from two purchases',
  objective: 'Compare purchases with common items, find one item price and use a price difference.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.MD.04'],
  canonicalPatternId: 'common-item-total-difference-then-unit-price-gap-pair',
} as const;

const dollars = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
const money = (cents: number): string => `$${dollars(cents)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const extraCount = r.int(2, 4);
  const brushCount = extraCount + 1;
  // Whole cents throughout; sharing the group cost requires no rounding.
  const brushCents = r.int(21, 49) * 5;
  const gapCents = r.int(21, 79) * 10;
  const boxCents = brushCents + gapCents;
  const smallTotal = boxCents + brushCents;
  const largeTotal = boxCents + brushCount * brushCents;
  const groupCents = largeTotal - smallTotal;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: '(a) Both purchases include one art box and one paintbrush. The larger purchase has these extra paintbrushes.',
      equation: `${brushCount} − 1 = ${extraCount}`,
    },
    {
      text: 'Subtract the totals to find the cost of the extra paintbrushes.',
      equation: `${money(largeTotal)} − ${money(smallTotal)} = ${money(groupCents)}`,
    },
    {
      text: '(b) Change that group cost to cents and share it equally to find the price of one paintbrush.',
      equation: `${money(groupCents)} = ${groupCents} cents; ${groupCents} ÷ ${extraCount} = ${brushCents} cents = ${money(brushCents)}`,
    },
    {
      text: 'Add the extra amount that an art box costs.',
      equation: `${money(brushCents)} + ${money(gapCents)} = ${money(boxCents)}`,
    },
    {
      text: 'Check the price using the smaller purchase.',
      equation: `${money(boxCents)} + ${money(brushCents)} = ${money(smallTotal)}`,
    },
  ];

  return {
    key,
    context: [
      'At an art shop, every art box has the same price. Every paintbrush has the same price.',
      `One purchase contains 1 art box and ${brushCount} paintbrushes. It costs ${money(largeTotal)}.`,
      `A second purchase contains 1 art box and 1 paintbrush. It costs ${money(smallTotal)}.`,
    ],
    prompt: `(a) What is the total price of ${extraCount} paintbrushes?\n(b) An art box costs ${money(gapCents)} more than one paintbrush. What is the price of an art box?\nGive both answers in dollars.`,
    answer: JSON.stringify([dollars(groupCents), dollars(boxCents)]),
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Paintbrushes — dollars',
      secondLabel: '(b) Art box — dollars',
      decimal: true,
    },
    unit: 'dollars',
    hint: 'Find which items are the same in both purchases. Subtract the totals, then find the price of one paintbrush before adding the extra cost of an art box.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  };
}
