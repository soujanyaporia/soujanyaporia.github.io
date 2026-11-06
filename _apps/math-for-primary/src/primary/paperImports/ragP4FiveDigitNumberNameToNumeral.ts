import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-five-digit-number-name-to-numeral',
  level: 4,
  title: 'From number names to digits',
  objective: 'Write a five-digit numeral from its name, using zero for any empty place.',
  skillIds: ['P4.S.WN.04'],
  canonicalPatternId: 'p4-five-digit-number-name-to-numeral',
};

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function belowHundred(value: number): string {
  if (value < 20) return small[value];
  const tensName = tens[Math.floor(value / 10)];
  const ones = value % 10;
  return ones === 0 ? tensName : `${tensName}-${small[ones]}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const thousands = rng.int(40, 99);
  const hundreds = rng.chance(0.5) ? 0 : rng.int(1, 9);
  const tail = rng.int(1, 99);
  const remainder = hundreds * 100 + tail;
  const value = thousands * 1000 + remainder;
  const thousandsName = `${belowHundred(thousands)} thousand`;
  const hundredsName = hundreds === 0 ? '' : ` ${small[hundreds]} hundred`;
  const name = `${thousandsName}${hundredsName} and ${belowHundred(tail)}`;
  const lastThree = String(remainder).padStart(3, '0');

  const workedSteps = [
    { text: `Start with ${thousandsName}.`, equation: `${thousands} × 1000 = ${thousands * 1000}` },
    { text: `The hundreds digit is ${hundreds}, the tens digit is ${Math.floor(tail / 10)} and the ones digit is ${tail % 10}. Write these three digits as ${lastThree}.` },
    { text: 'Put the thousands and the last three digits together.', equation: `${thousands * 1000} + ${remainder} = ${value}` },
  ];

  return {
    key,
    prompt: 'How do you write this number using digits? Type the digits together.',
    context: [name],
    answer: String(value),
    hint: 'Find the thousands first. Then fill the hundreds, tens and ones places. Use 0 for an empty place.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    proof: { op: '+', a: { op: '*', a: thousands, b: 1000 }, b: remainder },
  };
}
