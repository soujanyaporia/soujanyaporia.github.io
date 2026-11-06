import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-count-ratios-total-value',
  level: 5,
  title: 'Find counts and amounts using equal groups',
  objective: 'Use the value of a matching group to find item counts, expenditure differences or the value of coins with equal subtotals.',
  skillIds: ['P5.S.RATE.02', 'P5.S.WN.02'],
  canonicalPatternId: 'p5-count-ratios-and-total-value',
} as const;

const money = (dollars: number): string => dollars.toFixed(2);
const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = r.int(0, 3);
  const name = r.pick(['Nadia', 'Arun', 'Mei', 'Hana', 'Ravi']);
  const make = (
    prompt: string,
    context: string[],
    answer: string,
    unit: string,
    hint: string,
    workedSteps: Steps,
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    prompt,
    context,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  });

  // Two response tasks use the same purchase-group relationship.
  if (variant === 0 || variant === 1) {
    // Counts per group, then the two unit prices in dollars.
    // Every group costs a multiple of $10, with unequal category subtotals.
    const [a, b, notebookPrice, casePrice] = r.pick([
      [2, 1, 2, 6],
      [3, 1, 2, 4],
      [4, 1, 2, 12],
      [3, 2, 2, 7],
      [4, 3, 3, 6],
      [3, 2, 4, 9],
      [5, 2, 2, 15],
      [2, 3, 3, 8],
      [4, 3, 6, 2],
      [5, 2, 6, 5],
    ] as const);
    const groups = r.int(3, 24);
    const groupValue = a * notebookPrice + b * casePrice;
    const total = groups * groupValue;
    const notebooks = groups * a;
    const cases = groups * b;
    const notebookSpend = notebooks * notebookPrice;
    const caseSpend = cases * casePrice;
    const context = [
      `${name} buys only notebooks and pencil cases.`,
      `For every ${a} notebooks, ${name} buys ${b} pencil ${b === 1 ? 'case' : 'cases'}.`,
      `A notebook costs $${money(notebookPrice)} and a pencil case costs $${money(casePrice)}.`,
      `The total bill is $${money(total)}.`,
    ];
    const steps: Steps = [
      {
        text: `One matching group has ${a} notebooks and ${b} pencil ${b === 1 ? 'case' : 'cases'}. Find its cost.`,
        equation: `${a} × $${money(notebookPrice)} + ${b} × $${money(casePrice)} = $${money(groupValue)}`,
      },
      {
        text: 'Divide the total bill by the cost of one matching group.',
        equation: `$${money(total)} ÷ $${money(groupValue)} = ${groups} groups`,
      },
    ];
    if (variant === 1) {
      const askNotebooks = r.pick([true, false]);
      const item = askNotebooks ? 'notebooks' : 'pencil cases';
      const perGroup = askNotebooks ? a : b;
      const count = askNotebooks ? notebooks : cases;
      steps.push({
        text: `Find the number of ${item} in all the groups.`,
        equation: `${groups} × ${perGroup} = ${count} ${item}`,
      });
      return make(
        `How many ${item} does ${name} buy?`,
        context,
        String(count),
        item,
        'Find the cost of a matching group, then use the total bill to find how many groups were bought.',
        steps,
      );
    }
    steps.push(
      {
        text: 'Find how many of each item were bought.',
        equation: `${groups} × ${a} = ${notebooks} notebooks; ${groups} × ${b} = ${cases} pencil cases`,
      },
      {
        text: 'Find the amount spent on notebooks.',
        equation: `${notebooks} × $${money(notebookPrice)} = $${money(notebookSpend)}`,
      },
      {
        text: 'Find the amount spent on pencil cases.',
        equation: `${cases} × $${money(casePrice)} = $${money(caseSpend)}`,
      },
      {
        text: 'Subtract the smaller amount spent from the larger amount.',
        equation: `$${money(Math.max(notebookSpend, caseSpend))} − $${money(Math.min(notebookSpend, caseSpend))} = $${money(Math.abs(notebookSpend - caseSpend))}`,
      },
    );
    return make(
      `What is the difference between the amounts ${name} spends on notebooks and on pencil cases? Give your answer in dollars.`,
      context,
      money(Math.abs(notebookSpend - caseSpend)),
      'dollars',
      'Find the cost of one matching group. Use the number of groups to find each amount spent, then subtract.',
      steps,
    );
  }

  if (variant === 2) {
    const multiple = r.pick([2, 4]);
    const coins = r.int(8, 40);
    const notesValue = multiple * 2;
    const groupValue = notesValue + 1;
    const total = coins * groupValue;
    return make(
      'How many $1 coins are in the tin?',
      [
        `${name} keeps only $1 coins and $2 notes in a tin.`,
        `There are ${multiple} notes for every $1 coin.`,
        `The money in the tin totals $${money(total)}.`,
      ],
      String(coins),
      'coins',
      'Make a matching group containing one $1 coin and the stated number of $2 notes. Find the value of this group.',
      [
        {
          text: `Each matching group has ${multiple} notes. Find their value.`,
          equation: `${multiple} × $2 = $${notesValue}`,
        },
        {
          text: 'Add the value of the one coin in the group.',
          equation: `$${notesValue} + $1 = $${groupValue}`,
        },
        {
          text: 'Find the number of groups. Each group contains exactly one $1 coin.',
          equation: `$${money(total)} ÷ $${money(groupValue)} = ${coins} coins`,
        },
      ],
    );
  }

  const [low, high] = r.pick([[10, 20], [10, 50], [20, 50]] as const);
  const commonFactor = gcd(low, high);
  const lowPerGroup = high / commonFactor;
  const highPerGroup = low / commonFactor;
  const groupCount = lowPerGroup + highPerGroup;
  const groups = r.int(6, 24);
  const totalCount = groups * groupCount;
  const equalCents = lowPerGroup * low;
  const groupCents = equalCents * 2;
  const totalCents = groups * groupCents;
  return make(
    'What is the value of all the coins, in dollars?',
    [
      `${name} has only ${low}-cent coins and ${high}-cent coins.`,
      `The ${low}-cent coins are worth the same amount altogether as the ${high}-cent coins.`,
      `There are ${totalCount} coins in all.`,
    ],
    money(totalCents / 100),
    'dollars',
    'Find the smallest equal amounts that can be made with the two kinds of coins. Use those coin counts to form a matching group.',
    [
      {
        text: 'Match the smallest equal values made with each kind of coin.',
        equation: `${lowPerGroup} × ${low} cents = ${highPerGroup} × ${high} cents = ${equalCents} cents`,
      },
      {
        text: 'Count the coins in one matching group.',
        equation: `${lowPerGroup} + ${highPerGroup} = ${groupCount} coins`,
      },
      {
        text: 'Use the total number of coins to find the number of groups.',
        equation: `${totalCount} ÷ ${groupCount} = ${groups} groups`,
      },
      {
        text: 'Add the two equal amounts to find the value of one group.',
        equation: `${equalCents} + ${equalCents} = ${groupCents} cents`,
      },
      {
        text: 'Find the value of all the groups.',
        equation: `${groups} × ${groupCents} = ${totalCents} cents`,
      },
      {
        text: 'Convert cents to dollars using 100 cents for each dollar.',
        equation: `${totalCents} ÷ 100 = $${money(totalCents / 100)}`,
      },
    ],
  );
}
