import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-read-and-compare-digit-positions',
  level: 5,
  title: 'Read and compare digit positions',
  objective: 'Name digit positions, select numbers matching place clues, and compare digit values.',
  skillIds: ['P5.S.WN.01'],
  canonicalPatternId: 'read-and-compare-digit-positions',
};

const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions'] as const;
const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const LEADING = [5, 6, 7, 8, 9];
const POSITIONS = [0, 1, 2, 3, 4, 5, 6];
const format = (value: string | number): string => String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const digitAt = (number: string, position: number): number => Number(number[6 - position]);
const replaceDigit = (number: string, position: number, digit: number): string => {
  const digits = number.split('');
  digits[6 - position] = String(digit);
  return digits.join('');
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((seed >>> 0) + (index >>> 0)) % 4;
  const make = (
    prompt: string,
    answer: string,
    hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    extra: Partial<Question> = {},
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    answer,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => step.text + (step.equation ? ` ${step.equation}.` : '')).join(' '),
    ...extra,
  });
  const randomNumber = (): string => [r.pick(LEADING), ...Array.from({length: 6}, () => r.pick(DIGITS))].join('');
  const uniqueDigitNumber = (digit: number, position: number): string => {
    const leading = r.pick(LEADING.filter(value => value !== digit));
    const others = DIGITS.filter(value => value !== digit);
    const number = [leading, ...Array.from({length: 6}, () => r.pick(others))].join('');
    return replaceDigit(number, position, digit);
  };

  if (variant === 0) {
    const position = r.pick(POSITIONS);
    const digit = r.pick(position === 6 ? LEADING : DIGITS.slice(1));
    const number = uniqueDigitNumber(digit, position);
    const answer = PLACES[position]!;
    const wrong = r.shuffle(PLACES.filter(place => place !== answer)).slice(0, 3);
    const trace = POSITIONS.map(p => `${PLACES[p]}: ${digitAt(number, p)}`).join('; ');
    return make(
      `Which place does the digit ${digit} occupy in this number?`,
      answer,
      'Start with the ones place on the right. Move left through tens, hundreds and the larger places.',
      [
        {text: `Read the places from the right: ${trace}.`},
        {text: `The digit ${digit} is in the ${answer} place.`},
      ],
      {display: format(number), choices: r.shuffle([answer, ...wrong])},
    );
  }

  if (variant === 1 || variant === 2) {
    const correct = randomNumber();
    const selected = r.shuffle(POSITIONS);
    const first = selected[0]!;
    const second = selected[1]!;
    const firstDigit = digitAt(correct, first);
    const secondDigit = digitAt(correct, second);
    const alternatives = (position: number, digit: number): number[] =>
      r.shuffle((position === 6 ? LEADING : DIGITS).filter(value => value !== digit));
    let candidates: string[];
    let prompt: string;
    let hint: string;
    let checks: number[];
    if (variant === 1) {
      candidates = [correct, ...alternatives(first, firstDigit).slice(0, 3).map(digit => replaceDigit(correct, first, digit))];
      prompt = `Which number has ${firstDigit} in the ${PLACES[first]} place?`;
      hint = 'Find the named place in each option, then read the digit in that place.';
      checks = [first];
    } else {
      const wrongFirst = alternatives(first, firstDigit)[0]!;
      const wrongSecond = alternatives(second, secondDigit)[0]!;
      candidates = [
        correct,
        replaceDigit(correct, first, wrongFirst),
        replaceDigit(correct, second, wrongSecond),
        replaceDigit(replaceDigit(correct, first, wrongFirst), second, wrongSecond),
      ];
      prompt = `Which number has ${firstDigit} in the ${PLACES[first]} place and ${secondDigit} in the ${PLACES[second]} place?`;
      hint = 'Check both named places in each option. The number must match both clues.';
      checks = [first, second];
    }
    const ordered = r.shuffle(candidates);
    const steps: NonNullable<Question['workedSteps']> = ordered.map(number => ({
      text: `In ${format(number)}, ${checks.map(position => `the ${PLACES[position]} digit is ${digitAt(number, position)}`).join(' and ')}.`,
    }));
    steps.push({text: `${format(correct)} matches ${variant === 1 ? 'the clue' : 'both clues'}.`});
    return make(prompt, format(correct), hint, steps, {choices: ordered.map(format)});
  }

  const positions = r.shuffle(POSITIONS);
  const first = positions[0]!;
  const second = positions[1]!;
  const digit = r.pick(first === 6 || second === 6 ? LEADING : DIGITS.slice(1));
  const a = uniqueDigitNumber(digit, first);
  const b = uniqueDigitNumber(digit, second);
  const valueA = digit * 10 ** first;
  const valueB = digit * 10 ** second;
  const larger = Math.max(valueA, valueB);
  const smaller = Math.min(valueA, valueB);
  const difference = larger - smaller;
  return make(
    `How far apart are the values of the digit ${digit} in these two numbers?`,
    String(difference),
    'Find the value of the named digit in each number. Subtract the smaller value from the larger value.',
    [
      {text: `In Number A, ${digit} is in the ${PLACES[first]} place.`, equation: `${digit} × ${format(10 ** first)} = ${format(valueA)}`},
      {text: `In Number B, ${digit} is in the ${PLACES[second]} place.`, equation: `${digit} × ${format(10 ** second)} = ${format(valueB)}`},
      {text: 'Subtract the smaller digit value from the larger digit value.', equation: `${format(larger)} − ${format(smaller)} = ${format(difference)}`},
    ],
    {context: [`Number A: ${format(a)}.`, `Number B: ${format(b)}.`]},
  );
}
