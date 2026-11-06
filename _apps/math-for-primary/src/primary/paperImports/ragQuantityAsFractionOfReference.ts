import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'p6-rag-quantity-as-fraction-of-a-reference',
  level: 6 as const,
  title: 'Write a count as a fraction',
  objective: 'Identify a subgroup and its reference total, then express and simplify their fraction.',
  skillIds: ['P5.S.FRAC.02', 'P3.S.FRAC.02'],
  canonicalPatternId: 'p6-quantity-as-fraction-of-a-reference',
};

function gcd(a: number, b: number): number {
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const r = new Rng(hashString(key));
  const story = r.pick([
    {container: 'tray', items: 'counters', targetColour: 'yellow', otherColour: 'purple'},
    {container: 'jar', items: 'beads', targetColour: 'blue', otherColour: 'white'},
    {container: 'tin', items: 'buttons', targetColour: 'green', otherColour: 'red'},
    {container: 'box', items: 'tiles', targetColour: 'orange', otherColour: 'black'},
  ]);
  const total = r.pick([24, 28, 30, 32, 36, 40, 42, 45, 48, 54, 56, 60]);
  const needsReduction = r.chance(0.5);
  const candidates = Array.from({length: total - 3}, (_, i) => i + 2)
    .filter(n => n !== 7 && (gcd(n, total) > 1) === needsReduction);
  const target = r.pick(candidates);
  const divisor = gcd(target, total);
  const answer = `${target / divisor}/${total / divisor}`;
  const workedSteps: NonNullable<Question['workedSteps']> = [
    {text: `The reference group is all ${total} ${story.items}, so the denominator is ${total}.`},
    {
      text: `There are ${target} ${story.targetColour} ${story.items}. Put this count over the reference total.`,
      equation: `${target} ÷ ${total} = ${target}/${total}`,
    },
  ];
  if (divisor > 1) {
    workedSteps.push({
      text: `Divide the numerator and denominator by their greatest common factor, ${divisor}.`,
      equation: `${target}/${total} = (${target} ÷ ${divisor})/(${total} ÷ ${divisor}) = ${answer}`,
    });
  } else {
    workedSteps.push({text: `${target} and ${total} have no common factor greater than 1, so ${answer} is already in simplest form.`});
  }

  return {
    key,
    context: [
      `A ${story.container} holds ${total} ${story.items}.`,
      `${target} of the ${story.items} are ${story.targetColour}; all the others are ${story.otherColour}.`,
    ],
    prompt: `What fraction of the ${story.items} are ${story.targetColour}? Give your answer in simplest form.`,
    answer,
    requireSimplified: true,
    hint: `Put the number of ${story.targetColour} ${story.items} over the total number of ${story.items}. Then simplify.`,
    workedSteps,
    explanation: workedSteps.map(step => step.text + (step.equation ? ` ${step.equation}.` : '')).join(' '),
    proof: {op: '/', a: target, b: total},
  };
}
