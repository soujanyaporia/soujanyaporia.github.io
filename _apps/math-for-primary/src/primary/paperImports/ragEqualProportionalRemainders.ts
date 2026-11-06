import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-equal-proportional-remainders',
  level: 5,
  title: 'Work back from what is left',
  objective: 'Use fractions left and equal-sized units to recover starting quantities.',
  skillIds: ['P5.S.FRAC.05', 'P4.S.FRAC.04', 'P3.S.FRAC.01'],
  canonicalPatternId: 'equal-or-proportional-remainders',
} as const;

type Steps = NonNullable<Question['workedSteps']>;

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function randomInt(key: string): (min: number, max: number) => number {
  let state = 2166136261;
  for (let i = 0; i < key.length; i++) {
    state = Math.imul(state ^ key.charCodeAt(i), 16777619) >>> 0;
  }
  return (min, max) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return min + state % (max - min + 1);
  };
}

// Fractions used from the first and second collections, respectively.
// Each first collection starts larger when the remainders are equal.
const FRACTION_PAIRS: readonly (readonly [number, number, number, number])[] = [
  [1, 2, 1, 4],
  [2, 3, 1, 4],
  [3, 5, 1, 5],
  [3, 4, 1, 2],
  [2, 5, 1, 4],
  [1, 3, 1, 6],
  [3, 8, 1, 6],
  [2, 3, 1, 2],
];
const MONEY_FRACTIONS: readonly (readonly [number, number])[] = [
  [1, 4], [1, 5], [2, 5], [1, 6], [3, 8], [1, 2],
];
const MULTIPLIERS = [2, 3, 5] as const;
const FIXED_SPENDING = [18, 24, 32, 42, 56, 64, 72, 84] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index)) {
    throw new RangeError('Seed and index must be safe integers.');
  }
  const int = randomInt(`${RAG_PATTERN.id}:${seed}:${index}`);
  const variant = ((seed % 4 + index % 4) % 4 + 4) % 4;
  const finish = (
    context: string[], prompt: string, answer: number, unit: string,
    hint: string, workedSteps: Steps,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer: unit === 'dollars' ? answer.toFixed(2) : String(answer),
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step =>
      `${step.text}${step.equation ? ` ${step.equation}` : ''}`,
    ).join(' '),
  });

  if (variant === 3) {
    const [spent, denominator] = MONEY_FRACTIONS[int(0, MONEY_FRACTIONS.length - 1)]!;
    const kept = denominator - spent;
    const multiple = MULTIPLIERS[int(0, MULTIPLIERS.length - 1)]!;
    const fixed = FIXED_SPENDING[int(0, FIXED_SPENDING.length - 1)]!;
    const unitValue = int(6, 11);
    const lucasUnits = multiple * kept;
    const iman = denominator * unitValue;
    const lucasLeft = lucasUnits * unitValue;
    const lucas = lucasLeft + fixed;
    const total = iman + lucas;
    const adjustedTotal = total - fixed;
    const units = denominator + lucasUnits;
    return finish(
      [
        `Iman and Lucas had $${total} between them before a visit to the bookshop.`,
        `Iman spent ${spent}/${denominator} of his money. Lucas spent $${fixed}.`,
        `Lucas then had ${multiple} times as much money left as Iman.`,
      ],
      'How much more money did Lucas have than Iman before the visit?',
      lucas - iman,
      'dollars',
      'Use equal units for Iman’s starting money. Relate their money left, then subtract Lucas’s spending from the starting total.',
      [
        {
          text: `Represent Iman’s starting money by ${denominator} equal units. Find the fraction he kept.`,
          equation: `1 − ${spent}/${denominator} = ${kept}/${denominator}`,
        },
        {
          text: `Iman kept ${kept} units. Find how many of the same units Lucas had left.`,
          equation: `${multiple} × ${kept} = ${lucasUnits} units`,
        },
        {
          text: 'Subtract only Lucas’s spending from the starting total. This leaves Iman’s starting money together with Lucas’s money left.',
          equation: `$${total} − $${fixed} = $${adjustedTotal}`,
        },
        {
          text: `These amounts make ${denominator} + ${lucasUnits} = ${units} equal units. Find the value of one unit.`,
          equation: `$${adjustedTotal} ÷ ${units} = $${unitValue}`,
        },
        {
          text: 'Recover both starting amounts. Add Lucas’s spending back to his money left.',
          equation: `Iman: ${denominator} × $${unitValue} = $${iman}; Lucas: ${lucasUnits} × $${unitValue} + $${fixed} = $${lucas}`,
        },
        {
          text: 'Find the difference between their starting amounts.',
          equation: `$${lucas} − $${iman} = $${lucas - iman}`,
        },
      ],
    );
  }

  const [redSpent, redDenominator, blueSpent, blueDenominator] =
    FRACTION_PAIRS[int(0, FRACTION_PAIRS.length - 1)]!;
  const redKept = redDenominator - redSpent;
  const blueKept = blueDenominator - blueSpent;
  const commonUnits = redKept * blueKept / gcd(redKept, blueKept);
  const redUnits = commonUnits / redKept * redDenominator;
  const blueUnits = commonUnits / blueKept * blueDenominator;
  const unitValue = 3 * int(3, 9);
  const red = redUnits * unitValue;
  const blue = blueUnits * unitValue;
  const left = commonUnits * unitValue;
  const removal = `${redSpent}/${redDenominator} of the red beads and ${blueSpent}/${blueDenominator} of the blue beads were used.`;
  const retainedStep: Steps[number] = {
    text: 'Find the fraction of each colour left.',
    equation: `Red: 1 − ${redSpent}/${redDenominator} = ${redKept}/${redDenominator}; blue: 1 − ${blueSpent}/${blueDenominator} = ${blueKept}/${blueDenominator}`,
  };

  if (variant === 2) {
    return finish(
      [
        'A craft box contained red and blue beads.',
        removal,
        `Afterwards, there were ${left} blue beads left and the same number of red beads left.`,
      ],
      'How many beads were in the box before any were used?',
      red + blue,
      'beads',
      'Each colour has the same number left. For each colour, find one fractional part, then recover the whole collection.',
      [
        retainedStep,
        {
          text: `${left} red beads represent ${redKept} of the original ${redDenominator} equal parts. Recover the red beads at first.`,
          equation: `${left} ÷ ${redKept} × ${redDenominator} = ${red} beads`,
        },
        {
          text: `${left} blue beads represent ${blueKept} of the original ${blueDenominator} equal parts. Recover the blue beads at first.`,
          equation: `${left} ÷ ${blueKept} × ${blueDenominator} = ${blue} beads`,
        },
        {
          text: 'Add the two starting collections.',
          equation: `${red} + ${blue} = ${red + blue} beads`,
        },
      ],
    );
  }

  const fromTotal = variant === 0;
  const known = fromTotal ? red + blue : red - blue;
  const comparisonUnits = fromTotal ? redUnits + blueUnits : redUnits - blueUnits;
  const firstLine = fromTotal
    ? `A craft box held ${known} red and blue beads altogether.`
    : `Before a lesson, a box held ${known} more red beads than blue beads.`;
  return finish(
    [firstLine, removal, 'The numbers of red and blue beads left were equal.'],
    'How many red beads were in the box before any were used?',
    red,
    'beads',
    fromTotal
      ? 'Match the equal remainders using units of the same size. Work out how many units there were altogether at first.'
      : 'Match the equal remainders using units of the same size. The starting difference tells you the value of the extra units.',
    [
      retainedStep,
      {
        text: `Use ${commonUnits}, a common multiple of ${redKept} and ${blueKept}, as the number of units in each equal remainder. The units have the same size for both colours.`,
        equation: `Red at first: ${commonUnits} ÷ ${redKept} × ${redDenominator} = ${redUnits} units; blue at first: ${commonUnits} ÷ ${blueKept} × ${blueDenominator} = ${blueUnits} units`,
      },
      {
        text: fromTotal ? 'Add the starting units.' : 'Find the difference in starting units.',
        equation: `${redUnits} ${fromTotal ? '+' : '−'} ${blueUnits} = ${comparisonUnits} units`,
      },
      {
        text: 'Find the number of beads in one unit.',
        equation: `${known} ÷ ${comparisonUnits} = ${unitValue} beads`,
      },
      {
        text: 'Recover the number of red beads at first.',
        equation: `${redUnits} × ${unitValue} = ${red} beads`,
      },
    ],
  );
}
