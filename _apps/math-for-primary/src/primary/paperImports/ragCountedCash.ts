import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-counted-cash-transactions',
  level: 3,
  title: 'Count the coins, then find the missing amount',
  objective: 'Decide whether the coins show money held or money paid, then find a price or a balance.',
  skillIds: ['P3.S.MONEY.01', 'P2.S.MONEY.04'],
  canonicalPatternId: 'p3-payment-and-change-from-counted-cash',
};

const money = (cents: number) => '$' + (cents / 100).toFixed(2);
const names: Record<number, string> = { 10: 'ten', 20: 'twenty', 50: 'fifty' };

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const form = ((Math.trunc(seed) + Math.trunc(index)) % 3 + 3) % 3;
  const faces = form === 0 ? [r.pick([20, 50]), 10] : form === 1 ? [50, 20] : [50, 20, 10];
  const groups = faces.map(face => ({ face, count: r.int(2, form === 0 ? 4 : 6) }));
  const total = groups.reduce((sum, g) => sum + g.face * g.count, 0);
  const phrases = groups.map(g => `${g.count} ${names[g.face]}-cent coins`);
  const list = phrases.slice(0, -1).join(', ') + ' and ' + phrases[phrases.length - 1];
  const countEquation = groups.map(g => `${g.count} × ${g.face}¢`).join(' + ') + ` = ${total}¢ = ${money(total)}`;

  let context: string[], prompt: string, hint: string, countStep: string, subtractStep: string;
  let whole: number, part: number;
  let picture: Question['picture'];
  if (form === 0) {
    const tiles = groups.flatMap(g => Array<string>(g.count).fill(`${g.face}¢`));
    picture = { type: 'pattern', items: r.shuffle(tiles) };
    whole = total;
    part = r.pick([15, 20, 25, 30, 35]);
    context = [`Each tile shows one coin. Kai hands all ${tiles.length} coins to a fruit seller for one pear.`, `The seller gives Kai ${part}¢ back.`];
    prompt = 'What is the price of the pear?';
    hint = 'Find the value of all the tiles. Which part of that payment did the seller keep?';
    countStep = 'Group the coins by value to find how much Kai handed over.';
    subtractStep = 'Take away the change. The seller kept the price of the pear.';
  } else if (form === 1) {
    whole = total;
    // Choose a price payable with coins in the purse, leaving at least one coin.
    part = 50 * r.int(1, groups[0].count - 1) + 20 * r.int(0, groups[1].count);
    context = [`Siti has only ${list} in her purse.`, `She spends ${money(part)} from her purse on coloured paper.`];
    prompt = 'How much money is left in Siti’s purse?';
    hint = 'Count what was in the purse before Siti bought the paper.';
    countStep = 'Find how much Siti had to start with.';
    subtractStep = 'Subtract the cost of the paper from the money in the purse.';
  } else {
    whole = r.pick([600, 700, 800, 900]);
    part = total;
    context = [`Irfan has ${money(whole)} in his wallet.`, `He takes ${list} from his wallet to pay the exact price of a notebook.`];
    prompt = 'How much money is left in Irfan’s wallet?';
    hint = 'The listed coins leave the wallet. Find their value before subtracting.';
    countStep = 'Find the value of the coins Irfan spent.';
    subtractStep = 'Take the payment away from the amount he had at the start.';
  }

  const result = whole - part;
  const smallCoin = faces[faces.length - 1];
  const amounts = [result, result - smallCoin, total, result + smallCoin, result + 5, result + 10, result + 15];
  const choices = r.shuffle([...new Set(amounts.filter(n => n > 0))].slice(0, 4).map(money));
  const difference = `${money(whole)} − ${money(part)} = ${money(result)}`;
  return {
    key, context, prompt, ...(picture ? { picture } : {}), choices, answer: money(result), hint,
    workedSteps: [{ text: countStep, equation: countEquation }, { text: subtractStep, equation: difference }],
    explanation: `${countStep} ${countEquation}. ${subtractStep} ${difference}.`,
  };
}
