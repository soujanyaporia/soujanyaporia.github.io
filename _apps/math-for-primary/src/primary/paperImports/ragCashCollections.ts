import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-cash-collections',
  level: 3,
  title: 'How much are the coins and notes worth?',
  objective: 'Use counts and denominations to compare piles of coins, choose an affordable item or find a new balance.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MONEY.02', 'P2.S.MONEY.03', 'P3.S.MONEY.01'],
  canonicalPatternId: 'p3-value-and-compare-cash-collections',
};

type Step = NonNullable<Question['workedSteps']>[number];
const dollars = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function group(count: number, faceCents: number, kind: 'notes' | 'coins' = 'coins') {
  const face = faceCents >= 100 ? `$${faceCents / 100}` : `${faceCents}¢`;
  const label = `${count} ${face} ${kind}`;
  const total = count * faceCents;
  const step = { text: `Find the value of the ${label}.`, equation: `${count} × ${faceCents}¢ = ${total}¢` };
  return { label, total, step };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.int(0, 3);
  function finish(fields: Omit<Question, 'key' | 'explanation' | 'workedSteps'>, steps: Step[]): Question {
    return { ...fields, key, workedSteps: steps, explanation: steps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' ') };
  }

  if (variant < 2) {
    // Keep the piles close in value. Their offsets from the whole-dollar pile are distinct.
    const whole = rng.int(3, 5);
    const piles = rng.shuffle([
      group(whole, 100),
      group(2 * whole + rng.pick([-1, 1]), 50),
      group(5 * whole + rng.pick([-2, -1, 1, 2]), 20),
      group(10 * whole + rng.pick([-7, -3, -1, 1, 3, 7]), 10),
    ]);
    const ranked = [...piles].sort((a, b) => b.total - a.total);
    const winner = ranked[0];
    return finish({
      prompt: 'Which pile of coins is worth the most?',
      choices: piles.map(pile => pile.label),
      answer: winner.label,
      hint: 'Change $1 to 100¢. Multiply the number of coins in each pile by the value of one coin.',
    }, [...piles.map(pile => pile.step), {
      text: `The pile of ${winner.label} has the greatest value.`,
      equation: ranked.map(pile => `${pile.total}¢`).join(' > '),
    }]);
  }

  if (variant === 2) {
    const notes = group(rng.int(3, 6), 200, 'notes');
    const coins = group(rng.int(2, 7), rng.pick([10, 20, 50]));
    const budget = notes.total + coins.total;
    const low = budget - rng.pick([0, 20, 45, 80, 100]);
    const middle = budget + 5 * rng.int(1, 12);
    const high = budget + 5 * rng.int(13, 36);
    const prices = rng.shuffle([low, middle, high]);
    const items = ['Lunch box', 'Card game', 'Skipping rope'];
    const answer = items[prices.indexOf(low)];
    return finish({
      context: [`Tara has ${notes.label} and ${coins.label} to spend.`,
        ...items.map((item, i) => `${item} — ${dollars(prices[i])}`)],
      prompt: 'Which item can Tara buy with her money?',
      answer,
      hint: 'Find how much Tara has. She can buy an item if its price is equal to or less than that amount.',
    }, [notes.step, coins.step, {
      text: 'Add the values of the notes and coins.',
      equation: `${notes.total}¢ + ${coins.total}¢ = ${budget}¢ = ${dollars(budget)}`,
    }, {
      text: `Tara can buy the ${answer.toLowerCase()} for ${dollars(low)}. Both other prices are above her budget.`,
      equation: `${dollars(low)} ≤ ${dollars(budget)} < ${dollars(middle)} < ${dollars(high)}`,
    }]);
  }

  const opening = 100 * rng.int(8, 28) + 5 * rng.int(1, 19);
  const notes = group(rng.int(2, 7), rng.pick([200, 500]), 'notes');
  const largeCoins = group(rng.int(3, 9), rng.pick([20, 50]));
  const smallCoins = group(rng.int(6, 16), rng.pick([5, 10]));
  const received = notes.total + largeCoins.total + smallCoins.total;
  const balance = opening + received;
  return finish({
    context: [`Ravi has ${dollars(opening)} in his savings jar.`,
      `He puts in ${notes.label}, ${largeCoins.label} and ${smallCoins.label}.`],
    prompt: 'How much money is in Ravi’s jar now? Give your answer in dollars.',
    answer: (balance / 100).toFixed(2),
    unit: 'dollars',
    hint: 'Find the value of each group Ravi puts in. Remember the money that was already in the jar.',
  }, [notes.step, largeCoins.step, smallCoins.step, {
    text: 'Add the three amounts Ravi puts in.',
    equation: `${notes.total}¢ + ${largeCoins.total}¢ + ${smallCoins.total}¢ = ${received}¢ = ${dollars(received)}`,
  }, {
    text: 'Add this money to the amount already in the jar.',
    equation: `${dollars(opening)} + ${dollars(received)} = ${dollars(balance)}`,
  }]);
}
