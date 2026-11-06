import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-priced-category-totals',
  level: 4,
  title: 'Work out a bill with two prices',
  objective: 'Find the cost of each group, then use the total to work out the bill, change or saving.',
  skillIds: ['P4.S.DEC.06', 'P4.S.DEC.05', 'P4.S.GRAPH.01'],
  canonicalPatternId: 'p4-totals-across-priced-categories',
};

type Step = { text: string; equation?: string };
type Charge = [description: string, count: number, centsEach: number];
const dollars = (cents: number) => (cents / 100).toFixed(2);
const money = (cents: number) => '$' + dollars(cents);

function bill(first: Charge, second: Charge) {
  const costs = [first, second].map(([, count, rate]) => count * rate);
  const total = costs[0] + costs[1];
  const steps: Step[] = [first, second].map(([text, count, rate], i) => ({
    text,
    equation: `${count} × ${money(rate)} = ${money(costs[i])}`,
  }));
  steps.push({ text: 'Add the two costs.', equation: `${money(costs[0])} + ${money(costs[1])} = ${money(total)}` });
  return { total, steps };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;

  function finish(context: string[], prompt: string, cents: number, hint: string, steps: Step[], extra: Pick<Question, 'picture' | 'choices'> = {}): Question {
    return {
      key, context, prompt, answer: dollars(cents), unit: 'dollars', hint,
      workedSteps: steps,
      explanation: steps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
      ...extra,
    };
  }

  if (variant === 0) {
    const pens = r.int(3, 9);
    const sets = r.int(2, 6);
    const factor = r.int(2, 5);
    const penPrice = r.int(5, 15) * 25;
    const setPrice = factor * penPrice;
    const order = bill(['Find the cost of the pens.', pens, penPrice], ['Find the cost of the paint sets.', sets, setPrice]);
    return finish([
      `The art club buys ${pens} pens and ${sets} paint sets.`,
      `One pen costs ${money(penPrice)}. One paint set costs as much as ${factor} pens.`,
    ], 'How much does the club spend on the art supplies?', order.total,
    'Work out the price of one paint set before finding the cost of each group.', [
      { text: 'Find the price of one paint set.', equation: `${factor} × ${money(penPrice)} = ${money(setPrice)}` },
      ...order.steps,
    ]);
  }

  if (variant === 1) {
    const rolls = r.int(2, 6);
    const buns = r.int(2, 6);
    const rollPrice = r.int(5, 10) * 25;
    const bunPrice = r.int(11, 18) * 25;
    const order = bill(['Find the cost of the bread rolls.', rolls, rollPrice], ['Find the cost of the fruit buns.', buns, bunPrice]);
    const paid = order.total < 2000 ? 2000 : 5000;
    const change = paid - order.total;
    return finish([
      `Mira buys ${rolls} bread rolls at ${money(rollPrice)} each and ${buns} fruit buns at ${money(bunPrice)} each.`,
      `She pays ${money(paid)} in cash.`,
    ], 'How much change does Mira get?', change,
    'Find what Mira spends on both kinds of bread. Take that amount away from her payment.', [
      ...order.steps,
      { text: 'Find the change.', equation: `${money(paid)} − ${money(order.total)} = ${money(change)}` },
    ]);
  }

  const day = r.pick(['Wednesday', 'Friday', 'Saturday', 'Sunday']);
  const weekend = day === 'Saturday' || day === 'Sunday';
  const column = weekend ? 'Weekend' : 'Weekday';
  const childWeekday = r.int(27, 47) * 25;
  const childWeekend = childWeekday + r.int(3, 9) * 25;
  const adultWeekday = childWeekday + r.int(15, 25) * 25;
  const adultWeekend = adultWeekday + r.int(5, 12) * 25;
  const lowRate = weekend ? childWeekend : childWeekday;
  const highRate = weekend ? adultWeekend : adultWeekday;
  const adults = r.int(2, 3);
  const dayStep = { text: `The visit is on ${day}. Use the ${column} column.` };
  const ticketTable = (lowLabel: string, highLabel: string): NonNullable<Question['picture']> => ({
    type: 'nanyang-p4', layout: 'table', caption: 'Price of one ticket (dollars)', rowHeader: 'Ticket',
    columns: ['Weekday', 'Weekend'],
    rows: [
      { label: lowLabel, values: [childWeekday / 100, childWeekend / 100] },
      { label: highLabel, values: [adultWeekday / 100, adultWeekend / 100] },
    ],
  });

  if (variant === 2) {
    const limit = r.int(9, 11);
    const ages = r.shuffle([limit, limit + 1, limit + r.pick([-3, -2, 2, 3])]);
    const younger = ages.filter(age => age <= limit);
    const tickets = adults + ages.length;
    const older = tickets - younger.length;
    const order = bill(['Find the cost of the lower-priced tickets.', younger.length, lowRate], ['Find the cost of the other tickets.', older, highRate]);
    return finish([
      `On ${day}, ${adults} adults take three children to the bird park.`,
      `The children are aged ${ages[0]}, ${ages[1]} and ${ages[2]}.`,
      `The group buys ${tickets} tickets, one for each person.`,
    ], 'How much does the group pay for the tickets?', order.total,
    'Find the column for the day of the visit. Check each child’s age against the age limit in the table.', [
      dayStep,
      { text: `The lower price applies to ${younger.map(age => `the ${age}-year-old`).join(' and ')}. Count everyone else at the higher price.`, equation: `${tickets} − ${younger.length} = ${older}` },
      ...order.steps,
    ], { picture: ticketTable(`Age ${limit} or younger`, `Over age ${limit}`) });
  }

  const children = r.int(2, 4);
  const order = bill(['Find the cost of the children’s tickets.', children, lowRate], ['Find the cost of the adults’ tickets.', adults, highRate]);
  const saving = r.int(8, 22) * 25;
  const pass = order.total - saving;
  return finish([
    `On ${day}, ${adults} adults and ${children} children visit a butterfly garden.`,
    `A pass for ${adults} adults and ${children} children costs ${money(pass)}.`,
  ], 'How much do they save by buying the pass?', saving,
  'Find the price of separate tickets for everyone on the day they visit. Compare that total with the pass price.', [
    dayStep, ...order.steps,
    { text: 'The pass covers everyone in the group. Subtract its price from the cost of separate tickets.', equation: `${money(order.total)} − ${money(pass)} = ${money(saving)}` },
  ], {
    picture: ticketTable('Child', 'Adult'),
    choices: r.shuffle([saving, children * lowRate, pass, order.total].map(dollars)),
  });
}
