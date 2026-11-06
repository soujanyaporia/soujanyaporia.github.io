import {Rng, hashString} from '../../engine/random';
import type {Proof, Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fractional-quantity-fixed-adjustment',
  level: 5,
  title: 'Fractions and fixed amounts',
  objective: 'Combine a fraction of a quantity with a fixed change in the correct order, or work backwards to the starting quantity.',
  skillIds: ['P5.S.FRAC.04', 'P5.S.FRAC.05', 'P5.S.FRAC.06', 'P5.S.FRAC.07'],
  canonicalPatternId: 'fractional-quantity-with-fixed-adjustment',
} as const;

type Fraction = {n: number; d: number};
type Step = {text: string; equation: string};

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return Math.abs(a);
}
function fraction(n: number, d = 1): Fraction {
  const g = gcd(n, d);
  return {n: n / g, d: d / g};
}
const add = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const subtract = (a: Fraction, b: Fraction) => fraction(a.n * b.d - b.n * a.d, a.d * b.d);
const multiply = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
const value = (a: Fraction) => a.n / a.d;
const improper = (a: Fraction) => a.d === 1 ? String(a.n) : `${a.n}/${a.d}`;
function show(a: Fraction): string {
  if (a.d === 1) return String(a.n);
  const whole = Math.floor(a.n / a.d);
  return whole > 0 ? `${whole} ${a.n % a.d}/${a.d}` : `${a.n}/${a.d}`;
}
const proofOf = (a: Fraction): Proof => a.d === 1 ? a.n : {op: '/', a: a.n, b: a.d};
const ONE = fraction(1);
const FRACTIONS: readonly (readonly [number, number])[] = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [3, 5],
];

function pickAdjustment(r: Rng, denominator: number, valid: (amount: Fraction) => boolean): Fraction {
  const amounts: Fraction[] = [];
  for (let n = 1; n < denominator; n += 1) {
    const amount = fraction(n, denominator);
    if (valid(amount)) amounts.push(amount);
  }
  if (!amounts.length) throw new Error('No valid fixed adjustment');
  return r.pick(amounts);
}

function conversionStep(steps: Step[], amount: Fraction, description: string): void {
  if (amount.d > 1 && amount.n > amount.d) {
    steps.push({text: description, equation: `${show(amount)} = ${improper(amount)}`});
  }
}

function packingChoices(r: Rng, total: Fraction, scaled: Fraction, fixed: Fraction, answer: Fraction): string[] {
  const candidates = [
    scaled,
    subtract(scaled, fixed),
    subtract(total, answer),
    add(subtract(total, scaled), fixed),
    add(answer, fraction(1, 12)),
  ];
  const unique = new Map<string, Fraction>();
  for (const candidate of candidates) {
    if (candidate.n > 0 && value(candidate) < value(total) && improper(candidate) !== improper(answer)) {
      unique.set(improper(candidate), candidate);
    }
  }
  const wrong = r.shuffle([...unique.values()]).slice(0, 3);
  if (wrong.length !== 3) throw new Error('Three distinct distractors are required');
  return r.shuffle([show(answer), ...wrong.map(show)]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(`${RAG_PATTERN.id}:variant:${seed}`) >>> 0) + (index >>> 0)) % 4;
  const denominator = r.pick([3, 4, 5, 6, 8, 10, 12]);
  const [numerator, divisor] = r.pick(FRACTIONS);
  const share = fraction(numerator, divisor);
  const retained = subtract(ONE, share);
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;

  const make = (
    context: string[], prompt: string, answer: Fraction, unit: 'm' | 'kg',
    hint: string, steps: Step[], proof: Proof, choices?: string[],
  ): Question => ({
    key,
    context,
    prompt: `${prompt} ${choices ? 'Choose the correct answer.' : answer.n > answer.d ? 'Give your answer as a mixed number in simplest form.' : 'Give your answer as a fraction in simplest form.'}`,
    answer: show(answer),
    unit,
    hint,
    workedSteps: steps,
    explanation: `${steps.map(step => `${step.text} ${step.equation}.`).join(' ')} The answer is ${show(answer)} ${unit}.`,
    proof,
    requireSimplified: true,
    requireMixed: answer.n > answer.d,
    ...(choices ? {choices} : {}),
  });

  if (variant === 0) {
    const total = fraction(r.int(6, 12));
    const afterFraction = multiply(total, retained);
    const fixed = pickAdjustment(r, denominator, amount => {
      const result = subtract(afterFraction, amount);
      return result.n > 0 && result.d > 1;
    });
    const answer = subtract(afterFraction, fixed);
    const steps: Step[] = [
      {text: 'Find the fraction of cord left after making the display.', equation: `1 − ${show(share)} = ${show(retained)}`},
      {text: 'Find that length of cord, in metres.', equation: `${show(total)} × ${show(retained)} = ${show(afterFraction)}`},
      {text: 'Take away the fixed length used for tags.', equation: `${show(afterFraction)} − ${show(fixed)} = ${show(answer)}`},
    ];
    return make([
      `A craft club has ${show(total)} m of cord.`,
      `The club cuts off ${show(share)} of the cord for a display.`,
      `It then cuts off another ${show(fixed)} m for tags.`,
    ], 'How many metres of cord remain?', answer, 'm',
    'Find the length left after the fractional cut. Then subtract the extra length.', steps,
    {op: '-', a: {op: '*', a: proofOf(total), b: proofOf(retained)}, b: proofOf(fixed)});
  }

  if (variant === 1) {
    const parts = r.int(2, 5);
    const removed = fraction(parts - 1, parts);
    const leftFraction = fraction(1, parts);
    const final = fraction(r.int(1, 3) * denominator + r.int(1, denominator - 1), denominator);
    const beforeFraction = multiply(final, fraction(parts));
    const fixed = pickAdjustment(r, denominator, amount => add(beforeFraction, amount).d > 1);
    const answer = add(beforeFraction, fixed);
    const steps: Step[] = [
      {text: 'Find the fraction left after wrapping the gifts.', equation: `1 − ${show(removed)} = ${show(leftFraction)}`},
    ];
    conversionStep(steps, final, 'Write the final length as an improper fraction before multiplying.');
    steps.push(
      {text: `The final length is one of ${parts} equal parts. Find all ${parts} parts, in metres.`, equation: `${improper(final)} × ${parts} = ${show(beforeFraction)}`},
      {text: 'Put back the fixed length used for the bow.', equation: `${show(beforeFraction)} + ${show(fixed)} = ${show(answer)}`},
    );
    return make([
      `Lina cuts ${show(fixed)} m from a roll of ribbon to make a bow.`,
      `She then uses ${show(removed)} of the remaining ribbon to wrap gifts.`,
      `There is now ${show(final)} m of ribbon left on the roll.`,
    ], 'How many metres of ribbon were on the roll at the start?', answer, 'm',
    'Work backwards from the final length. Recover the length before wrapping the gifts, then add back the bow length.', steps,
    {op: '+', a: {op: '*', a: proofOf(final), b: parts}, b: proofOf(fixed)});
  }

  if (variant === 2) {
    const total = fraction(r.int(2, 6) * denominator + r.int(1, denominator - 1), denominator);
    const fixed = pickAdjustment(r, denominator, amount => {
      const result = multiply(subtract(total, amount), retained);
      return result.n > 0 && result.d > 1;
    });
    const afterFixed = subtract(total, fixed);
    const answer = multiply(afterFixed, retained);
    const steps: Step[] = [
      {text: 'Subtract the fixed length used for the flags.', equation: `${show(total)} − ${show(fixed)} = ${show(afterFixed)}`},
      {text: 'Find the fraction of the remaining fabric that stays unused.', equation: `1 − ${show(share)} = ${show(retained)}`},
    ];
    conversionStep(steps, afterFixed, 'Write the remaining length as an improper fraction before multiplying.');
    steps.push({text: 'Find the unused length, in metres.', equation: `${improper(afterFixed)} × ${show(retained)} = ${show(answer)}`});
    return make([
      `A sewing group starts with ${show(total)} m of fabric.`,
      `It cuts off ${show(fixed)} m for flags.`,
      `It then uses ${show(share)} of the remaining fabric for bunting.`,
    ], 'How many metres of fabric are still unused?', answer, 'm',
    'Subtract the flag length first. The stated fraction is taken from what remains.', steps,
    {op: '*', a: {op: '-', a: proofOf(total), b: proofOf(fixed)}, b: proofOf(retained)});
  }

  const total = fraction(r.int(6, 12));
  const packedFraction = multiply(total, share);
  const fixed = pickAdjustment(r, denominator, amount => {
    const result = add(packedFraction, amount);
    return result.d > 1 && value(result) < value(total);
  });
  const answer = add(packedFraction, fixed);
  const onePart = fraction(total.n, share.d);
  const steps: Step[] = [
    {text: 'Find one equal part of the starting mass, in kilograms.', equation: `${show(total)} × 1/${share.d} = ${show(onePart)}`},
  ];
  conversionStep(steps, onePart, 'Write one part as an improper fraction before multiplying.');
  steps.push(
    {text: `Find the mass in the ${share.n} parts packed into large bags.`, equation: `${improper(onePart)} × ${share.n} = ${show(packedFraction)}`},
    {text: 'Add the fixed mass in the small bag.', equation: `${show(packedFraction)} + ${show(fixed)} = ${show(answer)}`},
  );
  return make([
    `A food stall has ${show(total)} kg of dried beans.`,
    `It packs ${show(share)} of the beans into large bags.`,
    `It packs another ${show(fixed)} kg into a small bag.`,
  ], 'What is the total mass of beans packed?', answer, 'kg',
  'Find the mass represented by the fraction. Add the extra mass, which is already given in kilograms.', steps,
  {op: '+', a: {op: '*', a: proofOf(total), b: proofOf(share)}, b: proofOf(fixed)},
  packingChoices(r, total, packedFraction, fixed, answer));
}
