import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { Batch11UpperMark, Batch11UpperPicture } from './batch11UpperPicture';

export const RAG_PATTERN = {
  id: 'p1-rag-read-and-total-pictured-money',
  level: 1 as const,
  title: 'Count the money in the picture',
  objective: 'Read the value on each coin or note to match a coin, find a payment or add savings from two days.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-read-and-total-pictured-money',
};

type MoneyRow = { label: string; faces: string[] };
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const dollars = (value: number) => `$${value}`;
const cents = (value: number) => `${value}¢`;

// One outline and one face label per piece. The accessible description follows the same rows.
function moneyPicture(rows: MoneyRow[]): Batch11UpperPicture {
  const marks: Batch11UpperMark[] = [];
  rows.forEach((row, line) => {
    const y = (line + 0.5) * 200 / rows.length;
    marks.push({ kind: 'text', x: 4, y: y + 5, text: row.label });
    row.faces.forEach((face, position) => {
      const x = 102 + 44 * position;
      if (face.endsWith('¢') || face === '$1') {
        marks.push({ kind: 'circle', cx: x, cy: y, r: 18, fill: '#fff1bf' });
      } else {
        marks.push({ kind: 'path', d: `M ${x - 20} ${y - 14} h 40 v 28 h -40 Z`, fill: '#e3f3e9' });
      }
      marks.push({ kind: 'text', x: x - face.length * 4.7, y: y + 5, text: face });
    });
  });
  const label = rows.map(row => `${row.label}: ${row.faces.join(', ')}`).join('. ');
  return { type: 'batch11-upper', label, marks };
}

function matchCoin(key: string, rng: Rng): Question {
  const target = rng.pick([50, 100]);
  // Every row has four coins, so counting pieces alone cannot identify the answer.
  const pool = target === 50 ? [
    [20, 20, 5, 5], [20, 10, 10, 10], [20, 10, 5, 5], [20, 10, 10, 5],
    [20, 20, 10, 5], [20, 20, 10, 10], [20, 20, 20, 5],
  ] : [
    [50, 20, 20, 10], [50, 10, 10, 5], [50, 10, 10, 10],
    [50, 20, 10, 5], [50, 20, 10, 10], [50, 20, 20, 5],
  ];
  const matching = rng.pick(pool.filter(row => sum(row) === target));
  const others = rng.shuffle(pool.filter(row => sum(row) !== target)).slice(0, 3);
  const groups = rng.shuffle([matching, ...others]);
  const choices = ['A', 'B', 'C', 'D'];
  const answer = choices[groups.indexOf(matching)];
  const face = target === 100 ? '$1' : cents(target);
  const rows = groups.map((group, i) => ({ label: choices[i], faces: group.map(cents) }));
  const workedSteps = [
    { text: 'Read the coin at the top.', equation: target === 100 ? '$1 = 100¢' : 'The coin is worth 50¢.' },
    ...groups.map((group, i) => ({ text: `Count row ${choices[i]}.`, equation: `${group.map(cents).join(' + ')} = ${cents(sum(group))}` })),
  ];
  return {
    key, prompt: 'Which row of coins is worth as much as the coin at the top?',
    picture: moneyPicture([{ label: 'Coin', faces: [face] }, ...rows]),
    choices, answer, hint: 'Read the top coin first. Count the cents in one row at a time.',
    workedSteps, explanation: `Row ${answer} makes ${cents(target)}, the value of the top coin.`,
  };
}

function findPayment(key: string, rng: Rng): Question {
  const used = [rng.pick([10, 50]), 10, rng.pick([5, 10]), 5];
  const spare = Array<number>(rng.int(2, 4)).fill(2);
  const wallet = rng.shuffle([...used, ...spare]);
  const paid = sum(used);
  // Replacing even the smallest selected note with a spare costs at least $3.
  const price = paid - rng.int(1, 2);
  const bestWithTwo = [...used.slice(0, 3), 2];
  return {
    key, context: [`A scooter costs $${price}.`, 'Nora pays for it with exactly 4 notes from her wallet.'],
    prompt: 'How many dollars does Nora hand over?', unit: 'dollars', answer: String(paid),
    picture: moneyPicture([
      { label: 'Wallet', faces: wallet.slice(0, 4).map(dollars) },
      { label: 'Wallet', faces: wallet.slice(4).map(dollars) },
    ]),
    hint: 'Try a $2 note with the three biggest notes. Would those four cover the price?',
    workedSteps: [
      { text: `With a $2 note, this is the most Nora could give. It falls short of $${price}.`, equation: `${bestWithTwo.map(dollars).join(' + ')} = $${sum(bestWithTwo)}` },
      { text: 'Count the four notes she must use.', equation: `${used.map(dollars).join(' + ')} = $${paid}` },
    ],
    explanation: `The four larger notes cover the $${price} price. Nora hands over $${paid}.`,
  };
}

function totalSavings(key: string, rng: Rng): Question {
  const repeated = rng.pick([2, 5, 10]);
  const other = rng.pick([2, 5, 10].filter(value => value !== repeated));
  const friday = rng.shuffle([...Array<number>(rng.int(2, 3)).fill(repeated), other]);
  const saturday = rng.shuffle([rng.pick([10, 50]), rng.pick([2, 5, 10]), 1]);
  const days = [{ label: 'Friday', pieces: friday }, { label: 'Saturday', pieces: saturday }];
  const first = sum(friday);
  const second = sum(saturday);
  return {
    key, context: ['Rina puts this money in her savings box.'],
    prompt: 'How many dollars does Rina save over the two days?', unit: 'dollars', answer: String(first + second),
    picture: moneyPicture(days.map(day => ({ label: day.label, faces: day.pieces.map(dollars) }))),
    hint: 'Count the money in each row. Then put the two amounts together.',
    workedSteps: [
      ...days.map(day => ({ text: `Count the money for ${day.label}.`, equation: `${day.pieces.map(dollars).join(' + ')} = $${sum(day.pieces)}` })),
      { text: 'Add the two days of savings.', equation: `$${first} + $${second} = $${first + second}` },
    ],
    explanation: `Rina saves $${first} on Friday and $${second} on Saturday. Her savings come to $${first + second}.`,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variants = [matchCoin, findPayment, totalSavings];
  const slot = (hashString(String(seed)) % 3 + (index % 3) + 3) % 3;
  return variants[slot](key, rng);
}
