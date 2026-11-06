import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-multiplicative-comparison',
  level: 2 as const,
  title: 'Compare two collections',
  objective: 'Use the smaller collection as one equal part to find a total, a difference or the value of one part.',
  skillIds: ['P2.S.MD.01', 'P2.S.MD.02', 'P2.S.AS.01'],
  canonicalPatternId: 'multiplicative-comparison',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['total', 'smaller', 'difference'] as const);
  const [first, second] = rng.pick([['Mei', 'Ravi'], ['Ida', 'Leon'], ['Asha', 'Ben']] as const);
  const unit = rng.pick(['beads', 'buttons', 'shells']);
  const factor = variant === 'smaller' ? rng.pick([3, 4, 5]) : rng.pick([2, 3, 4, 5]);
  const small = rng.pick([2, 3, 4, 5, 7, 10]);
  const large = factor * small;
  const difference = large - small;
  const comparison = `${second} has ${factor} times as many ${unit} as ${first}.`;

  if (variant === 'smaller') {
    const extraParts = factor - 1;
    return {
      key, unit,
      context: [comparison, `Each box in the model stands for the same number of ${unit}.`],
      picture: {
        type: 'paper', layout: 'bars',
        rows: [
          { label: first, parts: [{ size: 1, label: '?', tone: 'blue' }] },
          { label: second, parts: Array.from({ length: factor }, (_, i) => ({
            size: 1, label: '1 part', tone: i === 0 ? 'blue' as const : 'orange' as const,
          })) },
        ],
        caption: `The extra boxes in ${second}’s row stand for ${difference} ${unit} altogether.`,
      },
      prompt: `How many ${unit} does ${first} have?`,
      answer: String(small),
      hint: 'Match the first box in each row. How many boxes are left in the longer row?',
      workedSteps: [
        { text: `Count the boxes that extend past ${first}’s box.`, equation: `${factor} − 1 = ${extraParts}` },
        { text: `Share the extra ${unit} equally among those boxes to find one box.`, equation: `${difference} ÷ ${extraParts} = ${small}` },
      ],
      explanation: `The ${extraParts} extra boxes hold ${difference} ${unit} between them. One box holds ${small} ${unit}, so ${first} has ${small} ${unit}.`,
    };
  }

  const context = [`${first} has ${small} ${unit}.`, comparison];
  const findLarge = {
    text: `Count ${factor} groups of ${small} to find how many ${unit} ${second} has.`,
    equation: `${factor} × ${small} = ${large}`,
  };

  if (variant === 'total') {
    const total = large + small;
    return {
      key, context,
      prompt: `(a) How many ${unit} does ${second} have? (b) How many ${unit} do the two children have altogether?`,
      structuredResponse: {
        kind: 'number-pair', firstLabel: `(a) ${second} (${unit})`, secondLabel: `(b) Both children (${unit})`,
      },
      answer: JSON.stringify([String(large), String(total)]),
      hint: `Find ${second}’s count first. For the second answer, include ${first}’s collection too.`,
      workedSteps: [findLarge, { text: 'Add the two collections.', equation: `${large} + ${small} = ${total}` }],
      explanation: `${second} has ${large} ${unit}. Adding ${first}’s ${small} ${unit} gives ${total} ${unit} altogether.`,
    };
  }

  return {
    key, unit, context,
    prompt: `How many more ${unit} does ${second} have than ${first}?`,
    answer: String(difference),
    hint: `Find ${second}’s count. Then take away the number that matches ${first}’s collection.`,
    workedSteps: [findLarge, { text: `Subtract ${first}’s count to find how many more ${second} has.`, equation: `${large} − ${small} = ${difference}` }],
    explanation: `Of ${second}’s ${large} ${unit}, ${small} match ${first}’s collection. The other ${difference} are the extra ${unit}.`,
  };
}
