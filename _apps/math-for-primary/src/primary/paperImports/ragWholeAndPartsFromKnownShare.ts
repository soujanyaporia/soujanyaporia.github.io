import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-whole-and-parts-from-known-share',
  level: 5,
  title: 'Find a whole or another part',
  objective: 'Use a known fractional amount to find the whole and, when needed, another part.',
  skillIds: ['P5.S.FRAC.05', 'P4.S.FRAC.04'],
  canonicalPatternId: 'whole-and-parts-from-known-share',
} as const;

type Fraction = readonly [number, number];
type Step = NonNullable<Question['workedSteps']>[number];

const SHARES: readonly Fraction[] = [
  [1, 5], [2, 5], [3, 5], [1, 6], [5, 6],
  [2, 7], [3, 7], [5, 8], [7, 10], [5, 12],
];
const HUNG_SHARES: readonly Fraction[] = [
  [1, 3], [2, 5], [3, 8], [1, 6], [7, 12],
];
// Each pair leaves a positive remainder of at most nine common-denominator parts.
const ALLOCATIONS: readonly (readonly [number, number, number, number])[] = [
  [2, 7, 1, 3], [3, 10, 1, 4], [2, 9, 1, 3], [1, 3, 1, 5],
  [1, 4, 2, 5], [3, 8, 1, 4], [1, 6, 1, 4], [5, 12, 1, 4],
];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function lcm(a: number, b: number): number {
  return a / gcd(a, b) * b;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) >>> 0) + (index >>> 0)) % 4;
  const finish = (
    context: string[], prompt: string, answer: number, unit: string,
    hint: string, workedSteps: Step[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer: String(answer), unit, hint, workedSteps,
    explanation: workedSteps.map(step =>
      `${step.text} ${step.equation ?? ''}`.trim(),
    ).join(' '),
  });

  if (variant === 0) {
    const [a, b] = r.pick(SHARES);
    const [c, d] = r.pick(HUNG_SHARES.filter(([n, den]) => n * b !== a * den));
    const whole = lcm(b, d) * r.int(6, 18);
    const yellow = whole / b * (b - a);
    const boxed = whole / d * (d - c);
    return finish([
      'The art club made blue and yellow paper flags, and no other colours.',
      `${a}/${b} of all the flags were blue.`,
      `There were ${yellow} yellow flags.`,
      `The club hung ${c}/${d} of all the flags in the hall and put every flag it did not hang into a box.`,
    ], 'How many flags were put in the box?', boxed, 'flags',
    'Use the yellow flags to find the total first. Both fractions refer to all the flags made.', [
      {text: 'Find the fraction of flags that were yellow.', equation: `1 − ${a}/${b} = ${b - a}/${b}`},
      {text: `The yellow flags make ${b - a} equal parts. Find one part.`, equation: `${yellow} ÷ ${b - a} = ${whole / b} flags`},
      {text: `Find all ${b} parts.`, equation: `${whole / b} × ${b} = ${whole} flags`},
      {text: 'Find the fraction put into the box.', equation: `1 − ${c}/${d} = ${d - c}/${d}`},
      {text: 'Find this fraction of all the flags made.', equation: `${whole} ÷ ${d} × ${d - c} = ${boxed} flags`},
    ]);
  }

  if (variant === 1) {
    const [a, b] = r.pick(SHARES);
    const onePart = r.int(9, 45);
    const green = a * onePart;
    const whole = b * onePart;
    return finish([
      'A jar contains only green and purple beads.',
      `${a}/${b} of all the beads are green.`,
      `There are ${green} green beads.`,
    ], 'How many beads are in the jar altogether?', whole, 'beads',
    'The green beads make the number of equal parts shown by the numerator.', [
      {text: `Find one of the ${b} equal parts.`, equation: `${green} ÷ ${a} = ${onePart} beads`},
      {text: `Find all ${b} parts in the jar.`, equation: `${onePart} × ${b} = ${whole} beads`},
    ]);
  }

  if (variant === 2) {
    const [a, b] = r.pick(SHARES);
    const onePart = r.int(9, 45);
    const white = (b - a) * onePart;
    const whole = b * onePart;
    return finish([
      'A tray holds only red and white counters.',
      `${a}/${b} of all the counters are red.`,
      `There are ${white} white counters.`,
    ], 'How many counters are on the tray altogether?', whole, 'counters',
    'Find the fraction that is white, then use the white counters to find one equal part.', [
      {text: 'Find the fraction of counters that are white.', equation: `1 − ${a}/${b} = ${b - a}/${b}`},
      {text: 'Find one equal part.', equation: `${white} ÷ ${b - a} = ${onePart} counters`},
      {text: `Find all ${b} parts.`, equation: `${onePart} × ${b} = ${whole} counters`},
    ]);
  }

  const [a, b, c, d] = r.pick(ALLOCATIONS);
  const common = lcm(b, d);
  const bowlParts = a * (common / b);
  const tileParts = c * (common / d);
  const leftParts = common - bowlParts - tileParts;
  const onePart = r.int(12, 40);
  const whole = common * onePart;
  const left = leftParts * onePart;
  const bowls = bowlParts * onePart;
  return finish([
    'The craft club had a lump of clay.',
    `${a}/${b} of the starting mass was used for bowls.`,
    `${c}/${d} of the starting mass was used for tiles.`,
    `The clay left over had a mass of ${left} g.`,
  ], 'How many grams of clay were used for the bowls?', bowls, 'g',
  'Both fractions describe the starting mass. Add them, then find the fraction left over.', [
    {text: 'Use equal-sized parts to add the two fractions used.', equation: `${a}/${b} + ${c}/${d} = ${bowlParts}/${common} + ${tileParts}/${common} = ${bowlParts + tileParts}/${common}`},
    {text: 'Find the fraction of the starting mass left over.', equation: `1 − ${bowlParts + tileParts}/${common} = ${leftParts}/${common}`},
    {text: `The leftover clay makes ${leftParts} equal parts. Find one part.`, equation: `${left} ÷ ${leftParts} = ${onePart} g`},
    {text: 'Find the starting mass.', equation: `${onePart} × ${common} = ${whole} g`},
    {text: 'Find the fraction used for bowls.', equation: `${whole} ÷ ${b} × ${a} = ${bowls} g`},
  ]);
}
