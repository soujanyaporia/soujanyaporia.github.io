import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-sum-and-differences',
  level: 5,
  title: 'Find amounts from totals and differences',
  objective: 'Use a total and a difference to find an amount, solve a linked coin problem, count equal groups or choose a matching calculation.',
  skillIds: ['P5.S.WN.03', 'P5.S.RATE.02'],
  canonicalPatternId: 'sum-and-differences',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = (hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) % 3;
  const variant = ((offset + Math.trunc(index)) % 3 + 3) % 3;
  const build = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => step.text + (step.equation ? ` ${step.equation}.` : '')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [largerName, smallerName] = r.pick([
      ['Asha', 'Ben'], ['Farah', 'Jun'], ['Kavin', 'Zoe'], ['Irfan', 'Mei'],
    ] as const);
    const smaller = 2 * r.int(12, 35);
    const difference = 2 * r.int(7, 17);
    const total = 2 * smaller + difference;
    const highCount = r.int(3, smaller - 3);
    const valueCents = 10 * smaller + 40 * highCount;
    const amount = `${Math.floor(valueCents / 100)}.${String(valueCents % 100).padStart(2, '0')}`;
    const baseline = 10 * smaller;
    const extraValue = valueCents - baseline;
    return build(
      [
        `${largerName} and ${smallerName} have ${total} coins between them.`,
        `${largerName} has ${difference} more coins than ${smallerName}.`,
        `${smallerName}'s purse holds only 10-cent and 50-cent coins. The coins in that purse are worth $${amount}.`,
      ],
      `(a) How many coins are in ${smallerName}'s purse? (b) How many of those coins are 50-cent coins?`,
      JSON.stringify([String(smaller), String(highCount)]),
      'For (a), set aside the extra coins and split the rest equally. For (b), first imagine that every coin in the purse is a 10-cent coin.',
      [
        {text: `(a) Set aside the ${difference} extra coins. The remaining total consists of two equal amounts.`, equation: `${total} − ${difference} = ${2 * smaller} coins`},
        {text: `Each equal amount is the number of coins in ${smallerName}'s purse.`, equation: `${2 * smaller} ÷ 2 = ${smaller} coins`},
        {text: '(b) Write the value of that purse in cents.', equation: `$${amount} = ${valueCents} cents`},
        {text: 'Find the value if every coin in the purse were a 10-cent coin.', equation: `${smaller} × 10 = ${baseline} cents`},
        {text: 'Find how much extra value the real coins have.', equation: `${valueCents} − ${baseline} = ${extraValue} cents`},
        {text: 'Replacing one 10-cent coin with one 50-cent coin keeps the coin count unchanged and adds this value.', equation: '50 − 10 = 40 cents'},
        {text: 'Divide the extra value by the increase for each replacement to find the number of 50-cent coins.', equation: `${extraValue} ÷ 40 = ${highCount} coins`},
      ],
      {structuredResponse: {kind: 'number-fields', fields: [
        {label: `(a) Coins in ${smallerName}'s purse (coins)`},
        {label: `(b) 50-cent coins in ${smallerName}'s purse (coins)`},
      ]}},
    );
  }

  if (variant === 1) {
    const [largerColour, smallerColour] = r.pick([
      ['green', 'yellow'], ['orange', 'purple'], ['white', 'black'],
    ] as const);
    const groupSize = r.pick([6, 8, 9, 10]);
    const smallerRows = r.int(7, 20);
    const largerRows = smallerRows + r.int(3, 9);
    const smaller = smallerRows * groupSize;
    const larger = largerRows * groupSize;
    const total = smaller + larger;
    const difference = larger - smaller;
    return build(
      [
        `A hall has ${total} ${largerColour} and ${smallerColour} chairs altogether.`,
        `There are ${difference} more ${largerColour} chairs than ${smallerColour} chairs.`,
        `The chairs are set out in rows of ${groupSize}. Every chair is used, and each row has chairs of just one colour.`,
      ],
      `How many rows of ${largerColour} chairs are there?`,
      String(largerRows),
      'Add the difference to the total and halve to find the larger group. Then divide by the number of chairs in a row.',
      [
        {text: `Imagine adding ${difference} chairs to the smaller group. There would be two equal groups, each as large as the ${largerColour} group.`, equation: `${total} + ${difference} = ${2 * larger} chairs`},
        {text: `Halve this new total to find the number of ${largerColour} chairs.`, equation: `${2 * larger} ÷ 2 = ${larger} chairs`},
        {text: `Each row contains ${groupSize} chairs.`, equation: `${larger} ÷ ${groupSize} = ${largerRows} rows`},
      ],
      {unit: 'rows'},
    );
  }

  const [heavyLabel, lightLabel] = r.pick([
    ['P', 'Q'], ['R', 'S'], ['U', 'V'],
  ] as const);
  const twiceLighter = 2 * r.int(70, 100) + Math.abs(Math.trunc(index)) % 2;
  const difference = r.int(16, 40);
  const total = twiceLighter + difference;
  const lighter = twiceLighter / 2;
  const heavier = lighter + difference;
  const addFirst = r.int(0, 1) === 1;
  const correct = addFirst
    ? `(${total} + ${difference}) ÷ 2`
    : `(${total} − ${difference}) ÷ 2 + ${difference}`;
  const choices = r.shuffle([
    correct,
    `(${total} − ${difference}) ÷ 2`,
    `${total} − ${difference} ÷ 2`,
    `${total} + ${difference} ÷ 2`,
  ]);
  const steps: NonNullable<Question['workedSteps']> = addFirst ? [
    {text: `Imagine adding ${difference} kg to crate ${lightLabel}. Both crates would then have the mass of crate ${heavyLabel}.`, equation: `${total} + ${difference} = ${2 * heavier} kg`},
    {text: `Halve this new total to find the mass of crate ${heavyLabel}.`, equation: `${2 * heavier} ÷ 2 = ${heavier} kg`},
    {text: 'The brackets make the addition happen before the division.', equation: `${correct} = ${heavier} kg`},
  ] : [
    {text: 'Subtract the extra mass so that the remaining total represents two equal lighter crates.', equation: `${total} − ${difference} = ${twiceLighter} kg`},
    {text: `Find the mass of crate ${lightLabel}.`, equation: `${twiceLighter} ÷ 2 = ${lighter} kg`},
    {text: `Add the difference to find the mass of crate ${heavyLabel}.`, equation: `${lighter} + ${difference} = ${heavier} kg`},
    {text: 'The brackets make the subtraction happen before halving. Then add the difference.', equation: `${correct} = ${heavier} kg`},
  ];
  return build(
    [
      `Two crates, ${heavyLabel} and ${lightLabel}, have a combined mass of ${total} kg.`,
      `Crate ${heavyLabel} is ${difference} kg heavier than crate ${lightLabel}.`,
    ],
    `Which calculation gives the mass of crate ${heavyLabel} in kilograms?`,
    correct,
    'Think about making the two masses equal. Check what the brackets tell you to calculate first.',
    steps,
    {choices},
  );
}
