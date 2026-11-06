import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-money-parts-and-total',
  level: 2 as const,
  title: 'Find a missing amount or a total',
  objective: 'Work in cents to find a missing part or a two-day total, then write the answer in the unit requested.',
  skillIds: ['P2.S.AS.01', 'P2.S.MONEY.03', 'P2.S.MONEY.01'],
  canonicalPatternId: 'parts-and-total',
};

const dollars = (cents: number) => (cents / 100).toFixed(2);
const jarAmounts = [5, 10, 15, 20, 25, 30, 35, 40, 45, 55, 65, 70, 75, 80, 85, 90, 95];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));

  if ((hashString(String(seed)) + index) % 2 === 0) {
    const saved = rng.pick(jarAmounts);
    const needed = 100 - saved;
    return {
      key,
      context: ['Mei wants to save $1 in her jar.', `She has put ${saved}¢ in the jar so far.`],
      prompt: 'How much more must Mei put in the jar? Give your answer in dollars.',
      unit: 'dollars',
      answer: dollars(needed),
      hint: 'How many cents make one dollar? Count on from the amount in the jar.',
      workedSteps: [
        { text: 'Write the goal in cents.', equation: '$1 = 100¢' },
        { text: 'Take away the amount already in the jar.', equation: `100¢ − ${saved}¢ = ${needed}¢` },
        { text: 'Write the missing amount in dollars.', equation: `${needed}¢ = $${dollars(needed)}` },
      ],
      explanation: `Another ${needed}¢ brings Mei's savings to 100¢. She needs $${dollars(needed)} more.`,
      proof: { op: '/', a: { op: '-', a: 100, b: saved }, b: 100 },
    };
  }

  const friday = 5 * rng.int(11, 15);
  const extra = rng.pick([5, 10, 15, 20, 25].filter(cents => friday + cents < 100));
  const saturday = friday + extra;
  const total = friday + saturday;
  return {
    key,
    context: [`Dana saves ${friday}¢ on Friday.`, `On Saturday she saves ${extra}¢ more than on Friday.`],
    prompt: '(a) How many cents does Dana save on Saturday? (b) How much does she save over both days, in dollars? Write a number sentence for each part on paper.',
    structuredResponse: {
      kind: 'number-fields',
      fields: [{ label: '(a) Saturday (cents)' }, { label: '(b) Both days (dollars)', decimal: true }],
    },
    answer: JSON.stringify([String(saturday), dollars(total)]),
    hint: 'Find what Dana saves on Saturday first. Which two amounts should you add for both days?',
    workedSteps: [
      { text: 'Add the extra cents to Friday’s saving to find Saturday’s saving.', equation: `${friday}¢ + ${extra}¢ = ${saturday}¢` },
      { text: 'Add the full amounts for Friday and Saturday.', equation: `${friday}¢ + ${saturday}¢ = ${total}¢` },
      { text: 'Group 100 cents into one dollar and keep the cents left over.', equation: `${total}¢ = 100¢ + ${total - 100}¢ = $${dollars(total)}` },
    ],
    explanation: `Dana saves ${saturday}¢ on Saturday. Counting Friday’s ${friday}¢ as well gives ${total}¢, or $${dollars(total)}.`,
  };
}
