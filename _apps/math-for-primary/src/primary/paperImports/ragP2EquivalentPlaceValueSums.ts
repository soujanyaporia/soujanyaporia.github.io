import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-equivalent-place-value-sums',
  level: 2,
  title: 'Match a number to its parts',
  objective: 'Use hundreds, tens and ones to match a sum to a number or find a missing part.',
  skillIds: ['P2.S.WN.02', 'P2.S.AS.02'],
  canonicalPatternId: 'p2-equivalent-place-value-sums',
};

function unitList(hundreds: number, tens: number, ones: number): string {
  return `${hundreds} hundreds, ${tens} tens and ${ones} ones`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
  const hundreds = rng.int(3, 8);
  const ones = rng.int(2, 9);
  const hundredValue = hundreds * 100;

  function choose(prompt: string, display: string, answer: string, distractors: string[], hint: string, workedSteps: { text: string; equation: string }[]): Question {
    return {
      key, prompt, display, answer, hint, workedSteps,
      choices: rng.shuffle([answer, ...distractors]),
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (variant === 0) {
    const target = hundredValue + ones;
    const answer = `${hundredValue} + ${ones}`;
    return choose('Which sum makes this number?', String(target), answer, [
      `${hundreds * 10} + ${ones}`,
      `${hundredValue} + ${ones * 10}`,
      `${hundreds * 10} + ${ones * 10}`,
    ], 'Read the digits from left to right. What does the zero tell you?', [
      { text: `The first digit stands for ${hundreds} hundreds.`, equation: `${hundreds} × 100 = ${hundredValue}` },
      { text: `There are no tens to add. Add the ${ones} ones.`, equation: `${answer} = ${target}` },
    ]);
  }

  const tens = rng.int(2, 8);
  const tenValue = tens * 10;
  const target = hundredValue + tenValue + ones;
  if (variant === 1) {
    return choose('What number belongs in the box?', `${hundredValue} + □ + ${ones} = ${target}`, String(tenValue), [
      String(tens), String(tens * 100), String(tenValue + ones),
    ], 'Start with the whole number. Take away the two parts you can see.', [
      { text: 'Take away the hundreds first.', equation: `${target} − ${hundredValue} = ${tenValue + ones}` },
      { text: 'Take away the ones to find the missing part.', equation: `${tenValue + ones} − ${ones} = ${tenValue}` },
      { text: 'Put that part back to check the sum.', equation: `${hundredValue} + ${tenValue} + ${ones} = ${target}` },
    ]);
  }

  const fewerHundreds = hundreds - 1;
  const extraTens = tens + 10;
  const extraOnes = ones + 10;
  const answer = unitList(fewerHundreds, extraTens - 1, extraOnes);
  return choose('Which set of hundreds, tens and ones makes this number?', String(target), answer, [
    unitList(fewerHundreds, extraTens, extraOnes),
    unitList(fewerHundreds, extraTens - 1, ones),
    unitList(hundreds, extraTens - 1, extraOnes),
  ], 'You can trade a hundred for ten tens, or a ten for ten ones.', [
    { text: 'Trade one hundred for ten tens.', equation: `${target} = ${unitList(fewerHundreds, extraTens, ones)}` },
    { text: 'Trade one of those tens for ten ones.', equation: `${target} = ${answer}` },
    { text: 'Add the three values to check.', equation: `${fewerHundreds * 100} + ${(extraTens - 1) * 10} + ${extraOnes} = ${target}` },
  ]);
}
