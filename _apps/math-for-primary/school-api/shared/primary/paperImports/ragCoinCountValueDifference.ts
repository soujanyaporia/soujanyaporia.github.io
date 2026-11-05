import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p5-coin-count-value-difference',
  level: 5,
  title: 'Work out a coin collection',
  objective: 'Use a coin-count multiple and a difference in value to find a difference in counts and a total amount.',
  skillIds: ['P5.S.WN.02', 'P3.S.MONEY.01'],
  canonicalPatternId: 'coin-count-multiple-and-value-difference',
};

const money = (cents: number): string =>
  `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, '0')}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const name = r.pick(['Aina', 'Harish', 'Mina', 'Ravi']);
  const multiple = r.pick([3, 5, 6]);
  const groups = r.int(12, 64);
  const smallValuePerGroup = multiple * 20;
  const gapPerGroup = smallValuePerGroup - 50;
  const gapCents = groups * gapPerGroup;
  const extraCoins = groups * (multiple - 1);
  const valuePerGroup = smallValuePerGroup + 50;
  const totalCents = groups * valuePerGroup;

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: `Make equal groups with ${multiple} 20-cent coins and one 50-cent coin in each group. Find the value of the 20-cent coins in one group.`,
      equation: `${multiple} × 20 = ${smallValuePerGroup} cents`,
    },
    {
      text: 'Find how much more the 20-cent coins are worth in each group.',
      equation: `${smallValuePerGroup} − 50 = ${gapPerGroup} cents`,
    },
    {
      text: 'Write the given difference in cents.',
      equation: `$${money(gapCents)} = ${gapCents} cents`,
    },
    {
      text: 'Find the number of groups. Each group contains one 50-cent coin.',
      equation: `${gapCents} ÷ ${gapPerGroup} = ${groups} groups`,
    },
    {
      text: `(a) Each group has ${multiple - 1} more 20-cent coins than 50-cent coins.`,
      equation: `${groups} × (${multiple} − 1) = ${extraCoins} coins`,
    },
    {
      text: '(b) Find the value of all the coins in one group.',
      equation: `${smallValuePerGroup} + 50 = ${valuePerGroup} cents`,
    },
    {
      text: 'Find the value of all the groups and convert cents to dollars.',
      equation: `${groups} × ${valuePerGroup} = ${totalCents} cents = $${money(totalCents)}`,
    },
  ];

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `${name} has only 20-cent coins and 50-cent coins in a purse.`,
      `For every 50-cent coin, there are ${multiple} 20-cent coins.`,
      `The 20-cent coins are worth $${money(gapCents)} more altogether than the 50-cent coins.`,
    ],
    prompt: '(a) How many more 20-cent coins than 50-cent coins are in the purse? (b) What is the total value of all the coins, in dollars?',
    answer: JSON.stringify([String(extraCoins), money(totalCents)]),
    structuredResponse: {
      kind: 'number-fields',
      fields: [
        {label: '(a) Extra 20-cent coins (coins)'},
        {label: '(b) Total value ($)', decimal: true},
      ],
    },
    hint: `Make a group of ${multiple} 20-cent coins and one 50-cent coin. Compare their values to work out how many groups there are.`,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' '),
    workedSteps,
  };
}
