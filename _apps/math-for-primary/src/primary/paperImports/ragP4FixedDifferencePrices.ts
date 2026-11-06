import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-fixed-difference-prices',
  level: 4,
  title: 'Find a price from a shopping bill',
  objective: 'Use the difference between two prices to work out what the bill would be if every item cost the same.',
  skillIds: ['P4.S.MD.03', 'P4.S.MD.01'],
  canonicalPatternId: 'p4-unit-prices-from-counts-total-and-fixed-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['cheaper', 'higher-via-cheaper', 'linked', 'higher-direct']);

  if (form === 'linked') {
    const desk = 10 * rng.int(61, 146);
    const difference = 10 * rng.int(12, 48) + 5;
    const bill = desk + (desk + difference);
    const equalBill = bill - difference;
    const bookcase = 2 * desk;
    const allThree = bill + bookcase;
    return {
      key,
      context: [
        `A desk and a cupboard together cost $${bill}.`,
        `The cupboard costs $${difference} more than the desk.`,
      ],
      prompt: '(a) How much does the desk cost? (b) A bookcase costs twice as much as the desk. How much would one desk, one cupboard and one bookcase cost altogether? Show your working on paper.',
      structuredResponse: { kind: 'number-pair', firstLabel: '(a) Desk ($)', secondLabel: '(b) All three items ($)', decimal: true },
      answer: JSON.stringify([String(desk), String(allThree)]),
      hint: 'Take the extra cost of the cupboard off the bill. How many desks could you buy for the amount left?',
      workedSteps: [
        { text: 'Take away the extra cost of the cupboard. What is left is the cost of two desks.', equation: `$${bill} − $${difference} = $${equalBill}` },
        { text: '(a) Find the cost of one desk.', equation: `$${equalBill} ÷ 2 = $${desk}` },
        { text: 'Double the price of the desk to find the price of the bookcase.', equation: `2 × $${desk} = $${bookcase}` },
        { text: '(b) Add the bookcase to the original bill for the desk and cupboard.', equation: `$${bill} + $${bookcase} = $${allThree}` },
      ],
      explanation: `Two desks would cost $${equalBill}, so one desk costs $${desk}. The bookcase costs $${bookcase}. Adding it to the original bill gives $${allThree}.`,
    };
  }

  const puzzles = rng.int(2, 5);
  const games = rng.pick([1, 2, 3, 4].filter(count => count !== puzzles));
  const puzzlePrice = rng.int(8, 24);
  const difference = rng.int(4, 18);
  const gamePrice = puzzlePrice + difference;
  const bill = puzzles * puzzlePrice + games * gamePrice;
  const count = puzzles + games;
  const raise = form === 'higher-direct';
  const extra = (raise ? puzzles : games) * difference;
  const equalBill = raise ? bill + extra : bill - extra;
  const equalPrice = equalBill / count;
  const target = form === 'cheaper' ? 'puzzle' : 'board game';
  const workedSteps = [
    {
      text: raise ? 'Find how much more the puzzles would cost at the board game price.' : 'Find the extra amount paid for the board games above the puzzle price.',
      equation: `${raise ? puzzles : games} × $${difference} = $${extra}`,
    },
    {
      text: raise ? 'Add that amount to make every item cost as much as a board game.' : 'Take that amount off the bill to make every item cost as much as a puzzle.',
      equation: `$${bill} ${raise ? '+' : '−'} $${extra} = $${equalBill}`,
    },
    { text: 'Count all the items in the bill.', equation: `${puzzles} + ${games} = ${count}` },
    { text: `Share the adjusted bill equally to find the price of one ${raise ? 'board game' : 'puzzle'}.`, equation: `$${equalBill} ÷ ${count} = $${equalPrice}` },
  ];
  if (form === 'higher-via-cheaper') {
    workedSteps.push({ text: 'Add one price difference to get the price of one board game.', equation: `$${equalPrice} + $${difference} = $${gamePrice}` });
  }
  const answer = target === 'puzzle' ? puzzlePrice : gamePrice;
  return {
    key,
    context: [
      'At a toy shop, every puzzle has the same price and every board game has the same price.',
      `Mei buys ${puzzles} puzzles and ${games} board ${games === 1 ? 'game' : 'games'} for $${bill} altogether.`,
      raise ? `One puzzle costs $${difference} less than one board game.` : `One board game costs $${difference} more than one puzzle.`,
    ],
    prompt: `What does one ${target} cost? Show your working on paper.`,
    unit: 'dollars',
    answer: String(answer),
    hint: raise ? 'Imagine paying the board game price for each puzzle. How much would you need to add to the bill?' : 'Imagine paying the puzzle price for every board game. How much could you take off the bill?',
    workedSteps,
    explanation: `At the ${raise ? 'board game' : 'puzzle'} price, the ${count} items would cost $${equalBill} altogether, or $${equalPrice} each. ${form === 'higher-via-cheaper' ? `One board game costs $${difference} more, so its price is $${answer}.` : `One ${target} therefore costs $${answer}.`}`,
  };
}
