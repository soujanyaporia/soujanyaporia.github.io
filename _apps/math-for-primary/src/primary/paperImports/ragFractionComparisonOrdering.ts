import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-fraction-comparison-ordering',
  level: 5,
  title: 'Compare and order fractions',
  objective: 'Use equivalent fractions to order values, find a minimum and check strict bounds.',
  skillIds: ['P3.S.FRAC.01', 'P3.S.FRAC.03'],
  canonicalPatternId: 'fraction-comparison-and-ordering',
};

type Fraction = {n: number; d: number};
type Step = NonNullable<Question['workedSteps']>[number];

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}
const label = (f: Fraction): string => `${f.n}/${f.d}`;
const row = (fractions: Fraction[]): string => fractions.map(label).join(', ');
const compare = (a: Fraction, b: Fraction): number => a.n * b.d - b.n * a.d;
const increasing = (fractions: Fraction[]): Fraction[] => [...fractions].sort(compare);
const commonDenominator = (fractions: Fraction[]): number =>
  fractions.reduce((a, f) => a / gcd(a, f.d) * f.d, 1);

function makePool(base: number): Fraction[] {
  const pool: Fraction[] = [];
  for (let d = 2; d <= 12; d++) {
    if (base % d !== 0) continue;
    for (let n = 1; n < d; n++) {
      if (gcd(n, d) === 1) pool.push({n, d});
    }
  }
  return pool;
}

function pickFractions(r: Rng, pool: Fraction[], count: number): Fraction[] {
  // Include a larger denominator and at least one different denominator.
  const first = r.pick(pool.filter(f => f.d >= 8));
  const second = r.pick(pool.filter(f => f.d !== first.d));
  const rest = r.shuffle(pool.filter(f => f !== first && f !== second));
  return r.shuffle([first, second, ...rest.slice(0, count - 2)]);
}

function renameStep(fractions: Fraction[], text: string): Step {
  const d = commonDenominator(fractions);
  return {
    text: `${text} Use ${d} as a common denominator.`,
    equation: fractions.map(f => `${label(f)} = ${f.n * (d / f.d)}/${d}`).join('; '),
  };
}

function orderSteps(shown: Fraction[], descending: boolean): Step[] {
  const sorted = increasing(shown);
  if (descending) sorted.reverse();
  const d = commonDenominator(shown);
  const direction = descending ? 'greatest to smallest' : 'smallest to greatest';
  return [
    renameStep(shown, 'Rename each fraction without changing its value.'),
    {
      text: 'The denominators are equal, so compare the numerators.',
      equation: sorted.map(f => `${f.n * (d / f.d)}/${d}`).join(descending ? ' > ' : ' < '),
    },
    {text: `From ${direction}, the original fractions are ${row(sorted)}.`},
  ];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((hashString(String(seed)) + (index >>> 0)) >>> 0) % 4;
  const pool = makePool(r.pick([12, 18, 20, 24, 30, 36, 40, 60]));
  const finish = (
    prompt: string,
    answer: string,
    hint: string,
    steps: Step[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    answer,
    hint,
    workedSteps: steps,
    explanation: steps.map(s => s.equation ? `${s.text} ${s.equation}.` : s.text).join(' '),
    ...extra,
  });

  if (variant === 0 && r.int(0, 1) === 1) {
    const correct = increasing(pickFractions(r, pool, 4));
    const rows: Fraction[][] = [correct];
    // Each distractor has a different adjacent inversion position. This also
    // keeps rows distinct if two independently selected fraction sets coincide.
    for (let position = 0; position < 3; position++) {
      const wrong = increasing(pickFractions(r, pool, 4));
      [wrong[position], wrong[position + 1]] = [wrong[position + 1], wrong[position]];
      rows.push(wrong);
    }
    const displayedRows = r.shuffle(rows);
    const steps: Step[] = [];
    displayedRows.forEach((fractions, i) => {
      steps.push(renameStep(fractions, `Check choice ${i + 1}.`));
      const d = commonDenominator(fractions);
      const bad = fractions.findIndex((f, j) => j + 1 < fractions.length && compare(f, fractions[j + 1]) > 0);
      if (bad < 0) {
        steps.push({
          text: `The numerators increase from left to right. Choice ${i + 1} is correct.`,
          equation: fractions.map(f => `${f.n * (d / f.d)}/${d}`).join(' < '),
        });
      } else {
        const a = fractions[bad], b = fractions[bad + 1];
        steps.push({
          text: `Choice ${i + 1} decreases at this pair, so it is not in increasing order.`,
          equation: `${a.n * (d / a.d)}/${d} > ${b.n * (d / b.d)}/${d}`,
        });
      }
    });
    return finish(
      'Choose the row that goes from the smallest fraction to the greatest.',
      row(correct),
      'Check each row from left to right. Every fraction must be greater than the one before it.',
      steps,
      {choices: displayedRows.map(row)},
    );
  }

  if (variant === 0 || variant === 1) {
    const descending = variant === 1;
    const sorted = increasing(pickFractions(r, pool, r.int(3, 4)));
    if (descending) sorted.reverse();
    const shown = r.shuffle(sorted);
    if (row(shown) === row(sorted)) shown.reverse();
    return finish(
      `Put the fractions in order from ${descending ? 'greatest to smallest' : 'smallest to greatest'}.`,
      sorted.map(label).join(','),
      'Make equivalent fractions with a common denominator, then compare their numerators.',
      orderSteps(shown, descending),
      {order: shown.map(label)},
    );
  }

  if (variant === 2) {
    const sorted = increasing(pickFractions(r, pool, 5));
    const lower = sorted[1], inside = sorted[2], upper = sorted[3];
    const outside = r.int(0, 1) === 0 ? sorted[0] : sorted[4];
    const options = r.shuffle([lower, inside, upper, outside]);
    const d = commonDenominator(options);
    const steps: Step[] = [
      renameStep([lower, upper, inside, outside], 'Compare both bounds with the choices.'),
      {
        text: `${label(inside)} is greater than the left bound and less than the right bound.`,
        equation: `${lower.n * (d / lower.d)}/${d} < ${inside.n * (d / inside.d)}/${d} < ${upper.n * (d / upper.d)}/${d}`,
      },
      {text: `${label(lower)} and ${label(upper)} equal the bounds, so neither fits a strict comparison.`},
      {text: `${label(outside)} is ${compare(outside, lower) < 0 ? 'less than the left bound' : 'greater than the right bound'}, so it does not fit.`},
      {text: `Only ${label(inside)} makes both comparisons true.`},
    ];
    return finish(
      'Choose the fraction that makes both comparisons true.',
      label(inside),
      'The fraction in the box must be greater than the left fraction and less than the right fraction.',
      steps,
      {display: `${label(lower)} < □ < ${label(upper)}`, choices: options.map(label)},
    );
  }

  const options = pickFractions(r, pool, 4);
  const smallest = increasing(options)[0];
  return finish(
    'Which of these four fractions has the smallest value?',
    label(smallest),
    'Use a common denominator. The smallest numerator will then give the smallest fraction.',
    [...orderSteps(options, false), {text: `${label(smallest)} is the smallest of all four fractions.`}],
    {choices: options.map(label)},
  );
}
