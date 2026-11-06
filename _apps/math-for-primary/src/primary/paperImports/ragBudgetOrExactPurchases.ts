import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-budget-or-exact-purchases',
  level: 2,
  title: 'What can Mira buy?',
  objective: 'Count the money or read the budget, then choose one item or two different items that meet the spending rule.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MONEY.02', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-purchases-within-budget-or-exact-total',
};

const shop = ['Skipping rope', 'Magnet set', 'Puzzle', 'Paint set', 'Toy drum', 'Kite'];
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
const dollars = (value: number) => '$' + value;
const decimalPrice = (cents: number) => '$' + (cents / 100).toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const modes = ['budget', 'exact', 'budget', 'single'] as const;
  const mode = modes[(hashString(String(seed)) + (index >>> 0)) % modes.length];
  const names = rng.shuffle(shop);
  const steps: NonNullable<Question['workedSteps']> = [];

  if (mode === 'single') {
    const notes = [10, 5, rng.pick([2, 5, 10])];
    const coins = [5, rng.pick([10, 20]), rng.pick([10, 20, 50])];
    const noteTotal = sum(notes);
    const coinTotal = sum(coins);
    const budget = 100 * noteTotal + coinTotal;
    const tokens = rng.shuffle([...notes.map(dollars), ...coins.map(c => `${c}¢`)]);
    const prices = [
      budget - rng.pick([0, 5, 10, 50, 105]),
      budget + rng.pick([5, 10, 15]),
      budget + rng.pick([45, 75, 100]),
      budget + rng.pick([150, 200, 250]),
    ];
    const labels = names.slice(0, prices.length);
    const tags = rng.shuffle(labels.map((label, i) => `${label} — ${decimalPrice(prices[i])}`));
    steps.push(
      { text: 'Count the notes.', equation: `${notes.map(dollars).join(' + ')} = ${dollars(noteTotal)}` },
      { text: 'Count the coins.', equation: `${coins.map(c => c + '¢').join(' + ')} = ${coinTotal}¢` },
      { text: 'Put the dollars and cents together.', equation: `${dollars(noteTotal)} and ${coinTotal}¢ = ${decimalPrice(budget)}` },
      { text: `Mira can pay for the ${labels[0].toLowerCase()}. Even the next price, ${decimalPrice(prices[1])}, is too high.`,
        equation: `${decimalPrice(prices[0])} ${prices[0] === budget ? '=' : '<'} ${decimalPrice(budget)}` },
    );
    return {
      key, prompt: 'Which one item can Mira buy with her money?',
      context: ['Each tile shows one note or coin from Mira’s purse.', ...tags],
      picture: { type: 'pattern', items: tokens },
      choices: rng.shuffle(labels), answer: labels[0],
      hint: 'Count all the notes and coins. Look for a price Mira can pay.',
      workedSteps: steps, explanation: steps.map(s => `${s.text} ${s.equation}`).join(' '),
    };
  }

  let budget: number;
  let prices: number[];
  let intro: string;
  let picture: Question['picture'];
  if (mode === 'exact') {
    const notes = rng.shuffle([10, 2, 2, rng.pick([2, 5, 10]), rng.pick([2, 5, 10])]);
    budget = sum(notes);
    const low = rng.int(3, Math.floor((budget - 3) / 2));
    const partner = budget - low;
    // A price between the partners gives one pair under and one over the exact total.
    prices = [low, partner, rng.int(low + 1, partner - 1)];
    intro = 'Each tile shows one note from Mira’s purse.';
    picture = { type: 'pattern', items: notes.map(dollars) };
    steps.push(
      { text: 'Count every note in the purse.', equation: `${notes.map(dollars).join(' + ')} = ${dollars(budget)}` },
      { text: `Try the ${names[0].toLowerCase()}. Find the price needed to spend the rest.`,
        equation: `${dollars(budget)} − ${dollars(low)} = ${dollars(partner)}` },
    );
  } else {
    budget = rng.int(24, 48);
    const low = rng.int(5, Math.floor(budget / 3));
    const partner = budget - low - rng.int(0, 4);
    // Even the cheapest item paired with the third one would cost too much.
    prices = [low, partner, budget - low + rng.int(1, 3)];
    intro = `Mira has ${dollars(budget)} to spend.`;
    steps.push({ text: `Pair the ${names[2].toLowerCase()} with the cheapest item. Even this pair costs more than ${dollars(budget)}.`,
      equation: `${dollars(prices[2])} + ${dollars(low)} = ${dollars(prices[2] + low)}` });
  }

  const labels = names.slice(0, prices.length);
  const pairCost = prices[0] + prices[1];
  const conclusion = pairCost === budget ? 'This uses all her money.' : `Mira has ${dollars(budget - pairCost)} left.`;
  steps.push({ text: `Choose the ${labels[0].toLowerCase()} and the ${labels[1].toLowerCase()}. ${conclusion}`,
    equation: `${dollars(prices[0])} + ${dollars(prices[1])} = ${dollars(pairCost)}` });
  return {
    key, picture,
    prompt: mode === 'exact' ? 'Which two different items use up all of Mira’s money?' : 'Which two different items can Mira buy with her money?',
    context: [intro, ...rng.shuffle(labels.map((label, i) => `${label} — ${dollars(prices[i])}`))],
    structuredResponse: { kind: 'named-pair', options: rng.shuffle(labels) },
    answer: JSON.stringify(labels.slice(0, 2)),
    hint: mode === 'exact' ? 'Count the notes. Look for two prices that add up to that amount.' : 'Try two prices at a time. Can Mira pay their total?',
    workedSteps: steps, explanation: steps.map(s => `${s.text} ${s.equation}`).join(' '),
  };
}
