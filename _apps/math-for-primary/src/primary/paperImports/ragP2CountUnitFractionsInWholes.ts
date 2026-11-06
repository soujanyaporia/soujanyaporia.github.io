import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-rag-count-unit-fractions-in-wholes',
  level: 2,
  title: 'Count fraction pieces',
  objective: 'Use the name of a unit fraction to count its pieces in one whole and in several equal-sized wholes.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.MD.01'],
  canonicalPatternId: 'p2-count-unit-fractions-in-wholes',
} as const;

const units = [
  { name: 'halves', denominator: 2 },
  { name: 'thirds', denominator: 3 },
  { name: 'fifths', denominator: 5 },
  { name: 'tenths', denominator: 10 },
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const { name, denominator } = rng.pick(units);
  const strips = rng.pick([2, 4, 5, 7, 8]);
  const total = strips * denominator;
  const workedSteps = [
    {
      text: `Cutting one strip into ${name} makes ${denominator} equal pieces. Each piece is 1/${denominator} of that strip.`,
      equation: `1 whole = ${denominator} ${name}`,
    },
    {
      text: `Count a group of ${denominator} pieces for each of the ${strips} strips.`,
      equation: `${strips} × ${denominator} = ${total}`,
    },
  ];
  const base = {
    key,
    context: [`There are ${strips} paper strips, all the same length.`, `Each strip is cut into ${name}.`],
    hint: `Think about how many ${name} fit in one whole strip. Count that many for each strip.`,
    workedSteps,
    explanation: `One strip gives ${denominator} ${name}. The ${strips} strips give ${strips} × ${denominator} = ${total} ${name} altogether.`,
  };
  const totalPrompt = 'How many pieces come from all the strips together?';
  if (rng.chance(0.5)) {
    return {
      ...base,
      prompt: `How many pieces come from one strip? ${totalPrompt}`,
      structuredResponse: {
        kind: 'number-pair',
        firstLabel: `From 1 strip (${name})`,
        secondLabel: `From all ${strips} strips (${name})`,
      },
      answer: JSON.stringify([String(denominator), String(total)]),
    };
  }
  return {
    ...base,
    prompt: totalPrompt,
    unit: name,
    answer: String(total),
    proof: { op: '*', a: strips, b: denominator },
  };
}
