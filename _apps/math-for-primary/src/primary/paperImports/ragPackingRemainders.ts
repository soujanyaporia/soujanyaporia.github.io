import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-packing-simultaneous-remainders',
  level: 5,
  title: 'Find a total from two grouping rules',
  objective: 'Use two grouping rules to find equal-count and least unequal-count totals, or the least missing group size.',
  skillIds: ['P5.S.RATE.02', 'P3.S.WN.03'],
  canonicalPatternId: 'p5-packing-simultaneous-remainders',
};

type PackingCase = {
  small: number;
  large: number;
  extra: number;
  shortage: number;
  equalPackets: number;
  equalTotal: number;
  period: number;
};

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

const CASES: PackingCase[] = [];
for (const small of [3, 4, 6, 7]) {
  for (let large = small + 1; large <= 9; large++) {
    const period = small * large / gcd(small, large);
    for (let extra = 1; extra < small; extra++) {
      for (let shortage = 1; shortage < large; shortage++) {
        const equalPackets = (extra + shortage) / (large - small);
        const equalTotal = small * equalPackets + extra;
        // Keep the equal-count case as the first positive common solution.
        // The next solution then necessarily has different pouch counts.
        if (Number.isInteger(equalPackets) && equalPackets >= 2 && equalTotal < period) {
          CASES.push({small, large, extra, shortage, equalPackets, equalTotal, period});
        }
      }
    }
  }
}
const ATTENDANCE_CASES = CASES.filter(value => value.period <= 36);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const variant = ((hash(String(seed)) + (index | 0)) >>> 0) % 2;
  const draw = (label: string, size: number) => hash(`${seed}:${index}:${label}`) % size;

  if (variant === 0) {
    const x = CASES[draw('pouches', CASES.length)];
    const leastDifferent = x.equalTotal + x.period;
    const smallCount = (leastDifferent - x.extra) / x.small;
    const largeCount = (leastDifferent + x.shortage) / x.large;
    const shortageTotals = Array.from(
      {length: largeCount},
      (_, i) => (i + 1) * x.large - x.shortage,
    );
    const workedSteps: NonNullable<Question['workedSteps']> = [
      {
        text: '(a) Compare one pouch from each child.',
        equation: `${x.large} − ${x.small} = ${x.large - x.small} tokens`,
      },
      {
        text: 'For equal pouch counts, the extra capacity accounts for Hana’s loose tokens and the tokens Ravi still needs.',
        equation: `${x.extra} + ${x.shortage} = ${x.extra + x.shortage} tokens`,
      },
      {
        text: 'Find the equal number of pouches.',
        equation: `${x.extra + x.shortage} ÷ ${x.large - x.small} = ${x.equalPackets} pouches`,
      },
      {
        text: 'Add Hana’s loose tokens to the tokens in her full pouches.',
        equation: `${x.small} × ${x.equalPackets} + ${x.extra} = ${x.equalTotal} tokens`,
      },
      {
        text: `(b) List positive totals that need ${x.shortage} more tokens to fill Ravi’s last pouch, in order: ${shortageTotals.join(', ')}.`,
      },
      {
        text: `In this list, only ${x.equalTotal} and ${leastDifferent} leave ${x.extra} tokens after making full pouches of ${x.small}. The first total gives equal pouch counts, so exclude it.`,
      },
      {
        text: 'Check the pouch counts at the next total. Count Ravi’s partly filled pouch.',
        equation: `(${leastDifferent} − ${x.extra}) ÷ ${x.small} = ${smallCount}; (${leastDifferent} + ${x.shortage}) ÷ ${x.large} = ${largeCount}`,
      },
      {
        text: `The counts ${smallCount} and ${largeCount} differ. Every smaller candidate was checked, so the least total in part (b) is ${leastDifferent} tokens for each child.`,
      },
    ];
    return {
      key,
      context: [
        'Hana and Ravi each have the same number of tokens.',
        `Hana puts ${x.small} tokens in every full pouch and has ${x.extra} tokens left outside the pouches.`,
        `Ravi puts ${x.large} tokens in every full pouch. His last pouch is partly filled and needs ${x.shortage} more tokens to be full.`,
        'When counting pouches, count Ravi’s partly filled pouch, but do not count Hana’s loose tokens as a pouch.',
      ],
      prompt: '(a) If they use the same number of pouches, how many tokens does each child have? (b) In a separate case, they use different numbers of pouches. What is the least possible number of tokens each child could have?',
      structuredResponse: {
        kind: 'number-fields',
        fields: [
          {label: '(a) Tokens each, with equal pouch counts'},
          {label: '(b) Least tokens each, with different pouch counts'},
        ],
      },
      answer: JSON.stringify([String(x.equalTotal), String(leastDifferent)]),
      hint: 'For (a), compare the capacity of matching pouches. For (b), list totals that fit both rules and check the pouch counts.',
      workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  const x = ATTENDANCE_CASES[draw('attendance', ATTENDANCE_CASES.length)];
  const known = ['art', 'chess', 'garden', 'music'].map(label => 13 + draw(label, 18));
  const knownTotal = known.reduce((sum, value) => sum + value, 0);
  const secondRemainder = x.large - x.shortage;
  const jumps = Math.max(0, Math.ceil((knownTotal + 1 - x.equalTotal) / x.period));
  const total = x.equalTotal + jumps * x.period;
  const missing = total - knownTotal;
  const candidates: number[] = [];
  for (let value = knownTotal + 1; value <= total; value++) {
    if (value % x.small === x.extra) candidates.push(value);
  }
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Add the numbers from the four clubs whose attendance is known.',
      equation: `${known.join(' + ')} = ${knownTotal} pupils`,
    },
    {
      text: `Drama sends at least one pupil, so the total must be greater than ${knownTotal}.`,
    },
    {
      text: `List larger totals that leave ${x.extra} pupils when making teams of ${x.small}, stopping at the first one that also fits the other rule: ${candidates.join(', ')}.`,
    },
    {
      text: `Checking these totals in order, ${total} is the first that leaves ${secondRemainder} pupils when making teams of ${x.large}.`,
      equation: `${total} = ${x.large} × ${(total - secondRemainder) / x.large} + ${secondRemainder}`,
    },
    {
      text: 'Subtract the known attendance to find the least possible number from Drama.',
      equation: `${total} − ${knownTotal} = ${missing} pupils`,
    },
    {
      text: 'Check the first grouping rule as well.',
      equation: `${total} = ${x.small} × ${(total - x.extra) / x.small} + ${x.extra}`,
    },
  ];
  return {
    key,
    context: [
      'Pupils from five clubs go on a trip. Each club sends at least one pupil.',
      `Art sends ${known[0]} pupils, Chess sends ${known[1]} pupils, Garden sends ${known[2]} pupils and Music sends ${known[3]} pupils. Drama’s number is not given.`,
      `Making teams of ${x.small} pupils leaves ${x.extra} pupils without a team.`,
      `Making teams of ${x.large} pupils leaves ${secondRemainder} pupils without a team.`,
      'The same pupils are counted each time.',
    ],
    prompt: 'What is the least possible number of pupils from Drama?',
    answer: String(missing),
    unit: 'pupils',
    hint: 'Add the four known numbers. Look for the smallest larger total that fits both grouping rules.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
