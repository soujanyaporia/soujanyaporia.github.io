import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-grouping-after-exclusions',
  level: 3,
  title: 'Pack the beads that are left',
  objective: 'Subtract the beads set aside, then find the number of packs, the beads left over or the number in each pack.',
  skillIds: ['P3.S.AS.01', 'P3.S.MD.04', 'P3.S.MD.02'],
  canonicalPatternId: 'grouping-after-exclusions',
} as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const variant = rng.pick(['count', 'count', 'count', 'count', 'leftover', 'size'] as const);
  // The divisor is beads per pack in the first two variants and packs in the last.
  const divisor = rng.int(3, 9);
  const quotient = rng.int(12, 86);
  const loose = variant === 'count' ? 0 : rng.int(1, divisor - 1);
  const packed = divisor * quotient;
  const available = packed + loose;
  const saved = rng.int(22, 118);
  const total = saved + available;
  const context = [
    `Siti has ${total} beads.`,
    `She saves ${saved} beads for tomorrow. The rest are for today's packs.`,
  ];
  const workedSteps = [{
    text: 'Take away the beads saved for tomorrow to find how many Siti can use today.',
    equation: `${total} − ${saved} = ${available} beads`,
  }];
  let prompt: string;
  let answer: number;
  let unit: string;
  let hint: string;

  if (variant === 'count') {
    context.push(`She packs all of today's beads, with ${divisor} beads in each pack.`);
    prompt = 'How many packs does Siti fill?';
    answer = quotient;
    unit = 'packs';
    hint = 'Find how many beads Siti can use today. How many packs of the given size will those beads fill?';
    workedSteps.push({
      text: 'Divide the beads for today by the number in one pack.',
      equation: `${available} ÷ ${divisor} = ${answer} packs`,
    });
  } else if (variant === 'leftover') {
    context.push(`She makes as many full packs as she can, with ${divisor} beads in each pack.`);
    prompt = `How many of today's beads are left after Siti fills the packs?`;
    answer = loose;
    unit = 'beads';
    hint = 'Start with the beads for today. When you divide them into full packs, which part of the result counts the loose beads?';
    workedSteps.push({
      text: 'Divide to find the full packs. The remainder counts the loose beads.',
      equation: `${available} ÷ ${divisor} = ${quotient} remainder ${loose}`,
    });
  } else {
    context.push(`She fills ${divisor} packs with the same number of beads in each. Of today's beads, ${loose} stay loose.`);
    prompt = 'How many beads are in each pack?';
    answer = quotient;
    unit = 'beads';
    hint = 'Find how many beads went into the packs. Take away both the beads saved for tomorrow and the loose beads before you share the packed beads equally.';
    workedSteps.push({
      text: 'Take away the loose beads to find how many went into the packs.',
      equation: `${available} − ${loose} = ${packed} beads`,
    }, {
      text: 'Share the packed beads equally among the packs.',
      equation: `${packed} ÷ ${divisor} = ${answer} beads per pack`,
    });
  }

  return {
    key, context, prompt: `${prompt} Show your working.`, answer: String(answer), unit, hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation}.`).join(' '),
  };
}
