import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-words-to-numerals',
  level: 5,
  title: 'Write number names in digits',
  objective: 'Read number names and write numerals, keeping zeros in empty places.',
  skillIds: ['P5.S.WN.01'],
  canonicalPatternId: 'words-and-numerals',
};

const small = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
  'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const grouped = (n: number): string => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

function groupWords(n: number): string {
  if (n < 20) return small[n];
  if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? `-${small[n % 10]}` : '');
  return `${small[Math.floor(n / 100)]} hundred` + (n % 100 ? ` and ${groupWords(n % 100)}` : '');
}

function numberName(millions: number, thousands: number, ones: number): string {
  let name = `${groupWords(millions)} million`;
  if (thousands) name += `, ${groupWords(thousands)} thousand`;
  if (ones) name += `${ones < 100 ? ' and ' : ', '}${groupWords(ones)}`;
  return name;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const millions = r.pick([2, 3, 4, 7, 8]);
  const profile = r.int(0, 3);
  let thousands: number;
  let ones: number;

  switch (profile) {
    case 0:
      thousands = r.int(1, 9) * 10;
      ones = r.int(1, 9) * 100 + r.int(1, 9) * 10 + r.int(1, 9);
      break;
    case 1:
      thousands = r.int(1, 9) * 100 + r.int(1, 9);
      ones = r.int(1, 9) * 10;
      break;
    case 2:
      thousands = r.int(1, 9) * 10 + r.int(1, 9);
      ones = r.int(1, 9);
      break;
    default:
      if (r.int(0, 1) === 0) {
        thousands = 0;
        ones = r.int(1, 9);
      } else {
        thousands = r.int(1, 9) * 100;
        ones = 0;
      }
  }

  const value = millions * 1000000 + thousands * 1000 + ones;
  const digits = String(value);
  const name = numberName(millions, thousands, ones);
  const multipleChoice = r.int(0, 2) === 0;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Read the millions group, the thousands group and the last group. A group that is not named has value zero.',
      equation: `Millions: ${millions}; thousands: ${thousands}; last group: ${ones}`,
    },
    {
      text: 'Write three digits in each group after the millions. Use zeros for empty places.',
      equation: `${millions} | ${String(thousands).padStart(3, '0')} | ${String(ones).padStart(3, '0')}`,
    },
    {
      text: 'Combine the values to write the complete numeral.',
      equation: `${grouped(millions * 1000000)} + ${grouped(thousands * 1000)} + ${ones} = ${grouped(value)}`,
    },
  ];

  const question: Question = {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt: multipleChoice
      ? 'Which numeral matches the number name below?'
      : 'Use digits to write the number named below. Do not put spaces between the digits.',
    display: name,
    answer: multipleChoice ? grouped(value) : digits,
    hint: 'Separate the millions, thousands and last group. Keep three places in each group after the millions.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {
      op: '+',
      a: {op: '+', a: {op: '*', a: millions, b: 1000000}, b: {op: '*', a: thousands, b: 1000}},
      b: ones,
    },
  };

  if (multipleChoice) {
    const withoutZero = digits.replace('0', '');
    const distractors = [...new Set([
      Number(withoutZero),
      millions * 1000000 + ones * 1000 + thousands,
      Number(withoutZero + '0'),
      millions * 1000000 + thousands * 100 + ones,
    ])].filter(n => n !== value && Number.isSafeInteger(n) && n > 0 && n <= 10000000).slice(0, 3);
    if (distractors.length !== 3) throw new Error('Expected three distinct place-value distractors');
    question.choices = r.shuffle([value, ...distractors].map(grouped));
  }

  return question;
}
