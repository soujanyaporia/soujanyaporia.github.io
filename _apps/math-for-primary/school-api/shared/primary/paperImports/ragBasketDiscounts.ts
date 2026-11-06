import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-basket-discounts',
  level: 5,
  title: 'Work out shopping discounts',
  objective: 'Choose discounts using prices or ages, add the costs, and use combined savings to find an equal item price.',
  skillIds: ['P5.S.PCT.03', 'P5.S.PCT.04'],
  canonicalPatternId: 'p5-basket-discounts',
} as const;

const dollars = (cents: number): string => (cents / 100).toFixed(2);
const money = (cents: number): string => `$${dollars(cents)}`;
const explain = (steps: NonNullable<Question['workedSteps']>): string =>
  steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 2 + 2) % 2;

  if (variant === 0) {
    const smallerRate = r.pick([5, 15, 20]);
    const largerRate = r.pick([30, 40, 50]);
    const cheaperCents = r.int(23, 54) * 100;
    const dearerCents = cheaperCents + r.int(6, 26) * 100;
    const kiteIsCheaper = r.int(0, 1) === 0;
    const kiteCents = kiteIsCheaper ? cheaperCents : dearerCents;
    const puzzleCents = kiteIsCheaper ? dearerCents : cheaperCents;
    const cheaperToy = kiteIsCheaper ? 'kite' : 'puzzle';
    const dearerToy = kiteIsCheaper ? 'puzzle' : 'kite';
    const cheaperPaid = cheaperCents * (100 - largerRate) / 100;
    const dearerPaid = dearerCents * (100 - smallerRate) / 100;
    const paid = cheaperPaid + dearerPaid;
    const busCents = r.int(26, 85) * 100;
    const rateSum = smallerRate + largerRate;
    const savingCents = busCents * rateSum / 100;
    const onePercentCents = busCents / 100;
    const workedSteps: NonNullable<Question['workedSteps']> = [
      {
        text: `(a) The ${cheaperToy} has the lower usual price, so it gets ${largerRate}% off. The ${dearerToy} gets ${smallerRate}% off.`,
        equation: `${money(cheaperCents)} < ${money(dearerCents)}`,
      },
      {
        text: `Find the amount paid for the ${cheaperToy}.`,
        equation: `${100 - largerRate}% of ${money(cheaperCents)} = ${money(cheaperPaid)}`,
      },
      {
        text: `Find the amount paid for the ${dearerToy}.`,
        equation: `${100 - smallerRate}% of ${money(dearerCents)} = ${money(dearerPaid)}`,
      },
      {
        text: 'Add the two amounts paid.',
        equation: `${money(cheaperPaid)} + ${money(dearerPaid)} = ${money(paid)}`,
      },
      {
        text: '(b) Both buses have the same usual price. Add the discount rates: both percentages use the price of one bus as their base.',
        equation: `${smallerRate}% + ${largerRate}% = ${rateSum}% of one bus's usual price`,
      },
      {
        text: 'The total saving is this combined percentage. Find 1% of one bus\'s usual price.',
        equation: `${money(savingCents)} ÷ ${rateSum} = ${money(onePercentCents)}`,
      },
      {
        text: 'Find 100%, which is the usual price of one bus.',
        equation: `${money(onePercentCents)} × 100 = ${money(busCents)}`,
      },
    ];
    return {
      key,
      prompt: '(a) How much does Isha pay for the kite and the puzzle altogether? (b) What is the usual price of one model bus? Give both answers in dollars.',
      context: [
        'A toy shop offers a discount when a customer buys exactly 2 toys.',
        `The higher-priced toy gets ${smallerRate}% off. The lower-priced toy gets ${largerRate}% off.`,
        `If the two toys have the same usual price, one gets ${smallerRate}% off and the other gets ${largerRate}% off. Each discount is taken from the toy's usual price.`,
        `(a) Isha buys a kite with a usual price of ${money(kiteCents)} and a puzzle with a usual price of ${money(puzzleCents)}.`,
        `(b) Noah buys 2 identical model buses. The total discount on the two buses is ${money(savingCents)}.`,
      ],
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Total paid ($)', decimal: true},
          {label: '(b) Usual price of one model bus ($)', decimal: true},
        ],
      },
      answer: JSON.stringify([dollars(paid), dollars(busCents)]),
      hint: 'For (a), compare the prices before choosing the discounts. For (b), add the discount percentages of the same single-bus price.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  const ticketCents = r.int(15, 27) * 100 + r.pick([0, 50]);
  const discountRate = r.pick([10, 30, 40, 50]);
  const cutoff = r.pick([11, 13, 14]);
  const youngerAge = cutoff - r.int(1, 5);
  const olderAge = cutoff + (Math.abs(Math.trunc(index)) % 2 === 0 ? 0 : r.int(1, 2));
  const ages = r.shuffle([youngerAge, olderAge]);
  const adults = 2;
  const eligible = ages.filter(age => age < cutoff).length;
  const fullCount = adults + ages.length - eligible;
  const reducedCents = ticketCents * (100 - discountRate) / 100;
  const fullSubtotal = fullCount * ticketCents;
  const reducedSubtotal = eligible * reducedCents;
  const totalCents = fullSubtotal + reducedSubtotal;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Only the ${youngerAge}-year-old child is younger than ${cutoff}. The ${olderAge}-year-old child and both adults pay the usual price.`,
      equation: `${eligible} discounted ticket; ${adults} + ${ages.length - eligible} = ${fullCount} full-price tickets`,
    },
    {
      text: 'Find the percentage paid for a discounted ticket.',
      equation: `100% − ${discountRate}% = ${100 - discountRate}%`,
    },
    {
      text: 'Find the cost of the discounted ticket.',
      equation: `${100 - discountRate}% of ${money(ticketCents)} = ${money(reducedCents)}`,
    },
    {
      text: 'Find the cost of the full-price tickets.',
      equation: `${fullCount} × ${money(ticketCents)} = ${money(fullSubtotal)}`,
    },
    {
      text: 'Add the costs of all the tickets.',
      equation: `${money(fullSubtotal)} + ${money(reducedSubtotal)} = ${money(totalCents)}`,
    },
  ];
  return {
    key,
    prompt: 'How much does the family pay for all its tickets? Give your answer in dollars.',
    context: [
      `The usual cinema ticket price is ${money(ticketCents)}.`,
      `Children younger than ${cutoff} years get a ${discountRate}% discount. Everyone else pays the usual price.`,
      `A family has ${adults} adults and ${ages.length} children. The children are ${ages[0]} and ${ages[1]} years old.`,
      'Each person buys one ticket. The discount is taken from the usual ticket price.',
    ],
    answer: dollars(totalCents),
    unit: 'dollars',
    hint: 'Younger than means strictly below the age limit. Count the discounted and full-price tickets separately.',
    workedSteps,
    explanation: explain(workedSteps),
  };
}
