import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-numerals-and-number-names',
  level: 3,
  title: 'Reading and writing four-digit numbers',
  objective: 'Write a named number in digits, or compare four numbers and write the greatest in words.',
  skillIds: ['P3.S.WN.01', 'P3.S.WN.02', 'P3.S.WN.03'],
  canonicalPatternId: 'numerals-and-number-names',
};

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function fourDigitName(value: number): string {
  let name = `${small[Math.floor(value / 1000)]} thousand`;
  const hundreds = Math.floor(value / 100) % 10;
  if (hundreds) name += ` ${small[hundreds]} hundred`;
  const tail = value % 100;
  if (tail === 0) return name;
  if (tail < 20) return `${name} and ${small[tail]}`;
  const ones = tail % 10;
  return `${name} and ${tens[Math.floor(tail / 10)]}${ones ? '-' + small[ones] : ''}`;
}

function withWorking(question: Omit<Question, 'workedSteps' | 'explanation'>, steps: NonNullable<Question['workedSteps']>): Question {
  return {
    ...question,
    workedSteps: steps,
    explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + index) % 14;
  const thousands = rng.pick([1, 2, 4, 6, 7, 8, 9]);

  if (slot !== 0) {
    const hundreds = slot % 2 === 0 ? 0 : rng.int(1, 9);
    const ones = rng.int(1, 9);
    const value = thousands * 1000 + hundreds * 100 + ones;
    const parts = [thousands * 1000, hundreds * 100, ones].filter(part => part > 0);
    const zeroStep = hundreds ? 'There are no tens, so write 0 in the tens place.' : 'There are no hundreds or tens, so write 0 in both places.';
    return withWorking({
      key,
      prompt: 'How do you write this number using digits?',
      context: [fourDigitName(value)],
      answer: String(value),
      hint: 'Start at the thousands place. Use a zero for each place the name skips.',
      proof: { op: '+', a: thousands * 1000, b: { op: '+', a: hundreds * 100, b: ones } },
    }, [
      { text: 'Find the value of each part you hear in the name.', equation: parts.join(' + ') },
      { text: zeroStep },
      { text: 'Write the digits in order from thousands to ones.', equation: `${parts.join(' + ')} = ${value}` },
    ]);
  }

  const [a, b, c] = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const endings = [[a, b, c], [a, c, b], [b, c, a], [c, a, b]];
  const listed = rng.shuffle(endings.map(digits => [thousands, ...digits].join('')));
  const sorted = [...listed].sort((left, right) => Number(right) - Number(left));
  const [greatest, next] = sorted;
  const position = greatest[1] === next[1] ? 2 : 1;
  const place = position === 1 ? 'hundreds' : 'tens';
  const name = fourDigitName(Number(greatest));
  return withWorking({
    key,
    prompt: 'Which of these numbers is greatest? Write your answer in words.',
    context: [listed.join(', ')],
    answer: name,
    answerFormat: 'number-words',
    hint: 'Compare digits from left to right. When two digits match, move one place to the right.',
  }, [
    { text: `All four numbers have ${thousands} in the thousands place. Compare the digits that follow.`, equation: sorted.join(' > ') },
    { text: `The two largest numbers first differ in the ${place} place. ${greatest} has ${greatest[position]} there and ${next} has ${next[position]}.`, equation: `${greatest[position]} > ${next[position]}` },
    { text: 'Read the greatest number from left to right.', equation: `${greatest} = ${name}` },
  ]);
}
