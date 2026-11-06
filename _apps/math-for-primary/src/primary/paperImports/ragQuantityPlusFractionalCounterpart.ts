import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p5-quantity-plus-fractional-counterpart',
  level: 5,
  title: 'Add a quantity and its fractional counterpart',
  objective: 'Find a second quantity as a fraction of the first, then combine both quantities.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P5.S.FRAC.04', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-quantity-plus-fractional-counterpart',
} as const;

const ratios = [[1, 2], [1, 4], [2, 5], [3, 4], [5, 6], [3, 8], [5, 8]] as const;
const masses: readonly (readonly [number, number])[] = [
  [7, 4], [9, 4], [11, 4], [5, 2], [7, 2],
  [9, 2], [13, 4], [7, 3], [8, 3], [10, 3],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function mixed(n: number, d: number): string {
  const g = gcd(n, d);
  n /= g;
  d /= g;
  if (d === 1) return String(n);
  const whole = Math.floor(n / d);
  return whole ? `${whole} ${n % d}/${d}` : `${n}/${d}`;
}

function improper(n: number, d: number): string {
  const g = gcd(n, d);
  return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`;
}

const tenths = (n: number): string => (n / 10).toFixed(1).replace(/\.0$/, '');
const explain = (steps: NonNullable<Question['workedSteps']>): string =>
  steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' ');

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) % 3 + (index >>> 0) % 3) % 3;
  const [n, d] = r.pick(ratios);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    // Work in tenths so every displayed distance and calculation is exact.
    const part = r.pick([4, 6, 7, 8, 9].filter(k => (d * k) % 10 !== 0));
    const first = d * part;
    const second = n * part;
    const total = first + second;
    const workedSteps: NonNullable<Question['workedSteps']> = [
      { text: 'Find the distance from the bakery to the playground.', equation: `${tenths(first)} ÷ ${d} × ${n} = ${tenths(second)} km` },
      { text: 'Add both parts of the walk. Walking back still adds to the distance travelled.', equation: `${tenths(first)} + ${tenths(second)} = ${tenths(total)} km` },
    ];
    return {
      key,
      context: [
        `Rina walks ${tenths(first)} km from a sports hall to a bakery.`,
        'She then walks back along the same path to a playground.',
        `Her walk from the bakery to the playground is ${n}/${d} of her walk from the sports hall to the bakery.`,
      ],
      prompt: 'How far does Rina walk altogether? Give your answer in kilometres.',
      unit: 'km',
      answer: tenths(total),
      hint: 'Find the length of the second part first. Then add the distances of both parts.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  if (variant === 1) {
    // Both the counterpart and the sum have manageable simplified denominators.
    const candidates = masses.filter(([a, b]) =>
      b * d / gcd(a * n, b * d) <= 12 &&
      b * d / gcd(a * (d + n), b * d) <= 12,
    );
    const [a, b] = r.pick(candidates);
    const denominator = b * d;
    const counterpart = a * n;
    const total = a * (d + n);
    const answer = mixed(total, denominator);
    const choices = r.shuffle([...new Set([
      total,
      counterpart,
      a * d,
      a * (d - n),
      a * d + n * b,
    ].map(value => mixed(value, denominator)))].slice(0, 4));
    const workedSteps: NonNullable<Question['workedSteps']> = [
      { text: 'Write the mass in the first bag as an improper fraction.', equation: `${mixed(a, b)} = ${improper(a, b)}` },
      { text: 'Find the mass of rice in the second bag.', equation: `${improper(a, b)} × ${n}/${d} = ${mixed(counterpart, denominator)} kg` },
      { text: 'Add the masses in the two bags.', equation: `${mixed(a, b)} + ${mixed(counterpart, denominator)} = ${answer} kg` },
    ];
    return {
      key,
      context: [
        `The first bag holds ${mixed(a, b)} kg of rice.`,
        `The second bag holds ${n}/${d} as much rice as the first bag.`,
      ],
      prompt: 'What is the total mass of rice in the two bags?',
      unit: 'kg',
      answer,
      choices,
      hint: 'Multiply the first mass by the fraction to find the second mass. Add both masses.',
      workedSteps,
      explanation: explain(workedSteps),
    };
  }

  const group = r.pick([3, 4, 6, 8]);
  const scale = r.int(2, 6);
  const first = d * group * scale;
  const second = n * group * scale;
  const rate = r.pick([2, 3, 4, 6]);
  const bonus = r.pick([7, 9, 12, 15]);
  const total = first + second;
  const groups = second / group;
  const itemPay = second * rate;
  const bonusPay = groups * bonus;
  const earnings = itemPay + bonusPay;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: 'Find the number of key rings sold in the second week.', equation: `${first} ÷ ${d} × ${n} = ${second} key rings` },
    { text: '(a) Add the sales for both weeks.', equation: `${first} + ${second} = ${total} key rings` },
    { text: '(b) Find the payment for individual sales in the second week.', equation: `${second} × $${rate} = $${itemPay}` },
    { text: 'Find the number of bonus groups in the second week.', equation: `${second} ÷ ${group} = ${groups} groups` },
    { text: 'Find the bonus payment.', equation: `${groups} × $${bonus} = $${bonusPay}` },
    { text: 'Add both payments for the second week.', equation: `$${itemPay} + $${bonusPay} = $${earnings}` },
  ];
  return {
    key,
    context: [
      `A craft seller sold ${first} key rings in the first week.`,
      `In the second week, the seller sold ${n}/${d} as many key rings as in the first week.`,
      `For each key ring sold, the seller earned $${rate}.`,
      `For every ${group} key rings sold in a week, the seller also received a bonus of $${bonus}.`,
    ],
    prompt: '(a) How many key rings did the seller sell over the two weeks? (b) How much did the seller earn in the second week, including bonuses?',
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        { label: '(a) Total sold (key rings)' },
        { label: '(b) Second-week earnings ($)', decimal: true },
      ],
    },
    answer: JSON.stringify([String(total), earnings.toFixed(2)]),
    hint: 'Find the second-week sales first. Use both weeks for (a), but only the second week for (b).',
    workedSteps,
    explanation: explain(workedSteps),
  };
}
