import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-reverse-interleaved-spending',
  level: 5,
  title: 'Work back through shopping expenses',
  objective: 'Recover starting money by undoing fractional purchases and fixed extra payments in reverse order.',
  skillIds: ['P5.S.FRAC.05', 'P4.S.FRAC.04'],
  canonicalPatternId: 'p5-reverse-interleaved-spending',
} as const;

const FIRST_FRACTIONS: [number, number][] = [
  [1, 3], [2, 7], [3, 5], [3, 7], [3, 8],
];
const SECOND_FRACTIONS: [number, number][] = [
  [1, 3], [2, 5], [3, 7], [3, 8], [4, 9],
];
const LAST_FRACTIONS: [number, number][] = [
  [1, 2], [2, 3], [3, 4], [2, 5], [3, 7],
];
const cash = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const fractionalFinish = (((hashString(String(seed)) >>> 0) + (index >>> 0)) % 2) === 0;
  const name = r.pick(['Alya', 'Ben', 'Dev', 'Farah', 'Jin', 'Siti']);
  const [n1, d1] = r.pick(FIRST_FRACTIONS);
  const [n2, d2] = r.pick(SECOND_FRACTIONS);
  const keep1 = d1 - n1;
  const keep2 = d2 - n2;
  const workedSteps: NonNullable<Question['workedSteps']> = [];
  let beforeLast: number;
  let left: number;
  let finalSentence: string;

  // All balances and expenses are represented in integer cents.
  if (fractionalFinish) {
    const [n3, d3] = r.pick(LAST_FRACTIONS);
    const keep3 = d3 - n3;
    const part = r.int(8, 22) * 100;
    beforeLast = d3 * part;
    left = keep3 * part;
    finalSentence = `Then ${name} spent ${n3}/${d3} of the money now left on a card game.`;
    workedSteps.push(
      {
        text: 'Find the fraction of the money kept after buying the card game.',
        equation: `1 − ${n3}/${d3} = ${keep3}/${d3}`,
      },
      {
        text: `${keep3} equal parts are worth ${cash(left)}. Find one part, then all ${d3} parts to recover the money before the card game.`,
        equation: `${cash(left)} ÷ ${keep3} × ${d3} = ${cash(beforeLast)}`,
      },
    );
  } else {
    left = r.int(17, 46) * 100;
    const finalCost = r.int(5, 17) * 100;
    beforeLast = left + finalCost;
    finalSentence = `Then ${name} paid ${cash(finalCost)} for a snack.`;
    workedSteps.push({
      text: 'Add back the snack cost to find the money left after buying the puzzle.',
      equation: `${cash(left)} + ${cash(finalCost)} = ${cash(beforeLast)}`,
    });
  }

  // Choose a positive extra payment that makes the second reversal exact
  // in whole dollars. The first reversal may produce dollars and cents.
  const adjustment = (keep2 - ((beforeLast / 100) % keep2)) % keep2;
  const extra2 = (keep2 * r.int(2, 7) + adjustment) * 100;
  const restoredSecond = beforeLast + extra2;
  const afterFirst = (restoredSecond / keep2) * d2;
  const extra1 = r.int(8, 35) * 100;
  const restoredFirst = afterFirst + extra1;
  // Every possible keep1 divides 100, so this always gives exact cents.
  const original = (restoredFirst / keep1) * d1;

  workedSteps.push(
    {
      text: 'Add back the extra payment for the puzzle before undoing its fractional cost.',
      equation: `${cash(beforeLast)} + ${cash(extra2)} = ${cash(restoredSecond)}`,
    },
    {
      text: `After taking ${n2}/${d2}, the fraction kept was ${keep2}/${d2}. Find one part, then all ${d2} parts to recover the money before the puzzle.`,
      equation: `${cash(restoredSecond)} ÷ ${keep2} × ${d2} = ${cash(afterFirst)}`,
    },
    {
      text: 'Add back the extra payment for the art kit.',
      equation: `${cash(afterFirst)} + ${cash(extra1)} = ${cash(restoredFirst)}`,
    },
    {
      text: `This is ${keep1}/${d1} of the starting money. Find one part, then all ${d1} parts.`,
      equation: `${cash(restoredFirst)} ÷ ${keep1} × ${d1} = ${cash(original)}`,
    },
  );

  return {
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context: [
      `${name} had some money for a shopping trip.`,
      `The art kit cost ${n1}/${d1} of the money ${name} had at the start, plus ${cash(extra1)}.`,
      `The puzzle cost ${n2}/${d2} of the money left after buying the art kit, plus ${cash(extra2)}.`,
      finalSentence,
      `${name} had ${cash(left)} left after these three purchases.`,
    ],
    prompt: `How much money did ${name} have before the shopping trip?`,
    answer: (original / 100).toFixed(2),
    unit: 'dollars',
    hint: 'Start with the money left. Undo the last purchase, then add back each extra payment before finding the earlier whole.',
    workedSteps,
    explanation: workedSteps.map(step => `${step.text} ${step.equation ?? ''}`).join(' ') + ` ${name} started with ${cash(original)}.`,
  };
}
