import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-quantity-from-rate-and-count',
  level: 5,
  title: 'Find a total from an amount per item',
  objective: 'Derive the relevant count or related amount per item, then calculate the total quantity.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.07', 'P5.S.RATE.02', 'P4.S.FRAC.03'],
  canonicalPatternId: 'p5-quantity-from-rate-and-count',
} as const;

const RATES: readonly (readonly [number, number])[] = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5],
  [1, 6], [5, 6], [3, 10], [7, 10], [5, 12], [7, 12],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function mixed(n: number, d: number): string {
  const factor = gcd(n, d);
  n /= factor;
  d /= factor;
  const whole = Math.floor(n / d);
  const remainder = n % d;
  if (remainder === 0) return String(whole);
  return whole > 0 ? `${whole} ${remainder}/${d}` : `${remainder}/${d}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) % 3 + Math.trunc(index) % 3) % 3 + 3) % 3;
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const [n, d] = r.pick(RATES);

  if (variant === 0) {
    const remaining = r.pick(Array.from({length: 12}, (_, i) => i + 7)
      .filter(count => count * n > d && (count * n) % d !== 0));
    const completed = r.pick([6, 7, 8, 9, 10].filter(count => count !== remaining));
    const total = remaining + completed;
    const numerator = remaining * n;
    const answer = mixed(numerator, d);
    const choices = r.shuffle([...new Set([
      numerator, completed * n, total * n,
      numerator + d, numerator + 2 * d, numerator + 3 * d,
    ].map(value => mixed(value, d)))].slice(0, 4));
    const workedSteps = [
      {text: 'Find how many models still need to be made.', equation: `${total} − ${completed} = ${remaining} models`},
      {text: 'Multiply the clay needed for one model by the number still to be made.', equation: `${remaining} × ${n}/${d} = ${numerator}/${d} kg`},
      {text: 'Write the mass in simplest form.', equation: `${numerator}/${d} kg = ${answer} kg`},
    ];
    return {
      key,
      context: [
        `A craft club plans to make ${total} clay models. Each model needs ${n}/${d} kg of clay.`,
        `The club has finished ${completed} models and has no clay left.`,
      ],
      prompt: 'How many more kilograms of clay are needed to finish all the models?',
      answer,
      choices,
      unit: 'kg',
      hint: 'Find the number of unfinished models first. Each one needs the same mass of clay.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
      proof: {op: '*', a: {op: '-', a: total, b: completed}, b: {op: '/', a: n, b: d}},
    };
  }

  if (variant === 1) {
    const whole = r.int(1, 3);
    const multiplier = r.int(2, 4);
    const countPairs: [number, number][] = [];
    for (let small = 4; small <= 8; small++) {
      for (let large = 3; large <= 6; large++) {
        if ((small + multiplier * large) % d !== 0) countPairs.push([small, large]);
      }
    }
    const [smallCount, largeCount] = r.pick(countPairs);
    const smallRate = whole * d + n;
    const largeRate = multiplier * smallRate;
    const smallTotal = smallCount * smallRate;
    const largeTotal = largeCount * largeRate;
    const total = smallTotal + largeTotal;
    const answer = mixed(total, d);
    const workedSteps = [
      {text: 'Change the ribbon length for one small banner to an improper fraction.', equation: `${whole} ${n}/${d} = ${smallRate}/${d} m`},
      {text: 'Find the ribbon length for one large banner.', equation: `${multiplier} × ${smallRate}/${d} = ${mixed(largeRate, d)} m`},
      {text: 'Find the ribbon used for all the small banners.', equation: `${smallCount} × ${smallRate}/${d} = ${mixed(smallTotal, d)} m`},
      {text: 'Find the ribbon used for all the large banners.', equation: `${largeCount} × ${mixed(largeRate, d)} = ${mixed(largeTotal, d)} m`},
      {text: 'Add both lengths and write the result as a mixed number in simplest form.', equation: `${mixed(smallTotal, d)} + ${mixed(largeTotal, d)} = ${answer} m`},
    ];
    return {
      key,
      context: [
        `Each small banner uses ${whole} ${n}/${d} m of ribbon. Each large banner uses ${multiplier} times as much ribbon as a small banner.`,
        `A class makes ${smallCount} small banners and ${largeCount} large banners.`,
      ],
      prompt: 'How many metres of ribbon are used in all? Give your answer as a mixed number in simplest form.',
      answer,
      unit: 'm',
      requireMixed: true,
      requireSimplified: true,
      hint: 'Work out the ribbon needed for one large banner. Then find and add the totals for both sizes.',
      workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
      proof: {
        op: '+',
        a: {op: '*', a: smallCount, b: {op: '/', a: smallRate, b: d}},
        b: {op: '*', a: largeCount, b: {op: '*', a: multiplier, b: {op: '/', a: smallRate, b: d}}},
      },
    };
  }

  const reference = r.pick(Array.from({length: 15}, (_, i) => (i + 8) * d)
    .filter(count => count !== 90));
  const denomination = r.pick([10, 20, 50]);
  const onePart = reference / d;
  const coinCount = onePart * n;
  const cents = coinCount * denomination;
  const answer = (cents / 100).toFixed(2);
  const workedSteps = [
    {text: `Find one of ${d} equal parts of Nora's coin count.`, equation: `${reference} ÷ ${d} = ${onePart} coins`},
    {text: `Ethan has ${n} of these parts.`, equation: `${onePart} × ${n} = ${coinCount} coins`},
    {text: 'Find the value of his coins in cents.', equation: `${coinCount} × ${denomination} = ${cents} cents`},
    {text: 'Convert cents to dollars using 100 cents = $1.', equation: `${cents} ÷ 100 = $${answer}`},
  ];
  return {
    key,
    context: [
      `Nora has ${reference} ${denomination}-cent coins.`,
      `Ethan has ${n}/${d} as many ${denomination}-cent coins as Nora.`,
    ],
    prompt: "What is the total value of Ethan's coins, in dollars?",
    answer,
    unit: 'dollars',
    hint: "Find Ethan's number of coins first, then use the value of each coin. Remember to convert cents to dollars.",
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {
      op: '/',
      a: {op: '*', a: {op: '*', a: {op: '/', a: reference, b: d}, b: n}, b: denomination},
      b: 100,
    },
  };
}
