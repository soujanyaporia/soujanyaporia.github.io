import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-numerals-from-digit-clues',
  level: 3,
  title: 'Find the number from its digit clues',
  objective: 'Use clues about digits in different places to find a missing digit or a whole number.',
  skillIds: ['P3.S.WN.01', 'P3.S.AS.01', 'P2.S.WN.06'],
  canonicalPatternId: 'numerals-from-digit-clues',
};

type Clues = Pick<Question, 'prompt' | 'context' | 'answer' | 'choices' | 'hint'>;

function finish(key: string, clues: Clues, steps: NonNullable<Question['workedSteps']>): Question {
  return {
    key, ...clues, workedSteps: steps,
    explanation: steps.map(({ text, equation }) => equation ? `${text} ${equation}.` : text).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const series = `${RAG_PATTERN.id}:${seed}`;
  const key = `${series}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(series) + Math.trunc(index)) % 3 + 3) % 3;

  if (variant === 0) {
    const frontSum = rng.int(10, 17);
    const digit = rng.int(2, 8);
    const backSum = 2 * digit;
    const total = frontSum + backSum;
    const choices = rng.shuffle([digit, 0, digit + 1, backSum <= 9 ? backSum : digit - 1].map(String));
    return finish(key, {
      prompt: 'Which digit is third from the left?',
      context: [
        `The four digits of a number add to ${total}.`,
        `Its thousands and hundreds digits add to ${frontSum}.`,
        'The difference between its tens digit and its ones digit is 0.',
      ],
      answer: String(digit), choices,
      hint: 'Find the total for the last two places. What does a difference of zero tell you?',
    }, [
      { text: 'Take away the sum of the first two digits to find the sum of the last two.', equation: `${total} − ${frontSum} = ${backSum}` },
      { text: 'The last two digits are equal, so each is half of their sum.', equation: `${backSum} ÷ 2 = ${digit}` },
      { text: `The third place from the left is the tens place. Its digit is ${digit}.` },
    ]);
  }

  if (variant === 1) {
    const thousands = rng.pick([1, 2, 3, 4, 6, 7, 8, 9]);
    const gap = rng.int(1, 4);
    const tens = rng.int(gap, 9);
    const hundreds = tens - gap;
    const sum = thousands + tens;
    const answer = `${thousands}${hundreds}${tens}9`;
    return finish(key, {
      prompt: 'Write the four-digit number.',
      context: [
        `The first digit is ${thousands}.`,
        'The last digit is the largest possible digit.',
        `Adding the thousands digit and the tens digit gives ${sum}.`,
        `The hundreds digit is ${gap} less than the tens digit.`,
      ],
      answer,
      hint: 'Fill in the two end places first. Which digit must you add to the first digit to reach the given sum?',
    }, [
      { text: 'The digits run from 0 to 9, so put 9 in the ones place.' },
      { text: 'Take the thousands digit away from the sum to find the tens digit.', equation: `${sum} − ${thousands} = ${tens}` },
      { text: 'Use the tens digit to find the hundreds digit.', equation: `${tens} − ${gap} = ${hundreds}` },
      { text: `Read the digits from left to right: ${thousands}, ${hundreds}, ${tens}, 9. The number is ${answer}.` },
    ]);
  }

  const tens = rng.pick([3, 5, 6]);
  const gap = rng.int(1, 2);
  const oddEndings = [1, 3, 5, 7, 9].filter(digit => digit > tens);
  const ones = rng.pick(oddEndings);
  const hundreds = ones - gap;
  const numberWith = (middle: number, last: number) => 100 * (last - gap) + 10 * middle + last;
  const answer = numberWith(tens, ones);
  const wrongHundreds = answer + 100;
  const evenEnding = rng.pick([4, 6, 8].filter(digit => digit > tens));
  const lowEnding = rng.pick([3, 5].filter(digit => digit <= tens));
  const otherChoices = rng.shuffle([
    numberWith(tens, evenEnding), numberWith(tens, lowEnding), numberWith(tens - 1, ones),
  ]).slice(0, 2);
  const choices = rng.shuffle([answer, wrongHundreds, ...otherChoices].map(String));
  return finish(key, {
    prompt: 'Which of these numbers fits every clue?',
    context: [
      'Look for a three-digit odd number.',
      `It has ${tens} in the tens place.`,
      'Its ones digit is larger than its tens digit.',
      `Subtract ${gap} from its ones digit to get its hundreds digit.`,
    ],
    answer: String(answer), choices,
    hint: 'Check the middle and last digits of each choice. Then check its first digit.',
  }, [
    { text: `With ${tens} in the middle, the last digit must be odd and greater than ${tens}. The possible endings are ${oddEndings.join(', ')}.` },
    { text: `Two choices pass those checks: ${answer} and ${wrongHundreds}. Both end in ${ones}.` },
    { text: 'Work out what their first digit must be.', equation: `${ones} − ${gap} = ${hundreds}` },
    { text: `Only ${answer} has ${hundreds} in the hundreds place and fits every clue.` },
  ]);
}
