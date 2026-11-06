import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-whole-from-final-original-share',
  level: 5,
  title: 'Find a whole from its final share',
  objective: 'Use fractions of a starting quantity and a fixed change to find the whole and the requested total.',
  skillIds: ['P5.S.FRAC.05', 'P5.S.FRAC.06', 'P4.S.FRAC.04', 'P3.S.FRAC.02'],
  canonicalPatternId: 'whole-from-final-original-share-equation',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function reduced(n: number, d: number): [number, number] {
  const divisor = gcd(n, d);
  return [n / divisor, d / divisor];
}

function fraction(n: number, d: number): string {
  const [top, bottom] = reduced(n, d);
  return bottom === 1 ? String(top) : `${top}/${bottom}`;
}

function sampler(seed: number, index: number): (size: number) => number {
  const text = `whole-final-share-v1:${seed}:${index}`;
  let state = 2166136261;
  for (let i = 0; i < text.length; i++) {
    state = Math.imul(state ^ text.charCodeAt(i), 16777619) >>> 0;
  }
  return (size: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return Math.floor(state / 4294967296 * size);
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const pick = sampler(seed, index);
  const variant = pick(3);
  const build = (
    context: string[],
    prompt: string,
    answer: string,
    hint: string,
    steps: Step[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    ...extra,
  });

  if (variant === 0) {
    // Whole units, units after the fixed sale, and the fraction sold next.
    const layouts: ReadonlyArray<readonly [number, number, number, number]> = [
      [5, 3, 1, 3],
      [4, 3, 2, 3],
      [5, 4, 3, 4],
      [6, 4, 1, 4],
      [9, 6, 2, 3],
      [4, 3, 1, 3],
    ];
    const [wholeUnits, afterUnits, n, d] = layouts[pick(layouts.length)]!;
    const unitValue = 10 + 2 * pick(11);
    const leftUnits = afterUnits * (d - n) / d;
    const fixedUnits = wholeUnits - afterUnits;
    const fixed = fixedUnits * unitValue;
    const soldUnits = wholeUnits - leftUnits;
    const sold = soldUnits * unitValue;
    const finalShare = fraction(leftUnits, wholeUnits);

    return build(
      [
        `A stall started the day with some notebooks. It sold ${fixed} notebooks before lunch.`,
        `After lunch, it sold ${n}/${d} of the notebooks still at the stall.`,
        `At closing time, ${finalShare} of the starting number of notebooks remained.`,
      ],
      'How many notebooks did the stall sell that day?',
      String(sold),
      'Represent the starting stock with equal units. Work back from the closing stock, then find the units sold.',
      [
        {text: `Use ${wholeUnits} equal units for the starting stock.`, equation: `${finalShare} of ${wholeUnits} units = ${leftUnits} units left`},
        {text: 'Find the fraction kept after the second sale.', equation: `1 − ${n}/${d} = ${fraction(d - n, d)}`},
        {text: 'Work back to the stock just before the second sale.', equation: `${leftUnits} ÷ ${d - n} × ${d} = ${afterUnits} units`},
        {text: 'The first sale accounts for the missing units.', equation: `${wholeUnits} − ${afterUnits} = ${fixedUnits} units = ${fixed} notebooks`},
        {text: 'Find the number of notebooks in one unit.', equation: `${fixed} ÷ ${fixedUnits} = ${unitValue} notebooks`},
        {text: 'Subtract the units left from the starting units to find all notebooks sold.', equation: `(${wholeUnits} − ${leftUnits}) × ${unitValue} = ${sold} notebooks`},
      ],
      {unit: 'notebooks'},
    );
  }

  if (variant === 1) {
    // First spending fraction, fraction of the remainder spent, final original share.
    const layouts: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
      [1, 3, 1, 4, 1, 4],
      [1, 4, 2, 3, 1, 8],
      [2, 5, 1, 3, 1, 10],
      [1, 2, 1, 3, 1, 6],
    ];
    const [a, b, c, d, e, f] = layouts[pick(layouts.length)]!;
    const common = b * d * f / gcd(b * d, f);
    const whole = common * (12 + 2 * pick(10));
    const [paperN, paperD] = reduced((b - a) * c, b * d);
    const [keptN, keptD] = reduced((b - a) * (d - c), b * d);
    const [gapN, gapD] = reduced(keptN * f - e * keptD, keptD * f);
    const fixed = whole * gapN / gapD;
    const unitValue = whole / gapD;
    const paperShare = fraction(paperN, paperD);
    const keptShare = fraction(keptN, keptD);
    const gapShare = fraction(gapN, gapD);

    return build(
      [
        `Leena set aside some money for an art project. She spent ${a}/${b} of it on tools.`,
        `Next, she spent ${c}/${d} of the money she had left on craft paper.`,
        `She then paid $${fixed} for a storage box. She had ${e}/${f} of her starting money left.`,
      ],
      "Find (a) the fraction of Leena's starting money spent on craft paper, in simplest form, and (b) her starting amount in dollars.",
      JSON.stringify([String(paperN), String(paperD), whole.toFixed(2)]),
      'First find the craft-paper cost as a fraction of the starting money. Then compare the fraction before the box payment with the final fraction.',
      [
        {text: 'Find the fraction left after buying tools.', equation: `1 − ${a}/${b} = ${fraction(b - a, b)}`},
        {text: '(a) Express the craft-paper cost as a fraction of the starting money.', equation: `${fraction(b - a, b)} × ${c}/${d} = ${paperShare}`},
        {text: 'Find the fraction left before paying for the box.', equation: `${fraction(b - a, b)} − ${paperShare} = ${keptShare}`},
        {text: 'The box payment is the difference between these two shares of the starting money.', equation: `${keptShare} − ${e}/${f} = ${gapShare}`},
        {text: `Use ${gapD} equal units for the starting money. The box costs ${gapN} units. Find one unit.`, equation: `$${fixed} ÷ ${gapN} = $${unitValue}`},
        {text: '(b) Find the value of all the starting units.', equation: `$${unitValue} × ${gapD} = $${whole}`},
      ],
      {
        structuredResponse: {
          kind: 'number-fields',
          fields: [
            {label: '(a) Numerator (simplest form)'},
            {label: '(a) Denominator (simplest form)'},
            {label: '(b) Starting money (dollars)', decimal: true},
          ],
        },
      },
    );
  }

  const layouts: ReadonlyArray<readonly [number, number, number, number]> = [
    [1, 3, 1, 4],
    [1, 4, 1, 3],
    [2, 5, 1, 3],
    [1, 2, 1, 3],
    [1, 4, 2, 3],
    [1, 3, 2, 5],
  ];
  const [a, b, c, d] = layouts[pick(layouts.length)]!;
  const whole = b * d * (10 + 2 * pick(8));
  const [keptN, keptD] = reduced((b - a) * (d - c), b * d);
  const [removedN, removedD] = reduced(keptD - keptN, keptD);
  const removed = whole * removedN / removedD;
  const excess = 8 + 2 * pick(9);
  const added = removed + excess;
  const totalMade = whole + added;
  const unitValue = whole / removedD;
  const keptShare = fraction(keptN, keptD);
  const removedShare = fraction(removedN, removedD);

  return build(
    [
      `Hana made some paper stars before a club meeting. She gave ${a}/${b} of this batch to the first group.`,
      `She gave ${c}/${d} of the stars she had left to a second group.`,
      `After the meeting, Hana made ${added} more paper stars. She then had ${excess} more stars than she had made before the meeting.`,
    ],
    'Find (a) the fraction of the first batch that Hana gave away, in simplest form, and (b) how many paper stars she made in all that day.',
    JSON.stringify([String(removedN), String(removedD), String(totalMade)]),
    'Find the fraction of the first batch given away. The new stars replace those stars and leave the stated extra amount.',
    [
      {text: 'Find the fraction of the first batch left after the first gift.', equation: `1 − ${a}/${b} = ${fraction(b - a, b)}`},
      {text: 'Find the fraction of the first batch left after both gifts.', equation: `${fraction(b - a, b)} × ${fraction(d - c, d)} = ${keptShare}`},
      {text: '(a) Find the fraction given away altogether.', equation: `1 − ${keptShare} = ${removedShare}`},
      {text: 'The new batch replaces the stars given away and leaves the extra stars. Find how many were given away.', equation: `${added} − ${excess} = ${removed} stars`},
      {text: `Use ${removedD} equal units for the first batch. The gifts total ${removedN} units. Find one unit.`, equation: `${removed} ÷ ${removedN} = ${unitValue} stars`},
      {text: 'Find the size of the first batch.', equation: `${unitValue} × ${removedD} = ${whole} stars`},
      {text: '(b) Add both batches made, including stars later given away.', equation: `${whole} + ${added} = ${totalMade} stars`},
    ],
    {
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Numerator (simplest form)'},
          {label: '(a) Denominator (simplest form)'},
          {label: '(b) Total paper stars made'},
        ],
      },
    },
  );
}
