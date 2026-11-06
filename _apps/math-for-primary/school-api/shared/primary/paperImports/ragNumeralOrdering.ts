import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-numeral-ordering',
  level: 2,
  title: 'Put numbers in order',
  objective: 'Compare whole numbers by place value to arrange a list, check a row or complete a strict inequality.',
  skillIds: ['P2.S.WN.04'],
  canonicalPatternId: 'numeral-ordering-and-inequalities',
};

const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

function makeFourNumerals(r: Rng) {
  const hundreds = r.int(2, 8);
  const [h, k] = r.shuffle(digits.filter(d => d > 0 && d !== hundreds));
  const [tens, ones, otherDigit] = r.shuffle(digits);
  const first = 100 * hundreds + 10 * tens + ones;
  const second = 100 * hundreds + (r.chance(0.5) ? 10 * ones + tens : 10 * tens + otherDigit);
  const values = [first, second, 100 * h + r.int(0, 99), 100 * k + r.int(0, 99)];

  const smaller = Math.min(first, second);
  const larger = Math.max(first, second);
  const sameTens = Math.floor(smaller / 10) === Math.floor(larger / 10);
  const place = sameTens ? 'ones' : 'tens';
  const divisor = sameTens ? 1 : 10;
  const lowDigit = Math.floor(smaller / divisor) % 10;
  const highDigit = Math.floor(larger / divisor) % 10;
  const tieStep = {
    text: `${smaller} and ${larger} have the same ${sameTens ? 'hundreds and tens digits' : 'hundreds digit'}. In the ${place} place, ${lowDigit} is smaller than ${highDigit}.`,
    equation: `${smaller} < ${larger}`,
  };
  return { values, tieStep };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const slot = (((seed + index) % 7) + 7) % 7;

  if (slot === 5) {
    const middle = r.int(410, 865);
    const lower = middle - r.int(30, 120);
    const upper = middle + r.int(1, 85);
    const belowLower = r.int(101, lower - 1);
    const between = middle - r.int(1, 20);
    const small = r.int(11, 98);
    const candidates = r.shuffle([small, belowLower, between, upper]);
    const chain = `${lower} < ${middle} < ${upper}`;
    return {
      key,
      prompt: 'Write one of the four numbers in the box to make the whole line true.',
      context: [`Choose from ${candidates.join(', ')}.`],
      display: `${lower} < ${middle} < □`,
      answer: String(upper),
      hint: 'Read from left to right. Each number must be bigger than the one before it.',
      workedSteps: [
        { text: `The first two numbers are already in order. The box must hold a number bigger than ${middle}.`, equation: `${lower} < ${middle}` },
        { text: `${between} is bigger than ${lower}, but it is still too small for the box.`, equation: `${between} < ${middle}` },
        { text: `Only ${upper} is big enough. Check the whole line.`, equation: chain },
      ],
      explanation: `${upper} is the only number in the list greater than ${middle}. This gives ${chain}.`,
    };
  }

  const { values, tieStep } = makeFourNumerals(r);
  if (slot === 6) {
    const [a, b, c, d] = [...values].sort((x, y) => x - y);
    const rows = [[a, b, c, d], [b, a, c, d], [a, c, b, d], [a, b, d, c]];
    const answer = rows[0].join(', ');
    const chain = rows[0].join(' < ');
    return {
      key,
      prompt: 'Which row goes from the smallest number to the largest?',
      choices: r.shuffle(rows.map(row => row.join(', '))),
      answer,
      hint: 'Look at each pair of neighbours. The number on the right must be bigger every time.',
      workedSteps: [
        { text: `A row that starts with ${b} followed by ${a} goes down at its first pair.`, equation: `${b} > ${a}` },
        tieStep,
        { text: 'Check all three pairs in the row you chose. Each pair goes up.', equation: chain },
      ],
      explanation: `In this row every number is smaller than its neighbour on the right: ${chain}.`,
    };
  }

  const descending = [...values].sort((a, b) => b - a);
  const start = r.shuffle(values);
  // Give the pupil a mixed row even when the shuffle lands on a sorted one.
  if (start.every((v, i) => v === descending[i]) || start.every((v, i) => v === descending[3 - i])) {
    [start[0], start[1]] = [start[1], start[0]];
  }
  const chain = descending.join(' > ');
  return {
    key,
    prompt: 'Put all four numbers in order, largest first.',
    order: start.map(String),
    answer: descending.join(','),
    hint: 'Compare the hundreds digits first. If they match, look at the tens and then the ones.',
    workedSteps: [
      { text: 'Look at the hundreds digits. Start with the biggest hundreds digit.', equation: `Largest hundreds digit: ${Math.floor(descending[0] / 100)}` },
      tieStep,
      { text: 'Put the larger number of each pair on the left. Check that you used all four numbers.', equation: chain },
    ],
    explanation: `Reading from the largest to the smallest gives ${chain}.`,
  };
}
