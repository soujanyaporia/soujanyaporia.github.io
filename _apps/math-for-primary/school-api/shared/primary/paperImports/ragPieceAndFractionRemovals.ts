import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-rag-piece-and-fraction-removals',
  level: 3,
  title: 'How much of the strip?',
  objective: 'Use equal pieces and a fraction of the original strip to find the fraction saved or used.',
  skillIds: ['P3.S.FRAC.01', 'P3.S.FRAC.05', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p3-removals-in-pieces-and-fractions',
};

function commonFactor(a: number, b: number): number {
  return b === 0 ? a : commonFactor(b, a % b);
}

function pieces(count: number): string {
  return `${count} ${count === 1 ? 'piece' : 'pieces'}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const total = rng.pick([6, 10, 12]);
  const divisors = Array.from({ length: total - 1 }, (_, i) => i + 2).filter(d => total % d === 0);
  const denominator = rng.pick(divisors);
  const knownFraction = `1/${denominator}`;
  const knownPieces = total / denominator;
  const availableForCrafts = total - knownPieces - 1;
  const first = rng.int(1, availableForCrafts - 1);
  const second = rng.int(1, availableForCrafts - first);
  const craftPieces = first + second;
  const missingPieces = total - craftPieces - knownPieces;
  const each = first === second;
  const findCrown = rng.chance(0.5);
  const requireSimplified = findCrown || !each;
  const factor = commonFactor(missingPieces, total);
  const answer = `${missingPieces / factor}/${total / factor}`;
  const context = [
    `Jia cuts one paper strip into ${total} equal pieces.`,
    each
      ? `She uses ${pieces(first)} on each of two kites.`
      : `She uses ${pieces(first)} on a kite and ${pieces(second)} on a mask.`,
    findCrown
      ? `She uses some of the other pieces for a paper crown and saves the rest. The pieces she saves make up ${knownFraction} of the original strip.`
      : `She uses ${knownFraction} of the original strip for a paper crown and saves the rest.`,
  ];
  const target = findCrown
    ? 'What fraction of the original strip does Jia use for the crown?'
    : 'What fraction of the original strip does Jia save?';
  const workedSteps = [
    {
      text: each ? 'Count the pieces on both kites.' : 'Count the pieces on the kite and the mask.',
      equation: each ? `2 × ${first} = ${craftPieces}` : `${first} + ${second} = ${craftPieces}`,
    },
    {
      text: `Each piece is 1/${total} of the original strip. Write the part already on the ${each ? 'kites' : 'kite and mask'} as a fraction.`,
      equation: `${craftPieces} out of ${total} equal pieces = ${craftPieces}/${total}`,
    },
    {
      text: `Count the ${findCrown ? 'saved part' : 'part for the crown'} in pieces of the same size.`,
      equation: knownPieces === 1 ? `${knownFraction} of the strip = 1 piece` : `${knownFraction} = ${knownPieces}/${total}`,
    },
    {
      text: findCrown
        ? 'Take away the pieces on the crafts and the pieces Jia saves. The rest go into the crown.'
        : 'Take away the pieces on the crafts and the crown to find the part Jia saves.',
      equation: `${total}/${total} − ${craftPieces}/${total} − ${knownPieces}/${total} = ${missingPieces}/${total}`,
    },
  ];
  if (factor > 1) {
    workedSteps.push({
      text: `Divide the top and bottom by ${factor} to write the same fraction in simplest form.`,
      equation: `${missingPieces}/${total} = ${answer}`,
    });
  }
  return {
    key, context, answer, requireSimplified, workedSteps,
    prompt: target + (requireSimplified ? ' Write your answer in simplest form.' : ''),
    hint: 'Use the number of pieces in the original strip as the denominator. Which two parts of the strip do you know?',
    explanation: workedSteps.map(step => `${step.text} ${step.equation}`).join(' '),
    proof: {
      op: '-',
      a: { op: '-', a: 1, b: { op: '/', a: { op: '+', a: first, b: second }, b: total } },
      b: { op: '/', a: 1, b: denominator },
    },
  };
}
