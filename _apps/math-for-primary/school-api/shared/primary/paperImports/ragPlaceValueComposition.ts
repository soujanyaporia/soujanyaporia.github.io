import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-place-value-composition',
  level: 3,
  title: 'Build and split four-digit numbers',
  objective: 'Use thousands, hundreds, tens and ones to build a number or find a part of its expansion.',
  skillIds: ['P3.S.WN.01'],
  canonicalPatternId: 'place-value-composition-and-expansion',
};

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = ((hashString(String(seed)) + index) >>> 0) % 4;
  const thousands = rng.pick([3, 4, 5, 6, 8]);
  const base = thousands * 1000;
  // Distinct nonzero digits keep the swapped-place choices distinguishable.
  const [middle, ones] = rng.shuffle([2, 3, 4, 5, 6, 7, 8, 9]);

  function question(prompt: string, display: string, answer: string, hint: string, steps: Step[], options?: string[]): Question {
    return {
      key, prompt, display, answer, hint,
      workedSteps: steps,
      explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
      ...(options ? { choices: rng.shuffle(options) } : {}),
    };
  }

  if (form === 0) {
    const tensValue = middle * 10;
    const total = base + tensValue + ones;
    return question(
      'Write the number these groups make. Use digits.',
      `${thousands} thousands, ${middle} tens and ${ones} ones`, String(total),
      'Start with the thousands. Which place has no groups?',
      [
        { text: 'Find the values of the thousands and the tens.', equation: `${thousands} × 1000 = ${base}, ${middle} × 10 = ${tensValue}` },
        { text: 'Add the ones. The hundreds digit is zero.', equation: `${base} + ${tensValue} + ${ones} = ${total}` },
      ],
    );
  }

  if (form === 1) {
    const looseOnes = 10 * middle + ones;
    const total = base + looseOnes;
    const options = [total, base + middle * 100 + ones, base + middle * 100 + ones * 10, base + ones * 10 + middle];
    return question(
      'Which number do these groups make?', `${thousands} thousands and ${looseOnes} ones`, String(total),
      'Make a ten from each group of ten ones. How many ones are left over?',
      [
        { text: 'Group the ones into tens and leftover ones.', equation: `${looseOnes} ones = ${middle} tens + ${ones} ones` },
        { text: 'Put these tens and ones with the thousands. There are zero hundreds.', equation: `${base} + ${middle * 10} + ${ones} = ${total}` },
      ], options.map(String),
    );
  }

  if (form === 2) {
    const place = rng.pick([10, 100]);
    const otherPlace = place === 10 ? 100 : 10;
    const middleValue = middle * place;
    const total = base + middleValue + ones;
    const sum = (value: number, last: number) => `${base} + ${value} + ${last}`;
    const answer = sum(middleValue, ones);
    return question(
      'Which sum shows the value of each nonzero digit?', String(total), answer,
      'Read the digits from right to left: ones, tens, hundreds, thousands.',
      [
        { text: `The digit ${middle} is in the ${place === 10 ? 'tens' : 'hundreds'} place.`, equation: `${middle} × ${place} = ${middleValue}` },
        { text: 'Write one part for each nonzero digit.', equation: `${total} = ${answer}` },
      ], [answer, sum(middle * otherPlace, ones), sum(ones * place, middle), sum(ones * otherPlace, middle)],
    );
  }

  const hundredsValue = middle * 100;
  const rest = hundredsValue + ones;
  const total = base + rest;
  return question(
    'Find the value that completes the sum.', `${total} = ${base} + □ + ${ones}`, String(hundredsValue),
    'The sum already shows the thousands and the ones. Which part is left?',
    [
      { text: 'Take away the thousands already shown.', equation: `${total} − ${base} = ${rest}` },
      { text: 'Take away the ones. The box holds the value of the hundreds.', equation: `${rest} − ${ones} = ${hundredsValue}` },
    ],
  );
}
