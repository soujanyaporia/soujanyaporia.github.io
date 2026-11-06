import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-price-ratios-mixed-cost',
  level: 5,
  title: 'Find prices from a mixed purchase',
  objective: 'Use related prices and a purchase total to find one price, a category cost or a price difference.',
  skillIds: ['P5.S.RATE.02'],
  canonicalPatternId: 'p5-price-ratios-mixed-cost',
};

const amount = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;
const money = (cents: number): string => `$${amount(cents)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = (hashString(String(seed)) >>> 0) % 3;
  const variant = (offset + ((Math.trunc(index) % 3 + 3) % 3)) % 3;
  const {a, b} = r.pick([
    {a: 'notebook', b: 'pen'},
    {a: 'folder', b: 'ruler'},
    {a: 'muffin', b: 'bun'},
    {a: 'workbook', b: 'pencil'},
  ]);
  const pluralA = `${a}s`;
  const pluralB = `${b}s`;
  const relation = r.pick(['multiple', 'fraction', 'bundle'] as const);
  const [unitsA, unitsB] = relation === 'fraction'
    ? r.pick([[4, 3], [5, 2], [5, 3], [5, 4]] as const)
    : [r.pick([2, 4, 5, 6]), 1];
  const countA = r.int(4, 9);
  const countB = r.int(2, 7);
  const unitCents = 25 + 15 * r.int(0, 9);
  const totalUnits = countA * unitsA + countB * unitsB;
  const totalCents = totalUnits * unitCents;

  const relationText = relation === 'fraction'
    ? `The price of one ${b} is ${unitsB}/${unitsA} of the price of one ${a}.`
    : relation === 'bundle'
      ? `For the same price, you can buy one ${a} or ${unitsA} ${pluralB}.`
      : `One ${a} costs ${unitsA} times as much as one ${b}.`;
  const unitText = relation === 'fraction'
    ? `Divide the price of one ${a} into ${unitsA} equal price units. One ${b} costs ${unitsB} of these units.`
    : `Use 1 price unit for one ${b}. One ${a} then costs ${unitsA} price units.`;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: unitText},
    {
      text: 'Count the price units in the whole purchase.',
      equation: `${countA} × ${unitsA} + ${countB} × ${unitsB} = ${totalUnits} price units`,
    },
    {
      text: 'Use the total paid to find the value of one price unit.',
      equation: `${money(totalCents)} ÷ ${totalUnits} = ${money(unitCents)}`,
    },
  ];

  let prompt: string;
  let answerCents: number;
  if (variant === 2) {
    const differenceUnits = unitsA - unitsB;
    answerCents = differenceUnits * unitCents;
    prompt = `How much more does one ${a} cost than one ${b}? Give your answer in dollars.`;
    workedSteps.push(
      {
        text: 'Find the difference between the two prices in price units.',
        equation: `${unitsA} − ${unitsB} = ${differenceUnits} price units`,
      },
      {
        text: 'Convert that difference to dollars.',
        equation: `${differenceUnits} × ${money(unitCents)} = ${money(answerCents)}`,
      },
    );
  } else {
    const targetA = r.int(0, 1) === 0;
    const item = targetA ? a : b;
    const plural = targetA ? pluralA : pluralB;
    const itemUnits = targetA ? unitsA : unitsB;
    const itemCount = targetA ? countA : countB;
    if (variant === 0) {
      answerCents = itemUnits * unitCents;
      prompt = `What is the price of one ${item}? Give your answer in dollars.`;
      workedSteps.push({
        text: `One ${item} costs ${itemUnits} price units.`,
        equation: `${itemUnits} × ${money(unitCents)} = ${money(answerCents)}`,
      });
    } else {
      const categoryUnits = itemCount * itemUnits;
      answerCents = categoryUnits * unitCents;
      prompt = `How much of the total was spent on the ${plural}? Give your answer in dollars.`;
      workedSteps.push(
        {
          text: `Count the price units for all ${itemCount} ${plural}.`,
          equation: `${itemCount} × ${itemUnits} = ${categoryUnits} price units`,
        },
        {
          text: `Find the amount spent on the ${plural}.`,
          equation: `${categoryUnits} × ${money(unitCents)} = ${money(answerCents)}`,
        },
      );
    }
  }

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      relationText,
      `All ${pluralA} have the same price. All ${pluralB} have the same price.`,
      `A class pays ${money(totalCents)} for ${countA} ${pluralA} and ${countB} ${pluralB}.`,
    ],
    prompt,
    answer: amount(answerCents),
    unit: 'dollars',
    hint: 'Describe both prices using equal price units. Count the units in the whole purchase before finding the amount asked for.',
    workedSteps,
    explanation: workedSteps.map(step =>
      step.equation ? `${step.text} ${step.equation}.` : step.text,
    ).join(' '),
  };
}
