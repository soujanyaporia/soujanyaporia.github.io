import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p4-indexed-common-multiples',
  level: 4,
  title: 'Find the next common multiples',
  objective: 'Find the first common multiple and use it to list, locate or add common multiples.',
  skillIds: ['P4.S.FACT.03'],
  canonicalPatternId: 'p4-indexed-common-multiples',
};

const pairs = [
  [2, 7], [3, 4], [3, 7], [3, 8], [3, 9], [4, 5],
  [4, 8], [4, 9], [5, 6], [5, 7], [6, 8], [6, 9],
] as const;
const positions = ['second', 'third', 'fourth'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const [a, b] = rng.pick(pairs);
  const variant = rng.pick(['pair', 'position', 'sum'] as const);
  const position = variant === 'position' ? rng.int(2, 4) : 2;

  let first = b;
  const tried: number[] = [b];
  while (first % a !== 0) {
    first += b;
    tried.push(first);
  }
  const terms = Array.from({ length: position }, (_, i) => (i + 1) * first);
  const last = position * first;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    { text: `Count in steps of ${b} until you reach a multiple of ${a}.`, equation: tried.join(', ') },
    { text: `${first} is the first number in both lists.`, equation: `${a} × ${first / a} = ${b} × ${first / b} = ${first}` },
    { text: `The common multiples go up in steps of ${first}. They start ${terms.join(', ')}.`, equation: `${position} × ${first} = ${last}` },
  ];

  let response: Pick<Question, 'prompt' | 'answer' | 'choices' | 'structuredResponse'>;
  if (variant === 'pair') {
    response = {
      prompt: 'Write the two smallest numbers that appear in both lists. Put the smaller one first.',
      structuredResponse: { kind: 'number-pair', firstLabel: 'Smallest', secondLabel: 'Next smallest' },
      answer: JSON.stringify([String(first), String(last)]),
    };
  } else if (variant === 'position') {
    response = {
      prompt: `List the shared numbers from smallest to largest. Which number comes ${positions[position - 2]}?`,
      answer: String(last),
    };
  } else {
    const sum = first + last;
    workedSteps.push({ text: 'Add the two smallest shared numbers.', equation: `${first} + ${last} = ${sum}` });
    response = {
      prompt: 'Find the two smallest numbers that appear in both lists. Which choice gives their sum?',
      answer: String(sum),
      choices: rng.shuffle([first, last, sum, 2 * last].map(String)),
    };
  }

  return {
    key,
    context: [`Make two lists of positive multiples, one for ${a} and one for ${b}.`],
    ...response,
    hint: 'Start each list at its table number. Look for the first match, then use it to count on to the next match.',
    workedSteps,
    explanation: workedSteps.map(step => [step.text, step.equation].filter(Boolean).join(' ')).join(' '),
  };
}
