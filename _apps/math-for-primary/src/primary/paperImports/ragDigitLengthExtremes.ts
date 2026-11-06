import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-digit-length-extremes',
  level: 3,
  title: 'Make the largest and smallest numbers',
  objective: 'Use place value and the ones digit to build an extreme number, then compare by subtraction when asked.',
  skillIds: ['P3.S.WN.01', 'P3.S.WN.03', 'P2.S.WN.06', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-extremes-of-a-given-length',
};

function withWorking(question: Omit<Question, 'workedSteps' | 'explanation'>, steps: NonNullable<Question['workedSteps']>): Question {
  return {
    ...question,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

// Once the last card is fixed, choose the best remaining digits from left to right.
function arrangeWithEnding(cards: number[], last: number, largest: boolean): number {
  const prefix = cards.filter(digit => digit !== last).sort((a, b) => largest ? b - a : a - b);
  if (prefix[0] === 0) {
    const first = prefix.findIndex(digit => digit > 0);
    [prefix[0], prefix[first]] = [prefix[first], prefix[0]];
  }
  return Number([...prefix, last].join(''));
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['two-numbers', 'card-difference', 'given-difference'] as const);

  if (form === 'two-numbers') {
    const [evenLength, oddLength] = rng.pick([
      [2, 3], [4, 3], [3, 2], [4, 2], [3, 1], [1, 4], [2, 4], [4, 1],
    ] as const);
    const even = '9'.repeat(evenLength - 1) + '8';
    const odd = oddLength === 1 ? '1' : '1' + '0'.repeat(oddLength - 2) + '1';
    return withWorking({
      key,
      prompt: 'Write a number for each part. You may repeat digits.',
      context: [
        `(a) Write an even ${evenLength}-digit number. Make it as large as you can.`,
        `(b) Write an odd ${oddLength}-digit number. Make it as small as you can.`,
      ],
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Even number', secondLabel: '(b) Odd number' },
      answer: JSON.stringify([even, odd]),
      hint: 'The last digit decides whether a number is odd or even. For a number with several digits, the first digit must be at least 1.',
    }, [
      { text: evenLength === 1 ? '(a) There is just one place. The largest even digit is 8.' : '(a) Put 9 in every place before the ones. Finish with 8, the largest even digit.', equation: `Even number = ${even}` },
      { text: oddLength === 1 ? '(b) The first odd number is 1. It already has one digit.' : '(b) Start with 1, the smallest possible first digit. End with 1, the smallest odd digit. Fill any places between them with zeros.', equation: `Odd number = ${odd}` },
    ]);
  }

  if (form === 'card-difference') {
    const firstOdd = rng.pick([1, 5, 9]);
    const otherOdd = rng.pick([1, 3, 5, 7, 9].filter(digit => digit !== firstOdd));
    const cards = rng.shuffle([0, rng.pick([2, 4, 6, 8]), firstOdd, otherOdd]);
    const oddOptions = cards.filter(digit => digit % 2 === 1)
      .map(last => arrangeWithEnding(cards, last, true)).sort((a, b) => b - a);
    const evenOptions = cards.filter(digit => digit % 2 === 0)
      .map(last => arrangeWithEnding(cards, last, false)).sort((a, b) => a - b);
    const largest = oddOptions[0];
    const smallest = evenOptions[0];
    const difference = largest - smallest;
    return withWorking({
      key,
      prompt: 'Make the largest odd number you can. Then make the smallest even number you can. What is the difference between them?',
      context: ['Use all four cards once in each number. You can use the cards again for the second number. The first digit cannot be 0.'],
      picture: { type: 'paper', layout: 'cards', heading: 'Digit cards', cards: cards.map((digit, i) => ({ label: `Card ${i + 1}`, value: String(digit), icon: 'number' })) },
      answer: String(difference),
      hint: 'Try each possible last card. Which arrangement gives the biggest odd number? Which gives the smallest even number?',
      proof: { op: '-', a: largest, b: smallest },
    }, [
      { text: 'Try each odd card at the end. For each ending, put the other cards in decreasing order. Keep the larger result.', equation: oddOptions.join(' > ') },
      { text: 'Try each even card at the end. Start with the smallest remaining digit greater than zero. Put the other two digits in increasing order before the last card. Keep the smaller result.', equation: evenOptions.join(' < ') },
      { text: 'Subtract the smaller number from the larger number.', equation: `${largest} − ${smallest} = ${difference}` },
    ]);
  }

  const length = rng.int(2, 4);
  const minimum = 10 ** (length - 1);
  const given = rng.int(minimum + 2, 10 ** length - 2);
  const difference = given - minimum;
  return withWorking({
    key,
    prompt: `How much larger is Zara’s number than the smallest ${length}-digit number?`,
    context: [`Zara writes ${given}.`],
    choices: rng.shuffle([difference, difference - 1, difference + 1, given - minimum / 10].map(String)),
    answer: String(difference),
    hint: 'Make the smallest number with the required number of digits. Then find the difference.',
    proof: { op: '-', a: given, b: minimum },
  }, [
    { text: `Use 1 in the first place and 0 in each of the remaining places. This gives the smallest number with ${length} digits.`, equation: `Smallest number = ${minimum}` },
    { text: 'Subtract this number from Zara’s number.', equation: `${given} − ${minimum} = ${difference}` },
  ]);
}
