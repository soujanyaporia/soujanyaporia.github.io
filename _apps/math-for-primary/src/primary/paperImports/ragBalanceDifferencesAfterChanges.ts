import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-balance-differences-after-changes',
  level: 5,
  title: 'Compare money after changes',
  objective: 'Compare separate changes to two balances, recover starting money and find a transfer that makes the balances equal.',
  skillIds: ['P4.S.DEC.05', 'P4.S.DEC.06', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-balance-differences-after-changes',
} as const;

const dollars = (cents: number): string => (cents / 100).toFixed(2);
const cash = (cents: number): string => `$${dollars(cents)}`;
type Steps = NonNullable<Question['workedSteps']>;
const explain = (steps: Steps): string => steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = ((offset + index) % 2 + 2) % 2;

  if (variant === 0) {
    // All amounts are integer cents. Dividing a whole-dollar gap by two
    // permits an exact half-dollar transfer without rounding.
    const multiple = r.pick([3, 5, 6]);
    const raviEnd = r.int(45, 95) * 100;
    const firstGap = r.int(25, 70) * 100;
    const lastGap = (multiple - 1) * raviEnd;
    const combinedChanges = lastGap - firstGap;
    let gift = r.int(5, combinedChanges / 100 - 5) * 100;
    if (2 * gift === combinedChanges) gift += 100;
    const spent = combinedChanges - gift;
    const lenaEnd = multiple * raviEnd;
    const lenaStart = lenaEnd - gift;
    const transfer = lastGap / 2;
    const steps: Steps = [
      {
        text: 'The gift raises Lena’s balance and Ravi’s purchase lowers his balance. Both changes make the gap larger.',
        equation: `${cash(firstGap)} + ${cash(gift)} + ${cash(spent)} = ${cash(lastGap)}`,
      },
      {
        text: `Ravi’s money after the purchase is one equal part. Lena has ${multiple} such parts, so the gap is ${multiple - 1} parts.`,
        equation: `${multiple} − 1 = ${multiple - 1}`,
      },
      {
        text: 'Find Ravi’s money after the purchase.',
        equation: `${cash(lastGap)} ÷ ${multiple - 1} = ${cash(raviEnd)}`,
      },
      {
        text: 'Find Lena’s money after the gift.',
        equation: `${cash(raviEnd)} × ${multiple} = ${cash(lenaEnd)}`,
      },
      {
        text: '(a) Remove the gift to find Lena’s starting money.',
        equation: `${cash(lenaEnd)} − ${cash(gift)} = ${cash(lenaStart)}`,
      },
      {
        text: '(b) Each dollar Lena passes to Ravi reduces her balance by one dollar and raises his by one dollar. The gap closes by two dollars, so pass half the gap.',
        equation: `${cash(lastGap)} ÷ 2 = ${cash(transfer)}`,
      },
      {
        text: 'Check that their balances become equal.',
        equation: `${cash(lenaEnd)} − ${cash(transfer)} = ${cash(raviEnd)} + ${cash(transfer)} = ${cash(lenaEnd - transfer)}`,
      },
    ];
    return {
      key,
      context: [
        `Lena’s savings were ${cash(firstGap)} greater than Ravi’s before a fair.`,
        `Her aunt added ${cash(gift)} to Lena’s savings. Ravi used ${cash(spent)} of his savings to buy supplies.`,
        `After both changes, Lena had ${multiple} times as much money as Ravi.`,
      ],
      prompt: '(a) How much money did Lena have before the fair? (b) After the gift and the purchase, how much should Lena pass to Ravi so that they have equal amounts?',
      answer: JSON.stringify([dollars(lenaStart), dollars(transfer)]),
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Lena’s starting money ($)',
        secondLabel: '(b) Money passed to Ravi ($)',
        decimal: true,
      },
      unit: 'dollars',
      hint: 'First find how the gift and spending change the gap. For part (b), think about what happens to both balances when money is passed.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  const priceMultiple = r.pick([2, 4, 5]);
  const startingMultiple = r.pick([2, 4, 5]);
  const ishaKits = r.int(2, 4);
  const zakiKits = ishaKits + 1;
  const zakiBrushes = r.int(2, 5);
  const extraUnits = r.int(-1, 1);
  const ishaBrushes = zakiBrushes + priceMultiple + extraUnits;
  const ishaUnits = ishaKits * priceMultiple + ishaBrushes;
  const zakiUnits = zakiKits * priceMultiple + zakiBrushes;
  // This factor makes reversing the starting/remaining relationship exact.
  const brushPrice = (startingMultiple - 1) * r.int(3, 8) * 100;
  const kitPrice = priceMultiple * brushPrice;
  const zakiSpent = zakiUnits * brushPrice;
  const zakiLeft = zakiSpent / (startingMultiple - 1);
  const zakiStart = startingMultiple * zakiLeft;
  const firstGap = r.int(4, 12) * 1000 + Math.abs(extraUnits) * brushPrice;
  const ishaStart = zakiStart + firstGap;
  const ishaSpent = ishaUnits * brushPrice;
  const lastGap = firstGap + zakiSpent - ishaSpent;
  const direction = extraUnits < 0 ? 'Increase' : extraUnits > 0 ? 'Decrease' : 'Stay the same';
  const comparison = extraUnits === 0
    ? 'Both purchases cost the same amount, so subtracting these costs leaves the gap unchanged.'
    : extraUnits > 0
      ? 'Isha spends more than Zaki, so her lead becomes smaller. The gap decreases.'
      : 'Zaki spends more than Isha, so Isha’s lead becomes larger. The gap increases.';
  const response = (trend: string, price: number): string => `(a) ${trend}; (b) ${cash(price)}`;
  const otherDirections = ['Increase', 'Decrease', 'Stay the same'].filter(value => value !== direction);
  const answer = response(direction, kitPrice);
  const steps: Steps = [
    {
      text: 'Use the price of one paintbrush as one price unit. Count the units in Isha’s purchase.',
      equation: `${ishaKits} × ${priceMultiple} + ${ishaBrushes} = ${ishaUnits} units`,
    },
    {
      text: 'Count the units in Zaki’s purchase.',
      equation: `${zakiKits} × ${priceMultiple} + ${zakiBrushes} = ${zakiUnits} units`,
    },
    {text: `(a) ${comparison}`},
    {
      text: 'Find Zaki’s starting money by subtracting the starting gap from Isha’s money.',
      equation: `${cash(ishaStart)} − ${cash(firstGap)} = ${cash(zakiStart)}`,
    },
    {
      text: `Zaki’s starting money is ${startingMultiple} equal parts and his money left is one part.`,
      equation: `${cash(zakiStart)} ÷ ${startingMultiple} = ${cash(zakiLeft)}`,
    },
    {
      text: 'Subtract the money left to find what Zaki spent.',
      equation: `${cash(zakiStart)} − ${cash(zakiLeft)} = ${cash(zakiSpent)}`,
    },
    {
      text: 'His spending pays for all his price units. Find the price of one paintbrush.',
      equation: `${cash(zakiSpent)} ÷ ${zakiUnits} = ${cash(brushPrice)}`,
    },
    {
      text: '(b) Find the price of one model kit.',
      equation: `${cash(brushPrice)} × ${priceMultiple} = ${cash(kitPrice)}`,
    },
    {
      text: 'Check the comparison by calculating the gap after shopping.',
      equation: `${cash(firstGap)} + ${cash(zakiSpent)} − ${cash(ishaSpent)} = ${cash(lastGap)}`,
    },
  ];
  return {
    key,
    context: [
      `Isha arrived at a craft stall with ${cash(firstGap)} more than Zaki.`,
      `At this stall, a model kit cost ${priceMultiple} times the price of a paintbrush.`,
      `Isha bought ${ishaKits} model kits and ${ishaBrushes} paintbrushes. Zaki bought ${zakiKits} model kits and ${zakiBrushes} paintbrushes. These were their only purchases.`,
      `Isha brought ${cash(ishaStart)} to the stall. Zaki’s starting amount was ${startingMultiple} times the amount he had left after shopping.`,
    ],
    prompt: '(a) Does the difference between their amounts of money increase, decrease or stay the same after shopping? (b) What is the price of one model kit? Choose the option that answers both parts.',
    answer,
    choices: r.shuffle([
      answer,
      response(otherDirections[0], kitPrice),
      response(direction, brushPrice),
      response(otherDirections[1], brushPrice),
    ]),
    hint: 'Express each purchase using the price of one paintbrush. Then use Zaki’s starting money and money left to find how much he spent.',
    workedSteps: steps,
    explanation: explain(steps),
  };
}
