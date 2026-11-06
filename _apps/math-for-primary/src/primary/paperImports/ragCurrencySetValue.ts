import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-currency-set-selection',
  level: 2,
  title: 'Compare sets of coins and notes',
  objective: 'Count each set in the same unit to match a price or find the most or least money.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MONEY.02', 'P2.S.MONEY.03'],
  canonicalPatternId: 'p2-value-of-a-currency-set',
};

type Mode = 'target' | 'most' | 'least' | 'tags';
type Steps = NonNullable<Question['workedSteps']>;
const modes: Mode[] = ['target', 'most', 'least', 'tags'];
const total = (pieces: number[]) => pieces.reduce((sum, piece) => sum + piece, 0);
const dollars = (cents: number) => '$' + (cents / 100).toFixed(2);
const face = (cents: number) => cents >= 100 ? '$' + cents / 100 : cents + '¢';

// Split coins into smaller denominations to vary the picture without changing its value.
function coins(r: Rng, cents: number, limit = 6): number[] {
  const pieces: number[] = [];
  for (const value of [100, 50, 20, 10, 5]) {
    while (cents >= value) {
      pieces.push(value);
      cents -= value;
    }
  }
  const splits: Record<number, number[]> = { 100: [50, 50], 50: [20, 20, 10], 20: [10, 10], 10: [5, 5] };
  const rounds = r.int(1, 3);
  for (let i = 0; i < rounds; i++) {
    const possible = pieces.filter(p => splits[p] && pieces.length - 1 + splits[p].length <= limit);
    if (!possible.length) break;
    const value = r.pick(possible);
    pieces.splice(pieces.indexOf(value), 1, ...splits[value]);
  }
  return pieces;
}

function targetPurses(r: Rng) {
  const target = r.pick([35, 40, 45, 60, 65, 70, 75, 80]);
  // A whole-dollar distractor has the same digits as the target in cents.
  const notes: number[] = [];
  let remainingDollars = target;
  for (const note of [50, 10, 5]) {
    while (remainingDollars >= note) {
      notes.push(note * 100);
      remainingDollars -= note;
    }
  }
  return { target, purses: [
    coins(r, target), coins(r, target - r.pick([5, 10])),
    coins(r, target + r.pick([5, 10])), notes,
  ] };
}

function mostPurses(r: Rng): number[][] {
  // The two mixed purses start one and two dollars below the notes-only purse.
  const [whole, near, far] = r.pick([
    [[200, 200, 200], [500], [200, 200]],
    [[500, 200], [200, 200, 200], [500]],
    [[200, 200, 200, 200], [500, 200], [200, 200, 200]],
    [[500, 200, 200], [200, 200, 200, 200], [500, 200]],
  ]);
  const [a, b] = r.shuffle([60, 75, 85, 95, 105, 115, 125, 140]);
  return [whole, [...near, ...coins(r, a, 8 - near.length)], [...far, ...coins(r, 100 + b, 8 - far.length)]];
}

function tagQuestion(r: Rng, key: string): Question {
  const small = r.pick([125, 135, 145, 155, 165, 175, 185, 195]);
  const whole = r.pick([200, 300]);
  const tags = r.shuffle([
    { label: 'Bookmark', cents: small, value: small + '¢' },
    { label: 'Notebook', cents: whole, value: '$' + whole / 100 },
  ]);
  const sums = r.shuffle([small, whole, small + 10, whole - 10]).map((amount, i) => {
    const first = 10 * r.int(3, Math.floor((amount - 20) / 10));
    const expression = first + '¢ + ' + (amount - first) + '¢';
    return { number: i + 1, amount, expression };
  });
  const matches = tags.map(tag => sums.find(card => card.amount === tag.cents)!.number);
  const explanation = tags.map((tag, i) => tag.label + ' matches card ' + matches[i]).join('. ') + '.';
  const workedSteps: Steps = [
    { text: 'Write the notebook price in cents.', equation: '$' + whole / 100 + ' = ' + whole + '¢' },
    ...sums.map(card => ({ text: 'Add the amounts on card ' + card.number + '.', equation: card.expression + ' = ' + card.amount + '¢' })),
    { text: explanation },
  ];
  return {
    key, prompt: 'Which sum card goes with each price tag? Write one card number for each item.',
    context: sums.map(card => 'Card ' + card.number + ': ' + card.expression),
    picture: { type: 'paper', layout: 'cards', heading: 'Price tags',
      cards: tags.map(tag => ({ label: tag.label, value: tag.value })) },
    structuredResponse: { kind: 'number-fields', fields: tags.map(tag => ({ label: tag.label })) },
    answer: JSON.stringify(matches.map(String)),
    hint: 'One dollar is 100 cents. Add the two amounts on a card and look for a tag with that price.',
    explanation, workedSteps,
  };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = [RAG_PATTERN.id, seed, index].join(':');
  const r = new Rng(hashString(key));
  const mode = modes[(hashString(String(seed)) + (index >>> 0)) % modes.length];
  if (mode === 'tags') return tagQuestion(r, key);

  let purses: number[][];
  let wanted: number;
  let prompt: string;
  const steps: Steps = [];
  if (mode === 'target') {
    const payment = targetPurses(r);
    purses = payment.purses;
    wanted = payment.target;
    prompt = 'Which purse holds exactly ' + dollars(wanted) + '?';
    steps.push({ text: 'Read the price in cents.', equation: dollars(wanted) + ' = ' + wanted + '¢' });
  } else if (mode === 'most') {
    purses = mostPurses(r);
    wanted = Math.max(...purses.map(total));
    prompt = 'Which purse holds the most money?';
  } else {
    const centre = 5 * r.int(26, 35);
    purses = r.shuffle([-20, -10, -5, 5, 10, 20]).slice(0, 4).map(offset => coins(r, centre + offset));
    wanted = Math.min(...purses.map(total));
    prompt = 'Which purse holds the least money?';
  }

  const rows = r.shuffle(purses).map((purse, i) => ({
    label: 'Purse ' + 'ABCD'[i], pieces: r.shuffle(purse), cents: total(purse),
  }));
  const winner = rows.find(row => row.cents === wanted)!;
  for (const row of rows) {
    const inDollars = row.pieces.every(value => value >= 100);
    const terms = row.pieces.map(value => inDollars ? face(value) : value + '¢');
    const result = inDollars ? dollars(row.cents) : row.cents + '¢ = ' + dollars(row.cents);
    steps.push({ text: 'Count the money in ' + row.label + (inDollars ? ' in dollars.' : ' in cents.'),
      equation: terms.join(' + ') + ' = ' + result });
  }
  const sorted = [...rows].sort((a, b) => a.cents - b.cents);
  const explanation = mode === 'target'
    ? winner.label + ' holds exactly ' + dollars(wanted) + '.'
    : winner.label + ' holds ' + dollars(wanted) + ', the ' + mode + ' money.';
  steps.push({ text: explanation, equation: mode === 'target' ? dollars(wanted) + ' = ' + wanted + '¢'
    : sorted.map(row => dollars(row.cents)).join(' < ') });
  return {
    key, prompt, context: ['Each amount in a purse stands for one coin or one note.'],
    picture: { type: 'paper', layout: 'cards', heading: 'Money in the purses',
      cards: rows.map(row => ({ label: row.label, value: row.pieces.map(face).join(', ') })) },
    choices: rows.map(row => row.label), answer: winner.label,
    hint: 'A dollar is 100 cents. Count the money in each purse before you choose.',
    explanation: rows.map(row => row.label + ' holds ' + dollars(row.cents) + '.').join(' ') + ' ' + explanation,
    workedSteps: steps,
  };
}
