import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-common-factor-lists',
  level: 4,
  title: 'Factors two numbers share',
  objective: 'Find every factor shared by two numbers and use the list to answer a question.',
  skillIds: ['P4.S.FACT.02'],
  canonicalPatternId: 'p4-common-factor-lists',
};

const forms = ['list', 'sum', 'list', 'count', 'list', 'sum', 'list', 'bags'] as const;
const multipliers: [number, number][] = [[2, 3], [3, 4], [2, 5], [4, 5], [5, 6], [5, 7], [3, 8]];

function factorPairs(total: number) {
  const factors = new Set<number>();
  const products: string[] = [];
  for (let small = 1; small * small <= total; small++) {
    if (total % small !== 0) continue;
    const large = total / small;
    factors.add(small);
    factors.add(large);
    products.push(`${small} × ${large}`);
  }
  return { factors: [...factors].sort((a, b) => a - b), equation: `${total} = ${products.join(' = ')}` };
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = (hashString(String(seed)) + Math.trunc(index)) % forms.length;
  const form = forms[(slot + forms.length) % forms.length];
  // These shared factors give between two and six entries in the list control.
  const scale = rng.pick([4, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
  const [left, right] = form === 'sum'
    ? [1, rng.int(2, 5)]
    : rng.pick(multipliers.filter(([, larger]) => scale * larger <= 100));
  const first = scale * left;
  const second = scale * right;
  const a = factorPairs(first);
  const b = factorPairs(second);
  const shared = a.factors.filter(factor => b.factors.includes(factor));
  const list = shared.join(', ');
  const largest = shared[shared.length - 1];
  const workedSteps = [
    { text: `Find the pairs that multiply to ${first}.`, equation: a.equation },
    { text: `Do the same for ${second}.`, equation: b.equation },
    { text: `Keep each number that appears in both sets of pairs. In order, these are ${list}.` },
  ];
  const base = {
    key,
    hint: 'Start with one times the number. Find the other factor pairs for each number, then compare the two lists.',
    workedSteps,
    explanation: `The numbers that divide both ${first} and ${second} exactly are ${list}.`,
  };

  if (form === 'list') {
    return {
      ...base,
      prompt: `Write all the factors that ${first} and ${second} have in common. Start with the smallest.`,
      structuredResponse: { kind: 'number-fields', fields: shared.map((_, i) => ({ label: `Factor ${i + 1}` })) },
      answer: JSON.stringify(shared.map(String)),
    };
  }
  if (form === 'sum') {
    const sum = shared.reduce((total, factor) => total + factor, 0);
    const equation = `${shared.join(' + ')} = ${sum}`;
    return {
      ...base,
      prompt: `Add all the different factors that ${first} and ${second} share. Which total do you get?`,
      answer: String(sum),
      choices: rng.shuffle([sum, sum - 1, sum - largest, sum + largest].map(String)),
      explanation: `${base.explanation} Adding them gives ${sum}.`,
      workedSteps: [...workedSteps, { text: 'Add each shared factor once.', equation }],
    };
  }
  if (form === 'count') {
    return {
      ...base,
      prompt: `How many different factors do ${first} and ${second} have in common?`,
      answer: String(shared.length),
      explanation: `${base.explanation} There are ${shared.length} in the list.`,
      workedSteps: [...workedSteps, { text: `Count each number in the shared list once. There are ${shared.length} common factors.` }],
    };
  }
  return {
    ...base,
    context: [
      `Lina has ${first} red counters and ${second} blue counters. She puts them all into bags.`,
      'Every bag must have the same number of red counters as every other bag. The same rule applies to the blue counters.',
    ],
    prompt: 'What is the greatest number of bags Lina can fill this way?',
    unit: 'bags',
    answer: String(largest),
    hint: 'The number of bags must divide both colour totals exactly. Look for the largest number that works.',
    explanation: `${base.explanation} The largest is ${largest}, so Lina can fill ${largest} bags.`,
    workedSteps: [...workedSteps,
      { text: `The number of bags must divide both totals. The greatest number in the shared list is ${largest}.` },
      { text: 'Check how many counters of each colour go in one bag.', equation: `${first} ÷ ${largest} = ${first / largest} red and ${second} ÷ ${largest} = ${second / largest} blue` },
    ],
  };
}
