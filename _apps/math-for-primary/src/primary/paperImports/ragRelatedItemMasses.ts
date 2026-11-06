import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-related-item-masses-in-loaded-containers',
  level: 5,
  title: 'Find masses from two weighings',
  objective: 'Compare loaded masses and related contents to find an empty container mass or a contents mass.',
  skillIds: ['P5.S.DEC.02', 'P5.S.WN.03'],
  canonicalPatternId: 'p5-related-item-masses-in-loaded-containers',
};

const kilograms = (grams: number): string => String(Number((grams / 1000).toFixed(3)));
type Steps = NonNullable<Question['workedSteps']>;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const variant = ((Math.trunc(seed + index) % 3) + 3) % 3;
  const make = (context: string[], prompt: string, answer: string, unit: string, hint: string, workedSteps: Steps): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`.trim()).join(' '),
  });

  if (variant === 0) {
    const metalCount = r.int(5, 9);
    const multiplier = r.int(3, 5);
    const extraUnits = r.int(2, 9);
    const equivalentCount = metalCount * multiplier;
    const woodCount = equivalentCount - extraUnits;
    const woodMass = r.int(8, 24);
    const emptyMass = r.int(110, 780);
    const firstTotal = emptyMass + woodCount * woodMass;
    const secondTotal = emptyMass + equivalentCount * woodMass;
    const difference = secondTotal - firstTotal;
    return make([
      `A box holds only ${woodCount} identical wooden discs. The box and discs together have a mass of ${firstTotal} g.`,
      `After all the wooden discs are removed, ${metalCount} identical metal discs are put in the same box. The box and metal discs together have a mass of ${kilograms(secondTotal)} kg.`,
      `Each metal disc has ${multiplier} times the mass of each wooden disc.`,
    ], 'What is the mass of the empty box in kilograms?', kilograms(emptyMass), 'kg',
    'Use grams for both weighings. Replace each metal disc with an equal mass of wooden discs, then compare.', [
      {text: 'Convert the second total to grams.', equation: `${kilograms(secondTotal)} × 1000 = ${secondTotal} g`},
      {text: 'Find how many wooden discs have the same mass as all the metal discs.', equation: `${metalCount} × ${multiplier} = ${equivalentCount} wooden discs`},
      {text: 'The same box is included in both totals, so their difference comes from the contents.', equation: `${secondTotal} − ${firstTotal} = ${difference} g`},
      {text: 'Find the extra number of wooden-disc masses in the second weighing.', equation: `${equivalentCount} − ${woodCount} = ${extraUnits}`},
      {text: 'Find the mass of one wooden disc.', equation: `${difference} ÷ ${extraUnits} = ${woodMass} g`},
      {text: 'Find the mass of the wooden discs in the first weighing.', equation: `${woodCount} × ${woodMass} = ${woodCount * woodMass} g`},
      {text: 'Subtract the contents to find the empty box mass.', equation: `${firstTotal} − ${woodCount * woodMass} = ${emptyMass} g`},
      {text: 'Convert the empty box mass to kilograms.', equation: `${emptyMass} ÷ 1000 = ${kilograms(emptyMass)} kg`},
    ]);
  }

  if (variant === 1) {
    const removed = r.int(3, 4);
    const blockCount = removed + r.int(3, 7);
    const ballCount = removed + r.int(2, 5);
    const blockMass = r.int(16, 46) * 2;
    const extraMass = r.pick([12, 16, 20, 28, 32, 36]);
    const ballMass = blockMass + extraMass;
    const emptyMass = r.int(20, 180) * 5 + 1;
    const contentsMass = blockCount * blockMass + ballCount * ballMass;
    const before = emptyMass + contentsMass;
    const pairMass = blockMass + ballMass;
    const removedMass = removed * pairMass;
    const after = before - removedMass;
    return make([
      `A tray holds only ${blockCount} identical wooden blocks and ${ballCount} identical metal balls. The total mass, including the tray, is ${before} g.`,
      `Removing ${removed} blocks and ${removed} balls leaves a total mass of ${after} g, including the same tray.`,
      `Each metal ball is ${extraMass} g heavier than each wooden block.`,
    ], 'What is the mass of the empty tray in kilograms?', kilograms(emptyMass), 'kg',
    'Find the mass removed. Group the removed objects into pairs of one block and one ball.', [
      {text: 'The decrease in total mass is the mass of the objects removed.', equation: `${before} − ${after} = ${removedMass} g`},
      {text: `The removed objects make ${removed} equal pairs. Find the mass of one block and one ball together.`, equation: `${removedMass} ÷ ${removed} = ${pairMass} g`},
      {text: 'Take away the extra mass of the ball. What remains is twice the mass of a block.', equation: `${pairMass} − ${extraMass} = ${2 * blockMass} g`},
      {text: 'Find the mass of one block.', equation: `${2 * blockMass} ÷ 2 = ${blockMass} g`},
      {text: 'Add the extra mass to find the mass of one ball.', equation: `${blockMass} + ${extraMass} = ${ballMass} g`},
      {text: 'Find the mass of all the original contents.', equation: `${blockCount} × ${blockMass} + ${ballCount} × ${ballMass} = ${contentsMass} g`},
      {text: 'Subtract the original contents mass from the original total.', equation: `${before} − ${contentsMass} = ${emptyMass} g`},
      {text: 'Convert the empty tray mass to kilograms.', equation: `${emptyMass} ÷ 1000 = ${kilograms(emptyMass)} kg`},
    ]);
  }

  const multiplier = r.int(3, 6);
  const peasMass = r.int(12, 36) * 5 + 2;
  const emptyMass = r.int(14, 36) * 5 + 3;
  const firstTotal = emptyMass + peasMass;
  const secondTotal = emptyMass + multiplier * peasMass;
  const difference = secondTotal - firstTotal;
  return make([
    'Two empty tubs have the same mass.',
    `One tub holds only dried peas. The tub and peas together have a mass of ${firstTotal} g.`,
    `The other tub holds only lentils. The tub and lentils together have a mass of ${secondTotal} g.`,
    `The lentils alone have ${multiplier} times the mass of the dried peas alone.`,
  ], 'What is the mass of the dried peas in grams?', String(peasMass), 'g',
  'The empty tubs have equal masses. Compare the totals to find how much heavier the lentils are than the peas.', [
    {text: 'Subtract the loaded masses. The equal empty-tub masses cancel.', equation: `${secondTotal} − ${firstTotal} = ${difference} g`},
    {text: `Let one equal part be the mass of the peas. The lentils have ${multiplier} such parts. Find the difference in parts.`, equation: `${multiplier} − 1 = ${multiplier - 1} parts`},
    {text: 'Divide the mass difference by the difference in parts to find the mass of the peas.', equation: `${difference} ÷ ${multiplier - 1} = ${peasMass} g`},
  ]);
}
