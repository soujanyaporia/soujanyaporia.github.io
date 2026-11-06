import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-extreme-digit-arrangements',
  level: 5,
  title: 'Arrange digits with odd and even rules',
  objective: 'Use place value and the last digit to find extreme arrangements, and compare distances in a linked closest-number task.',
  skillIds: ['P5.S.WN.01', 'P2.S.WN.06', 'P4.S.WN.01', 'P3.S.AS.01'],
  canonicalPatternId: 'extreme-digit-arrangements',
};

const variants = [
  {extreme: 'smallest', parity: 'odd'},
  {extreme: 'greatest', parity: 'odd'},
  {extreme: 'greatest', parity: 'even'},
  {extreme: 'smallest', parity: 'even'},
] as const;

const format = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const numberFrom = (digits: number[]): number => Number(digits.join(''));

function bestWithLast(digits: number[], last: number, smallest: boolean): number {
  const prefix = digits.filter(d => d !== last).sort((a, b) => smallest ? a - b : b - a);
  if (prefix[0] === 0) {
    const firstNonzero = prefix.findIndex(d => d !== 0);
    const leading = prefix[firstNonzero]!;
    prefix.splice(firstNonzero, 1);
    prefix.unshift(leading);
  }
  return numberFrom([...prefix, last]);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const slot = (seed >>> 0) + (index >>> 0);
  const variant = variants[slot % variants.length]!;
  const width = [4, 6, 7][Math.floor(slot / variants.length) % 3]!;
  const smallest = variant.extreme === 'smallest';
  const requiredRemainder = variant.parity === 'odd' ? 1 : 0;

  // Two odd and two even digits guarantee several possible last digits.
  // The fixed pair also keeps every generated set different from the reference sets.
  const initial = [2, 7, r.pick([1, 3, 5, 9]), r.pick([0, 4, 6, 8])];
  const remaining = r.shuffle(Array.from({length: 10}, (_, d) => d).filter(d => !initial.includes(d)));
  const digits = r.shuffle([...initial, ...remaining.slice(0, width - initial.length)]);
  const endings = digits.filter(d => d % 2 === requiredRemainder).sort((a, b) => a - b);
  const candidates = endings.map(last => ({last, value: bestWithLast(digits, last, smallest)}));
  const extreme = candidates.reduce((best, candidate) =>
    smallest ? Math.min(best, candidate.value) : Math.max(best, candidate.value),
    candidates[0]!.value,
  );
  const linked = width === 4 && variant.extreme === 'greatest' && variant.parity === 'odd';
  const part = linked ? '(a) ' : '';
  const steps: NonNullable<Question['workedSteps']> = [
    {text: `${part}The last digit decides whether a number is odd or even. The possible last digits for this ${variant.parity} number are ${endings.join(', ')}.`},
    {text: smallest
      ? 'For each possible last digit, put the smallest remaining non-zero digit first. Put the other remaining digits in increasing order before the last digit.'
      : 'For each possible last digit, put all the remaining digits in decreasing order before it.'},
    ...candidates.map(candidate => ({
      text: `With ${candidate.last} last, the ${variant.extreme} arrangement is ${format(candidate.value)}.`,
    })),
    {text: `${part}Comparing these arrangements, ${format(extreme)} is the ${variant.extreme} ${variant.parity} number.`},
  ];

  const q: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `Digit cards: ${digits.join(', ')}.`,
      'Use every digit exactly once in each answer. Do not begin a number with 0.',
    ],
    prompt: `What is the ${variant.extreme} ${width}-digit ${variant.parity} number you can make?`,
    answer: String(extreme),
    hint: 'Try each permitted last digit. For each choice, arrange the other digits to make the number as small or as large as needed.',
    workedSteps: steps,
    explanation: '',
  };

  if (linked) {
    // Every permutation has the same remainder modulo 9. A different remainder
    // for the target rules out two arrangements equally far from that target.
    const digitSumRemainder = digits.reduce((sum, d) => sum + d, 0) % 9;
    const thousands = r.pick([3, 4, 5, 7].filter(k => k !== digitSumRemainder));
    const target = thousands * 1000;
    // The supplied 2 and 7 ensure valid arrangements on both sides of the target.
    const below = Math.max(...digits.filter(d => d > 0 && d < thousands).map(first =>
      numberFrom([first, ...digits.filter(d => d !== first).sort((a, b) => b - a)]),
    ));
    const above = Math.min(...digits.filter(d => d >= thousands).map(first =>
      numberFrom([first, ...digits.filter(d => d !== first).sort((a, b) => a - b)]),
    ));
    const belowGap = target - below;
    const aboveGap = above - target;
    const closest = belowGap < aboveGap ? below : above;

    q.prompt = `(a) What is the greatest 4-digit odd number you can make? (b) Using the same digits again, which 4-digit number is closest to ${format(target)}? The number in (b) may be odd or even.`;
    q.answer = JSON.stringify([String(extreme), String(closest)]);
    q.structuredResponse = {
      kind: 'number-pair',
      firstLabel: '(a) Greatest odd number',
      secondLabel: `(b) Number closest to ${format(target)}`,
    };
    q.hint += ' For (b), compare the nearest arrangement below the target with the nearest one above it. There is no odd or even rule for (b).';
    steps.push(
      {text: '(b) Use all the digits again. This time the last digit does not have to be odd.'},
      {text: `Below ${format(target)}, choose the largest available thousands digit smaller than ${thousands}, then put the other digits in decreasing order. This gives ${format(below)}.`},
      {text: `Above ${format(target)}, choose the smallest available thousands digit at least ${thousands}, then put the other digits in increasing order. This gives ${format(above)}.`},
      {text: 'Find the distance from the lower number to the target.', equation: `${format(target)} − ${format(below)} = ${format(belowGap)}`},
      {text: 'Find the distance from the target to the higher number.', equation: `${format(above)} − ${format(target)} = ${format(aboveGap)}`},
      {text: `The smaller distance is ${format(Math.min(belowGap, aboveGap))}, so the closest number is ${format(closest)}.`},
    );
  }

  q.explanation = steps.map(step => step.equation ? `${step.text} ${step.equation}.` : step.text).join(' ');
  return q;
}
