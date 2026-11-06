import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-starting-money-spending-balance',
  level: 4,
  title: 'Money spent and money left',
  objective: 'Use the amount spent and the amount left to work out how much money someone started with, spent or kept.',
  skillIds: ['P4.S.DEC.05', 'P4.S.MD.03'],
  canonicalPatternId: 'p4-starting-money-spending-and-balance',
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const price = (cents: number) => '$' + dollars(cents);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;
  function question(
    context: string[], prompt: string, answer: string, hint: string,
    workedSteps: NonNullable<Question['workedSteps']>,
    response: Pick<Question, 'choices' | 'picture' | 'unit' | 'proof'>,
  ): Question {
    return {
      key, context, prompt, answer, hint, workedSteps, ...response,
      explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
    };
  }

  if (variant === 0) {
    const spent = 5 * rng.int(62, 178);
    const left = 5 * rng.int(205, 485);
    const start = spent + left;
    return question(
      [`Hana paid ${price(spent)} for a notebook.`, `She had ${price(left)} left in her purse after she paid.`],
      'How much money was in Hana’s purse before she bought the notebook?', dollars(start),
      'Think about the money Hana handed over and the money she kept.',
      [{ text: 'Put the cost of the notebook back with the money left in the purse.', equation: `${price(spent)} + ${price(left)} = ${price(start)}` }],
      { unit: 'dollars', proof: { op: '/', a: { op: '+', a: spent, b: left }, b: 100 } },
    );
  }

  if (variant === 1) {
    const items = ['bookmark', 'glue stick', 'ruler', 'sketch pad'].map((label, i) => ({
      label, cents: (i + 1) * 100 + 5 * rng.int(1, 18),
    }));
    const [first, second, substitute] = rng.shuffle(items);
    const paid = 2000;
    const cost = first.cents + second.cents;
    const change = paid - cost;
    const wrongCost = first.cents + substitute.cents;
    // Distinct price bands keep the two totals different. Both totals are below half the payment.
    const choices = rng.shuffle([cost, wrongCost, paid - wrongCost, change].map(price));
    return question(
      [`Leela buys one ${first.label} and one ${second.label}.`, `She pays with a $${paid / 100} note.`],
      'How much change should Leela get?', price(change),
      'Find both items on the price list. How much of the note will pay for them?',
      [
        { text: `Add the prices of the ${first.label} and the ${second.label}.`, equation: `${price(first.cents)} + ${price(second.cents)} = ${price(cost)}` },
        { text: 'Take the cost of both items away from the amount Leela handed over.', equation: `${price(paid)} − ${price(cost)} = ${price(change)}` },
      ],
      { choices, picture: { type: 'paper', layout: 'cards', heading: 'Craft stall price list', cards: items.map(item => ({ label: item.label, value: price(item.cents) })) } },
    );
  }

  if (variant === 2) {
    const clubs = rng.shuffle(['art', 'chess', 'drama', 'music', 'robotics']).slice(0, rng.int(3, 5));
    const names = clubs.slice(0, -1).join(', ') + ' and ' + clubs[clubs.length - 1];
    const target = rng.pick(clubs);
    const share = rng.int(425, 1360);
    const total = clubs.length * share;
    const spent = rng.int(112, 390);
    const left = share - spent;
    return question(
      [`The ${names} clubs share a grant of $${total} equally.`, `The ${target} club spends $${spent} from its share on supplies.`],
      `How much grant money does the ${target} club have left?`, String(left),
      'Count the clubs that shared the grant. How much did one club receive?',
      [
        { text: `The grant is split into ${clubs.length} equal shares. Find one club’s share.`, equation: `$${total} ÷ ${clubs.length} = $${share}` },
        { text: `Take the cost of the supplies out of the ${target} club’s share.`, equation: `$${share} − $${spent} = $${left}` },
      ],
      { unit: 'dollars', proof: { op: '-', a: { op: '/', a: total, b: clubs.length }, b: spent } },
    );
  }

  const allowance = 100 * rng.int(15, 30);
  const saved = 5 * rng.int(30, 230);
  const brotherSaved = 5 * rng.int(35, 215);
  const together = saved + brotherSaved;
  const spent = allowance - saved;
  return question(
    [
      `Nisha got ${price(allowance)} for her allowance this week. She spent some of it and saved the rest.`,
      `Her brother saved ${price(brotherSaved)} this week.`,
      `Together they saved ${price(together)} this week.`,
    ],
    'How much of her allowance did Nisha spend this week?', dollars(spent),
    'First find Nisha’s part of the savings. Which part of her allowance did she spend?',
    [
      { text: 'Take her brother’s savings out of their combined savings to find what Nisha saved.', equation: `${price(together)} − ${price(brotherSaved)} = ${price(saved)}` },
      { text: 'Take Nisha’s savings out of her allowance to find what she spent.', equation: `${price(allowance)} − ${price(saved)} = ${price(spent)}` },
    ],
    { unit: 'dollars', proof: { op: '/', a: { op: '-', a: allowance, b: { op: '-', a: together, b: brotherSaved } }, b: 100 } },
  );
}
