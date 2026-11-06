import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-number-name-to-digits',
  level: 1,
  title: 'From a number name to digits',
  objective: 'Read a two-digit number name and write the number using digits.',
  skillIds: ['P1.S.WN.03'],
  canonicalPatternId: 'p1-numerals-and-number-names',
};

const tenToNineteen = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const decades = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const onesNames = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
const practiceValues = Array.from({ length: 90 }, (_, i) => 10 + i)
  .filter(value => ![15, 27, 38, 40, 76, 98].includes(value));

function numberName(value: number): string {
  if (value < 20) return tenToNineteen[value - 10];
  const decade = decades[Math.floor(value / 10) - 2];
  const ones = value % 10;
  return ones === 0 ? decade : `${decade}-${onesNames[ones]}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const value = new Rng(hashString(key)).pick(practiceValues);
  const name = numberName(value);
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const workedSteps = [
    {
      text: `“${name}” means ${tens} ${tens === 1 ? 'ten' : 'tens'} and ${ones} ${ones === 1 ? 'one' : 'ones'}.`,
      equation: `${tens * 10} + ${ones} = ${value}`,
    },
    {
      text: `Write ${tens} in the tens place and ${ones} in the ones place.`,
      equation: String(value),
    },
  ];
  return {
    key,
    prompt: 'Read this number name. How do you write it in digits?',
    display: name,
    answer: String(value),
    hint: 'Think about how many tens and how many ones the name stands for.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: value,
  };
}
