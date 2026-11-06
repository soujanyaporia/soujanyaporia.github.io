import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-spending-and-remainder-equations',
  level: 5,
  title: 'Find spending and money left',
  objective: 'Use equal units and fractions to connect starting money, spending and money left, then find amounts or purchase counts.',
  skillIds: [
    'P5.S.FRAC.01',
    'P5.S.FRAC.06',
    'P5.S.RATE.02',
    'P4.S.DEC.05',
    'P4.S.DEC.06',
  ],
  canonicalPatternId: 'p5-spending-and-remainder-equations',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];

function cash(cents: number): string {
  return (cents / 100).toFixed(2);
}

function gcd(first: number, second: number): number {
  let a = first;
  let b = second;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (Math.trunc(seed) % 3 + Math.trunc(index) % 3 + 6) % 3;

  const finish = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: Step[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps
      .map(step => [step.text, step.equation].filter(Boolean).join(' '))
      .join(' '),
    ...extra,
  });

  if (variant === 0) {
    const priceMultiple = random.int(2, 4);
    const balanceMultiple = random.int(2, 4);
    const ashaCases = random.int(1, 3);
    const benCases = ashaCases + random.int(1, 2);
    const benPens = random.int(2, 6);
    const ashaPens = benPens + (benCases - ashaCases) * priceMultiple;
    const priceUnits = benCases * priceMultiple + benPens;
    const penPriceCents = (balanceMultiple - 1) * 25 * random.int(2, 8);
    const casePriceCents = priceMultiple * penPriceCents;
    const spendingCents = priceUnits * penPriceCents;
    const benLeftCents = spendingCents / (balanceMultiple - 1);
    const benInitialCents = balanceMultiple * benLeftCents;
    const differenceCents = 100 * random.int(15, 55);
    const ashaInitialCents = benInitialCents + differenceCents;
    const answer = `(a) Stay the same. (b) $${cash(casePriceCents)}`;

    return finish(
      [
        `Asha started with $${cash(differenceCents)} more than Ben.`,
        `Asha bought ${ashaCases} pencil cases and ${ashaPens} pens. Ben bought ${benCases} pencil cases and ${benPens} pens.`,
        `Each pencil case cost ${priceMultiple} times as much as a pen. All pencil cases had the same price, and all pens had the same price.`,
        `Asha started with $${cash(ashaInitialCents)}. Ben's starting amount was ${balanceMultiple} times the amount he had left after shopping.`,
        'They spent money only on these items.',
      ],
      '(a) After their purchases, did the difference between their amounts of money increase, decrease or stay the same? (b) What was the price of one pencil case? Choose the option that answers both parts.',
      answer,
      'Express each basket in pen-price units. Then use Ben’s starting amount and the number of equal parts he had left.',
      [
        {
          text: 'Express Asha’s spending in pen-price units.',
          equation: `${ashaCases} × ${priceMultiple} + ${ashaPens} = ${priceUnits} units`,
        },
        {
          text: 'Express Ben’s spending in the same units.',
          equation: `${benCases} × ${priceMultiple} + ${benPens} = ${priceUnits} units`,
        },
        {
          text: '(a) They spent equal amounts, so the difference stays the same.',
          equation: `Difference after shopping = $${cash(differenceCents)}`,
        },
        {
          text: 'Find Ben’s starting amount.',
          equation: `$${cash(ashaInitialCents)} − $${cash(differenceCents)} = $${cash(benInitialCents)}`,
        },
        {
          text: `Ben’s starting amount contains ${balanceMultiple} equal parts. He had one part left.`,
          equation: `$${cash(benInitialCents)} ÷ ${balanceMultiple} = $${cash(benLeftCents)}`,
        },
        {
          text: 'Find how much Ben spent.',
          equation: `$${cash(benInitialCents)} − $${cash(benLeftCents)} = $${cash(spendingCents)}`,
        },
        {
          text: 'Find the price of one pen.',
          equation: `$${cash(spendingCents)} ÷ ${priceUnits} = $${cash(penPriceCents)}`,
        },
        {
          text: '(b) Find the price of one pencil case.',
          equation: `${priceMultiple} × $${cash(penPriceCents)} = $${cash(casePriceCents)}`,
        },
      ],
      {
        choices: random.shuffle([
          answer,
          `(a) Stay the same. (b) $${cash(penPriceCents)}`,
          `(a) Increase. (b) $${cash(casePriceCents)}`,
          `(a) Decrease. (b) $${cash(casePriceCents)}`,
        ]),
      },
    );
  }

  if (variant === 1) {
    const spendingMultiple = random.int(2, 3);
    const remainderMultiple = random.int(2, 3);
    const omarLeftCents = 500 * random.int(5, 12);
    const gapCents = 600 * random.int(2, 6);
    const lenaLeftCents = remainderMultiple * omarLeftCents;
    const lenaSpentCents = lenaLeftCents - gapCents;
    const omarSpentCents = spendingMultiple * lenaSpentCents;
    const lenaInitialCents = lenaSpentCents + lenaLeftCents;
    const totalCents = omarSpentCents + omarLeftCents + lenaInitialCents;
    const totalUnits = spendingMultiple * remainderMultiple + 2 * remainderMultiple + 1;
    const enlargedTotalCents = totalCents + (spendingMultiple + 1) * gapCents;

    return finish(
      [
        `Omar and Lena had $${cash(totalCents)} altogether before visiting a craft fair.`,
        `Omar spent ${spendingMultiple} times as much money as Lena.`,
        `Lena's money left was $${cash(gapCents)} more than the amount she spent.`,
        `Lena had ${remainderMultiple} times as much money left as Omar.`,
        'Each person paid from their own money and kept the rest.',
      ],
      '(a) How much did Omar spend? (b) How much money did Lena have before the fair?',
      JSON.stringify([cash(omarSpentCents), cash(lenaInitialCents)]),
      'Treat Omar’s money left as one unit. Think about how much to add to each person’s spending to make whole units.',
      [
        {
          text: 'Treat Omar’s money left as 1 unit.',
          equation: `Lena’s money left = ${remainderMultiple} units`,
        },
        {
          text: `Adding $${cash(gapCents)} to Lena’s spending makes ${remainderMultiple} units. Omar’s spending needs ${spendingMultiple} times this addition.`,
          equation: `${spendingMultiple} × $${cash(gapCents)} = $${cash(spendingMultiple * gapCents)}`,
        },
        {
          text: 'Count the enlarged spending amounts and the two remainders.',
          equation: `${spendingMultiple * remainderMultiple} + ${remainderMultiple} + 1 + ${remainderMultiple} = ${totalUnits} units`,
        },
        {
          text: 'Add the two adjustments to the starting total.',
          equation: `$${cash(totalCents)} + $${cash(gapCents)} + $${cash(spendingMultiple * gapCents)} = $${cash(enlargedTotalCents)}`,
        },
        {
          text: 'Find one unit, which is Omar’s money left.',
          equation: `$${cash(enlargedTotalCents)} ÷ ${totalUnits} = $${cash(omarLeftCents)}`,
        },
        {
          text: 'Find Lena’s spending from her money left.',
          equation: `${remainderMultiple} × $${cash(omarLeftCents)} − $${cash(gapCents)} = $${cash(lenaSpentCents)}`,
        },
        {
          text: '(a) Find Omar’s spending.',
          equation: `${spendingMultiple} × $${cash(lenaSpentCents)} = $${cash(omarSpentCents)}`,
        },
        {
          text: '(b) Add Lena’s spending and her money left.',
          equation: `$${cash(lenaSpentCents)} + $${cash(lenaLeftCents)} = $${cash(lenaInitialCents)}`,
        },
      ],
      {
        structuredResponse: {
          kind: 'number-pair',
          firstLabel: '(a) Omar spent ($)',
          secondLabel: '(b) Lena had at first ($)',
          decimal: true,
        },
      },
    );
  }

  const fractionSets: [number, number, number, number, number, number][] = [
    [1, 4, 1, 3, 1, 3],
    [1, 5, 1, 4, 2, 5],
    [1, 3, 1, 4, 1, 3],
    [1, 4, 2, 5, 1, 3],
  ];
  const [bookNumerator, bookDenominator, lunchNumerator, lunchDenominator, finalNumerator, finalDenominator] = random.pick(fractionSets);
  const rawOriginalUnits = finalDenominator * (bookDenominator - bookNumerator) * (lunchDenominator - lunchNumerator);
  const rawAfterSetAsideUnits = finalNumerator * bookDenominator * lunchDenominator;
  const rawBeforeLunchUnits = finalNumerator * lunchDenominator * (bookDenominator - bookNumerator);
  const rawFinalUnits = finalNumerator * (bookDenominator - bookNumerator) * (lunchDenominator - lunchNumerator);
  const divisor = gcd(
    gcd(rawOriginalUnits, rawAfterSetAsideUnits),
    gcd(rawBeforeLunchUnits, rawFinalUnits),
  );
  const originalUnits = rawOriginalUnits / divisor;
  const afterSetAsideUnits = rawAfterSetAsideUnits / divisor;
  const beforeLunchUnits = rawBeforeLunchUnits / divisor;
  const finalUnits = rawFinalUnits / divisor;
  const fixedUnits = originalUnits - afterSetAsideUnits;
  const bookUnits = originalUnits - beforeLunchUnits;
  const notebookPriceCents = random.pick([125, 150, 175, 225, 250, 275, 325]);
  const unitCents = notebookPriceCents * random.int(1, 4);
  const fixedCents = fixedUnits * unitCents;
  const finalCents = finalUnits * unitCents;
  const bookBillCents = bookUnits * unitCents;
  const notebookCount = bookBillCents / notebookPriceCents;

  return finish(
    [
      `Nadia had some money in her purse. To pay for notebooks, she first set aside $${cash(fixedCents)}.`,
      `She added ${bookNumerator}/${bookDenominator} of the money still in her purse to the amount set aside. She used all the set-aside money to pay for the notebooks.`,
      `After buying the notebooks, she spent ${lunchNumerator}/${lunchDenominator} of the money left in her purse on lunch.`,
      `At the end, she had ${finalNumerator}/${finalDenominator} of her starting money left.`,
      `One notebook cost $${cash(notebookPriceCents)}. All the notebooks had the same price.`,
    ],
    '(a) How much money did Nadia have at the end? (b) How many notebooks did she buy?',
    JSON.stringify([cash(finalCents), String(notebookCount)]),
    'Use equal units for the starting money. Work backwards from the final fraction to find how many units the first set-aside amount represents.',
    [
      {
        text: `Think of the starting money as ${originalUnits} equal units. Write the final fraction in these units.`,
        equation: `${finalNumerator}/${finalDenominator} = ${finalUnits}/${originalUnits}`,
      },
      {
        text: `After lunch, ${lunchDenominator - lunchNumerator} of ${lunchDenominator} equal parts remained. Find the units before lunch.`,
        equation: `${finalUnits} ÷ ${lunchDenominator - lunchNumerator} × ${lunchDenominator} = ${beforeLunchUnits} units`,
      },
      {
        text: `Before the notebook payment was topped up, the purse held ${bookDenominator} equal parts. The top-up left ${bookDenominator - bookNumerator} parts in the purse. Work back to all the parts.`,
        equation: `${beforeLunchUnits} ÷ ${bookDenominator - bookNumerator} × ${bookDenominator} = ${afterSetAsideUnits} units`,
      },
      {
        text: 'Find how many units were first set aside.',
        equation: `${originalUnits} − ${afterSetAsideUnits} = ${fixedUnits} units`,
      },
      {
        text: 'Find the value of one unit.',
        equation: `$${cash(fixedCents)} ÷ ${fixedUnits} = $${cash(unitCents)}`,
      },
      {
        text: '(a) Find the money left at the end.',
        equation: `${finalUnits} × $${cash(unitCents)} = $${cash(finalCents)}`,
      },
      {
        text: 'The notebook bill is the starting money less the money before lunch.',
        equation: `(${originalUnits} − ${beforeLunchUnits}) × $${cash(unitCents)} = $${cash(bookBillCents)}`,
      },
      {
        text: '(b) Divide the notebook bill by the price of one notebook.',
        equation: `$${cash(bookBillCents)} ÷ $${cash(notebookPriceCents)} = ${notebookCount} notebooks`,
      },
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          { label: '(a) Money left ($)', decimal: true },
          { label: '(b) Number of notebooks' },
        ],
      },
    },
  );
}
