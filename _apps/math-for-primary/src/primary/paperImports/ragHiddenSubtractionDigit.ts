import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-hidden-subtraction-digit',
  level: 2,
  title: 'Find the hidden subtraction digit',
  objective: 'Use the ones column to recover a hidden digit and check it in the completed subtraction.',
  skillIds: ['P2.S.WN.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-hidden-digit-in-three-digit-subtraction',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const shared = (hashString(String(seed)) + index) % 2 === 0;
  const hundreds = rng.pick([5, 7, 8, 9]);
  const tens = rng.int(1, 8);
  const digit = shared ? rng.int(1, hundreds - 2) : rng.int(0, 8);
  const lowerHundreds = shared ? digit : rng.int(1, hundreds - 2);

  // After giving a ten to the ones, the tens must also exchange a hundred.
  const lowerOnes = rng.int(digit + 1, 9);
  const lowerTens = rng.int(tens, 9);
  const start = 100 * hundreds + 10 * tens + digit;
  const takeAway = 100 * lowerHundreds + 10 * lowerTens + lowerOnes;
  const difference = start - takeAway;
  const resultDigits = String(difference).split('').map(Number);
  const [resultHundreds, resultTens, resultOnes] = resultDigits;
  const restoredOnes = resultOnes + lowerOnes;

  const workedSteps = [
    { text: 'Add the ones taken away to the ones left over.', equation: `${lowerOnes} + ${resultOnes} = ${restoredOnes}` },
    { text: 'Ten of those ones came from exchanging a ten. Take them out to find the original ones digit.', equation: `${restoredOnes} − 10 = ${digit}` },
    { text: 'One ten went to the ones column. Exchange one hundred for ten more tens, then subtract the bottom tens.', equation: `${tens} − 1 + 10 − ${lowerTens} = ${resultTens}` },
  ];
  if (shared) {
    workedSteps.push({
      text: `There are ${hundreds - 1} hundreds after the exchange. Find how many hundreds were taken away. This checks the second space.`,
      equation: `${hundreds - 1} − ${resultHundreds} = ${digit}`,
    });
  }
  workedSteps.push({ text: 'Check the whole subtraction.', equation: `${start} − ${takeAway} = ${difference}` });

  const question: Question = {
    key,
    prompt: shared ? 'Which digit fits both question marks?' : 'Fill in the missing ones digit.',
    picture: {
      type: 'nanyang-p4',
      layout: 'table',
      caption: shared ? 'Both question marks stand for the same digit.' : 'One digit is hidden.',
      rowHeader: 'Subtraction',
      columns: ['Hundreds', 'Tens', 'Ones'],
      rows: [
        { label: 'Start', values: [hundreds, tens, null] },
        { label: '− Take away', values: [shared ? null : lowerHundreds, lowerTens, lowerOnes] },
        { label: '= Difference', values: resultDigits },
      ],
    },
    answer: String(digit),
    hint: 'Look at the ones. How many ones were there just before the bottom ones were taken away?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
  };
  if (shared) {
    const neighbours = [digit - 1, digit + 1, lowerOnes, resultOnes, resultHundreds, digit + 2, digit + 3];
    const otherDigits = [...new Set(neighbours)].filter(n => n >= 1 && n <= 9 && n !== digit);
    question.choices = rng.shuffle([digit, ...otherDigits.slice(0, 3)].map(String));
  }
  return question;
}
