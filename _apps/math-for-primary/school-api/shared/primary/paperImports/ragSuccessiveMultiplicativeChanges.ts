import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-successive-multiplicative-changes',
  level: 6,
  title: 'Discount, then GST',
  objective: 'Find the amount paid after a discount and GST on the reduced price.',
  skillIds: ['P5.S.PCT.03', 'P5.S.PCT.04'],
  canonicalPatternId: 'p6-successive-multiplicative-changes',
} as const;

const cash = (cents: number): string => (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:v1:${seed}:${index}`));
  const priceCents = 100 * r.pick([
    60, 80, 100, 120, 140, 160, 180, 220, 240, 260,
    280, 300, 320, 340, 360, 380, 420, 440, 460, 480,
  ]);
  const discount = r.pick([10, 15, 20, 25, 30, 35, 40]);
  const gst = r.pick([7, 8, 9]);
  const buyer = r.pick(['Mira', 'Hana', 'Rafi', 'Zane']);
  const item = r.pick(['a scooter', 'a camera', 'a keyboard', 'a pair of skates']);

  // These bounds make every monetary calculation exact in integer cents.
  const retainedPercent = 100 - discount;
  const discountedCents = priceCents * retainedPercent / 100;
  const totalCents = discountedCents * (100 + gst) / 100;
  const gstCents = totalCents - discountedCents;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Find the percentage of the price left to pay after the discount.',
      equation: `100% − ${discount}% = ${retainedPercent}%`,
    },
    {
      text: 'Calculate the discounted price before GST.',
      equation: `$${cash(priceCents)} × ${retainedPercent}/100 = $${cash(discountedCents)}`,
    },
    {
      text: 'Find the GST using the discounted price.',
      equation: `$${cash(discountedCents)} × ${gst}/100 = $${cash(gstCents)}`,
    },
    {
      text: 'Add the GST to the discounted price.',
      equation: `$${cash(discountedCents)} + $${cash(gstCents)} = $${cash(totalCents)}`,
    },
  ];

  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `${buyer} buys ${item}. The price before any discount or GST is $${cash(priceCents)}.`,
      `The shop gives a ${discount}% discount.`,
      `For this purchase, GST of ${gst}% is then added to the discounted price.`,
    ],
    prompt: `How much does ${buyer} pay altogether? Give your answer in dollars.`,
    answer: cash(totalCents),
    unit: 'dollars',
    hint: 'Find the discounted price first. Calculate GST using that reduced price.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };

  if (r.chance(0.5)) {
    // Common errors: omit GST, tax the original price, or subtract GST.
    const taxOnOriginalCents = priceCents * (100 - discount + gst) / 100;
    const subtractTaxCents = discountedCents * (100 - gst) / 100;
    question.choices = r.shuffle([
      totalCents,
      discountedCents,
      taxOnOriginalCents,
      subtractTaxCents,
    ].map(cash));
  }

  return question;
}
