import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-digit-place-value-lookup',
  level: 3,
  title: 'Find what a digit is worth',
  objective: 'Locate a digit in a four-digit number, compare its value across numbers and find its value after addition.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01'],
  canonicalPatternId: 'digit-place-and-value-lookup',
} as const;

const places = ['ones', 'tens', 'hundreds', 'thousands'] as const;
const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
type Steps = NonNullable<Question['workedSteps']>;

function numberWithDigit(r: Rng, digit: number, place: number, leading?: number): number {
  const others = digits.filter(n => n !== digit);
  const columns = Array.from({ length: 4 }, () => r.pick(others));
  columns[3] = leading ?? r.pick(others.filter(n => n > 0));
  columns[place] = digit;
  return columns.reduce((total, n, p) => total + n * 10 ** p, 0);
}

function digitAt(n: number, place: number): number {
  return Math.floor(n / 10 ** place) % 10;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const start = hashString(`${RAG_PATTERN.id}:${seed}`) >>> 0;
  const variant = (((start % 4 + index) % 4) + 4) % 4;
  function question(prompt: string, answer: string, choices: string[], hint: string, workedSteps: Steps): Question {
    return {
      key, prompt, answer, choices, hint, workedSteps,
      explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 3) {
    // Build a sum with distinct digits, then split it into two four-digit addends.
    const head = r.int(4, 9);
    const tail = r.shuffle(digits.filter(n => n !== head && n < 9)).slice(0, 3);
    const sumDigits = [head, ...tail];
    const total = Number(sumDigits.join(''));
    const digit = r.pick(sumDigits.filter(n => n > 0));
    const place = 3 - sumDigits.indexOf(digit);
    // A larger ones digit in the first addend forces regrouping in the addition.
    const first = 10 * r.int(120, 199) + r.int(total % 10 + 1, 9);
    const second = total - first;
    const value = digit * 10 ** place;
    return question(
      `Add ${first} and ${second}. What is the digit ${digit} worth in the total?`,
      String(value), r.shuffle(places.map((_, p) => String(digit * 10 ** p))),
      'Work out the total first. Then count places from the right to find the digit.',
      [
        { text: 'Add the two numbers.', equation: `${first} + ${second} = ${total}` },
        { text: `In ${total}, the digit ${digit} is in the ${places[place]} place.`, equation: `${digit} × ${10 ** place} = ${value}` },
      ],
    );
  }

  const digit = r.int(2, 8);
  const place = r.int(0, 3);
  if (variant === 1) {
    const n = numberWithDigit(r, digit, place);
    const columns = places.map((name, p) => `${name} digit = ${digitAt(n, p)}`);
    return question(
      `In ${n}, which place holds the digit ${digit}?`, places[place], r.shuffle([...places]),
      'Start at the right with ones, then count tens, hundreds and thousands.',
      [
        { text: 'Read the digits from right to left.', equation: columns.join(', ') },
        { text: `The digit ${digit} is in the ${places[place]} place.` },
      ],
    );
  }

  // Each numeral has the target in a different place. One distractor exceeds
  // the numeral with the target in the thousands place.
  const numbers = places.map((_, p) => numberWithDigit(r, digit, p, p === 0 ? r.int(digit + 1, 9) : undefined));
  const order = r.shuffle([0, 1, 2, 3]);
  const choices = order.map(p => String(numbers[p]));
  if (variant === 0) {
    const readings = order.map(p => `In ${numbers[p]}, ${digit} is worth ${digit * 10 ** p}.`);
    return question(
      `In which number is the digit ${digit} worth the most?`, String(numbers[3]), choices,
      'Find the digit in each number. Its value grows as it moves to the left.',
      [
        { text: 'Compare the value of the digit in each choice.', equation: readings.join(' ') },
        { text: `The greatest value is ${digit * 1000}. Choose ${numbers[3]}, where ${digit} is in the thousands place.` },
      ],
    );
  }

  const readings = order.map(p => `${numbers[p]} → ${digitAt(numbers[p], place)}`);
  return question(
    `Which number has ${digit} as its ${places[place]} digit?`, String(numbers[place]), choices,
    'Count from the right to find the named place. Check that place in each number.',
    [
      { text: `Read the ${places[place]} digit of each number.`, equation: readings.join(', ') },
      { text: `Only ${numbers[place]} has ${digit} in the ${places[place]} place.` },
    ],
  );
}
