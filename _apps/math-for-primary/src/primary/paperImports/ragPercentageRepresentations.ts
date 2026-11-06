import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-percentage-representations',
  level: 6,
  title: 'Fractions, decimals and percentages',
  objective: 'Convert between percentages, fractions and decimals; simplify fractions and round percentages when asked.',
  skillIds: ['P5.S.PCT.01', 'P5.S.PCT.02'],
  canonicalPatternId: 'p6-percentage-representations',
};

type RandomInt = (minimum: number, maximum: number) => number;

function hash(text: string): number {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) {
    value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  }
  return value >>> 0;
}

function randomInt(seed: number, index: number): RandomInt {
  let state = hash(`${RAG_PATTERN.id}:${seed}:${index}`);
  return (minimum, maximum) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return minimum + Math.floor(state / 4294967296 * (maximum - minimum + 1));
  };
}

function shuffled(values: string[], int: RandomInt): string[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = int(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

// Only powers of ten are passed as the denominator here.
const decimal = (numerator: number, denominator: number): string =>
  String(numerator / denominator);

const recurringFractions: [number, number][] = [];
for (const denominator of [6, 7, 9, 11, 12]) {
  for (let numerator = 1; numerator < denominator; numerator++) {
    if (gcd(numerator, denominator) === 1) {
      recurringFractions.push([numerator, denominator]);
    }
  }
}

export function makeRagQuestion(seed: number, index = 0): Question {
  if (!Number.isSafeInteger(seed) || !Number.isSafeInteger(index) || index < 0) {
    throw new RangeError('Use an integer seed and a non-negative integer index.');
  }
  const int = randomInt(seed, index);
  const variant = (hash(String(seed)) % 4 + index % 4) % 4;
  const make = (
    prompt: string,
    display: string,
    answer: string,
    hint: string,
    steps: string[],
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    display,
    answer,
    hint,
    workedSteps: steps.map(text => ({text})),
    explanation: steps.join(' '),
    ...extra,
  });

  if (variant === 0) {
    const scale = [10, 100, 1000][int(0, 2)];
    let numerator = int(2, 5 * scale - 1);
    if (numerator * 2 === 5 * scale) numerator++;
    if (numerator % scale === 0) numerator++;
    const given = decimal(numerator, scale);
    const percentage = decimal(numerator * 100, scale);
    const answer = `${percentage}%`;
    const choices = shuffled([
      answer,
      `${given}%`,
      `${decimal(numerator * 10, scale)}%`,
      `${decimal(numerator * 1000, scale)}%`,
    ], int);
    return make(
      'Which percentage has the same value as the decimal shown?',
      given,
      answer,
      'Multiply the decimal by 100 to find the percentage value.',
      [
        'A percentage tells us how many parts there are out of 100.',
        `${given} × 100 = ${percentage}.`,
        `So ${given} has the same value as ${answer}.`,
      ],
      {choices},
    );
  }

  if (variant === 1) {
    const band = int(0, 2);
    const tenths = band === 0 ? int(2, 9)
      : band === 1 ? int(1, 99) * 10
      : int(1, 99) * 10 + int(1, 9);
    const given = decimal(tenths, 10);
    const wholePercentage = tenths % 10 === 0;
    const numerator = wholePercentage ? tenths / 10 : tenths;
    const denominator = wholePercentage ? 100 : 1000;
    const factor = gcd(numerator, denominator);
    const answer = `${numerator / factor}/${denominator / factor}`;
    const steps = [`Percent means out of 100, so ${given}% = ${given}/100.`];
    if (!wholePercentage) {
      steps.push(`Multiply the top and bottom by 10: ${given}/100 = ${numerator}/${denominator}.`);
    }
    steps.push(factor === 1
      ? `${numerator} and ${denominator} have no common factor greater than 1, so ${answer} is already in simplest form.`
      : `Divide the top and bottom by ${factor}: ${numerator}/${denominator} = ${answer}.`);
    return make(
      'Write the percentage shown as a fraction in its simplest form.',
      `${given}%`,
      answer,
      'Write the percentage over 100. Clear any decimal in the numerator, then simplify.',
      steps,
      {requireSimplified: true},
    );
  }

  if (variant === 2) {
    const band = int(0, 2);
    const tenths = band === 0 ? int(2, 9)
      : band === 1 ? int(1, 99) * 10 + int(0, 9)
      : int(1001, 2499);
    const given = decimal(tenths, 10);
    const answer = decimal(tenths, 1000);
    return make(
      'Write the percentage shown as a decimal.',
      `${given}%`,
      answer,
      'Percent means out of 100. Divide the percentage value by 100.',
      [
        `${given}% means ${given} out of 100.`,
        `${given} ÷ 100 = ${answer}, so the decimal is ${answer}.`,
      ],
    );
  }

  const [numerator, denominator] = recurringFractions[int(0, recurringFractions.length - 1)];
  const percentageNumerator = numerator * 100;
  const thirdDigit = Math.floor(percentageNumerator * 1000 / denominator) % 10;
  const preview = (Math.floor(percentageNumerator * 10000 / denominator) / 10000).toFixed(4);
  // Integer arithmetic rounds the percentage to the nearest hundredth.
  const hundredths = Math.floor((2 * percentageNumerator * 100 + denominator) / (2 * denominator));
  const answer = (hundredths / 100).toFixed(2);
  return make(
    'Change the fraction shown to a percentage. Round your answer to 2 decimal places.',
    `${numerator}/${denominator}`,
    answer,
    'Multiply the fraction by 100, then use the third decimal digit to round to 2 decimal places.',
    [
      `${numerator}/${denominator} × 100% = ${percentageNumerator}/${denominator}%.`,
      `Before rounding, the percentage is ${preview}…%. The third decimal digit is ${thirdDigit}.`,
      thirdDigit >= 5
        ? `The third decimal digit is at least 5, so round up at the hundredths place to get ${answer}%.`
        : `The third decimal digit is less than 5, so keep the hundredths digit to get ${answer}%.`,
    ],
    {unit: '%'},
  );
}
