import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-successive-percentage-factors',
  level: 5,
  title: 'Follow two percentage changes',
  objective: 'Use the correct amount for each percentage to find a final balance, a starting amount or a second payment.',
  skillIds: ['P5.S.PCT.02', 'P5.S.PCT.03', 'P5.S.PCT.04'],
  canonicalPatternId: 'successive-percentage-factors',
} as const;

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return value;
}

function randomFor(text: string): (limit: number) => number {
  let state = hash(text);
  return limit => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * limit);
  };
}

const cash = (cents: number): string => (cents / 100).toFixed(2);
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const random = randomFor(`${RAG_PATTERN.id}:${seed}:${index}`);
  const integer = (low: number, high: number) => low + random(high - low + 1);
  const pick = (values: readonly number[]) => values[random(values.length)]!;
  const variant = (hash(String(seed)) + (index >>> 0)) % 4;
  const make = (
    context: string[], prompt: string, answerCents: number,
    hint: string, steps: Steps, choices?: string[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer: cash(answerCents), unit: 'dollars', hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text}${step.equation ? ` ${step.equation}` : ''}`).join(' '),
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    // Multiples of $20 give whole-dollar discounted prices and exact-cent tax.
    const original = integer(3, 20) * 2000;
    const discount = pick([10, 15, 20, 25, 30]);
    const tax = pick([6, 7, 8, 9]);
    const retained = 100 - discount;
    const reduced = original * retained / 100;
    const taxAmount = reduced * tax / 100;
    const final = reduced * (100 + tax) / 100;
    return make([
      `A sports bag has a marked price of $${cash(original)}.`,
      `The shop gives a ${discount}% discount on the marked price.`,
      `A tax of ${tax}% is then charged on the discounted price.`,
    ], 'What is the total price, including tax?', final,
    'First find the discounted price. Use that new price to calculate the tax.', [
      {text: 'Find the percentage of the marked price still payable.', equation: `100% − ${discount}% = ${retained}%`},
      {text: 'Find the discounted price.', equation: `$${cash(original)} × ${retained} ÷ 100 = $${cash(reduced)}`},
      {text: 'Calculate tax on the discounted price.', equation: `$${cash(reduced)} × ${tax} ÷ 100 = $${cash(taxAmount)}`},
      {text: 'Add the tax to the discounted price.', equation: `$${cash(reduced)} + $${cash(taxAmount)} = $${cash(final)}`},
    ]);
  }

  if (variant === 1) {
    const original = integer(2, 18) * 10000;
    const first = pick([10, 30, 40, 50]);
    const second = pick([10, 20, 40, 50]);
    const retainedFirst = 100 - first;
    const retainedSecond = 100 - second;
    const middle = original * retainedFirst / 100;
    const left = middle * retainedSecond / 100;
    let choices: string[] | undefined;
    if (random(2) === 0) {
      choices = [...new Set([
        original, middle, left, original - left, original + left,
      ])].slice(0, 4).map(cash);
      for (let i = choices.length - 1; i > 0; i--) {
        const j = random(i + 1);
        const saved = choices[i]!;
        choices[i] = choices[j]!;
        choices[j] = saved;
      }
    }
    return make([
      `Lina used ${first}% of her gift money to buy art materials.`,
      `She then donated ${second}% of the money left.`,
      `After these two payments, she had $${cash(left)} left.`,
    ], 'How much gift money did Lina have at first?', original,
    'Work backwards through the donation first, then through the purchase.', [
      {text: 'Find the percentage kept after the donation. Its whole is the money left after buying art materials.', equation: `100% − ${second}% = ${retainedSecond}%`},
      {text: 'Recover the amount before the donation.', equation: `$${cash(left)} ÷ ${retainedSecond} × 100 = $${cash(middle)}`},
      {text: 'Find the percentage of the original money left after the purchase.', equation: `100% − ${first}% = ${retainedFirst}%`},
      {text: 'Recover all the gift money.', equation: `$${cash(middle)} ÷ ${retainedFirst} × 100 = $${cash(original)}`},
    ], choices);
  }

  if (variant === 2) {
    const original = integer(2, 12) * 10000;
    const first = pick([10, 20, 30, 40]);
    const second = pick([15, 20, 30, 35]);
    const retained = 100 - first;
    const middle = original * retained / 100;
    const food = middle * second / 100;
    return make([
      `A class club had $${cash(original)} for an outing.`,
      `It spent ${first}% of this money on transport.`,
      `It then spent ${second}% of the money left on food.`,
    ], 'How much money did the club spend on food?', food,
    'The food percentage is a share of the money left after paying for transport.', [
      {text: 'Find the percentage left after paying for transport.', equation: `100% − ${first}% = ${retained}%`},
      {text: 'Find the amount left for the next payment.', equation: `$${cash(original)} × ${retained} ÷ 100 = $${cash(middle)}`},
      {text: 'Find the food payment using that remaining amount.', equation: `$${cash(middle)} × ${second} ÷ 100 = $${cash(food)}`},
    ]);
  }

  // Whole-dollar first-year balances ensure exact-cent second-year interest.
  const original = integer(2, 20) * 10000;
  const first = pick([2, 3, 4, 5, 6, 8, 10]);
  const second = pick([2, 3, 4, 5, 6, 8, 10]);
  const middle = original * (100 + first) / 100;
  const final = middle * (100 + second) / 100;
  return make([
    `A club put $${cash(original)} in a savings account.`,
    `At the end of the first year, the bank added ${first}% of the starting balance as interest.`,
    `At the end of the second year, the bank added ${second}% of the balance after the first year as interest.`,
    'No other money was added to or taken from the account.',
  ], 'How much money was in the account after the second year?', final,
  'Include the first year’s interest before calculating the second year’s interest.', [
    {text: 'The first-year balance includes the original money and its interest.', equation: `100% + ${first}% = ${100 + first}%`},
    {text: 'Find the balance after the first year.', equation: `$${cash(original)} × ${100 + first} ÷ 100 = $${cash(middle)}`},
    {text: 'Use the first-year balance as the whole for the second year.', equation: `100% + ${second}% = ${100 + second}%`},
    {text: 'Find the balance after the second year.', equation: `$${cash(middle)} × ${100 + second} ÷ 100 = $${cash(final)}`},
  ]);
}
