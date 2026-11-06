import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-regroup-tens-and-ones',
  level: 1,
  title: 'Make another ten',
  objective: 'Exchange ten ones for one ten and write the number the tens and ones make.',
  skillIds: ['P1.S.WN.02'],
  canonicalPatternId: 'build-a-numeral-from-tens-and-ones',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const tens = rng.pick([3, 4, 5, 7]);
  const ones = rng.int(10, 19);
  const remainingOnes = ones - 10;
  const newTens = tens + 1;
  const tensValue = newTens * 10;
  const total = tensValue + remainingOnes;
  const choice = rng.int(0, 2) !== 0;
  const given = `${tens} tens and ${ones} ones`;

  return {
    key,
    prompt: choice ? `Which number do ${given} make?` : `Write the number made by ${given}.`,
    ...(choice ? { choices: rng.shuffle([total, total - 10, total + 10, tens + ones]).map(String) } : {}),
    answer: String(total),
    hint: 'Can you make another ten from the ones?',
    workedSteps: [
      { text: 'Take ten of the ones to make one new ten. Count the ones left over.', equation: `${ones} − 10 = ${remainingOnes}` },
      { text: 'Add the new ten to the tens you started with.', equation: `${tens} + 1 = ${newTens}` },
      { text: `The ${newTens} tens are worth ${tensValue}. Add the ones left over.`, equation: `${tensValue} + ${remainingOnes} = ${total}` },
    ],
    explanation: `Making a ten changes how the ones are grouped. The tens are now worth ${tensValue}. Adding the remaining ${remainingOnes} gives ${total}.`,
    proof: { op: '+', a: { op: '*', a: tens, b: 10 }, b: ones },
  };
}
