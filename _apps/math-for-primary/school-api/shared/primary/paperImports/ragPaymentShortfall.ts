import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-payment-shortfall',
  level: 2 as const,
  title: 'Find the money still needed',
  objective: 'Compare the full price with the money saved to find a missing amount or choose a payment that falls short.',
  skillIds: ['P2.S.MONEY.04', 'P2.S.MONEY.02', 'P2.S.AS.01'],
  canonicalPatternId: 'payment-shortfall',
};

const dollars = (value: number) => `$${value}`;
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
type Steps = NonNullable<Question['workedSteps']>;
type Response = Pick<Question, 'answer' | 'unit' | 'picture' | 'choices'>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = rng.int(0, 6);
  const make = (context: string[], prompt: string, hint: string, workedSteps: Steps, response: Response): Question => ({
    key, context, prompt, hint, workedSteps, ...response,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (slot < 4) {
    const mixed = slot < 2;
    const notes = mixed
      ? [2, rng.pick([2, 5, 10]), rng.pick([2, 5, 10])]
      : [rng.pick([10, 50]), ...Array<number>(rng.int(2, 3)).fill(10), rng.pick([2, 5])];
    const coins = mixed ? [rng.pick([5, 10, 20]), rng.pick([10, 20]), rng.pick([10, 20, 50])] : [];
    const noteTotal = sum(notes);
    const item = mixed ? 'set of paints' : 'scooter';
    const price = mixed ? rng.int(26, 39) : noteTotal + rng.int(13, 37);
    const context = [`The ${item} costs ${dollars(price)}.`, 'Each label shows one note or one coin. These are all of Kai’s savings.'];
    const prompt = `How much must Kai add to his savings to buy the ${item}?`;
    const picture: Question['picture'] = {
      type: 'pattern', items: rng.shuffle([...notes.map(dollars), ...coins.map(value => `${value}¢`)]),
    };
    const steps: Steps = [{ text: 'Add the notes.', equation: `${notes.map(dollars).join(' + ')} = ${dollars(noteTotal)}` }];

    if (mixed) {
      const coinTotal = sum(coins);
      const topUp = 100 - coinTotal;
      const nextDollar = noteTotal + 1;
      const wholeDollarsLeft = price - nextDollar;
      const answer = (wholeDollarsLeft + topUp / 100).toFixed(2);
      steps.push(
        { text: 'Count the coins and put them with the notes.', equation: `${coins.map(value => `${value}¢`).join(' + ')} = ${coinTotal}¢. Kai has $${(noteTotal + coinTotal / 100).toFixed(2)}.` },
        { text: `Count on to ${dollars(nextDollar)}.`, equation: `${coinTotal}¢ + ${topUp}¢ = 100¢` },
        { text: 'Find how many whole dollars are still needed.', equation: `${dollars(price)} − ${dollars(nextDollar)} = ${dollars(wholeDollarsLeft)}` },
        { text: 'Put both parts of the top-up together.', equation: `${topUp}¢ + ${dollars(wholeDollarsLeft)} = $${answer}` },
      );
      return make(context, prompt, 'Count the money. How many cents will get Kai to the next whole dollar?', steps, { picture, answer, unit: 'dollars' });
    }

    const gap = price - noteTotal;
    const smallNote = notes[notes.length - 1];
    steps.push({ text: 'Take the savings away from the price.', equation: `${dollars(price)} − ${dollars(noteTotal)} = ${dollars(gap)}` });
    return make(context, prompt, 'Count every note once, then compare the total with the price.', steps, {
      picture, answer: dollars(gap), choices: rng.shuffle([gap, gap - 10, gap + 10, gap + smallNote].map(dollars)),
    });
  }

  if (slot === 4) {
    const cost = rng.int(4, 7) * 5;
    const book = rng.int(6, 14);
    const pens = cost - book;
    const shortDenomination = rng.pick([2, 5, 10]);
    const bundles = rng.shuffle([2, 5, 10, 50]).map(value => {
      const enough = Math.ceil(cost / value);
      const count = value === shortDenomination ? enough - 1 : enough;
      return { count, value, amount: count * value, label: `${count} $${value} ${count === 1 ? 'note' : 'notes'}` };
    });
    const shortBundle = bundles.find(bundle => bundle.amount < cost)!;
    return make(
      [`A sketchbook costs ${dollars(book)} and a pack of pens costs ${dollars(pens)}.`, 'Farah wants one of each.'],
      'Which group of notes has too little money to pay for both items?',
      'Add the two prices. A group with exactly that much money can pay for both.',
      [
        { text: 'Find the price of both items together.', equation: `${dollars(book)} + ${dollars(pens)} = ${dollars(cost)}` },
        { text: 'Count the money in each group of notes.', equation: bundles.map(b => `${b.count} × ${dollars(b.value)} = ${dollars(b.amount)}`).join(', ') },
        { text: `Only the group of ${shortBundle.label} falls short.`, equation: `${dollars(shortBundle.amount)} < ${dollars(cost)}` },
      ],
      { choices: bundles.map(b => b.label), answer: shortBundle.label },
    );
  }

  const prices = [rng.int(9, 18), rng.int(5, 13), rng.int(3, 8)];
  const total = sum(prices);
  const shortfall = rng.int(2, 15);
  const saved = total - shortfall;
  const findSavings = slot === 6;
  const context = [
    `A puzzle costs ${dollars(prices[0])}, a book costs ${dollars(prices[1])} and a ball costs ${dollars(prices[2])}.`,
    'Ida wants one of each.',
    findSavings ? `Ida still needs ${dollars(shortfall)} to buy all three.` : `Ida has saved ${dollars(saved)}.`,
  ];
  const steps: Steps = [{ text: 'Add the three prices.', equation: `${prices.map(dollars).join(' + ')} = ${dollars(total)}` }];
  if (findSavings) {
    steps.push({ text: 'Take away the part Ida still needs to find the part she has saved.', equation: `${dollars(total)} − ${dollars(shortfall)} = ${dollars(saved)}` });
    return make(context, 'How much has Ida already saved?', 'Her savings and the money she still needs add up to the full price.', steps, { answer: String(saved), unit: 'dollars' });
  }
  steps.push({ text: 'Take away the money Ida has already saved.', equation: `${dollars(total)} − ${dollars(saved)} = ${dollars(shortfall)}` });
  return make(context, 'How much more must Ida save?', 'Find the cost of one of each item, then compare it with her savings.', steps, { answer: String(shortfall), unit: 'dollars' });
}
