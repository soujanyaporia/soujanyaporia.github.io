import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-static-quantity-shares',
  level: 6,
  title: 'Work out related quantities',
  objective: 'Use fractional comparisons and equal ratio parts to find a combined amount, one share or a category fraction.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P6.S.RATIO.03', 'P6.S.RATIO.05'],
  canonicalPatternId: 'p6-static-quantity-relationships-and-shares',
};

function fraction(n: number, d: number): string {
  let a = n;
  let b = d;
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return d / a === 1 ? String(n / a) : `${n / a}/${d / a}`;
}

type Step = {text: string; equation?: string};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 2);
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: Step[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const fractions: [number, number][] = [[2, 3], [3, 4], [4, 5], [5, 6], [5, 8], [7, 10], [7, 12]];
    const [n, d] = r.pick(fractions);
    // Keep the combined length non-integral, as in a fractional-length task.
    const factor = r.pick([2, 3, 4].filter(k => n * (k + 1) % d !== 0));
    const first = fraction(n, d);
    const second = fraction(n * factor, d);
    const answer = fraction(n * (factor + 1), d);
    const choices = r.shuffle([
      answer,
      fraction(n, d * factor),
      fraction(n * (factor + 1), d * factor),
      second,
    ]);
    return make(
      [
        'Hana cuts two pieces of cord for a class display.',
        `The first piece is ${first} m long.`,
        `The second piece is ${factor} times as long as the first.`,
      ],
      'What is the total length of the two pieces, in metres?',
      answer,
      'Find the length of the second piece. Then include the first piece too.',
      [
        {text: 'Find the length of the second piece.', equation: `${first} × ${factor} = ${second} m`},
        {text: 'Add the lengths of both pieces.', equation: `${n}/${d} + ${n * factor}/${d} = ${answer} m`},
      ],
      {choices, unit: 'm'},
    );
  }

  if (variant === 1) {
    const fractions: [number, number][] = [[1, 2], [2, 3], [3, 4], [2, 5], [4, 5], [3, 7], [5, 8]];
    const [n, d] = r.pick(fractions);
    const onePart = r.int(6, 16) * 25;
    const total = (n + d) * onePart;
    const answer = d * onePart;
    return make(
      [
        `Together, Isha and Marcus have $${total} in their savings jars.`,
        `Isha has ${n}/${d} as much money as Marcus.`,
      ],
      'How much money has Marcus saved?',
      String(answer),
      "Treat the denominator as Marcus's number of equal parts. How many parts do they have altogether?",
      [
        {text: `Isha has ${n} equal parts for every ${d} equal parts Marcus has.`, equation: `Isha : Marcus = ${n} : ${d}`},
        {text: 'Count all the equal parts.', equation: `${n} + ${d} = ${n + d} parts`},
        {text: 'Find the value of one part.', equation: `$${total} ÷ ${n + d} = $${onePart}`},
        {text: `Marcus has ${d} of these parts.`, equation: `${d} × $${onePart} = $${answer}`},
      ],
      {unit: 'dollars'},
    );
  }

  const fractions: [number, number][] = [[1, 4], [2, 5], [3, 7], [5, 8], [1, 5], [3, 8]];
  const [n, d] = r.pick(fractions);
  // Avoid two distractors representing the same fraction.
  const factor = r.pick([2, 3, 4].filter(k => (d - n) * (k + 1) !== d * k));
  const remainder = fraction(d - n, d);
  const purpleShare = fraction(factor, factor + 1);
  const answer = fraction((d - n) * factor, d * (factor + 1));
  const choices = r.shuffle([
    answer,
    purpleShare,
    remainder,
    fraction(d - n, d * (factor + 1)),
  ]);
  return make(
    [
      'A sheet holds green, purple and orange stickers only.',
      `${n}/${d} of all the stickers are green.`,
      `There are ${factor} times as many purple stickers as orange stickers.`,
    ],
    'What fraction of all the stickers are purple?',
    answer,
    'Find the fraction that is not green, then split it between purple and orange.',
    [
      {text: 'Find the fraction made up of purple and orange stickers together.', equation: `1 − ${n}/${d} = ${remainder}`},
      {text: `For every ${factor} purple parts there is 1 orange part. Purple takes ${factor} of the ${factor + 1} equal parts in the remainder.`, equation: `Purple share of the remainder = ${purpleShare}`},
      {text: 'Find the purple fraction of the whole sheet.', equation: `${remainder} × ${purpleShare} = ${answer}`},
    ],
    {choices},
  );
}
