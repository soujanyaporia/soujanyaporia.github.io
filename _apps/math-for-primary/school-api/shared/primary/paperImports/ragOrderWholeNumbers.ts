import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-order-whole-numbers',
  level: 5,
  title: 'Order four whole numbers',
  objective: 'Compare whole numbers by place value and arrange them in either direction.',
  skillIds: ['P5.S.WN.01', 'P4.S.WN.01'],
  canonicalPatternId: 'p5-order-whole-numbers',
} as const;

const PLACE_NAMES = [
  'ones', 'tens', 'hundreds', 'thousands',
  'ten thousands', 'hundred thousands', 'millions',
];

function label(value: number): string {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const descending = r.int(0, 3) !== 0;
  const width = r.pick([5, 6, 7]);
  const template = Array.from({length: width}, (_, i) => r.int(i === 0 ? 1 : 0, 9));
  const groupPlace = r.int(1, width - 3);
  const closePlace = r.int(groupPlace + 1, width - 2);
  const groupLow = r.int(0, 8);
  const groupHigh = r.int(groupLow + 1, 9);
  const closeLow = r.int(0, 8);
  const closeHigh = r.int(closeLow + 1, 9);

  const build = (groupDigit: number, first: number, second: number): number => {
    const digits = [...template];
    digits[groupPlace] = groupDigit;
    digits[closePlace] = first;
    digits[closePlace + 1] = second;
    return Number(digits.join(''));
  };
  const values = [groupLow, groupHigh].flatMap(groupDigit => [
    build(groupDigit, closeLow, closeHigh),
    build(groupDigit, closeHigh, closeLow),
  ]);
  const ascending = [...values].sort((a, b) => a - b);
  const ordered = descending ? [...ascending].reverse() : [...ascending];
  const given = r.shuffle([...values]);
  const alreadyAscending = given.every((value, i) => value === ascending[i]);
  const alreadyDescending = given.every((value, i) => value === ascending[3 - i]);
  if (alreadyAscending || alreadyDescending) {
    given.push(given.shift()!);
  }

  const direction = descending ? 'greatest to smallest' : 'smallest to greatest';
  const symbol = descending ? '>' : '<';
  const relation = descending ? 'greater' : 'smaller';
  const sequence = ordered.map(label).join(` ${symbol} `);
  const workedSteps: NonNullable<Question['workedSteps']> = ordered.slice(0, -1).map((value, i) => {
    const next = ordered[i + 1];
    const left = String(value);
    const right = String(next);
    const differentAt = [...left].findIndex((digit, place) => digit !== right[place]);
    const placeName = PLACE_NAMES[left.length - differentAt - 1];
    return {
      text: `The digits to the left of the ${placeName} place match. In that place, ${left[differentAt]} is ${relation} than ${right[differentAt]}.`,
      equation: `${label(value)} ${symbol} ${label(next)}`,
    };
  });
  workedSteps.push({
    text: `Use these comparisons to put all four numbers in order from ${direction}.`,
    equation: sequence,
  });

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: `Put the four numbers in ${descending ? 'descending' : 'ascending'} order, from ${direction}.`,
    order: given.map(label),
    answer: ordered.map(label).join(','),
    hint: 'Start with the leftmost digit. When the digits match, move one place to the right until they differ.',
    explanation: `${sequence}. The first unequal digit from the left decides which of two numbers is greater.`,
    workedSteps,
  };
}
