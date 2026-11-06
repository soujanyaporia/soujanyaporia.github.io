import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-paired-quantities-from-total-cost',
  level: 5,
  title: 'Find equal quantities from a total value',
  objective: 'Use the value of an equal pair or equal-sized group to find how many of each item there are.',
  skillIds: ['P5.S.RATE.01', 'P5.S.RATE.02'],
  canonicalPatternId: 'paired-quantities-from-total-cost',
} as const;

function greatestCommonFactor(first: number, second: number): number {
  return second === 0 ? first : greatestCommonFactor(second, first % second);
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const random = new Rng(hashString(key));
  const presentation = random.int(0, 2);

  let context: string[];
  let prompt: string;
  let answer: number;
  let unit: string;
  let hint: string;
  let steps: string[];
  let choices: string[] | undefined;

  if (presentation === 0) {
    const [muffinsPerPack, rollsPerPack] = random.pick([
      [3, 4],
      [4, 6],
      [6, 9],
      [5, 6],
    ] as const);
    const muffinPackPrice = random.int(7, 17);
    const rollPackPrice = random.int(11, 23);
    const equalGroupSize = muffinsPerPack * rollsPerPack
      / greatestCommonFactor(muffinsPerPack, rollsPerPack);
    const muffinPacksPerGroup = equalGroupSize / muffinsPerPack;
    const rollPacksPerGroup = equalGroupSize / rollsPerPack;
    const muffinGroupCost = muffinPacksPerGroup * muffinPackPrice;
    const rollGroupCost = rollPacksPerGroup * rollPackPrice;
    const groupCost = muffinGroupCost + rollGroupCost;
    const groups = random.int(2, 5);
    const total = groups * groupCost;

    answer = equalGroupSize * groups;
    unit = 'rolls';
    context = [
      `A stall sells muffins in packs of ${muffinsPerPack} for $${muffinPackPrice} per pack and rolls in packs of ${rollsPerPack} for $${rollPackPrice} per pack.`,
      `Nisha buys whole packs and gets exactly as many muffins as rolls. She pays $${total} altogether.`,
    ];
    prompt = 'How many rolls does Nisha buy?';
    hint = 'Find a common multiple of the two pack sizes. Work out the cost of that many muffins and that many rolls together.';
    steps = [
      `The smallest common multiple of ${muffinsPerPack} and ${rollsPerPack} is ${equalGroupSize}. Make a group with ${equalGroupSize} muffins and ${equalGroupSize} rolls.`,
      `${equalGroupSize} muffins need ${equalGroupSize} ÷ ${muffinsPerPack} = ${muffinPacksPerGroup} packs. They cost ${muffinPacksPerGroup} × $${muffinPackPrice} = $${muffinGroupCost}.`,
      `${equalGroupSize} rolls need ${equalGroupSize} ÷ ${rollsPerPack} = ${rollPacksPerGroup} packs. They cost ${rollPacksPerGroup} × $${rollPackPrice} = $${rollGroupCost}.`,
      `One equal group costs $${muffinGroupCost} + $${rollGroupCost} = $${groupCost}.`,
      `The number of equal groups is $${total} ÷ $${groupCost} = ${groups}.`,
      `Each group has ${equalGroupSize} rolls, so Nisha buys ${groups} × ${equalGroupSize} = ${answer} rolls.`,
    ];
  } else if (presentation === 1) {
    const [brushPrice, sketchbookPrice] = random.pick([
      [3, 5],
      [3, 7],
      [5, 7],
      [5, 9],
      [7, 9],
    ] as const);
    const pairs = random.pick([14, 16, 18, 20, 22, 24, 30, 32, 34, 36]);
    const pairPrice = brushPrice + sketchbookPrice;
    const total = pairs * pairPrice;

    answer = pairs;
    unit = 'brushes';
    context = [
      'For an art activity, Hana buys the same number of brushes and sketchbooks.',
      `A brush costs $${brushPrice}. A sketchbook costs $${sketchbookPrice}. Hana pays $${total} in all.`,
    ];
    prompt = 'How many brushes does Hana buy?';
    hint = 'Pair each brush with one sketchbook. Find the cost of a pair before dividing the total.';
    steps = [
      'The equal numbers let us make pairs, each containing one brush and one sketchbook.',
      `One pair costs $${brushPrice} + $${sketchbookPrice} = $${pairPrice}.`,
      `The number of pairs is $${total} ÷ $${pairPrice} = ${pairs}.`,
      `There is one brush in each pair, so Hana buys ${answer} brushes.`,
    ];
    choices = random.shuffle([
      String(pairs),
      String(pairs / 2),
      String(pairs * 2),
      String(total / (sketchbookPrice - brushPrice)),
    ]);
  } else {
    const [smallerNote, largerNote] = random.pick([
      [2, 10],
      [5, 10],
      [2, 50],
      [10, 50],
    ] as const);
    const pairs = random.pick([15, 18, 21, 24, 27, 30, 33, 36, 39, 42]);
    const pairValue = smallerNote + largerNote;
    const total = pairs * pairValue;

    answer = pairs;
    unit = 'notes';
    context = [
      `A donation box contains only $${smallerNote} notes and $${largerNote} notes.`,
      `The two types have equal numbers of notes. Their total value is $${total}.`,
    ];
    prompt = `How many $${largerNote} notes are in the box?`;
    hint = 'Make pairs with one note of each type. Divide the total value by the value of one pair.';
    steps = [
      `Pair each $${smallerNote} note with one $${largerNote} note. All the notes can be paired because the counts are equal.`,
      `Each pair is worth $${smallerNote} + $${largerNote} = $${pairValue}.`,
      `The number of pairs is $${total} ÷ $${pairValue} = ${pairs}.`,
      `Each pair contains one $${largerNote} note, so there are ${answer} of these notes.`,
    ];
  }

  return {
    key,
    context,
    prompt,
    answer: String(answer),
    unit,
    choices,
    hint,
    workedSteps: steps.map(text => ({ text })),
    explanation: steps.join(' '),
  };
}
