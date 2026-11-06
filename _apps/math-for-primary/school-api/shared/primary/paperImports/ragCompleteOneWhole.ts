import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p2-complete-one-whole',
  level: 2,
  title: 'Find the missing fraction',
  objective: 'Find the share that completes one whole when one or two portions are known.',
  skillIds: ['P2.S.FRAC.01', 'P2.S.FRAC.05'],
  canonicalPatternId: 'p2-complete-one-whole',
};

function unequalPortions(rng: Rng, denominator: number): [number, number] {
  const pairs: [number, number][] = [];
  for (let first = 1; first < denominator - 1; first++) {
    for (let second = 1; first + second < denominator; second++) {
      const sum = first + second;
      const rest = denominator - sum;
      // Either given, their sum and the missing share make four distinct choices.
      if (new Set([first, second, sum, rest]).size === 4) pairs.push([first, second]);
    }
  }
  return rng.pick(pairs);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['one-piece', 'two-pieces', 'games', 'equal-pieces'] as const);
  const denominator = rng.pick([6, 8, 11, 12]);
  const fraction = (parts: number) => `${parts}/${denominator}`;

  let first: number;
  let second = 0;
  let story: string;
  let prompt = 'What fraction of the full ribbon is left?';
  let hint = 'Find the fraction used for both pieces. How much more would make one whole?';

  if (variant === 'one-piece') {
    first = rng.int(1, denominator - 1);
    story = `Jia cuts a piece off a new ribbon. She has ${fraction(first)} of the full ribbon left.`;
    prompt = 'What fraction of the full ribbon did Jia cut off?';
    hint = 'The piece Jia cut off and the ribbon she has left make one whole ribbon.';
  } else if (variant === 'equal-pieces') {
    first = rng.int(1, Math.floor((denominator - 1) / 2));
    second = first;
    story = `Jia cuts two pieces from one ribbon. Each piece is ${fraction(first)} of the full ribbon.`;
    hint = 'Count the same fraction twice, once for each piece. Then find what is left.';
  } else {
    [first, second] = unequalPortions(rng, denominator);
    if (variant === 'games') {
      story = `Each child at camp chose just one game. ${fraction(first)} of the children chose tag and ${fraction(second)} chose hopscotch. Everyone else chose catch.`;
      prompt = 'What fraction of the children chose catch?';
      hint = 'Put the tag and hopscotch groups together. The rest of the children chose catch.';
    } else {
      story = `Jia starts with one ribbon. She cuts off ${fraction(first)} of the full ribbon for a card and ${fraction(second)} of the full ribbon for a badge.`;
    }
  }

  const known = first + second;
  const answer = fraction(denominator - known);
  const workedSteps = [{
    text: `Think of the whole as ${denominator} equal parts.`,
    equation: `1 = ${fraction(denominator)}`,
  }];
  if (second > 0) {
    const text = variant === 'games' ? 'Add the shares who chose tag and hopscotch.'
      : variant === 'equal-pieces' ? 'Count the same share once for each of the two pieces.'
      : 'Add the shares used for the card and the badge.';
    workedSteps.push({ text, equation: `${fraction(first)} + ${fraction(second)} = ${fraction(known)}` });
  }
  workedSteps.push({
    text: variant === 'one-piece' ? 'Take away the ribbon still left to find the piece Jia cut off.'
      : variant === 'games' ? 'Take those two groups away from the whole group to find who chose catch.'
      : 'Take both pieces away from the full ribbon to find the share left.',
    equation: `${fraction(denominator)} − ${fraction(known)} = ${answer}`,
  });
  return {
    key, prompt, context: [story], answer, hint, workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
    ...(variant === 'games' ? { choices: rng.shuffle([fraction(first), fraction(second), fraction(known), answer]) } : {}),
  };
}
