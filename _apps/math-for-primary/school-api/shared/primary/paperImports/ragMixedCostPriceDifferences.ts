import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-mixed-cost-price-differences',
  level: 5,
  title: 'Find prices in a mixed purchase',
  objective: 'Use a total cost and a difference between unit prices to find an item price or a category total.',
  skillIds: ['P5.S.RATE.02', 'P4.S.FRAC.03'],
  canonicalPatternId: 'p5-mixed-cost-with-price-differences',
} as const;

const money = (amount: number): string => amount.toFixed(2);

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const variant = ((hashString(`${RAG_PATTERN.id}:${seed}`) + Math.trunc(index)) % 3 + 3) % 3;
  const finish = (question: Omit<Question, 'key' | 'explanation'>): Question => ({
    ...question, key,
    explanation: (question.workedSteps ?? []).map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  if (variant < 2) {
    const folders = r.int(2, 5);
    const notebooks = r.pick([2, 3, 4].filter(count => count !== folders));
    const folderPrice = r.int(4, 18);
    const difference = r.int(3, 11);
    const notebookPrice = folderPrice + difference;
    const total = folders * folderPrice + notebooks * notebookPrice;
    const extra = notebooks * difference;
    const count = folders + notebooks;
    const adjusted = total - extra;
    const subtotal = variant === 1;
    const workedSteps: NonNullable<Question['workedSteps']> = [
      {text: 'Find the extra cost of the notebooks compared with the same number of folders.', equation: `${notebooks} × $${money(difference)} = $${money(extra)}`},
      {text: `Remove that extra cost. The adjusted total is the cost of ${count} folders.`, equation: `$${money(total)} − $${money(extra)} = $${money(adjusted)}`},
      {text: 'Divide to find the price of one folder.', equation: `$${money(adjusted)} ÷ ${count} = $${money(folderPrice)}`},
    ];
    if (subtotal) workedSteps.push({text: `Find the cost of the ${folders} folders bought.`, equation: `${folders} × $${money(folderPrice)} = $${money(folders * folderPrice)}`});
    return finish({
      context: [
        `Hana pays $${money(total)} for ${folders} folders and ${notebooks} notebooks for her class.`,
        'All folders have the same price, and all notebooks have the same price.',
        `Each notebook costs $${money(difference)} more than each folder.`,
      ],
      prompt: subtotal ? `What is the total cost of the ${folders} folders?` : 'What is the price of one folder?',
      answer: money(subtotal ? folders * folderPrice : folderPrice),
      unit: 'dollars',
      hint: 'Imagine replacing every notebook with a folder. How much would the total cost fall? Then find the price of one folder.',
      workedSteps,
    });
  }

  const [numerator, denominator] = r.pick([[1, 4], [2, 7], [3, 8]] as const);
  const fanDenominator = r.int(2, 4);
  const stools = r.pick([3, 5, 6]);
  // This scale makes every amount in the fraction prelude a whole number of dollars.
  const scale = numerator * fanDenominator;
  const stoolPrice = scale * r.int(5, 14);
  const difference = scale * r.int(2, 6);
  const deskPrice = stoolPrice + difference;
  const furniture = stools * stoolPrice + deskPrice;
  const onePart = furniture / numerator;
  const remaining = onePart * (denominator - numerator);
  const fan = remaining / fanDenominator;
  const extra = stools * difference;
  const equalTotal = furniture + extra;
  return finish({
    context: [
      `To set up a reading corner, Dara spends ${numerator}/${denominator} of her money on 1 desk and ${stools} stools.`,
      `She uses 1/${fanDenominator} of the money left after that purchase to buy a fan for $${money(fan)}.`,
      `Each stool costs $${money(difference)} less than the desk. All the stools have the same price.`,
    ],
    prompt: '(a) How much does Dara spend on the desk and stools altogether? (b) What is the price of the desk?',
    answer: JSON.stringify([money(furniture), money(deskPrice)]),
    structuredResponse: {kind: 'number-pair', firstLabel: '(a) Desk and stools ($)', secondLabel: '(b) One desk ($)', decimal: true},
    hint: 'Use the fan cost to work back to the money left after buying furniture. Find the furniture total, then imagine making every stool cost as much as the desk.',
    workedSteps: [
      {text: '(a) Find the money left just after buying the furniture.', equation: `$${money(fan)} × ${fanDenominator} = $${money(remaining)}`},
      {text: `The money left is ${denominator - numerator}/${denominator} of the starting amount. Find one of the ${denominator} equal parts.`, equation: `$${money(remaining)} ÷ ${denominator - numerator} = $${money(onePart)}`},
      {text: `The desk and stools cost ${numerator} of these equal parts.`, equation: `$${money(onePart)} × ${numerator} = $${money(furniture)}`},
      {text: '(b) Work out how much to add so that every stool costs as much as the desk.', equation: `${stools} × $${money(difference)} = $${money(extra)}`},
      {text: `The adjusted total is the cost of ${stools + 1} desks.`, equation: `$${money(furniture)} + $${money(extra)} = $${money(equalTotal)}`},
      {text: 'Divide to find the price of one desk.', equation: `$${money(equalTotal)} ÷ ${stools + 1} = $${money(deskPrice)}`},
    ],
  });
}
