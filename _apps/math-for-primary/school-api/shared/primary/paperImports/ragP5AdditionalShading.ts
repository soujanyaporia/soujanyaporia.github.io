import type { Question } from '../generate';
import { Rng, hashString } from '../../engine/random';

export const RAG_PATTERN = {
  id: 'rag-p5-additional-shading',
  level: 5,
  title: 'Shade enough parts',
  objective: 'Find how many extra equal parts to shade from a shaded or unshaded target fraction.',
  skillIds: ['P5.S.FRAC.05', 'P4.S.FRAC.03'],
  canonicalPatternId: 'p5-additional-shading',
};

const TARGETS: readonly (readonly [number, number])[] = [
  [1, 4], [3, 4], [2, 5], [3, 5], [4, 5],
  [1, 6], [5, 6], [7, 8], [7, 10], [5, 12], [7, 12],
];

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const leaveUnshaded = ((hashString(String(seed)) + index) & 1) === 1;
  const [numerator, denominator] = r.pick(TARGETS);
  const total = r.pick([12, 20, 24, 30].filter(n => n % denominator === 0));
  const shadedNumerator = leaveUnshaded ? denominator - numerator : numerator;
  const requiredShading = (total / denominator) * shadedNumerator;
  const alreadyShaded = r.int(1, requiredShading - 1);
  const additional = requiredShading - alreadyShaded;
  const picture: NonNullable<Question['picture']> = {
    type: 'fraction', parts: total, filled: alreadyShaded,
  };

  const workedSteps: NonNullable<Question['workedSteps']> = [
    {
      text: 'Count all the equal parts, then count those already shaded.',
      equation: `${total} parts in all; ${alreadyShaded} already shaded`,
    },
  ];
  if (leaveUnshaded) {
    workedSteps.push({
      text: 'The shaded and unshaded fractions add up to one whole.',
      equation: `1 − ${numerator}/${denominator} = ${shadedNumerator}/${denominator}`,
    });
  }
  workedSteps.push(
    {
      text: 'Find how many parts need to be shaded altogether.',
      equation: `${total} ÷ ${denominator} × ${shadedNumerator} = ${requiredShading}`,
    },
    {
      text: 'Subtract the parts that are already shaded.',
      equation: `${requiredShading} − ${alreadyShaded} = ${additional}`,
    },
  );

  return {
    key,
    prompt: 'How many blank parts must you shade to reach the target shown?',
    context: [
      'The diagram shows one whole divided into equal parts. Keep every part that is already shaded.',
    ],
    display: `Target: ${numerator}/${denominator} of the whole ${leaveUnshaded ? 'left unshaded' : 'shaded'}`,
    picture,
    answer: String(additional),
    unit: 'parts',
    hint: leaveUnshaded
      ? 'First find the fraction that must be shaded. Use it to find the shaded count, then subtract the parts already shaded.'
      : 'Find the target number of shaded parts, then subtract the parts already shaded.',
    explanation: `${requiredShading} of the ${total} equal parts must be shaded. There are already ${alreadyShaded} shaded parts, so shade ${additional} more.`,
    workedSteps,
    proof: {
      op: '-',
      a: {
        op: '*',
        a: { op: '/', a: total, b: denominator },
        b: shadedNumerator,
      },
      b: alreadyShaded,
    },
  };
}
