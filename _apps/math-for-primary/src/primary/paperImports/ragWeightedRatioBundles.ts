import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-weighted-ratio-bundles',
  level: 6,
  title: 'Find an amount using ratio groups',
  objective: 'Weight ratio parts by counts or prices, then use a total to find an individual amount or category count.',
  skillIds: ['P6.S.RATIO.01', 'P6.S.RATIO.03', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-weighted-ratio-bundles',
} as const;

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const make = (
    context: string[], prompt: string, answer: string,
    hint: string, steps: Steps, extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint,
    workedSteps: steps,
    explanation: steps.map(step => step.equation
      ? `${step.text} ${step.equation}.` : step.text).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const largeCount = r.int(3, 5);
    const smallCount = r.int(4, 6);
    const multiplier = r.int(3, 5);
    const perSmall = r.int(18, 42);
    const units = largeCount * multiplier + smallCount;
    const total = units * perSmall;
    return make([
      `Lina has filled ${largeCount} large tubs and ${smallCount} small tubs with ${total} counters altogether.`,
      'All large tubs contain the same number of counters. All small tubs contain the same number of counters.',
      `Each large tub contains ${multiplier} times as many counters as each small tub.`,
    ], 'How many counters are in each small tub?', String(perSmall),
    'Let the number in one small tub be 1 unit. Count the units in every tub before dividing.', [
      {text: `One small tub holds 1 unit of counters, so one large tub holds ${multiplier} units.`},
      {text: 'Count the units in all the tubs.', equation: `${largeCount} × ${multiplier} + ${smallCount} × 1 = ${units}`},
      {text: 'Find the number of counters in 1 unit, which is the amount in each small tub.', equation: `${total} ÷ ${units} = ${perSmall}`},
      {text: 'Check the combined number of counters.', equation: `${largeCount} × ${multiplier * perSmall} + ${smallCount} × ${perSmall} = ${total}`},
    ], {unit: 'counters'});
  }

  if (variant === 1) {
    const [penParts, rulerParts] = r.pick([[3, 1], [4, 1], [3, 2], [5, 2], [4, 3]] as const);
    const penPrice = r.int(4, 8);
    const rulerPrice = r.int(1, 3);
    const groups = r.int(8, 32);
    const bundleCost = penParts * penPrice + rulerParts * rulerPrice;
    const total = groups * bundleCost;
    const askPens = r.int(0, 1) === 0;
    const target = askPens ? 'marker pens' : 'rulers';
    const targetParts = askPens ? penParts : rulerParts;
    return make([
      `An art club paid $${total} for marker pens and rulers.`,
      `The ratio of the number of marker pens to the number of rulers was ${penParts}:${rulerParts}.`,
      `Each marker pen cost $${penPrice}. Each ruler cost $${rulerPrice}.`,
    ], `How many ${target} did the art club buy?`, String(groups * targetParts),
    'Make one group in the given ratio. Find its cost, then find how many such groups were bought.', [
      {text: `One ratio group contains ${penParts} marker pens and ${rulerParts} ${rulerParts === 1 ? 'ruler' : 'rulers'}.`},
      {text: 'Find the cost of one ratio group in dollars.', equation: `${penParts} × ${penPrice} + ${rulerParts} × ${rulerPrice} = ${bundleCost}`},
      {text: 'Find the number of ratio groups.', equation: `${total} ÷ ${bundleCost} = ${groups}`},
      {text: `Each ratio group has ${targetParts} ${targetParts === 1 && !askPens ? 'ruler' : target}. Find the requested count.`, equation: `${groups} × ${targetParts} = ${groups * targetParts}`},
    ], {unit: target});
  }

  const [usedNumerator, denominator] = r.pick([[2, 5], [3, 8], [4, 9], [5, 11]] as const);
  const smallCount = r.int(3, 5);
  const largeCount = r.int(4, 6);
  const multiplier = r.pick([3, 5, 6]);
  const scale = r.int(5, 14);
  // These constructions ensure whole sequins in both fraction parts and flag allocations.
  const perSmall = usedNumerator * scale;
  const flagUnits = smallCount + largeCount * multiplier;
  const used = flagUnits * perSmall;
  const fractionPart = flagUnits * scale;
  const remainingParts = denominator - usedNumerator;
  const left = remainingParts * fractionPart;
  const perLarge = multiplier * perSmall;
  return make([
    `Siti used ${usedNumerator}/${denominator} of her sequins to decorate ${smallCount} small flags and ${largeCount} large flags.`,
    `She had ${left} sequins left.`,
    'Every small flag had the same number of sequins. Every large flag had the same number of sequins.',
    `Each small flag had 1/${multiplier} as many sequins as each large flag.`,
  ], '(a) How many sequins did Siti use altogether? (b) How many sequins were on each large flag?',
  JSON.stringify([String(used), String(perLarge)]),
  'Use the fraction left to find the total used. Then compare the amounts on one small flag and one large flag.', [
    {text: 'Find the fraction of the original sequins that was left.', equation: `1 − ${usedNumerator}/${denominator} = ${remainingParts}/${denominator}`},
    {text: 'Find the number of sequins in one fraction part of the original collection.', equation: `${left} ÷ ${remainingParts} = ${fractionPart}`},
    {text: `(a) The amount used was ${usedNumerator} fraction parts.`, equation: `${fractionPart} × ${usedNumerator} = ${used}`},
    {text: `Now use a new unit for the decorations: one small flag has 1 unit, so one large flag has ${multiplier} units.`},
    {text: 'Count the decoration units on all the flags.', equation: `${smallCount} × 1 + ${largeCount} × ${multiplier} = ${flagUnits}`},
    {text: 'Find the number of sequins on one small flag.', equation: `${used} ÷ ${flagUnits} = ${perSmall}`},
    {text: '(b) Find the number of sequins on one large flag.', equation: `${perSmall} × ${multiplier} = ${perLarge}`},
  ], {
    unit: 'sequins',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Sequins used altogether',
      secondLabel: '(b) Sequins on each large flag',
    },
  });
}
