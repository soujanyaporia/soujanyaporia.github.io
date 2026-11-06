import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-numeral-from-digit-clues',
  level: 2 as const,
  title: 'Find the number from its digits',
  objective: 'Use place value and arithmetic clues to find a single two- or three-digit number.',
  skillIds: ['P2.S.WN.02', 'P2.S.WN.04', 'P2.S.MD.01', 'P2.S.AS.01'],
  canonicalPatternId: 'numeral-from-digit-clues',
};

type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const offset = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = ((offset + index) % 3 + 3) % 3;
  const entryPrompt = 'Write the three-digit number that fits all the clues.';

  function question(prompt: string, context: string[], answer: string, hint: string, workedSteps: Steps, choices?: string[]): Question {
    return {
      key, prompt, context, answer, hint, workedSteps,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
      ...(choices ? { choices } : {}),
    };
  }

  if (variant === 0) {
    const hundreds = rng.int(4, 9);
    const lower = hundreds * 100;
    const upper = lower + 100;
    const factor = rng.pick([2, 3, 4, 5]);
    const tens = rng.int(1, Math.floor(9 / factor));
    const ones = factor * tens;
    const answer = `${hundreds}${tens}${ones}`;
    return question(entryPrompt, [
      `The number is greater than ${lower} and less than ${upper}.`,
      `There is a ${tens} in the tens place.`,
      `Multiply the tens digit by ${factor} to get the ones digit.`,
    ], answer, 'Start with the two ends of the range. Which hundreds digit do all the numbers inside it share?', [
      { text: `The numbers from ${lower + 1} to ${upper - 1} all start with ${hundreds}.` },
      { text: `Use the tens digit, ${tens}, to find the ones digit.`, equation: `${tens} × ${factor} = ${ones}` },
      { text: 'Put the digits in their places.', equation: `${lower} + ${10 * tens} + ${ones} = ${answer}` },
    ]);
  }

  if (variant === 1) {
    const tens = rng.int(2, 4);
    const gap = rng.int(1, 5);
    const ones = tens + gap;
    const product = tens * ones;
    const answer = `${tens}${ones}`;
    const reversed = `${ones}${tens}`;
    const otherStarts = rng.shuffle([1, 2, 3, 4, 5].filter(digit => digit !== tens && digit + gap <= 9));
    const alternatives = otherStarts.slice(0, 2).map(start => `${start}${start + gap}`);
    const choices = rng.shuffle([answer, reversed, ...alternatives]);
    const products = choices.map(choice => {
      const [left, right] = choice.split('').map(Number);
      return `${left} × ${right} = ${left * right}`;
    });
    return question('Choose the two-digit number that fits both clues.', [
      `Multiplying the two digits gives ${product}.`,
      `The ones digit is ${gap} more than the tens digit.`,
    ], answer, 'Check the product for each choice. Then check which digit belongs on the right.', [
      { text: 'Multiply the digits in each choice.', equation: products.join(',  ') },
      { text: `Both ${answer} and ${reversed} give ${product}. The larger digit must go in the ones place.`, equation: `${tens} + ${gap} = ${ones}` },
      { text: `Choose ${answer}. It has ${tens} tens and ${ones} ones.` },
    ], choices);
  }

  const factor = rng.pick([2, 3, 4]);
  const largestStart = Math.floor(9 / factor);
  const gap = rng.int(factor === 2 ? 2 : 1, largestStart - 1);
  const hundreds = rng.int(gap, largestStart);
  const tens = factor * hundreds;
  const ones = hundreds - gap;
  const total = hundreds + tens + ones;
  const answer = `${hundreds}${tens}${ones}`;
  const steps: Steps = [
    { text: `Start at ${gap} for the hundreds digit so you can take away ${gap}. Stop at ${largestStart} because the tens digit must be less than 10.` },
  ];
  for (let start = gap; start <= largestStart; start++) {
    const middle = factor * start;
    const last = start - gap;
    steps.push({
      text: `Try ${start} in the hundreds place. The tens digit is ${factor} × ${start} = ${middle}. The ones digit is ${start} − ${gap} = ${last}.`,
      equation: `${start} + ${middle} + ${last} = ${start + middle + last}`,
    });
  }
  steps.push({ text: `Only the digits ${hundreds}, ${tens} and ${ones}, in that order, add to ${total} and fit the other clues. They make ${answer}.` });
  return question(entryPrompt, [
    `The hundreds digit is ${gap} more than the ones digit.`,
    `Multiply the hundreds digit by ${factor} to get the tens digit.`,
    `The three digits add up to ${total}.`,
  ], answer, 'Try a hundreds digit. Use it to find the other two digits, then check their sum.', steps);
}
