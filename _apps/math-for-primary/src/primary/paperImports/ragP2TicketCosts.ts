import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';
import type { PaperPicture } from '../paperPicture';

export const RAG_PATTERN = {
  id: 'p2-ticket-costs-by-category',
  level: 2 as const,
  title: 'Tickets for a puppet show',
  objective: 'Match tickets to their prices and find the cost for one group or the whole family.',
  skillIds: ['P2.S.MD.01', 'P2.S.MONEY.04', 'P2.S.AS.01'],
  canonicalPatternId: 'p2-quantity-unit-price-and-total-cost',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const task = rng.pick(['adult-tickets', 'children-then-family', 'family-total'] as const);
  const adultPrice = rng.pick([7, 8, 9]);
  const childPrice = rng.pick([2, 4, 5]);
  const priceLabel = (price: number) => `$${task === 'adult-tickets' ? price.toFixed(2) : price}`;
  const picture: PaperPicture = {
    type: 'paper', layout: 'cards', heading: 'Price of one puppet show ticket',
    cards: rng.shuffle([
      { label: 'Adult', value: priceLabel(adultPrice) },
      { label: 'Child', value: priceLabel(childPrice) },
    ]),
  };

  if (task === 'adult-tickets') {
    const adults = rng.int(2, 4);
    const children = rng.int(2, 5);
    const tickets = rng.shuffle([
      ...Array<string>(adults).fill('Adult'), ...Array<string>(children).fill('Child'),
    ]);
    const adultCost = adults * adultPrice;
    return {
      key, picture,
      context: ['Each word on the list stands for one ticket.', `Tickets ordered: ${tickets.join(', ')}.`],
      prompt: 'How much does the group pay for just the adult tickets?',
      unit: 'dollars', answer: String(adultCost),
      hint: 'Count the Adult entries. Look up the price of one adult ticket.',
      workedSteps: [
        { text: `Adult appears ${adults} times on the list. Each adult ticket costs $${adultPrice}.` },
        { text: 'Find the cost of those tickets.', equation: `${adults} × $${adultPrice} = $${adultCost}` },
      ],
      explanation: `The group buys ${adults} adult tickets at $${adultPrice} each. The adult tickets cost $${adultCost}.`,
    };
  }

  const children = rng.int(2, 5);
  const childCost = children * childPrice;
  const adultCost = 2 * adultPrice;
  const total = childCost + adultCost;
  const family = {
    key, picture,
    context: [`Mum and Dad take ${children} children to a puppet show. Each person needs one ticket.`],
    hint: 'Use the child price for the children. Mum and Dad each need an adult ticket.',
    workedSteps: [
      { text: 'Find the cost of the children’s tickets.', equation: `${children} × $${childPrice} = $${childCost}` },
      { text: 'Count one adult ticket for Mum and one for Dad.', equation: `2 × $${adultPrice} = $${adultCost}` },
      { text: 'Add the two ticket costs.', equation: `$${childCost} + $${adultCost} = $${total}` },
    ],
    explanation: `The children’s tickets cost $${childCost}. Mum and Dad pay $${adultCost} for their own tickets, so the family pays $${total} in all.`,
  };
  if (task === 'children-then-family') {
    return {
      ...family,
      prompt: '(a) How much do the children’s tickets cost? (b) How much does the family pay for all its tickets?',
      structuredResponse: {
        kind: 'number-pair', decimal: true,
        firstLabel: '(a) Children’s tickets ($)', secondLabel: '(b) Whole family ($)',
      },
      answer: JSON.stringify([String(childCost), String(total)]),
    };
  }
  return {
    ...family, prompt: 'How much does the family pay for all its tickets?',
    unit: 'dollars', answer: String(total),
  };
}
