import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-complete-money-sets',
  level: 1,
  title: 'Choose the tray of money',
  objective: 'Count all the money in each tray. Find the tray with an exact total or a total strictly between two amounts.',
  skillIds: ['P1.S.MONEY.01', 'P1.S.MONEY.02', 'P1.S.AS.01', 'P1.S.WN.04'],
  canonicalPatternId: 'match-a-complete-set-to-a-value-condition',
};

type Step = NonNullable<Question['workedSteps']>[number];
type Rule = { target: number } | { low: number; high: number };
type Round = {
  prompt: string;
  context?: string[];
  rule: Rule;
  sets: number[][];
  hint: string;
  firstStep?: Step;
};

// All arithmetic uses integer cents. Only the labels mix dollars and cents.
const centCoins = [50, 20, 10, 5];
const wholeMoney = [1000, 500, 200, 100];
const sum = (pieces: number[]) => pieces.reduce((a, b) => a + b, 0);

function amount(cents: number): string {
  if (cents < 100) return `${cents}¢`;
  const whole = `$${Math.floor(cents / 100)}`;
  return cents % 100 ? `${whole} and ${cents % 100}¢` : whole;
}

// Pick a short, countable set. Visiting denominations in order counts each
// combination once, even when it contains several identical coins.
function piecesFor(r: Rng, total: number, values: number[], limit = 5): number[] {
  const ways: number[][] = [];
  function visit(left: number, first: number, pieces: number[]) {
    if (left === 0) {
      if (pieces.length >= 2) ways.push(pieces);
      return;
    }
    if (pieces.length === limit) return;
    for (let i = first; i < values.length; i++) {
      if (values[i] <= left) visit(left - values[i], i, [...pieces, values[i]]);
    }
  }
  visit(total, 0, []);
  return r.pick(ways);
}

function buildRound(r: Rng): Round {
  const kind = r.pick(['price', 'exchange', 'wallet', 'wallet', 'between', 'received']);
  if (kind === 'between') {
    const low = r.pick([25, 30, 35, 40, 45, 55, 60, 65]);
    const high = low + r.pick([15, 20]);
    const inside = low + 5 * r.int(1, (high - low) / 5 - 1);
    const outside = r.pick([low - 5, high + 5]);
    return {
      prompt: `Choose the row worth more than ${amount(low)} but less than ${amount(high)}.`,
      rule: { low, high },
      sets: [low, inside, high, outside].map(n => piecesFor(r, n, centCoins)),
      hint: 'Add each row. A total equal to either end is outside the range.',
    };
  }

  if (kind === 'exchange') {
    const dollars = r.int(3, 4);
    const tray = (ones: number, change: number) => [
      ...Array<number>(ones).fill(100), ...piecesFor(r, change, centCoins, 4),
    ];
    return {
      prompt: `Which tray of coins can you swap for exactly $${dollars}?`,
      rule: { target: 100 * dollars },
      sets: [tray(dollars - 1, 100), tray(dollars - 1, r.pick([80, 90, 95])),
        tray(dollars - 2, 100), tray(dollars, r.pick([10, 15, 20]))],
      hint: 'Count the cent coins first. Every 100¢ makes one dollar.',
      firstStep: { text: 'Group the cent coins before adding the dollar coins.', equation: '100¢ = $1' },
    };
  }

  const centsOnly = kind === 'price';
  let target: number;
  let prompt: string;
  let context: string[] | undefined;
  let firstStep: Step | undefined;
  let hint = 'Count every piece in one tray before moving to the next tray.';
  if (kind === 'received') {
    const start = r.int(5, 10) * 100;
    const gift = r.pick([200, 500, 1000]);
    target = start + gift;
    context = [`Anya has ${amount(start)}. Her aunt gives her ${amount(gift)} more.`];
    prompt = 'Which tray shows how much Anya has now?';
    hint = 'Add the gift to the money Anya had. Then count each tray.';
    firstStep = { text: 'Add the money she received to the money she had.',
      equation: `${amount(start)} + ${amount(gift)} = ${amount(target)}` };
  } else if (centsOnly) {
    target = r.pick([35, 40, 45, 55, 60, 65, 75, 85]);
    prompt = `A sticker costs ${amount(target)}. Which tray pays for it exactly?`;
  } else {
    target = r.pick([8, 9, 11, 13, 14, 16, 17, 18]) * 100;
    prompt = `Which tray holds exactly ${amount(target)}?`;
  }
  const gap = centsOnly ? 5 : 100;
  const sets = [-1, 0, 1, 2].map(n =>
    piecesFor(r, target + n * gap, centsOnly ? centCoins : wholeMoney));
  return { prompt, context, rule: { target }, sets, firstStep, hint };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const { prompt, context, rule, sets, firstStep, hint } = buildRound(r);
  const trays = r.shuffle(sets);
  const totals = trays.map(sum);
  const sums = trays.map(pieces => pieces.map(amount).join(' + '));
  const labels = ['Tray A', 'Tray B', 'Tray C', 'Tray D'];
  const between = 'low' in rule;
  const choices = between ? sums : labels;
  const matches = totals.map(n => 'target' in rule ? n === rule.target : n > rule.low && n < rule.high);
  if (matches.filter(Boolean).length !== 1) throw new Error('Expected one matching tray');
  const winner = matches.indexOf(true);
  const answer = choices[winner];

  const steps: Step[] = firstStep ? [firstStep] : [];
  trays.forEach((_, i) => steps.push({
    text: between ? `Count the coins in row ${i + 1}.` : `Count the money in ${labels[i]}.`,
    equation: `${sums[i]} = ${amount(totals[i])}`,
  }));
  const result = amount(totals[winner]);
  steps.push({ text: between
    ? `Choose row ${winner + 1}. Its ${result} is more than ${amount(rule.low)} and less than ${amount(rule.high)}.`
    : `Choose ${answer}. It holds exactly ${result}.` });

  const picture: Question['picture'] = between ? undefined : {
    type: 'paper', layout: 'bars', caption: 'Each box shows one coin or one note.',
    rows: trays.map((pieces, i) => ({
      label: labels[i],
      parts: pieces.map(n => ({ size: 1, label: `${amount(n)}\n${n <= 100 ? 'coin' : 'note'}` })),
    })),
  };
  return { key, prompt, context, choices, picture, answer, hint, workedSteps: steps,
    explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
}
