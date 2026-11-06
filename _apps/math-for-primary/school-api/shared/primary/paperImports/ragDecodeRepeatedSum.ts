import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-decode-repeated-sum',
  level: 1,
  title: 'Read the groups in a sum',
  objective: 'Count the equal addends and use their value to describe or match the groups.',
  skillIds: ['P1.S.MD.01'],
  canonicalPatternId: 'decode-a-repeated-sum',
};

type Groups = { count: number; size: number };
const groupNames: Record<number, string> = { 2: 'twos', 3: 'threes', 4: 'fours', 5: 'fives', 9: 'nines' };

function usable(count: number, size: number) {
  return count !== size && count * size <= 40;
}

const facts: Groups[] = [];
for (let count = 2; count <= 6; count++) {
  for (const size of [2, 3, 4, 5, 9]) {
    if (usable(count, size)) facts.push({ count, size });
  }
}

function writeSum(count: number, size: number): string {
  return Array<string>(count).fill(String(size)).join(' + ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;
  const { count, size } = rng.pick(facts);
  const sum = writeSum(count, size);
  const total = count * size;
  const name = groupNames[size];

  if (variant === 1) {
    // Cross the two counts with the two sizes. Each clue alone fits two sums.
    const other = rng.pick(facts.filter(b => b.count !== count && b.size !== size
      && usable(b.count, size) && usable(count, b.size)));
    const otherSum = writeSum(other.count, other.size);
    const options = rng.shuffle([sum, otherSum, writeSum(count, other.size), writeSum(other.count, size)]);
    const first = String(options.indexOf(sum) + 1);
    const second = String(options.indexOf(otherSum) + 1);
    return {
      key,
      prompt: 'Match each multiplication to a sum. The first number in the multiplication tells how many groups there are. Write the number of each matching sum.',
      context: options.map((option, i) => `Sum ${i + 1}: ${option}`),
      structuredResponse: { kind: 'number-pair', firstLabel: `Sum for ${count} × ${size}`, secondLabel: `Sum for ${other.count} × ${other.size}` },
      answer: JSON.stringify([first, second]),
      hint: 'Check which number repeats. Then count how many times it appears.',
      workedSteps: [
        { text: `Look for ${count} copies of ${size}. They are in sum ${first}.`, equation: `${count} × ${size} = ${sum}` },
        { text: `Look for ${other.count} copies of ${other.size}. They are in sum ${second}.`, equation: `${other.count} × ${other.size} = ${otherSum}` },
      ],
      explanation: `Sum ${first} shows ${count} groups of ${size}. Sum ${second} shows ${other.count} groups of ${other.size}.`,
    };
  }

  const base = {
    key,
    display: sum,
    hint: 'Point to each number once as you count along the sum.',
    explanation: `The number ${size} appears ${count} times. That makes ${count} groups of ${size}.`,
    workedSteps: [
      { text: `Each group has ${size}, because ${size} is the number being added each time.` },
      { text: `Count one group each time you see ${size}.`, equation: `${sum} = ${count} groups of ${size}` },
    ],
  };

  if (variant === 0) {
    const nearby = count - 1 === size ? count + 1 : count - 1;
    return {
      ...base,
      prompt: `How many ${name} can you count in this sum?`,
      choices: rng.shuffle([count, size, total, nearby].map(String)),
      answer: String(count),
    };
  }

  if (variant === 2) {
    const countOn = Array.from({ length: count }, (_, i) => (i + 1) * size);
    return {
      ...base,
      display: `${sum} = □`,
      prompt: `Find the total. How many ${name} make that total?`,
      structuredResponse: { kind: 'number-pair', firstLabel: 'Total', secondLabel: `Number of ${name}` },
      answer: JSON.stringify([String(total), String(count)]),
      workedSteps: [...base.workedSteps, { text: `Count on in ${name} to find the total.`, equation: countOn.join(' → ') }],
      explanation: `There are ${count} ${name}. Adding them gives ${total}, so the total is ${total} and the number of ${name} is ${count}.`,
    };
  }

  return {
    ...base,
    prompt: 'How many groups does the sum show? How many are in each group?',
    structuredResponse: { kind: 'number-pair', firstLabel: 'Number of groups', secondLabel: 'Number in each group' },
    answer: JSON.stringify([String(count), String(size)]),
  };
}
