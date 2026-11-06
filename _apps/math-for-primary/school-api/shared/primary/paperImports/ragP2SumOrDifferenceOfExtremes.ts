import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-sum-or-difference-of-extremes',
  level: 2,
  title: 'Use the smallest and largest numbers',
  objective: 'Select the smallest and largest of four numbers and find their sum or difference.',
  skillIds: ['P2.S.WN.04', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-sum-or-difference-of-extremes',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const add = rng.chance(0.5);
  const lowHundreds = rng.int(1, 3);
  // For a sum, leave room for a carry from the tens column.
  const highHundreds = rng.int(lowHundreds + 1, add ? 8 - lowHundreds : 9);
  const smallest = 100 * lowHundreds + rng.int(10, 69);
  const largest = 100 * highHundreds + rng.int(30, 98);
  const nextToLargest = largest - rng.pick([1, 2, 10, 20]);
  const second = add ? smallest + rng.pick([1, 2, 10, 20]) : largest - rng.int(21, 29);
  const ordered = [smallest, second, nextToLargest, largest];
  const shown = rng.shuffle([...ordered]);
  const result = add ? largest + smallest : largest - smallest;
  const equation = `${largest} ${add ? '+' : '−'} ${smallest} = ${result}`;
  const comparison = `${smallest} is the smallest and ${largest} is the largest.`;

  return {
    key,
    prompt: add
      ? 'What do you get when you add the smallest number to the largest one?'
      : 'How much larger is the largest number than the smallest one?',
    display: shown.join(', '),
    answer: String(result),
    hint: 'Compare the hundreds first. If they match, compare the tens, then the ones.',
    workedSteps: [
      { text: 'Put the four numbers in order from smallest to largest.', equation: ordered.join(' < ') },
      { text: comparison },
      { text: add ? 'Add those two numbers.' : 'Subtract the smallest from the largest.', equation },
    ],
    explanation: `${comparison} ${equation}.`,
    proof: { op: add ? '+' : '-', a: largest, b: smallest },
  };
}
