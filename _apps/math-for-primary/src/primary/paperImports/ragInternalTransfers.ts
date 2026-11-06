import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-internal-transfers-changing-shares',
  level: 5,
  title: 'Track counters passed between groups',
  objective: 'Use an unchanged total to undo transfers, equalise three groups and compare their final amounts.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p5-internal-transfers-changing-shares',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];

function reduced(n: number, d: number): [number, number] {
  let a = n;
  let b = d;
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return [n / a, d / a];
}

function fraction(n: number, d: number): string {
  const [numerator, denominator] = reduced(n, d);
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const offset = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = (hashString(String(seed)) % 3 + offset) % 3;
  const make = (
    context: string[], prompt: string, answer: string, hint: string,
    workedSteps: Step[], extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context, prompt, answer, hint, workedSteps,
    explanation: workedSteps.map(step =>
      step.equation ? `${step.text} ${step.equation}.` : step.text,
    ).join(' '),
    ...extra,
  });

  if (variant === 0) {
    const [a, b, c, d] = r.pick([
      [1, 3, 1, 4], [1, 5, 2, 5], [2, 5, 1, 3],
      [1, 6, 1, 5], [2, 7, 1, 4], [1, 4, 2, 5],
    ]);
    const block = (b - a) * (d - c);
    let each = block * r.int(4, 12);
    if (each === 180) each += block;
    const total = 3 * each;
    const omarBeforeGiving = each / (d - c) * d;
    const oneLilaPart = each / (b - a);
    const lilaGift = oneLilaPart * a;
    const omarStart = omarBeforeGiving - lilaGift;
    return make([
      `Lila, Omar and Wen have ${total} counters altogether.`,
      `Lila passes ${a}/${b} of her counters to Omar.`,
      `Next, Omar passes ${c}/${d} of the counters he now has to Wen.`,
      'They finish with equal numbers of counters. All counters stay with these three children.',
    ],
    '(a) How many counters does each child have at the end? (b) How many counters did Omar have before either transfer?',
    JSON.stringify([String(each), String(omarStart)]),
    'Transfers keep the total unchanged. Start with the equal shares at the end and work backwards.',
    [
      {text: '(a) Divide the unchanged total equally among the three children.', equation: `${total} ÷ 3 = ${each} counters each`},
      {text: `Omar kept ${d - c} out of ${d} equal parts. Find how many counters he held just before giving to Wen.`, equation: `${each} ÷ ${d - c} × ${d} = ${omarBeforeGiving}`},
      {text: `Lila kept ${b - a} equal parts. Her final amount tells us the size of one part.`, equation: `${each} ÷ ${b - a} = ${oneLilaPart}`},
      {text: `Lila gave Omar ${a} of these parts.`, equation: `${oneLilaPart} × ${a} = ${lilaGift}`},
      {text: '(b) Remove the counters Omar received from Lila to find his starting amount.', equation: `${omarBeforeGiving} − ${lilaGift} = ${omarStart} counters`},
    ], {
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: '(a) Counters each at the end',
        secondLabel: '(b) Omar’s counters at the start',
      },
    });
  }

  if (variant === 1) {
    const [a, b, c, d] = r.pick([
      [1, 4, 1, 3], [1, 5, 1, 4], [1, 8, 2, 7],
      [2, 9, 1, 7], [1, 6, 1, 5], [1, 9, 1, 4],
    ]);
    // Both receiving trays start below one third of the unchanged total.
    const gapUnits = b * d - 3 * (b - a) * c;
    let scale = r.int(2, 8);
    if (gapUnits * scale === 21) scale += 1;
    const total = 3 * b * d * scale;
    const transfer = gapUnits * scale;
    const remainder = fraction(b - a, b);
    const qShare = fraction((b - a) * c, b * d);
    const [rNumerator, rDenominator] = reduced((b - a) * (d - c), b * d);
    const [gapNumerator, gapDenominator] = reduced(gapUnits, 3 * b * d);
    return make([
      'A club arranges all its counters in trays P, Q and R.',
      `It puts ${a}/${b} of all the counters in tray P, then ${c}/${d} of the remaining counters in tray Q. Everything left goes into tray R.`,
      `Next, ${transfer} counters are moved from tray R to tray Q. Some counters are also moved from tray R to tray P.`,
      'After these two moves, the three trays hold equal numbers of counters. None are added or taken away.',
    ],
    '(a) What fraction of all the counters was in tray R at the start? Enter the numerator and denominator of the simplest fraction. (b) How many counters are there in all?',
    JSON.stringify([String(rNumerator), String(rDenominator), String(total)]),
    'Find each tray’s starting fraction. Compare tray Q’s fraction with one third of the whole.',
    [
      {text: 'Find the fraction left after filling tray P.', equation: `1 − ${a}/${b} = ${remainder}`},
      {text: 'Tray Q gets a fraction of that remainder.', equation: `${remainder} × ${c}/${d} = ${qShare} of the whole`},
      {text: '(a) Tray R gets the part of the remainder that did not go into Q. Simplify the result.', equation: `${remainder} × ${d - c}/${d} = ${rNumerator}/${rDenominator}`},
      {text: 'Moving counters between trays keeps the total unchanged. Each tray finishes with 1/3 of the whole.'},
      {text: 'The known transfer fills the gap between Q’s starting fraction and its final fraction.', equation: `1/3 − ${qShare} = ${gapNumerator}/${gapDenominator}`},
      {text: `(b) ${gapNumerator} equal parts represent ${transfer} counters. Find one part, then the whole.`, equation: `${transfer} ÷ ${gapNumerator} × ${gapDenominator} = ${total} counters`},
    ], {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Simplest fraction: numerator'},
          {label: '(a) Simplest fraction: denominator'},
          {label: '(b) Total counters'},
        ],
      },
    });
  }

  const [numerator, denominator] = r.pick([
    [1, 3], [2, 5], [3, 4], [1, 6], [2, 7], [3, 8],
  ]);
  const each = denominator * r.int(12, 30);
  const total = 3 * each;
  let fixed = r.int(7, each - 7);
  if (fixed === 52) fixed += 1;
  const fractionalGift = each / denominator * numerator;
  const lilaEnd = each + fixed + fractionalGift;
  const wenEnd = each - fractionalGift;
  const difference = lilaEnd - wenEnd;
  return make([
    `Lila, Omar and Wen split ${total} counters equally.`,
    `Omar passes ${fixed} counters to Lila.`,
    `Wen passes ${numerator}/${denominator} of his counters to Lila.`,
    'No other counters change hands.',
  ],
  'How many more counters does Lila have than Wen after both transfers?',
  String(difference),
  'Find the equal starting amounts, then keep track of what each child gives and receives.',
  [
    {text: 'Find the number each child starts with.', equation: `${total} ÷ 3 = ${each}`},
    {text: 'Find the number Wen passes to Lila.', equation: `${each} ÷ ${denominator} × ${numerator} = ${fractionalGift}`},
    {text: 'Lila receives counters from both children.', equation: `${each} + ${fixed} + ${fractionalGift} = ${lilaEnd}`},
    {text: 'Subtract Wen’s gift from his starting amount.', equation: `${each} − ${fractionalGift} = ${wenEnd}`},
    {text: 'Compare their final amounts.', equation: `${lilaEnd} − ${wenEnd} = ${difference} counters`},
  ], {unit: 'counters'});
}
