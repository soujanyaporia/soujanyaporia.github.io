import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-compare-and-order-fractions',
  level: 2,
  title: 'Put fractions in order',
  objective: 'Order three unit fractions and find the smallest or greatest of four fractions with the same denominator.',
  skillIds: ['P2.S.FRAC.03', 'P2.S.FRAC.04'],
  canonicalPatternId: 'compare-and-order-fractions',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = ((hashString(String(seed)) + index) >>> 0) % 4;

  if (variant < 2) {
    const ascending = variant === 0;
    const direction = ascending ? 'smallest to greatest' : 'greatest to smallest';
    const denominators = rng.shuffle([2, 3, 4, 5, 6, 8, 9, 10, 11, 12]).slice(0, 3);
    const ranked = [...denominators].sort((a, b) => ascending ? b - a : a - b);
    const ordered = ranked.map(d => `1/${d}`);
    const order = denominators.map(d => `1/${d}`);
    if (order.join(',') === ordered.join(',')) [order[0], order[1]] = [order[1], order[0]];

    const firstPart = ascending ? 'smallest' : 'largest';
    const chain = ordered.join(ascending ? ' < ' : ' > ');
    return {
      key,
      prompt: `Tap all three fractions from ${direction}.`,
      order,
      answer: ordered.join(','),
      hint: `Think of cutting equal-sized cakes into different numbers of equal slices. Which cake has the ${firstPart} slices?`,
      workedSteps: [
        { text: 'Each fraction stands for one piece. Splitting the same whole into more equal pieces makes each piece smaller.' },
        { text: `Compare the bottom numbers. One of ${ranked[0]} equal pieces is the ${firstPart} piece here.`, equation: ranked.join(ascending ? ' > ' : ' < ') },
        { text: `Start with ${ordered[0]} and place the other two in order.`, equation: chain },
      ],
      explanation: `More equal pieces make one piece smaller. From ${direction}, the fractions are ${ordered.join(', ')}.`,
    };
  }

  const smallest = variant === 2;
  const extreme = smallest ? 'smallest' : 'greatest';
  const denominator = rng.pick([5, 6, 7, 8, 10, 11, 12]);
  const numerators = rng.shuffle(Array.from({ length: denominator - 1 }, (_, i) => i + 1)).slice(0, 4);
  const ranked = [...numerators].sort((a, b) => a - b);
  const target = smallest ? ranked[0] : ranked[ranked.length - 1];
  const answer = `${target}/${denominator}`;
  return {
    key,
    prompt: `Pick the ${extreme} of these four fractions.`,
    choices: numerators.map(n => `${n}/${denominator}`),
    answer,
    hint: 'The bottom numbers match. Look at the top numbers to see how many equal parts are counted.',
    workedSteps: [
      { text: `Each whole is split into ${denominator} equal parts. The fractions count pieces of the same size.` },
      { text: 'Compare the top numbers to see which fractions have fewer or more parts.', equation: ranked.join(' < ') },
      { text: `${target} is the ${extreme} top number, so ${answer} is the ${extreme} fraction.` },
    ],
    explanation: `The parts are the same size. The ${extreme} number of parts is ${target}, so choose ${answer}.`,
  };
}
