import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-ordering-and-list-extremes',
  level: 3,
  title: 'Compare four numbers',
  objective: 'Use place value to order four numbers from largest to smallest or to find the sum or difference of the two extremes.',
  skillIds: ['P3.S.WN.03', 'P3.S.AS.01'],
  canonicalPatternId: 'ordering-and-list-extremes',
};

function increasingDigits(r: Rng): [number, number] {
  const smaller = r.int(0, 8);
  return [smaller, r.int(smaller + 1, 9)];
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const task = r.pick(['descending', 'sum', 'difference'] as const);
  const thousands = r.int(1, task === 'sum' ? 4 : 9);
  const [lowHundreds, highHundreds] = increasingDigits(r);
  const [lowOne, highOne] = increasingDigits(r);
  const [lowTen, highTen] = increasingDigits(r);

  // The lower pair differs only in the ones. The upper pair differs only in the tens.
  const lowerPrefix = thousands * 1000 + lowHundreds * 100 + r.int(0, 9) * 10;
  const upperBase = thousands * 1000 + highHundreds * 100 + r.int(0, 9);
  const smallest = lowerPrefix + lowOne;
  const largest = upperBase + highTen * 10;
  const descending = [largest, upperBase + lowTen * 10, lowerPrefix + highOne, smallest];
  const listed = r.shuffle([...descending]);
  if (listed.join() === descending.join() || listed.join() === [...descending].reverse().join()) {
    [listed[1], listed[2]] = [listed[2], listed[1]];
  }

  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `All four numbers have ${thousands} in the thousands place. The two with ${highHundreds} in the hundreds place are larger than the two with ${lowHundreds} there.` },
    { text: 'Compare the tens in the larger pair. In the smaller pair the tens match, so compare the ones.', equation: descending.join(' > ') },
  ];
  let response: Pick<Question, 'prompt' | 'order' | 'display' | 'answer' | 'proof'>;
  if (task === 'descending') {
    response = {
      prompt: 'Put all four numbers in order from largest to smallest.',
      order: listed.map(String),
      answer: descending.join(','),
    };
  } else {
    const add = task === 'sum';
    const result = add ? largest + smallest : largest - smallest;
    workedSteps.push({
      text: add ? 'Add the first and last numbers in that order.' : 'Subtract the last number in that order from the first.',
      equation: `${largest} ${add ? '+' : '−'} ${smallest} = ${result}`,
    });
    response = {
      prompt: add ? 'Add the largest and smallest numbers. What total do you get?' : 'How much greater is the largest number than the smallest?',
      display: listed.join(', '),
      answer: String(result),
      proof: { op: add ? '+' : '-', a: largest, b: smallest },
    };
  }
  return {
    key,
    ...response,
    hint: 'Read the digits from left to right. When two digits match, compare the next place.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
