import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-place-value-difference',
  level: 3,
  title: 'Take away hundreds, tens and ones',
  objective: 'Work out how much to take away when it is given in place-value units, then subtract it from a number or a product.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-difference-after-place-value-conversion',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let start: number;
  let amount: number;
  let prompt: string;
  let hint: string;
  let choices: string[] | undefined;

  if ((hashString(String(seed)) + index) % 2 === 0) {
    const hundreds = rng.int(3, 7);
    const tens = rng.int(2, 6);
    const ones = rng.int(12, 15);
    const looseOnes = ones - 10;
    const totalTens = tens + 1;
    amount = hundreds * 100 + totalTens * 10 + looseOnes;

    // The exchange happens in the amount being taken away. Once it is written
    // as a numeral, each of its digits can be subtracted without borrowing.
    start = 1000 * rng.int(3, 5) + 100 * rng.int(hundreds, 9)
      + 10 * rng.int(totalTens, 9) + rng.int(looseOnes, 9);
    prompt = `Start at ${start}. Take away ${hundreds} hundreds, ${tens} tens and ${ones} ones. Which number is left?`;
    hint = 'Make a ten from the ones. Include that ten when you work out how much to take away.';
    workedSteps.push(
      { text: 'Exchange ten of the ones for one ten.', equation: `${ones} ones = 1 ten + ${looseOnes} ones` },
      { text: `There are now ${totalTens} tens. Add the values of all three parts.`, equation: `${hundreds * 100} + ${totalTens * 10} + ${looseOnes} = ${amount}` },
    );
    // The alternatives distinguish losing the exchanged ten and adding instead of subtracting.
    choices = rng.shuffle([start - amount, start - (amount - 10), start + amount, start + (amount - 10)].map(String));
  } else {
    const factor = rng.int(41, 59);
    const multiplier = rng.int(5, 9);
    const tens = rng.int(4, 9);
    start = factor * multiplier;
    amount = tens * 10;
    prompt = `Begin with the product of ${factor} and ${multiplier}. Take away ${tens} tens. What number is left?`;
    hint = 'Multiply to find the starting number. How many ones are in the tens you need to take away?';
    workedSteps.push(
      { text: 'Multiply to find the starting number.', equation: `${factor} × ${multiplier} = ${start}` },
      { text: 'Each ten is worth ten ones.', equation: `${tens} × 10 = ${amount}` },
    );
  }

  const answer = start - amount;
  workedSteps.push({ text: 'Subtract the amount from the starting number.', equation: `${start} − ${amount} = ${answer}` });
  return {
    key, prompt, hint, answer: String(answer), workedSteps,
    ...(choices ? { choices } : {}),
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: { op: '-', a: start, b: amount },
  };
}
