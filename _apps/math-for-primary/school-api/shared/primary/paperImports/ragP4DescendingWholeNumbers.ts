import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-descending-whole-numbers',
  level: 4,
  title: 'Order five-digit numbers from largest to smallest',
  objective: 'Use the first place where two digits differ to decide which number comes first in a decreasing row.',
  skillIds: ['P4.S.WN.01'],
  canonicalPatternId: 'p4-order-five-digit-whole-numbers-descending',
};

function completeNumbers(prefix: number, digits: number[]): number[] {
  if (digits.length === 0) return [prefix];
  return digits.flatMap((digit, index) =>
    completeNumbers(10 * prefix + digit, digits.filter((_, position) => position !== index)),
  );
}

function formatNumber(value: number): string {
  const digits = String(value);
  return `${digits.slice(0, 2)} ${digits.slice(2)}`;
}

function formatRow(values: number[]): string {
  return values.map(formatNumber).join(', ');
}

function comparison(larger: number, smaller: number) {
  const left = String(larger);
  const right = String(smaller);
  const place = [...left].findIndex((digit, index) => digit !== right[index]);
  const names = ['ten-thousands', 'thousands', 'hundreds', 'tens', 'ones'];
  return {
    text: `Read ${formatNumber(larger)} and ${formatNumber(smaller)} from the left. The first difference is in the ${names[place]} place, where ${left[place]} is greater than ${right[place]}.`,
    equation: `${formatNumber(larger)} > ${formatNumber(smaller)}`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const fixedSet = rng.chance(0.5);
  const first = rng.int(1, 9);
  const digits = rng.shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(digit => digit !== first)).slice(0, 4);
  // A fixed set shares its first two digits. Independent rows share the first digit.
  const pool = rng.shuffle(fixedSet
    ? completeNumbers(10 * first + digits[0], digits.slice(1))
    : completeNumbers(first, digits));
  const givens = pool.slice(0, 3);
  const descending = [...givens].sort((a, b) => b - a);
  const [high, middle, low] = descending;
  const answer = formatRow(descending);
  const wrongOrders = [[0, 2, 1], [1, 0, 2], [2, 1, 0]];
  const distractors = wrongOrders.map((order, row) => {
    const start = 3 * (row + 1);
    const values = fixedSet ? descending : pool.slice(start, start + 3).sort((a, b) => b - a);
    return formatRow(order.map(position => values[position]));
  });
  const shown = givens[0] === high && givens[1] === middle ? [low, high, middle] : givens;
  return {
    key,
    prompt: fixedSet
      ? 'Which row puts these three numbers in order from largest to smallest?'
      : 'Which row gets smaller at each step from left to right?',
    ...(fixedSet ? { display: formatRow(shown) } : {}),
    choices: rng.shuffle([answer, ...distractors]),
    answer,
    hint: 'Start at the left of each number. When two digits differ, the larger digit tells you which number is larger. Check both steps in the row.',
    workedSteps: [comparison(high, middle), comparison(middle, low)],
    explanation: `${formatNumber(high)} > ${formatNumber(middle)} > ${formatNumber(low)}, so the numbers get smaller at both steps.`,
  };
}
