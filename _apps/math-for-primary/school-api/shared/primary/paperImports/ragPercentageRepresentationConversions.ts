import type {Question} from '../generate';
import {Rng, hashString} from '../../engine/random';

export const RAG_PATTERN = {
  id: 'rag-p5-percentage-representation-conversions',
  level: 5,
  title: 'Decimals, fractions and percentages',
  objective: 'Convert between decimals, percentages and fractions, including a fraction remaining.',
  skillIds: ['P5.S.PCT.02'],
  canonicalPatternId: 'percentage-representation-conversions',
} as const;

// Format integer coefficients exactly, without rounding decimal arithmetic.
function scaled(coefficient: number, places: number): string {
  if (places === 0) return String(coefficient);
  const digits = String(coefficient).padStart(places + 1, '0');
  return `${digits.slice(0, -places)}.${digits.slice(-places)}`
    .replace(/0+$/, '').replace(/\.$/, '');
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function fraction(n: number, d: number): string {
  const factor = gcd(n, d);
  return `${n / factor}/${d / factor}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = (offset + (Math.trunc(index) >>> 0)) % 4;

  if (variant === 0) {
    const places = r.pick([2, 3]);
    let coefficient = r.int(1, 10 ** places - 1);
    if (coefficient === (places === 2 ? 64 : 640)) coefficient += 1;
    const decimal = scaled(coefficient, places);
    const answer = scaled(coefficient, places - 2);
    const choices = r.shuffle([
      answer,
      decimal,
      scaled(coefficient, places - 1),
      places === 3 ? String(coefficient) : String(coefficient * 10),
    ]);
    return {
      key,
      prompt: 'Choose the percentage that has the same value as this decimal.',
      display: decimal,
      answer,
      choices,
      unit: '%',
      hint: 'A whole is 100%. Multiply the decimal by 100 to find the percentage number.',
      explanation: `${decimal} × 100 = ${answer}, so the decimal is equal to ${answer}%.`,
      workedSteps: [
        {text: 'Multiply by 100 to find the number of hundredths.', equation: `${decimal} × 100 = ${answer}`},
        {text: 'Write that number with the percent sign.', equation: `${decimal} = ${answer}%`},
      ],
      proof: {op: '*', a: Number(decimal), b: 100},
    };
  }

  if (variant === 1) {
    const smallPercentage = r.chance(0.5);
    let coefficient = r.int(1, smallPercentage ? 9 : 99);
    if (smallPercentage && coefficient === 5) coefficient = 7;
    if (!smallPercentage && (coefficient === 6 || coefficient === 64)) coefficient += 1;
    const places = smallPercentage ? 1 : 0;
    const percentage = scaled(coefficient, places);
    const answer = scaled(coefficient, places + 2);
    return {
      key,
      prompt: 'Write this percentage using decimal notation.',
      display: `${percentage}%`,
      answer,
      hint: 'Percent means out of 100. Divide the percentage number by 100.',
      explanation: `${percentage}% means ${percentage} divided by 100, which is ${answer}.`,
      workedSteps: [
        {text: 'Percent means out of 100.', equation: `${percentage}% = ${percentage} ÷ 100`},
        {text: 'Divide by 100, keeping any zeros needed for place value.', equation: `${percentage} ÷ 100 = ${answer}`},
      ],
      proof: {op: '/', a: Number(percentage), b: 100},
    };
  }

  if (variant === 2) {
    let percentage = r.int(1, 99);
    if (percentage === 6 || percentage === 64) percentage += 1;
    const factor = gcd(percentage, 100);
    const answer = fraction(percentage, 100);
    return {
      key,
      prompt: 'Write this percentage as a fraction in its simplest form.',
      display: `${percentage}%`,
      answer,
      requireSimplified: true,
      hint: 'Write the percentage number over 100. Then divide both parts by their greatest common factor.',
      explanation: `${percentage}% is ${percentage}/100. ${factor === 1 ? 'This fraction is already in simplest form.' : `Dividing the numerator and denominator by ${factor} gives ${answer}.`}`,
      workedSteps: [
        {text: 'Write the percentage as a fraction out of 100.', equation: `${percentage}% = ${percentage}/100`},
        factor === 1
          ? {text: 'There is no common factor greater than 1, so the fraction is already in simplest form.', equation: answer}
          : {text: `Divide both the numerator and denominator by ${factor}.`, equation: `(${percentage} ÷ ${factor})/(100 ÷ ${factor}) = ${answer}`},
      ],
      proof: {op: '/', a: percentage, b: 100},
    };
  }

  const denominator = r.pick([2, 4, 5, 10, 20, 25, 50, 100]);
  const numerator = r.int(1, denominator - 1);
  const factor = gcd(numerator, denominator);
  const n = numerator / factor;
  const d = denominator / factor;
  const remaining = d - n;
  const yellowFraction = fraction(remaining, d);
  const percentage = remaining * (100 / d);
  return {
    key,
    prompt: 'What percentage of the counters are yellow?',
    context: [`In a tray, ${n}/${d} of the counters are blue. All the other counters are yellow.`],
    answer: String(percentage),
    unit: '%',
    hint: 'Subtract the blue fraction from one whole, then write the remaining fraction out of 100.',
    explanation: `The yellow fraction is 1 − ${n}/${d} = ${yellowFraction}. This is ${percentage}/100, or ${percentage}%.`,
    workedSteps: [
      {text: 'Subtract the blue fraction from one whole to find the yellow fraction.', equation: `${d}/${d} − ${n}/${d} = ${yellowFraction}`},
      {text: 'Write the yellow fraction with a denominator of 100.', equation: `${yellowFraction} = ${percentage}/100`},
      {text: 'Write the number out of 100 as a percentage.', equation: `${percentage}/100 = ${percentage}%`},
    ],
    proof: {op: '*', a: {op: '-', a: 1, b: {op: '/', a: n, b: d}}, b: 100},
  };
}
