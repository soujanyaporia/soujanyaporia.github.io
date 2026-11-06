import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p2-place-value-unit-arithmetic',
  level: 2 as const,
  title: 'Count on and back in tens and hundreds',
  objective: 'Use the value of each ten or hundred to find a missing number or a difference.',
  skillIds: ['P2.S.WN.02', 'P2.S.AS.02'],
  canonicalPatternId: 'p2-arithmetic-with-place-value-units',
};

type Step = { text: string; equation: string };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = ((hashString(String(seed)) + index) >>> 0) % 4;

  function entry(prompt: string, answer: number, hint: string, workedSteps: Step[]): Question {
    return {
      key, prompt, answer: String(answer), hint, workedSteps,
      explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    };
  }

  if (form === 0) {
    const tens = rng.int(2, 8);
    // Choose the starting tens digit so counting on crosses one hundred boundary.
    const start = rng.int(1, 8) * 100 + rng.int(10 - tens, 9) * 10;
    const change = tens * 10;
    const finish = start + change;
    return entry(`Start at ${start} and count on ${tens} tens. Where do you finish? Show your working.`,
      finish, 'Each ten is worth 10. Counting on takes you to a larger number.', [
        { text: `Find the value of ${tens} tens.`, equation: `${tens} × 10 = ${change}` },
        { text: 'Add that amount to the starting number.', equation: `${start} + ${change} = ${finish}` },
      ]);
  }

  if (form === 1) {
    const hundreds = rng.int(2, 3);
    const tens = rng.int(11, 29);
    const change = hundreds * 100 + tens * 10;
    const start = rng.int(Math.ceil(change / 100) + 1, 9) * 100;
    const left = start - change;
    return entry(`Start with ${start}. Take away ${hundreds} hundreds and ${tens} tens. How much is left?`,
      left, 'Work out how much the hundreds and tens make together. Take that amount away.', [
        { text: 'Find the value of the hundreds.', equation: `${hundreds} × 100 = ${hundreds * 100}` },
        { text: 'Count all the tens, including the tens that make another hundred.', equation: `${tens} × 10 = ${tens * 10}` },
        { text: 'Put the two amounts together.', equation: `${hundreds * 100} + ${tens * 10} = ${change}` },
        { text: 'Take the whole amount away.', equation: `${start} − ${change} = ${left}` },
      ]);
  }

  if (form === 2) {
    const hundreds = rng.int(2, 7);
    const finish = rng.int(hundreds + 1, 9) * 100 + rng.int(1, 9) * 10 + rng.int(1, 8);
    const change = hundreds * 100;
    const start = finish - change;
    return entry(`I added ${hundreds} hundreds to my number and got ${finish}. What was my number?`,
      start, 'You know the number after the hundreds were added. Work back to the number before.', [
        { text: 'Find how much was added.', equation: `${hundreds} × 100 = ${change}` },
        { text: 'Take those hundreds back out.', equation: `${finish} − ${change} = ${start}` },
        { text: 'Add them back to check.', equation: `${start} + ${change} = ${finish}` },
      ]);
  }

  const fewerTens = rng.int(11, 58);
  const moreTens = fewerTens + rng.int(2, 30);
  const extraTens = moreTens - fewerTens;
  const ones = extraTens * 10;
  return entry(`Find the difference between ${moreTens} tens and ${fewerTens} tens. Give your answer in ones.`,
    ones, 'Both amounts are in tens. Find how many extra tens there are, then count their ones.', [
      { text: 'Find the difference in tens.', equation: `${moreTens} − ${fewerTens} = ${extraTens}` },
      { text: `Count the ones in ${extraTens} tens.`, equation: `${extraTens} × 10 = ${ones}` },
    ]);
}
