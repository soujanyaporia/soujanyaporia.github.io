import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-repeated-addition-and-multiplication',
  level: 2 as const,
  title: 'One addend for each group',
  objective: 'Match equal groups, repeated addition and multiplication using the number of groups and the size of each group.',
  skillIds: ['P2.S.MD.01'],
  canonicalPatternId: 'repeated-addition-and-multiplication',
};

function repeatTerm(value: number, count: number, sign: '+' | '×'): string {
  return Array(count).fill(value).join(` ${sign} `);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(1, 12);
  const groups = rng.int(3, 7);
  const size = rng.pick([3, 5, 10].filter(n => n !== groups));
  const sum = repeatTerm(size, groups, '+');
  const product = `${groups} × ${size}`;
  const total = groups * size;

  let prompt: string;
  let display: string | undefined;
  if (variant <= 10) {
    prompt = `There are ${groups} jars. Each jar holds ${size} buttons. Which addition counts all the buttons?`;
  } else if (variant === 11) {
    display = product;
    prompt = 'The first number tells how many groups there are. Which addition shows these groups?';
  } else {
    display = sum;
    prompt = 'Which multiplication shows this addition? Put the number of groups first.';
  }

  const chooseProduct = variant === 12;
  const answer = chooseProduct ? product : sum;
  const distractors = chooseProduct
    ? [`${groups - 1} × ${size}`, `${groups + 1} × ${size}`, `${groups} + ${size}`]
    : [repeatTerm(size, groups + 1, '+'), repeatTerm(groups, groups, '+'), repeatTerm(size, groups, '×')];
  const workedSteps = chooseProduct
    ? [
        { text: `Count the numbers in the addition. There are ${groups} of them, and each one is ${size}.` },
        { text: `Write ${groups} first for the groups and ${size} second for the number in each group.`, equation: `${product} = ${total}` },
      ]
    : [
        { text: `One group gives us ${size}. We need one ${size} for each of the ${groups} groups.`, equation: product },
        { text: `Join the ${groups} numbers with plus signs.`, equation: `${sum} = ${total}` },
      ];

  return {
    key, prompt, display, answer,
    choices: rng.shuffle([answer, ...distractors]),
    hint: chooseProduct
      ? 'Count how many numbers are being added. Then look at the number that repeats.'
      : 'Think of one group at a time. What number should you write for each group?',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
