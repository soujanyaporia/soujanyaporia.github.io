import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-multiple-with-an-additive-change',
  level: 3,
  title: 'Compare two jars of beads',
  objective: 'Use a comparison before or after beads are added to find a jar’s count, then combine the counts when asked.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.03', 'P3.S.MD.04'],
  canonicalPatternId: 'p3-multiple-with-an-additive-change',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const form = rng.pick(['starting multiple', 'smaller count', 'linked counts']);
  const green = rng.int(24, 57);
  const factor = rng.int(2, 7);
  const added = rng.int(13, 22);
  const change = `Mei puts ${added} more beads into the blue jar.`;

  if (form === 'starting multiple') {
    const blueBefore = factor * green;
    const blueNow = blueBefore + added;
    return {
      key,
      context: [
        `The green jar starts with ${green} beads.`,
        `At first, the blue jar has ${factor} times as many beads as the green jar.`,
        change,
      ],
      prompt: 'How many beads are in the blue jar now?',
      answer: String(blueNow),
      unit: 'beads',
      hint: 'Find how many beads were in the blue jar before Mei added any.',
      workedSteps: [
        { text: 'Find the starting count in the blue jar.', equation: `${factor} × ${green} = ${blueBefore} beads` },
        { text: 'Add the beads Mei puts in.', equation: `${blueBefore} + ${added} = ${blueNow} beads` },
      ],
      explanation: `The blue jar started with ${blueBefore} beads. Adding ${added} brings its count to ${blueNow}.`,
    };
  }

  // Build the final comparison first so the visible division is always exact.
  const blueNow = factor * green;
  const blueBefore = blueNow - added;
  const common = {
    key,
    context: [
      `The blue jar starts with ${blueBefore} beads.`,
      change,
      `Now, the blue jar has ${factor} times as many beads as the green jar.`,
    ],
    hint: 'First count the beads in the blue jar after Mei adds more. How many beads would be in one equal group?',
    workedSteps: [
      { text: 'Find the new count in the blue jar.', equation: `${blueBefore} + ${added} = ${blueNow} beads` },
      { text: `The blue jar now holds ${factor} equal groups of the green jar’s beads. Find the size of one group.`, equation: `${blueNow} ÷ ${factor} = ${green} beads` },
    ],
    explanation: `The blue jar now has ${blueNow} beads. Dividing that count by ${factor} gives ${green} beads in the green jar.`,
  };
  if (form === 'smaller count') {
    return { ...common, prompt: 'How many beads are in the green jar?', unit: 'beads', answer: String(green) };
  }

  const together = blueNow + green;
  return {
    ...common,
    prompt: '(a) How many beads are in the green jar?\n(b) How many beads are in the two jars altogether now? Show your working for both parts.',
    structuredResponse: {
      kind: 'number-pair',
      firstLabel: '(a) Green jar (beads)',
      secondLabel: '(b) Both jars now (beads)',
    },
    answer: JSON.stringify([String(green), String(together)]),
    workedSteps: [...common.workedSteps,
      { text: 'Add the green jar’s count to the new count in the blue jar.', equation: `${blueNow} + ${green} = ${together} beads` },
    ],
    explanation: `${common.explanation} Together the two jars hold ${together} beads.`,
  };
}
