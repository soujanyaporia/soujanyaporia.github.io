import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-starting-money-two-purchases',
  level: 3,
  title: 'Money before shopping',
  objective: 'Find the cost of two purchases, then add the money left to find the starting amount.',
  skillIds: ['P3.S.MONEY.01'],
  canonicalPatternId: 'p3-spending-and-remaining-balance',
};

// Prices and balances are in cents. Only the displayed amounts are in dollars.
function shoppingTrip(r: Rng) {
  switch (r.int(0, 2)) {
    case 0:
      return {
        form: 'cents-choice', firstItem: 'a sketchbook', secondItem: 'a marker',
        first: r.int(30, 62) * 10 + 5, second: r.int(12, 28) * 10 + 5,
        left: r.int(71, 124) * 10,
      };
    case 1: {
      const cents = r.pick([15, 35, 55, 75, 95]);
      return {
        form: 'mixed-choice', firstItem: 'a sports bag', secondItem: 'a water bottle',
        first: r.int(28, 39) * 100, second: r.int(4, 8) * 100 + cents,
        left: r.int(9, 17) * 100 + (100 - cents),
      };
    }
    default:
      return {
        form: 'written', firstItem: 'a bicycle', secondItem: 'a helmet',
        first: r.int(174, 236) * 100, second: r.int(31, 68) * 100,
        left: r.int(24, 79) * 100,
      };
  }
}

const dollars = (cents: number) => (cents / 100).toFixed(2);
const cash = (cents: number) => '$' + (cents % 100 === 0 ? String(cents / 100) : dollars(cents));

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const { form, firstItem, secondItem, first, second, left } = shoppingTrip(r);
  const name = r.pick(['Meera', 'Kai', 'Hana', 'Ben']);
  const spent = first + second;
  const start = spent + left;
  const question: Question = {
    key,
    context: [
      `${name} bought ${firstItem} for ${cash(first)} and ${secondItem} for ${cash(second)}.`,
      `After paying for both items, ${name} had ${cash(left)} left.`,
    ],
    prompt: `How much money did ${name} have before buying the two items?`,
    answer: dollars(start),
    unit: 'dollars',
    hint: 'Think of the money in two parts: the money spent and the money still left.',
    workedSteps: [
      { text: 'Add the two prices to find how much was spent.', equation: `${cash(first)} + ${cash(second)} = ${cash(spent)}` },
      { text: 'Put the money spent back with the money left.', equation: `${cash(spent)} + ${cash(left)} = ${cash(start)}` },
    ],
    explanation: `${name} spent ${cash(spent)} and still had ${cash(left)}. Together these make the starting amount of ${cash(start)}.`,
    proof: { op: '/', a: { op: '+', a: { op: '+', a: first, b: second }, b: left }, b: 100 },
  };
  if (form === 'written') {
    question.prompt += ' Show your working on paper, then enter your answer in dollars.';
  } else {
    question.prompt += ' Choose the amount in dollars.';
    const distractors = form === 'mixed-choice'
      ? [start - 100, start + 100, start - first]
      : [spent, first + left, start + second];
    question.choices = r.shuffle([start, ...distractors].map(dollars));
  }
  return question;
}
