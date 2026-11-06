import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-purchase-shortfall',
  level: 3,
  title: 'How much more money is needed?',
  objective: 'Find the total cost or the money a shopper has, then work out how much more the shopper needs.',
  skillIds: ['P3.S.MONEY.01', 'P3.S.MD.03'],
  canonicalPatternId: 'p3-purchase-shortfall',
};

function money(cents: number): string {
  return '$' + (cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2));
}

function groupCost(count: number, unitCents: number): string {
  const total = count * unitCents;
  return `${count} × ${unitCents}¢ = ${total}¢ = ${money(total)}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = r.pick(['gift-entry', 'gift-choice', 'counted-cash', 'shopping-list'] as const);
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let price: number;
  let available: number;
  let context: string[];
  let prompt: string;
  let hint: string;
  let choices: string[] | undefined;

  if (form === 'gift-entry' || form === 'gift-choice') {
    price = 100 * r.int(169, 248);
    const savings = 100 * r.int(76, 98);
    const gift = 100 * r.int(29, 55);
    available = savings + gift;
    context = [
      `The tent Mira wants costs ${money(price)}.`,
      `Mira has saved ${money(savings)}. Her aunt gives her ${money(gift)} to spend on the tent.`,
    ];
    prompt = 'How much more must Mira save for the tent?';
    hint = 'How much can Mira put towards the tent after her aunt gives her the money?';
    workedSteps.push({ text: 'Add the gift to Mira’s savings.', equation: `${money(savings)} + ${money(gift)} = ${money(available)}` });
    if (form === 'gift-choice') {
      prompt = 'Choose the amount Mira still needs for the tent.';
      const gap = price - available;
      choices = r.shuffle([gap, price - savings, price - gift, gap + 1000].map(money));
    }
  } else if (form === 'counted-cash') {
    const notes = r.int(2, 6);
    const fifties = r.int(2, 6);
    const twenties = r.pick([2, 3, 4, 6, 7]);
    const noteValue = notes * 500;
    const fiftyValue = fifties * 50;
    const twentyValue = twenties * 20;
    available = noteValue + fiftyValue + twentyValue;
    price = 100 * r.int(38, 62);
    context = [
      `A sports bag costs ${money(price)}.`,
      `Tara has ${notes} $5 notes, ${fifties} 50-cent coins and ${twenties} 20-cent coins. These are all her savings.`,
    ];
    prompt = 'How much more must Tara save for the sports bag?';
    hint = 'Find the value of each group of notes or coins. Then compare all the savings with the price.';
    workedSteps.push(
      { text: 'Count the five-dollar notes.', equation: `${notes} × $5 = ${money(noteValue)}` },
      { text: 'Count the fifty-cent coins.', equation: groupCost(fifties, 50) },
      { text: 'Count the twenty-cent coins.', equation: groupCost(twenties, 20) },
      { text: 'Add the three amounts in dollars.', equation: `${money(noteValue)} + ${money(fiftyValue)} + ${money(twentyValue)} = ${money(available)}` },
    );
  } else {
    const markers = r.int(2, 6);
    const pads = r.int(2, 5);
    const markerPrice = 10 * r.int(11, 18);
    const padPrice = 5 * r.int(45, 79);
    const markerTotal = markers * markerPrice;
    const padTotal = pads * padPrice;
    price = markerTotal + padTotal;
    available = 100 * r.int(3, Math.floor((price - 1) / 100));
    context = [
      `Dev needs ${markers} markers at ${money(markerPrice)} each and ${pads} sketch pads at ${money(padPrice)} each.`,
      `He has ${money(available)} for these supplies.`,
    ];
    prompt = 'How much more money does Dev need to buy everything on his list?';
    hint = 'Find the cost of all the markers and the cost of all the sketch pads before using the money Dev has.';
    workedSteps.push(
      { text: 'Find the cost of the markers in cents.', equation: groupCost(markers, markerPrice) },
      { text: 'Find the cost of the sketch pads in cents.', equation: groupCost(pads, padPrice) },
      { text: 'Add the two costs.', equation: `${money(markerTotal)} + ${money(padTotal)} = ${money(price)}` },
    );
  }

  const gap = price - available;
  workedSteps.push({ text: 'Subtract the money already available from the cost.', equation: `${money(price)} − ${money(available)} = ${money(gap)}` });
  return {
    key, context, prompt, hint, workedSteps,
    answer: choices ? money(gap) : (gap / 100).toFixed(2),
    ...(choices ? { choices } : { unit: 'dollars' }),
    explanation: `With another ${money(gap)}, the shopper will have the full price: ${money(available)} + ${money(gap)} = ${money(price)}.`,
  };
}
