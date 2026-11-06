import { hashString, Rng } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-common-base-quantities',
  level: 3,
  title: 'Find the smallest of three collections',
  objective: 'Use two successive differences and a total to find the smallest collection.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-three-quantities-with-a-common-base',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const [small, middle, large] = rng.shuffle(['red', 'blue', 'green']);
  const [firstGap, secondGap] = rng.shuffle([rng.int(4, 14), rng.int(17, 23)]);
  const smallest = rng.int(72, 145);
  const middleCount = smallest + firstGap;
  const largest = middleCount + secondGap;
  const total = smallest + middleCount + largest;

  const largeExtra = firstGap + secondGap;
  const bothExtras = firstGap + largeExtra;
  const equalTotal = total - bothExtras;
  const workedSteps = [
    {
      text: `The ${large} tin has more buttons than the ${middle} tin, which already has more than the ${small} tin. Add both differences to compare the ${large} tin with the ${small} tin.`,
      equation: `${firstGap} + ${secondGap} = ${largeExtra}`,
    },
    {
      text: `The ${middle} tin has ${firstGap} extra buttons and the ${large} tin has ${largeExtra} extra buttons compared with the ${small} tin. Count all the extra buttons.`,
      equation: `${firstGap} + ${largeExtra} = ${bothExtras}`,
    },
    {
      text: 'Take those extra buttons out of the total. Each tin now holds the same number.',
      equation: `${total} − ${bothExtras} = ${equalTotal}`,
    },
    {
      text: `Divide by three to find how many buttons are in the ${small} tin.`,
      equation: `${equalTotal} ÷ 3 = ${smallest}`,
    },
  ];

  return {
    key,
    context: [
      `The red, blue and green tins hold ${total} buttons altogether.`,
      `The ${middle} tin has ${firstGap} more buttons than the ${small} tin.`,
      `The ${large} tin has ${secondGap} more buttons than the ${middle} tin.`,
    ],
    prompt: `How many buttons are in the ${small} tin?`,
    unit: 'buttons',
    answer: String(smallest),
    hint: 'How many buttons would you take from each fuller tin so that all three tins had as many as the smallest one?',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join('\n'),
  };
}
