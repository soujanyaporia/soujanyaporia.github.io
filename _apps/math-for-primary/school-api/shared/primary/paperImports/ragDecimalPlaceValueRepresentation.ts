import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-decimal-place-value-representation',
  level: 5,
  title: 'Read and build decimals',
  objective: 'Compose decimals, read their digits, name decimal places and find missing place-value components.',
  skillIds: ['P4.S.DEC.01'],
  canonicalPatternId: 'decimal-place-value-representation',
} as const;

type Step = NonNullable<Question['workedSteps']>[number];
const PLACES = [
  {name: 'thousands', scale: 1000000},
  {name: 'hundreds', scale: 100000},
  {name: 'tens', scale: 10000},
  {name: 'ones', scale: 1000},
  {name: 'tenths', scale: 100},
  {name: 'hundredths', scale: 10},
  {name: 'thousandths', scale: 1},
] as const;

// Integer thousandths keep all intermediate calculations exact.
function decimal(scaled: number): string {
  const whole = Math.floor(scaled / 1000);
  const fraction = String(scaled % 1000).padStart(3, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function numeral(digits: number[]): string {
  return `${Number(digits.slice(0, 4).join(''))}.${digits.slice(4).join('')}`;
}

function expression(digits: number[], blank = -1): string {
  return PLACES.flatMap((place, i) =>
    i === blank ? [`□ ${place.name}`] : digits[i] === 0 ? [] : [`${digits[i]} ${place.name}`],
  ).join(' + ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed) % 4 + Math.trunc(index) % 4) % 4 + 4) % 4;
  const digits = [0, r.int(2, 5), r.int(0, 9), r.int(0, 9), r.int(0, 9), r.int(0, 9), r.int(0, 9)];
  const target = r.int(4, 6);
  const place = PLACES[target];
  const make = (prompt: string, display: string, answer: string, hint: string, workedSteps: Step[]): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    display,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant === 0) {
    digits[0] = r.int(2, 6);
    for (let i = 1; i <= 3; i++) digits[i] = r.int(1, 9);
    digits[r.int(1, 3)] = 0;
    const last = r.int(4, 6);
    for (let i = 4; i <= 6; i++) digits[i] = i > last ? 0 : i === last ? r.int(1, 9) : r.int(0, 9);
    const answer = numeral(digits).replace(/0+$/, '').replace(/\.$/, '');
    const parts = PLACES.flatMap((p, i) => digits[i] === 0 ? [] : [{name: p.name, count: digits[i], value: decimal(digits[i] * p.scale)}]);
    const zeros = PLACES.filter((_, i) => digits[i] === 0).map(p => p.name);
    return make(
      'Write the decimal formed by these place-value parts.',
      expression(digits),
      answer,
      'Put each digit in its named column. Use zero for an unlisted place.',
      [
        {text: 'Write each part as a number.', equation: parts.map(p => `${p.count} ${p.name} = ${p.value}`).join('; ')},
        {text: `The unlisted places are ${zeros.join(', ')}. They contain zero.`, equation: numeral(digits)},
        {text: 'Add the parts to form the decimal.', equation: `${parts.map(p => p.value).join(' + ')} = ${answer}`},
      ],
    );
  }

  if (variant === 1) {
    return make(
      `Read this decimal. What digit is in the ${place.name} place?`,
      numeral(digits),
      String(digits[target]),
      'Start immediately after the decimal point: tenths, hundredths, then thousandths.',
      [
        {text: 'Read the three decimal places from left to right.', equation: `tenths: ${digits[4]}; hundredths: ${digits[5]}; thousandths: ${digits[6]}`},
        {text: `Give the digit in the ${place.name} place.`, equation: `${place.name} digit = ${digits[target]}`},
      ],
    );
  }

  if (variant === 2) {
    const hundreds = r.int(2, 5);
    const remaining = r.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== hundreds));
    digits.splice(0, digits.length, 0, hundreds, ...remaining.slice(0, 5));
    const ordinal = ['first', 'second', 'third'][target - 4];
    return make(
      `Which decimal place contains the digit ${digits[target]}? Write tenths, hundredths or thousandths.`,
      numeral(digits),
      place.name,
      'Find the digit, then count its position to the right of the decimal point.',
      [
        {text: 'The first three places after the decimal point are tenths, hundredths and thousandths.'},
        {text: `The digit ${digits[target]} is ${ordinal} after the decimal point.`, equation: `${digits[target]} is in the ${place.name} place`},
      ],
    );
  }

  const total = digits.reduce((sum, digit, i) => sum + digit * PLACES[i].scale, 0);
  const remainder = digits[target] * place.scale;
  const known = total - remainder;
  const knownValues = PLACES.flatMap((p, i) => i === target || digits[i] === 0 ? [] : [decimal(digits[i] * p.scale)]);
  return make(
    'Find the number for □ so that the two sides are equal.',
    `${numeral(digits)} = ${expression(digits, target)}`,
    String(digits[target]),
    'Add the known parts and subtract them from the decimal. Then count the missing place-value units.',
    [
      {text: 'Add all the known parts.', equation: `${knownValues.join(' + ')} = ${decimal(known)}`},
      {text: 'Subtract to find the value of the missing part.', equation: `${numeral(digits)} − ${decimal(known)} = ${decimal(remainder)}`},
      {text: `Each ${place.name} unit is worth ${decimal(place.scale)}. Find how many are needed.`, equation: `${decimal(remainder)} ÷ ${decimal(place.scale)} = ${digits[target]}`},
    ],
  );
}
