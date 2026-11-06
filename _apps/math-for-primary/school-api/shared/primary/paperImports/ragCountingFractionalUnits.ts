import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-counting-fractional-units',
  level: 5,
  title: 'Count equal fractional parts',
  objective: 'Count fractional parts in an amount, a length or the gap between two mixed numbers.',
  skillIds: ['P4.S.FRAC.02', 'P5.S.FRAC.04', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-counting-fractional-units',
} as const;

function formatAmount(numerator: number, denominator: number): string {
  const whole = Math.floor(numerator / denominator);
  const remainder = numerator % denominator;
  if (remainder === 0) return String(whole);

  let divisor = remainder;
  let other = denominator;
  while (other !== 0) {
    const next = divisor % other;
    divisor = other;
    other = next;
  }

  const part = `${remainder / divisor}/${denominator / divisor}`;
  return whole === 0 ? part : `${whole} ${part}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const seedVariant = (hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0) % 3;
  const indexVariant = ((Math.trunc(index) % 3) + 3) % 3;
  const variant = (seedVariant + indexVariant) % 3;

  const make = (
    context: string[],
    prompt: string,
    answer: number,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key,
    context,
    prompt,
    answer: String(answer),
    hint,
    workedSteps,
    explanation: workedSteps
      .map(step => [step.text, step.equation].filter(Boolean).join(' '))
      .join(' '),
    ...extra,
  });

  if (variant === 0) {
    const denominator = random.pick([3, 4, 5, 6, 8, 10, 12]);
    const whole = random.int(3, 6);
    const remainder = random.int(1, denominator - 1);
    const wholeParts = whole * denominator;
    const totalParts = wholeParts + remainder;
    const amount = formatAmount(totalParts, denominator);
    const fractionalPart = formatAmount(remainder, denominator);
    const choices = random.shuffle([
      totalParts,
      wholeParts,
      whole + remainder,
      totalParts + denominator,
    ].map(String));

    return make(
      [`Each small part is 1/${denominator} of a whole.`],
      'Choose the number of small parts in the amount shown.',
      totalParts,
      'Count the parts in the whole numbers, then include the fractional part.',
      [
        {
          text: `Each whole contains ${denominator} small parts.`,
          equation: `${whole} × ${denominator} = ${wholeParts}`,
        },
        {
          text: `The fractional part contains ${remainder} more small parts.`,
          equation: `${remainder} × 1/${denominator} = ${fractionalPart}`,
        },
        {
          text: 'Add the two counts.',
          equation: `${wholeParts} + ${remainder} = ${totalParts} parts`,
        },
      ],
      {display: amount, choices, unit: 'parts'},
    );
  }

  if (variant === 1) {
    const [numerator, denominator] = random.pick([
      [2, 3], [3, 4], [2, 5], [3, 5], [5, 6],
      [3, 7], [5, 8], [4, 9], [7, 10], [5, 12],
    ] as const);
    const totalMetres = numerator * random.int(2, 7);
    const smallLengths = totalMetres * denominator;
    const pieces = smallLengths / numerator;

    return make(
      [
        `A craft club has ${totalMetres} m of cord.`,
        `Each piece is ${numerator}/${denominator} m long. All the cord is used.`,
      ],
      'How many equal pieces are made? Show your working.',
      pieces,
      `First count lengths of 1/${denominator} m. Then group them into pieces.`,
      [
        {
          text: `Each metre contains ${denominator} lengths of 1/${denominator} m. Count these lengths in all the cord.`,
          equation: `${totalMetres} × ${denominator} = ${smallLengths}`,
        },
        {
          text: `Each finished piece uses ${numerator} of these small lengths.`,
          equation: `${numerator} × 1/${denominator} m = ${numerator}/${denominator} m`,
        },
        {
          text: 'Group the small lengths to count the finished pieces.',
          equation: `${smallLengths} ÷ ${numerator} = ${pieces} pieces`,
        },
      ],
      {unit: 'pieces'},
    );
  }

  const denominator = random.pick([4, 6, 8, 10, 12]);
  const startWhole = random.int(3, 5);
  const targetWhole = startWhole + random.int(1, 3);
  const startParts = startWhole * denominator + random.int(1, denominator - 1);
  const targetParts = targetWhole * denominator + random.int(1, denominator - 1);
  const missingParts = targetParts - startParts;
  const start = formatAmount(startParts, denominator);
  const target = formatAmount(targetParts, denominator);

  return make(
    [
      `A total starts at ${start} and must reach ${target}.`,
      `Each added part has a value of 1/${denominator}.`,
    ],
    'How many parts must be added? Show your working.',
    missingParts,
    'Write both amounts using the denominator of one added part. Then find the gap.',
    [
      {
        text: 'Rewrite the starting amount using the size of one added part.',
        equation: `${start} = ${startParts}/${denominator}`,
      },
      {
        text: 'Rewrite the target amount using the same denominator.',
        equation: `${target} = ${targetParts}/${denominator}`,
      },
      {
        text: 'Subtract to find the amount still needed.',
        equation: `${targetParts}/${denominator} − ${startParts}/${denominator} = ${missingParts}/${denominator}`,
      },
      {
        text: `The gap contains ${missingParts} parts of size 1/${denominator}. Add ${missingParts} parts to reach the target.`,
      },
    ],
    {unit: 'parts'},
  );
}
