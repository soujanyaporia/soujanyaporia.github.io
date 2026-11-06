import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-reverse-nested-fractions',
  level: 5,
  title: 'Work back through spending and collections',
  objective: 'Recover earlier amounts from nested fractions, then find total spending or linked category counts.',
  skillIds: ['P4.S.FRAC.03', 'P5.S.FRAC.05', 'P5.S.FRAC.06', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-reverse-nested-fractions-and-remainders',
} as const;

const cash = (cents: number): string => (cents / 100).toFixed(2);
type Steps = NonNullable<Question['workedSteps']>;

const BALANCE_CASES: [number, number, number, number][] = [
  [1, 4, 2, 3], [2, 5, 3, 4], [1, 6, 2, 5],
  [3, 8, 1, 2], [2, 7, 3, 5], [1, 5, 2, 3],
];
const PRICE_CASES: [number, number, number, number][] = [
  [1, 4, 2, 3], [1, 5, 3, 4], [2, 7, 2, 5],
  [2, 5, 1, 3], [3, 8, 2, 5],
];
const CATEGORY_CASES: [number, number, number, number, number, number][] = [
  [2, 5, 1, 4, 1, 4], [3, 7, 2, 5, 1, 3],
  [1, 4, 2, 3, 1, 5], [2, 7, 3, 4, 1, 5],
  [3, 8, 1, 2, 1, 4], [2, 5, 1, 3, 1, 5],
];

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index) || index < 0) {
    throw new RangeError('Use an integer seed and a non-negative integer question index.');
  }
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = (((seed % 3) + (index % 3)) % 3 + 3) % 3;
  const finish = (
    context: string[], prompt: string, answer: string, hint: string,
    workedSteps: Steps, extra: Partial<Question>,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [a, b, c, d] = r.pick(BALANCE_CASES);
    const scale = r.int(5, 12);
    // Whole-dollar construction keeps all intermediate equal parts exact.
    const whole = b * d * scale;
    const first = a * d * scale;
    const afterFirst = whole - first;
    const second = (b - a) * c * scale;
    const left = afterFirst - second;
    const spent = first + second;
    const choices = r.shuffle(
      [...new Set([spent, whole, afterFirst, left, first, second])]
        .slice(0, 4).map(value => cash(value * 100)),
    );
    return finish([
      `Nadia used ${a}/${b} of her craft money to buy a paint set.`,
      `She then used ${c}/${d} of the money still left to buy a craft kit.`,
      `She had $${cash(left * 100)} left after these two purchases.`,
    ], 'How much did Nadia spend altogether on the paint set and the craft kit?',
    cash(spent * 100),
    'Work back from the money left. Then subtract that final balance from the starting amount.', [
      {text: 'Find the fraction kept after buying the craft kit.', equation: `1 − ${c}/${d} = ${d - c}/${d}`},
      {text: 'Use those remaining parts to find the money available before the craft kit.', equation: `$${cash(left * 100)} ÷ ${d - c} × ${d} = $${cash(afterFirst * 100)}`},
      {text: `After the paint set, ${b - a}/${b} of the starting money remained. Recover the whole.`, equation: `$${cash(afterFirst * 100)} ÷ ${b - a} × ${b} = $${cash(whole * 100)}`},
      {text: 'Subtract the final balance to find the total spent.', equation: `$${cash(whole * 100)} − $${cash(left * 100)} = $${cash(spent * 100)}`},
    ], {unit: 'dollars', choices});
  }

  if (variant === 1) {
    const [a, b, c, d] = r.pick(PRICE_CASES);
    const scale = r.int(1, 3);
    const priceCents = r.pick([60, 75, 80, 120, 125]);
    const firstMetres = a * d * scale;
    const firstCents = firstMetres * priceCents;
    const wholeCents = b * d * scale * priceCents;
    const afterFirstCents = wholeCents - firstCents;
    const secondCents = (b - a) * c * scale * priceCents;
    const spentCents = firstCents + secondCents;
    return finish([
      `Aisha bought ${firstMetres} m of cord at $${cash(priceCents)} per metre.`,
      `This first purchase used ${a}/${b} of the money she had set aside.`,
      `She used ${c}/${d} of the money left after that purchase to buy more cord at the same price.`,
    ], 'How much did Aisha pay for the cord in both purchases?',
    cash(spentCents),
    'Find the cost of the first length. Use its fraction to recover the starting money before finding the second cost.', [
      {text: 'Calculate the first purchase cost.', equation: `${firstMetres} × $${cash(priceCents)} = $${cash(firstCents)}`},
      {text: `The first cost represents ${a} of ${b} equal parts of the starting money.`, equation: `$${cash(firstCents)} ÷ ${a} × ${b} = $${cash(wholeCents)}`},
      {text: 'Find the money left after the first purchase.', equation: `$${cash(wholeCents)} − $${cash(firstCents)} = $${cash(afterFirstCents)}`},
      {text: 'Find the cost of the second purchase from this remaining money.', equation: `$${cash(afterFirstCents)} ÷ ${d} × ${c} = $${cash(secondCents)}`},
      {text: 'Add the costs of both purchases.', equation: `$${cash(firstCents)} + $${cash(secondCents)} = $${cash(spentCents)}`},
    ], {unit: 'dollars'});
  }

  const [a, b, c, d, e, f] = r.pick(CATEGORY_CASES);
  const scale = r.int(2, 6);
  // Scaling by f-e makes the unchanged group an exact number of new parts.
  // Each case satisfies a/b > e/f, so a positive number of red badges is sold.
  const whole = b * d * (f - e) * scale;
  const redBefore = a * d * (f - e) * scale;
  const otherColours = whole - redBefore;
  const yellow = (b - a) * (d - c) * (f - e) * scale;
  const redAfter = (b - a) * d * e * scale;
  const sold = redBefore - redAfter;
  return finish([
    'The box contains only red, blue and yellow badges.',
    `At first, ${a}/${b} of all the badges were red.`,
    `Of the badges that were not red, ${c}/${d} were blue. The other ${yellow} badges were yellow.`,
    'The club then sold some red badges. No blue or yellow badges were sold, and no badges were added.',
    `After the sale, ${e}/${f} of the badges still in the box were red.`,
  ], 'Find (a) the number of red badges before the sale and (b) the number of red badges sold.',
  JSON.stringify([String(redBefore), String(sold)]),
  'Work back from the yellow badges. For part (b), the number of blue and yellow badges stays unchanged.', [
    {text: `Yellow badges formed ${d - c}/${d} of the badges that were not red. Recover that group.`, equation: `${yellow} ÷ ${d - c} × ${d} = ${otherColours} badges`},
    {text: `The blue and yellow group formed ${b - a}/${b} of the original collection. Recover the original total.`, equation: `${otherColours} ÷ ${b - a} × ${b} = ${whole} badges`},
    {text: 'Find the red badges before the sale for part (a).', equation: `${whole} ÷ ${b} × ${a} = ${redBefore} red badges`},
    {text: 'After the sale, the unchanged blue and yellow group formed this fraction of the smaller collection.', equation: `1 − ${e}/${f} = ${f - e}/${f}`},
    {text: `The unchanged ${otherColours} badges represent ${f - e} new equal parts. Find the ${e} red part${e === 1 ? '' : 's'} left.`, equation: `${otherColours} ÷ ${f - e} × ${e} = ${redAfter} red badges`},
    {text: 'Subtract the red badges left to answer part (b).', equation: `${redBefore} − ${redAfter} = ${sold} red badges sold`},
  ], {
    unit: 'badges',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Red badges before the sale',
      secondLabel: '(b) Red badges sold',
    },
  });
}
