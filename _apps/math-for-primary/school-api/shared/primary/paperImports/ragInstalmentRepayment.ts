import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-instalment-repayment',
  level: 5,
  title: 'Find a monthly instalment',
  objective: 'Subtract a deposit and convert years to months to find an equal monthly payment.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02'],
  canonicalPatternId: 'p5-instalment-repayment',
} as const;

const money = (dollars: number): string => '$' + dollars.toLocaleString('en-SG', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  // Both settings use the same reasoning and response task.
  const isHome = r.pick([false, true]);
  const item = isHome ? 'flat' : 'car';
  const years = r.pick(isHome ? [15, 20, 25] : [3, 4, 5, 6]);
  const months = years * 12;
  const monthlyPayment = r.int(isHome ? 50 : 32, isHome ? 118 : 87) * 25;
  const deposit = isHome ? r.int(24, 70) * 2500 : r.int(30, 90) * 500;
  // Construct an exactly divisible balance; no rounding or final unequal payment.
  const balance = monthlyPayment * months;
  const price = deposit + balance;
  const workedSteps = [
    {
      text: 'Subtract the deposit to find the balance still to be paid.',
      equation: `${money(price)} − ${money(deposit)} = ${money(balance)}`,
    },
    {
      text: 'There are 12 months in a year. Find the number of monthly payments.',
      equation: `${years} × 12 = ${months} months`,
    },
    {
      text: 'Share the balance equally among all the monthly payments.',
      equation: `${money(balance)} ÷ ${months} = ${money(monthlyPayment)}`,
    },
  ];
  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `A family is buying a ${item} priced at ${money(price)}.`,
      `Their first payment is a deposit of ${money(deposit)}.`,
      `They will pay the balance in equal monthly instalments for ${years} years.`,
      'There is no interest or extra charge.',
    ],
    prompt: 'How much will the family pay each month after the deposit?',
    answer: monthlyPayment.toFixed(2),
    unit: 'dollars',
    hint: 'Find the unpaid balance first. How many monthly payments are there in the stated number of years?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    proof: {
      op: '/',
      a: {op: '-', a: price, b: deposit},
      b: {op: '*', a: years, b: 12},
    },
  };
}
