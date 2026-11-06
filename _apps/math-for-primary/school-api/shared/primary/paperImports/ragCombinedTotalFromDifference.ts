import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-combined-total-from-difference',
  level: 1,
  title: 'How many do they have together?',
  objective: 'Use a more or fewer clue to find one child’s quantity, then add both children’s quantities.',
  skillIds: ['P1.S.AS.01', 'P1.S.AS.04', 'P1.S.AS.05'],
  canonicalPatternId: 'p1-combined-total-from-difference',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['fewer-linked', 'more-total', 'more-linked'] as const);
  const { first, second, unit } = rng.pick([
    { first: 'Amir', second: 'Jia', unit: 'points' },
    { first: 'Mei', second: 'Dev', unit: 'stamps' },
    { first: 'Asha', second: 'Ben', unit: 'shells' },
  ]);
  const known = rng.pick([9, 12, 14, 17, 19, 22, 26, 28, 32, 35, 39, 46]);
  const gap = rng.pick([3, 4, 6, 7]);
  const fewer = form === 'fewer-linked';
  const other = fewer ? known - gap : known + gap;
  const total = known + other;
  const totalPrompt = `How many ${unit} do ${first} and ${second} have together?`;
  const otherPrompt = `How many ${unit} does ${second} have?`;
  const linked = form !== 'more-total';
  const comparison = `${known} ${fewer ? '−' : '+'} ${gap} = ${other}`;
  const addition = `${known} + ${other} = ${total}`;

  return {
    key,
    context: [
      `${first} has ${known} ${unit}.`,
      `${second} has ${gap} ${fewer ? 'fewer' : 'more'} ${unit} than ${first}.`,
    ],
    prompt: `${linked ? otherPrompt + ' ' : ''}${totalPrompt} Write a number sentence for each step on paper.`,
    hint: `Start with ${first}’s ${unit}. Does ${second} have more or fewer? Find ${second}’s number before you add the two amounts.`,
    workedSteps: [
      {
        text: fewer
          ? `Subtract ${gap} from ${first}’s number to find how many ${unit} ${second} has.`
          : `Add ${gap} to ${first}’s number to find how many ${unit} ${second} has.`,
        equation: comparison,
      },
      { text: `Count both children’s ${unit} by adding their two amounts.`, equation: addition },
    ],
    explanation: `${comparison}, so ${second} has ${other} ${unit}. Together they have ${total} ${unit} because ${addition}.`,
    ...(linked ? {
      structuredResponse: {
        kind: 'number-pair' as const,
        firstLabel: `${second}’s ${unit}`,
        secondLabel: `Total ${unit}`,
      },
      answer: JSON.stringify([String(other), String(total)]),
    } : {
      unit,
      answer: String(total),
      proof: { op: '+' as const, a: known, b: { op: '+' as const, a: known, b: gap } },
    }),
  };
}
