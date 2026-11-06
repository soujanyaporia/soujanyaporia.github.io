import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-two-amounts-and-their-difference',
  level: 2 as const,
  title: 'Find the other amount and the total',
  objective: 'Use the smaller amount and the difference to find the larger amount, then add both amounts and give the total in dollars.',
  skillIds: ['P2.S.AS.01', 'P2.S.MONEY.03'],
  canonicalPatternId: 'p2-two-amounts-and-their-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  if (rng.chance(0.5)) {
    const smaller = rng.pick([14, 16, 19, 21, 23, 25, 27, 29, 32, 34, 36]);
    const gap = rng.int(3, 9);
    const larger = smaller + gap;
    const total = smaller + larger;
    return {
      key,
      context: [`There is $${smaller} in Asha's purse.`, `That is $${gap} less than the amount in Ben's purse.`],
      prompt: 'If Asha and Ben put their money together, how many dollars will they have?',
      answer: String(total), unit: 'dollars',
      hint: 'Whose purse has more money? Find that amount before adding the money in both purses.',
      workedSteps: [
        { text: 'Ben has more than Asha. Add the difference to find his amount.', equation: `$${smaller} + $${gap} = $${larger}` },
        { text: 'Add the money in the two purses.', equation: `$${smaller} + $${larger} = $${total}` },
      ],
      explanation: `Ben has $${larger}. With Asha's $${smaller}, that makes $${total}.`,
    };
  }

  const saturday = rng.pick([55, 60, 65, 70]);
  const extra = rng.pick([5, 10, 15, 20, 25]);
  const sunday = saturday + extra;
  const totalCents = saturday + sunday;
  const dollars = (totalCents / 100).toFixed(2);
  return {
    key,
    context: [`On Saturday, Ravi put ${saturday}¢ in his jar.`, `On Sunday, he put in ${extra}¢ more than he did on Saturday.`],
    prompt: '(a) How many cents did Ravi put in on Sunday? (b) How much did he put in over the two days? Give the total in dollars.',
    structuredResponse: { kind: 'number-fields', fields: [{ label: '(a) Sunday (cents)' }, { label: '(b) Both days (dollars)', decimal: true }] },
    answer: JSON.stringify([String(sunday), dollars]),
    hint: 'The extra cents are only part of Sunday’s deposit. Find the whole deposit, then count the money from both days.',
    workedSteps: [
      { text: 'Start with Saturday’s amount and add the extra cents to find Sunday’s amount.', equation: `${saturday}¢ + ${extra}¢ = ${sunday}¢` },
      { text: 'Add the two deposits.', equation: `${saturday}¢ + ${sunday}¢ = ${totalCents}¢` },
      { text: 'Make one dollar from 100 cents. Keep the cents left over.', equation: `${totalCents}¢ = 100¢ + ${totalCents - 100}¢ = $${dollars}` },
    ],
    explanation: `Ravi put in ${sunday}¢ on Sunday. The two deposits make ${totalCents}¢, so the total in dollars is $${dollars}.`,
  };
}
