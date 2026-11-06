import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-nested-fractions-successive-remainders',
  level: 5,
  title: 'Fractions of what is left',
  objective: 'Find quantities after successive fractional changes and use a later addition to recover a starting quantity.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06'],
  canonicalPatternId: 'nested-fractions-and-successive-remainders',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];
const PAIRS = [
  [1, 3, 3, 4],
  [2, 5, 5, 6],
  [3, 8, 4, 5],
  [1, 4, 4, 5],
  [2, 3, 3, 5],
  [3, 5, 5, 8],
] as const;
const VOLUMES = [[2, 3], [3, 5], [4, 5], [5, 6], [5, 8], [7, 8], [7, 10]] as const;
const NAMES = ['Aina', 'Ravi', 'Mei', 'Iman', 'Dev', 'Lina'] as const;
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
function fraction(n: number, d: number) {
  const g = gcd(n, d);
  return {n: n / g, d: d / g, text: d / g === 1 ? String(n / g) : `${n / g}/${d / g}`};
}
const explain = (steps: Step[]) => steps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' ');

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = ((hashString(`nested-fractions:${seed}`) >>> 0) % 3 + offset) % 3;
  const [a, b, c, d] = r.pick(PAIRS);
  const name = r.pick(NAMES);
  const firstKept = fraction(b - a, b);
  const secondKept = fraction(d - c, d);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  if (variant === 0) {
    // Multiples of both denominators keep every bead count integral.
    let total = b * d * r.int(3, 12);
    if (total === 200) total += b * d;
    const afterFirst = total * (b - a) / b;
    const remaining = afterFirst * (d - c) / d;
    const steps: Step[] = [
      {text: 'Find the fraction left on the tray after filling the red bag.', equation: `1 − ${a}/${b} = ${firstKept.text}`},
      {text: 'Find how many beads are still on the tray.', equation: `${total} ÷ ${b} × ${b - a} = ${afterFirst} beads`},
      {text: 'Find the fraction of those beads left after filling the blue bag.', equation: `1 − ${c}/${d} = ${secondKept.text}`},
      {text: 'These remaining beads go into the green bag.', equation: `${afterFirst} ÷ ${d} × ${d - c} = ${remaining} beads`},
    ];
    return {
      key,
      context: [
        `There are ${total} beads on a tray.`,
        `${name} moved ${a}/${b} of the beads into a red bag.`,
        `Then ${name} moved ${c}/${d} of the beads still on the tray into a blue bag.`,
        `${name} put all the beads left on the tray into a green bag.`,
      ],
      prompt: 'How many beads went into the green bag?',
      answer: String(remaining),
      unit: 'beads',
      hint: 'Find what remains after each move. The second fraction refers to the beads still on the tray.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  if (variant === 1) {
    const [n, denominator] = r.pick(VOLUMES);
    const initial = fraction(n, denominator);
    const afterFirst = fraction(n * (b - a), denominator * b);
    const used = fraction(afterFirst.n * c, afterFirst.d * d);
    const steps: Step[] = [
      {text: 'Find the fraction of the original drink still in the jug.', equation: `1 − ${a}/${b} = ${firstKept.text}`},
      {text: 'Find the volume left after filling the cups.', equation: `${initial.text} × ${firstKept.text} = ${afterFirst.text} L`},
      {text: 'Take the stated fraction of that remaining volume for the flask.', equation: `${afterFirst.text} × ${c}/${d} = ${used.text} L`},
    ];
    return {
      key,
      context: [
        `${name} poured ${initial.text} L of berry drink into an empty jug.`,
        `First, ${name} poured ${a}/${b} of the drink into cups.`,
        `Then ${name} poured ${c}/${d} of the drink still in the jug into a flask.`,
      ],
      prompt: 'How much drink was poured into the flask? Give a fraction in simplest form, in litres.',
      answer: used.text,
      unit: 'L',
      requireSimplified: true,
      hint: 'First find the volume left in the jug. The flask receives a fraction of that volume.',
      workedSteps: steps,
      explanation: explain(steps),
    };
  }

  const original = b * d * r.int(3, 12);
  const secondGift = fraction((b - a) * c, b * d);
  const removed = fraction(b * d - (b - a) * (d - c), b * d);
  const givenAway = original * removed.n / removed.d;
  const increase = r.pick([6, 8, 10, 12, 14, 16, 18]);
  const added = givenAway + increase;
  const onePart = givenAway / removed.n;
  const totalMade = original + added;
  const steps: Step[] = [
    {text: '(a) Find the fraction of the first batch left after the first gift.', equation: `1 − ${a}/${b} = ${firstKept.text}`},
    {text: 'Express the second gift as a fraction of the first batch.', equation: `${firstKept.text} × ${c}/${d} = ${secondGift.text}`},
    {text: 'Add the two gifts as fractions of the same first batch.', equation: `${a}/${b} + ${secondGift.text} = ${removed.text}`},
    {text: '(b) The new flowers replace those given away and leave the stated increase.', equation: `${added} − ${increase} = ${givenAway} flowers given away`},
    {text: `The gifts account for ${removed.n} equal parts of the first batch. Find one part.`, equation: `${givenAway} ÷ ${removed.n} = ${onePart} flowers`},
    {text: `The complete first batch has ${removed.d} equal parts.`, equation: `${onePart} × ${removed.d} = ${original} flowers`},
    {text: 'Add both batches to find how many flowers were made altogether.', equation: `${original} + ${added} = ${totalMade} flowers`},
  ];
  return {
    key,
    context: [
      `Before lunch, ${name} made some paper flowers.`,
      `${name} gave ${a}/${b} of these flowers to one class.`,
      `Then ${name} gave ${c}/${d} of the flowers still left to another class.`,
      `After that, ${name} made ${added} more flowers and kept all of them.`,
      `There were now ${increase} more flowers left than ${name} had made before lunch.`,
    ],
    prompt: `(a) What fraction of the flowers made before lunch was given away? Write it in simplest form using the numerator and denominator boxes. (b) How many flowers did ${name} make altogether?`,
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: '(a) Numerator'},
        {label: '(a) Denominator'},
        {label: '(b) Total flowers made'},
      ],
    },
    answer: JSON.stringify([String(removed.n), String(removed.d), String(totalMade)]),
    hint: 'For (a), express both gifts as fractions of the first batch. For (b), subtract the final increase from the new batch to find how many flowers were given away.',
    workedSteps: steps,
    explanation: explain(steps),
  };
}
