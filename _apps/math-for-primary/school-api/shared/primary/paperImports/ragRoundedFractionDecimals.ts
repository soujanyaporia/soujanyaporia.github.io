import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-rounded-fraction-decimals',
  level: 5,
  title: 'Fractions as rounded decimals',
  objective: 'Convert a fraction or mixed number by division, then round to the requested decimal place.',
  skillIds: ['P5.S.FRAC.03', 'P4.S.DEC.04'],
  canonicalPatternId: 'p5-division-and-fraction-to-decimal-conversion',
};

type Places = 1 | 2;
type Fraction = {numerator: number; denominator: number};

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

function fractionPool(places: Places, mixed: boolean): Fraction[] {
  const pool: Fraction[] = [];
  for (const denominator of [3, 4, 6, 7, 8, 9]) {
    for (let numerator = 1; numerator < denominator; numerator++) {
      if (gcd(numerator, denominator) !== 1) continue;
      if ((numerator * 10 ** places) % denominator === 0) continue;
      if (!mixed && ((numerator === 5 && denominator === 8) ||
                     (numerator === 4 && denominator === 7))) continue;
      pool.push({numerator, denominator});
    }
  }
  return pool;
}

function decimalText(units: number, places: Places): string {
  const scale = 10 ** places;
  return `${Math.floor(units / scale)}.${String(units % scale).padStart(places, '0')}`;
}

function divisionDigits(numerator: number, denominator: number, count: number) {
  let remainder = numerator;
  let digits = '';
  for (let i = 0; i < count; i++) {
    const dividend = remainder * 10;
    digits += String(Math.floor(dividend / denominator));
    remainder = dividend % denominator;
  }
  return {digits, remainder};
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const slot = (((hashString(String(seed)) >>> 0) + (index >>> 0)) >>> 0) % 4;
  const mixed = slot === 3;
  const places: Places = slot === 0 ? 1 : 2;
  const multipleChoice = slot === 1;
  const {numerator, denominator} = r.pick(fractionPool(places, mixed));
  const whole = mixed ? r.int(3, 8) : 0;
  const display = `${mixed ? `${whole} ` : ''}${numerator}/${denominator}`;
  const scale = 10 ** places;
  const totalNumerator = whole * denominator + numerator;
  // Positive rational half-up rounding, without binary decimal rounding.
  const roundedUnits = Math.floor((2 * totalNumerator * scale + denominator) / (2 * denominator));
  const answer = decimalText(roundedUnits, places);
  const {digits, remainder} = divisionDigits(numerator, denominator, places + 1);
  const tail = remainder === 0 ? '' : '…';
  const fractionExpansion = `0.${digits}${tail}`;
  const totalExpansion = `${whole}.${digits}${tail}`;
  const decidingDigit = Number(digits[places]);
  const decidingPlace = places === 1 ? 'hundredths' : 'thousandths';
  const keptPlace = places === 1 ? 'tenths' : 'hundredths';
  const accuracy = `${places} decimal place${places === 1 ? '' : 's'}`;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'A fraction bar means division.',
      equation: `${numerator}/${denominator} = ${numerator} ÷ ${denominator}`,
    },
    {
      text: `Work out the first ${places + 1} digits after the decimal point. This gives one extra digit to check.`,
      equation: `${numerator} ÷ ${denominator} = ${fractionExpansion}`,
    },
  ];
  if (mixed) {
    workedSteps.push({
      text: 'Add the whole-number part.',
      equation: `${whole} + ${fractionExpansion} = ${totalExpansion}`,
    });
  }
  workedSteps.push({
    text: `The ${decidingPlace} digit is ${decidingDigit}. ${decidingDigit >= 5
      ? `It is 5 or more, so increase the ${keptPlace} digit by 1.`
      : `It is below 5, so keep the ${keptPlace} digit unchanged.`} Write the result to ${accuracy}.`,
    equation: `${display} ≈ ${answer}`,
  });

  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `Change the number shown to a decimal. Round to ${accuracy}.${multipleChoice ? ' Choose the matching answer.' : ''}`,
    display,
    answer,
    hint: `Divide the top number of the fraction by the bottom number.${mixed ? ' Add the whole-number part.' : ''} Look at the ${decidingPlace} digit to decide how to round.`,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text}${step.equation ? ` ${step.equation}.` : ''}`).join(' '),
  };
  if (multipleChoice) {
    question.choices = r.shuffle([
      answer,
      decimalText(roundedUnits - 1, places),
      decimalText(roundedUnits + 1, places),
      decimalText(roundedUnits + 10, places),
    ]);
  }
  return question;
}
