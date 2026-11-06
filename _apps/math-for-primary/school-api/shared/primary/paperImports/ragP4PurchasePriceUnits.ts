import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-purchase-price-units',
  level: 4,
  title: 'Find prices from a shopping bill',
  objective: 'Use the price of the cheaper item as one unit to work out prices from a mixed purchase.',
  skillIds: ['P4.S.MD.03', 'P4.S.DEC.06', 'P4.S.DEC.05'],
  canonicalPatternId: 'p4-purchase-total-in-cheaper-item-units',
};

type Target = 'small' | 'large' | 'pair' | 'difference';
const targets: Target[] = ['small', 'large', 'pair', 'difference'];
const dollars = (cents: number) => (cents / 100).toFixed(2);
const price = (cents: number) => `$${dollars(cents)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const target = r.pick(targets);
  const item = r.pick(['tent', 'badge']);
  const plural = `${item}s`;
  const largeCount = target === 'difference' ? r.int(2, 4) : target === 'pair' ? 2 : r.int(1, 2);
  const factor = r.int(2, largeCount === 1 || target === 'difference' ? 4 : 3);
  // For unequal counts, keep the equivalent number of small items at nine or fewer.
  const smallCount = target === 'difference' ? largeCount : r.int(largeCount + 1, 9 - largeCount * factor);
  const smallCents = item === 'tent' ? 100 * r.int(64, 175) : 5 + 10 * r.int(8, 28);
  const largeCents = factor * smallCents;
  const pairCents = largeCents + smallCents;
  const totalCents = largeCount * largeCents + smallCount * smallCents;
  const context = [
    `Each large ${item} costs the same as ${factor} small ${plural}.`,
    `The club paid ${price(totalCents)} for ${largeCount} large ${largeCount === 1 ? item : plural} and ${smallCount} small ${plural}.`,
    `All ${plural} of the same size have the same price.`,
  ];
  const prompts = {
    small: `What is the price of one small ${item}?`,
    large: `What is the price of one large ${item}?`,
    pair: `How much would one large ${item} and one small ${item} cost together?`,
    difference: `How much more does one large ${item} cost than one small ${item}?`,
  };
  const answers = { small: smallCents, large: largeCents, pair: pairCents, difference: largeCents - smallCents };
  const steps: NonNullable<Question['workedSteps']> = [];
  let hint = `Imagine buying small ${plural} in place of the large ones for the same price.`;

  if (target === 'difference') {
    hint = `Make pairs with one large ${item} and one small ${item} in each. How much did the club pay for each pair?`;
    steps.push(
      { text: `There are ${largeCount} pairs. Find the price of one pair.`, equation: `${price(totalCents)} ÷ ${largeCount} = ${price(pairCents)}` },
      { text: `Count one unit for each small ${item} that would cost the same as the pair.`, equation: `${factor} + 1 = ${factor + 1} units` },
      { text: `One unit is the price of one small ${item}.`, equation: `${price(pairCents)} ÷ ${factor + 1} = ${price(smallCents)}` },
      { text: `Find the price of one large ${item}.`, equation: `${price(smallCents)} × ${factor} = ${price(largeCents)}` },
      { text: 'Subtract the smaller price from the larger price.', equation: `${price(largeCents)} − ${price(smallCents)} = ${price(answers.difference)}` },
    );
  } else {
    const units = largeCount * factor + smallCount;
    steps.push(
      { text: `Count ${factor} price units for each large ${item} and one for each small ${item}.`, equation: `${largeCount} × ${factor} + ${smallCount} = ${units} units` },
      { text: `Share the bill equally among the ${units} units to find the price of one small ${item}.`, equation: `${price(totalCents)} ÷ ${units} = ${price(smallCents)}` },
    );
    if (target === 'large') {
      steps.push({ text: `One large ${item} costs as much as ${factor} small ones.`, equation: `${price(smallCents)} × ${factor} = ${price(largeCents)}` });
    }
    if (target === 'pair') {
      context.push('Show your working on paper.');
      steps.push(
        { text: 'Count the price units for one of each size.', equation: `${factor} + 1 = ${factor + 1} units` },
        { text: 'Find the price of those units together.', equation: `${price(smallCents)} × ${factor + 1} = ${price(pairCents)}` },
      );
    }
  }

  return {
    key, context, prompt: prompts[target], answer: dollars(answers[target]), unit: 'dollars', hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
