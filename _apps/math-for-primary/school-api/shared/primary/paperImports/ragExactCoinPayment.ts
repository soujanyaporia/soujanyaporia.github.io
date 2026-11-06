import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-exact-coin-payment',
  level: 2,
  title: 'Choose coins to pay exactly',
  objective: 'Choose coins from a tray to make a price, using any coin or count rules given.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MONEY.03', 'P2.S.AS.01'],
  canonicalPatternId: 'coin-selection-for-exact-payment',
};

const values = [5, 10, 20, 50];
type Mode = 'tray' | 'machine' | 'count' | 'shop';
const modes: Mode[] = ['tray', 'machine', 'count', 'shop'];
type Payment = { counts: number[]; cents: number; size: number };

function availablePayments(stock: number[]): Payment[] {
  let rows: Payment[] = [{ counts: [], cents: 0, size: 0 }];
  for (const [i, available] of stock.entries()) {
    rows = rows.flatMap(row => Array.from({ length: available + 1 }, (_, take) => ({
      counts: [...row.counts, take],
      cents: row.cents + take * values[i],
      size: row.size + take,
    })));
  }
  return rows;
}

function choosePayment(r: Rng, mode: Mode, stock: number[]): Payment {
  const all = availablePayments(stock);
  const legal = all.filter(p => mode !== 'machine' || p.counts[0] === 0);
  const byTotal = new Map<number, Payment[]>();
  for (const p of legal) {
    const group = byTotal.get(p.cents) ?? [];
    group.push(p);
    byTotal.set(p.cents, group);
  }
  const machineTotal = stock[1] * 10 + stock[2] * 20 + stock[3] * 50;
  const pool = legal.filter(p => {
    if (p.counts.filter(n => n > 0).length < 2 || [75, 85, 150].includes(p.cents)) return false;
    if (mode === 'machine') {
      if (p.cents <= 100 || p.cents >= machineTotal) return false;
      // The machine's rule must rule out a payment that would otherwise work.
      if (!all.some(other => other.cents === p.cents && other.counts[0] > 0)) return false;
    } else if (p.cents < 30 || p.cents > 95) return false;
    const sameTotal = byTotal.get(p.cents)!;
    if (mode === 'count') {
      return sameTotal.length > 1 && sameTotal.filter(other => other.size === p.size).length === 1;
    }
    return sameTotal.length === 1;
  });
  if (!pool.length) throw new Error('No exact payment for this tray');
  return r.pick(pool);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const mode = r.pick(modes);
  const stock = [mode === 'count' || mode === 'machine' ? 2 : r.int(1, 2), r.int(1, 2), r.int(1, 3), mode === 'machine' ? 2 : r.int(1, 2)];
  const payment = choosePayment(r, mode, stock);
  const items = r.shuffle(values.flatMap((v, i) => Array<string>(stock[i]).fill(`${v}¢`)));
  const context: string[] = [];
  const steps: NonNullable<Question['workedSteps']> = [];
  let prompt = `Which coins can you take from the tray to make ${payment.cents}¢?`;
  let hint = 'Try a coin from the tray. How much more do you need?';

  if (mode === 'count') {
    prompt = `Use exactly ${payment.size} coins from the tray to make ${payment.cents}¢.`;
    hint = 'Keep track of two things as you pick coins: their value and how many you have used.';
  } else if (mode === 'machine') {
    const price = `$${(payment.cents / 100).toFixed(2)}`;
    prompt = `A juice box costs ${price}. Which coins can you put in the machine to pay for it?`;
    context.push('The machine takes only 10¢, 20¢ and 50¢ coins.');
    hint = 'Change the price to cents. Set aside any coins the machine cannot take.';
    steps.push({ text: 'Write the price in cents and leave the 5¢ coins in the tray.', equation: `${price} = ${payment.cents}¢` });
  } else if (mode === 'shop') {
    const [first, second, third, fourth] = r.shuffle(['badge', 'bookmark', 'sticker', 'postcard']);
    const a = 5 * r.int(2, Math.floor((payment.cents - 5) / 10));
    const b = payment.cents - a;
    const otherPrices = r.shuffle(Array.from({ length: 14 }, (_, i) => (i + 2) * 5).filter(v => v !== a && v !== b));
    context.push(...r.shuffle([`A ${first} costs ${a}¢.`, `A ${second} costs ${b}¢.`, `A ${third} costs ${otherPrices[0]}¢.`, `A ${fourth} costs ${otherPrices[1]}¢.`]));
    prompt = `Mei buys one ${first} and one ${second}. Which coins can she use to pay for both?`;
    hint = 'Find the price of each item Mei buys. Add those two prices before picking coins.';
    steps.push({ text: `Add the prices of the ${first} and the ${second}.`, equation: `${a}¢ + ${b}¢ = ${payment.cents}¢` });
  }

  context.push('Each label in the tray stands for one coin. Enter how many of each coin you take. Enter 0 for any you leave out.');
  const used = values.flatMap((v, i) => Array<number>(payment.counts[i]).fill(v)).reverse();
  steps.push(
    { text: `Try a ${used[0]}¢ coin. Find how much is left to make.`, equation: `${payment.cents}¢ − ${used[0]}¢ = ${payment.cents - used[0]}¢` },
    { text: 'Fill the gap with other coins from the tray. Check the whole payment.', equation: `${used.map(v => `${v}¢`).join(' + ')} = ${payment.cents}¢` },
  );
  if (mode === 'count') {
    steps.push({ text: 'Count the coins used to check the second rule.', equation: `${payment.counts.filter(n => n > 0).join(' + ')} = ${payment.size} coins` });
  }
  return {
    key, prompt, context, hint,
    picture: { type: 'pattern', items },
    structuredResponse: { kind: 'number-fields', fields: values.map(v => ({ label: `${v}¢ coins` })) },
    answer: JSON.stringify(payment.counts.map(String)),
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
