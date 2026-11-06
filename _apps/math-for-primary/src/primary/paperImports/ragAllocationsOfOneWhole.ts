import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-allocations-of-one-original-whole',
  level: 5,
  title: 'Share one starting amount',
  objective: 'Combine percentages of one whole to find a remaining quantity, compare shares or express a combined share as a simplified fraction.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02', 'P5.S.PCT.03'],
  canonicalPatternId: 'allocations-of-one-original-whole',
};

const decimalMoney = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

function greatestCommonFactor(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = (Math.trunc(seed) % 3 + Math.trunc(index) % 3 + 6) % 3;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question>,
  ): Question => ({
    key,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step =>
      [step.text, step.equation].filter(Boolean).join(' '),
    ).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [leafPercent, wavePercent] = r.pick([
      [15, 30], [10, 35], [30, 25], [15, 20], [25, 35], [30, 10],
    ]);
    const whole = r.pick(
      Array.from({length: 19}, (_, i) => (i + 6) * 20)
        .filter(value => value !== 200),
    );
    const usedPercent = leafPercent + wavePercent;
    const remainingPercent = 100 - usedPercent;
    const starArea = whole * remainingPercent / 100;
    const choices = r.shuffle([
      starArea,
      whole * leafPercent / 100,
      whole * wavePercent / 100,
      whole * usedPercent / 100,
    ].map(String));

    return make(
      [
        `A school mural covers ${whole} m².`,
        `${leafPercent}% of the whole mural has a leaf design and ${wavePercent}% of the whole mural has a wave design.`,
        'The two designs cover separate parts. The rest of the mural has a star design.',
      ],
      'What area is covered by the star design?',
      String(starArea),
      'Add the two given percentages. Find the percentage left, then find that percentage of the total area.',
      [
        {
          text: 'The leaf and wave designs are parts of the same whole.',
          equation: `${leafPercent}% + ${wavePercent}% = ${usedPercent}%`,
        },
        {
          text: 'Find the percentage covered by stars.',
          equation: `100% − ${usedPercent}% = ${remainingPercent}%`,
        },
        {
          text: 'Find this percentage of the total area.',
          equation: `${whole} ÷ 100 × ${remainingPercent} = ${starArea} m²`,
        },
      ],
      {unit: 'm²', choices},
    );
  }

  if (variant === 1) {
    const [gamesPercent, foodPercent] = r.pick([
      [45, 20], [50, 15], [55, 10], [40, 30], [45, 25], [50, 20],
    ]);
    const wholeDollars = r.int(1201, 4999);
    const usedPercent = gamesPercent + foodPercent;
    const prizePercent = 100 - usedPercent;
    const differencePercent = gamesPercent - prizePercent;
    // Whole-dollar budgets and integer percentages give exact integer cents.
    const prizeCents = wholeDollars * prizePercent;
    const differenceCents = wholeDollars * differencePercent;
    const budget = decimalMoney(wholeDollars * 100);
    const prizeAmount = decimalMoney(prizeCents);
    const differenceAmount = decimalMoney(differenceCents);

    return make(
      [
        `A neighbourhood group has $${budget} for a fun day.`,
        `It uses ${gamesPercent}% of this starting amount for games and ${foodPercent}% of the same starting amount for food.`,
        'All the money left is used to buy prizes.',
      ],
      '(a) How much money is used to buy prizes?\n(b) What is the difference between the amounts used for games and prizes?',
      JSON.stringify([prizeAmount, differenceAmount]),
      'Both percentages use the starting budget. Find the percentage for prizes first, then compare it with the percentage for games.',
      [
        {
          text: 'Add the percentages used for games and food.',
          equation: `${gamesPercent}% + ${foodPercent}% = ${usedPercent}%`,
        },
        {
          text: 'The prize money is the part left.',
          equation: `100% − ${usedPercent}% = ${prizePercent}%`,
        },
        {
          text: '(a) Find the amount used for prizes.',
          equation: `$${budget} ÷ 100 × ${prizePercent} = $${prizeAmount}`,
        },
        {
          text: 'Games use a greater share than prizes. Compare their percentages of the same budget.',
          equation: `${gamesPercent}% − ${prizePercent}% = ${differencePercent}%`,
        },
        {
          text: '(b) Find the difference in money.',
          equation: `$${budget} ÷ 100 × ${differencePercent} = $${differenceAmount}`,
        },
      ],
      {
        unit: 'dollars',
        structuredResponse: {
          kind: 'number-pair',
          firstLabel: '(a) Prize money ($)',
          secondLabel: '(b) Difference ($)',
          decimal: true,
        },
      },
    );
  }

  const [paperPercent, gluePercent] = r.pick([
    [15, 25], [30, 35], [25, 45], [10, 25], [15, 40], [30, 45],
  ]);
  const spentPercent = paperPercent + gluePercent;
  const factor = greatestCommonFactor(spentPercent, 100);
  const answer = `${spentPercent / factor}/${100 / factor}`;

  return make(
    [
      `Mira spends ${paperPercent}% of her starting money on paper and ${gluePercent}% of her starting money on glue.`,
    ],
    'What fraction of her starting money does Mira spend in all? Give your answer in its simplest form.',
    answer,
    'Add the percentages of the starting money. Write the total over 100, then simplify.',
    [
      {
        text: 'Both purchases are measured against the same starting amount.',
        equation: `${paperPercent}% + ${gluePercent}% = ${spentPercent}%`,
      },
      {
        text: 'Percent means parts out of 100.',
        equation: `${spentPercent}% = ${spentPercent}/100`,
      },
      {
        text: `Divide the numerator and denominator by ${factor}.`,
        equation: `${spentPercent}/100 = ${answer}`,
      },
    ],
    {requireSimplified: true},
  );
}
