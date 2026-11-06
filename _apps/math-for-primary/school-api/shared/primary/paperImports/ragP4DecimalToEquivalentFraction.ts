import { Rng, hashString } from '../../engine/random';
import { fraction, type Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-decimal-to-equivalent-fraction',
  level: 4,
  title: 'Write a decimal as a fraction',
  objective: 'Use decimal place value to write an equivalent fraction, simplify a mixed number or find a missing denominator.',
  skillIds: ['P4.S.DEC.08'],
  canonicalPatternId: 'p4-decimal-to-equivalent-fraction',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = ((seed >>> 0) + (index >>> 0)) % 7;
  const fractionChoice = slot === 3 || slot === 4;
  const mixed = slot === 5;
  const places = fractionChoice ? 3 : 2;
  const scale = 10 ** places;
  const placeName = fractionChoice ? 'thousandths' : 'hundredths';
  // Odd multiples of 25 give genuine three-place decimals. The two-place
  // decimals end in a nonzero even digit so there is always a factor to cancel.
  const part = fractionChoice
    ? 25 * (2 * rng.int(1, 18) + 1)
    : 10 * rng.int(0, 9) + rng.pick([2, 4, 6, 8]);
  const whole = mixed ? rng.int(3, 8) : 0;
  const decimal = `${whole}.${String(part).padStart(places, '0')}`;
  const reduced = fraction(part, scale);
  const [top, bottom] = reduced.split('/').map(Number);
  const commonFactor = scale / bottom;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: mixed ? `Keep the whole number and write the decimal part in ${placeName}.` : `Read the digits after the point as ${placeName}.`,
      equation: `${decimal} = ${mixed ? `${whole} + ` : ''}${part}/${scale}`,
    },
    {
      text: `Divide both the numerator and the denominator by ${commonFactor}.`,
      equation: `${part}/${scale} = ${reduced}`,
    },
  ];
  const base = {
    key,
    display: decimal,
    hint: `How many ${placeName} are in the part after the decimal point?`,
    workedSteps,
  };

  if (slot === 6) {
    const multiplier = rng.pick([3, 5]);
    const suppliedTop = top * multiplier;
    const missingBottom = bottom * multiplier;
    workedSteps.push({
      text: `To change ${top} to ${suppliedTop}, multiply by ${multiplier}. Multiply the denominator by the same number.`,
      equation: `${reduced} = ${suppliedTop}/${missingBottom}`,
    });
    return {
      ...base,
      prompt: 'Which number goes below the line to make the fraction equal to the decimal?',
      display: `${decimal} = ${suppliedTop}/□`,
      answer: String(missingBottom),
      explanation: `The decimal equals ${reduced}. Multiplying both parts by ${multiplier} gives ${suppliedTop}/${missingBottom}.`,
      proof: { op: '/', a: { op: '*', a: suppliedTop, b: scale }, b: part },
    };
  }

  if (mixed) {
    const answer = `${whole} ${reduced}`;
    workedSteps.push({
      text: 'Put the whole number and the simplified fraction together.',
      equation: `${whole} + ${reduced} = ${answer}`,
    });
    return {
      ...base,
      prompt: 'Which mixed number gives the same value with its fraction in simplest form?',
      answer,
      choices: rng.shuffle([
        answer,
        `${whole} ${2 * top}/${2 * bottom}`,
        `${whole} ${fraction(part - 1, scale)}`,
        `${whole} ${fraction(part + 1, scale)}`,
      ]),
      requireMixed: true,
      requireSimplified: true,
      explanation: `The whole number is ${whole}. The remaining ${part} hundredths simplify to ${reduced}, giving ${answer}.`,
      proof: { op: '+', a: whole, b: { op: '/', a: part, b: scale } },
    };
  }

  return {
    ...base,
    prompt: fractionChoice
      ? 'Which fraction has the same value as this decimal? Choose the fraction in simplest form.'
      : 'Write a fraction equal to this decimal. Give your fraction in simplest form.',
    answer: reduced,
    ...(fractionChoice ? { choices: rng.shuffle([
      reduced,
      fraction(part - 25, scale),
      fraction(part + 25, scale),
      fraction(part, 2 * scale),
    ]) } : {}),
    requireSimplified: true,
    explanation: `${part} ${placeName} means ${part}/${scale}. Dividing both parts by ${commonFactor} gives ${reduced}.`,
    proof: { op: '/', a: part, b: scale },
  };
}
