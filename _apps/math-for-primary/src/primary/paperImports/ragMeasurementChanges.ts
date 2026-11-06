import {Rng, hashString} from '../../engine/random';
import type {Question} from '../generate';

export const RAG_PATTERN = {
  id: 'rag-p5-measurement-additions-deductions',
  level: 5,
  title: 'Find the measurement left',
  objective: 'Use common units to subtract known amounts, combine equal deductions and round a final measurement when requested.',
  skillIds: ['P5.S.DEC.02', 'P5.S.FRAC.03', 'P4.S.DEC.04'],
  canonicalPatternId: 'p5-measurement-additions-deductions',
};

type Step = {text: string; equation: string};

// Format a non-negative integer number of decimal subdivisions exactly.
function fixed(amount: number, places: number): string {
  const scale = 10 ** places;
  return `${Math.floor(amount / scale)}.${String(amount % scale).padStart(places, '0')}`;
}

export function makeRagQuestion(seed: number, index = 0): Question {
  const r = new Rng(hashString(`${RAG_PATTERN.id}:${seed}:${index}`));
  const start = (hashString(`measurement-variant:${seed}`) >>> 0) % 3;
  const variant = ((start + Math.trunc(index)) % 3 + 3) % 3;
  const make = (
    context: string[],
    prompt: string,
    answer: string,
    unit: string,
    hint: string,
    steps: Step[],
  ): Question => ({
    key: `${RAG_PATTERN.id}:${seed}:${index}`,
    context,
    prompt,
    answer,
    unit,
    hint,
    workedSteps: steps,
    explanation: steps.map(step => `${step.text} ${step.equation}`).join(' '),
  });

  if (variant === 0) {
    const initialCm = r.int(5, 9) * 100 + r.int(1, 99);
    const singleCm = r.int(13, 29) * 5;
    const count = r.pick([3, 5, 6, 7]);
    const pieceCm = r.pick([24, 28, 32, 36, 42, 46]);
    const piecesCm = count * pieceCm;
    const usedCm = singleCm + piecesCm;
    const leftCm = initialCm - usedCm;
    // Initial length is at least 501 cm; total use is at most 467 cm.
    return make(
      [
        `A craft club has ${fixed(initialCm, 2)} m of cord on a roll.`,
        `The club uses ${singleCm} cm for a banner and cuts ${count} equal pieces, each ${pieceCm} cm long, for name tags.`,
      ],
      'How much cord is left on the roll? Give your answer in metres.',
      fixed(leftCm, 2),
      'm',
      'Work in centimetres first. Find the total length of the equal pieces, then subtract all the cord used.',
      [
        {text: 'Convert the starting length to centimetres.', equation: `${fixed(initialCm, 2)} × 100 = ${initialCm} cm`},
        {text: 'Find the length used for all the name tags.', equation: `${count} × ${pieceCm} = ${piecesCm} cm`},
        {text: 'Add the two amounts of cord used.', equation: `${singleCm} + ${piecesCm} = ${usedCm} cm`},
        {text: 'Subtract the total used from the starting length.', equation: `${initialCm} − ${usedCm} = ${leftCm} cm`},
        {text: 'Convert the remaining length to metres.', equation: `${leftCm} ÷ 100 = ${fixed(leftCm, 2)} m`},
      ],
    );
  }

  if (variant === 1) {
    const initialMl = r.int(1, 4) * 1000 + r.int(11, 99) * 10;
    const removedMl = r.pick([230, 370, 450, 560, 680, 790, 850, 920]);
    const leftMl = initialMl - removedMl;
    const initialL = fixed(initialMl / 10, 2);
    const removedL = fixed(removedMl / 10, 2);
    const leftL = fixed(leftMl / 10, 2);
    return make(
      [
        `A jug holds ${initialL} L of pear juice.`,
        `Kai pours ${removedMl} ml of juice from the jug into a bottle.`,
      ],
      'How much juice remains in the jug? Give your answer in litres.',
      leftL,
      'L',
      'There are 1000 millilitres in a litre. Express the amount poured out in litres before subtracting.',
      [
        {text: 'Convert the amount poured out to litres.', equation: `${removedMl} ÷ 1000 = ${removedL} L`},
        {text: 'Subtract the amount poured out from the amount in the jug.', equation: `${initialL} − ${removedL} = ${leftL} L`},
      ],
    );
  }

  const [numerator, denominator] = r.pick([
    [1, 2], [1, 4], [3, 4], [1, 5], [2, 5],
    [4, 5], [1, 10], [3, 10], [7, 10], [9, 10],
  ]);
  const whole = r.pick([1, 2, 4, 5]);
  const removedMl = whole * 1000 + numerator * (1000 / denominator);
  const leftAfterServingMl = r.int(2, 7) * 1000 + r.pick([134, 135, 136, 994, 995, 996]);
  const initialMl = removedMl + leftAfterServingMl;
  const addedL = r.pick([1, 3, 4]);
  const finalMl = leftAfterServingMl + addedL * 1000;
  const roundedHundredths = Math.floor((finalMl + 5) / 10);
  const lastDigit = finalMl % 10;
  const answer = fixed(roundedHundredths, 2);
  return make(
    [
      `A drink dispenser contains ${fixed(initialMl, 3)} L of fruit punch.`,
      `The helpers serve ${whole} ${numerator}/${denominator} L of punch, then pour ${addedL} L more punch into the dispenser.`,
    ],
    'How much punch is in the dispenser now? Give your answer in litres, rounded to 2 decimal places.',
    answer,
    'L',
    'Write the mixed number as a decimal. Subtract the amount served and add the refill. Round only the final amount.',
    [
      {text: 'Convert the mixed number to decimal litres.', equation: `${whole} ${numerator}/${denominator} L = (${whole} + ${numerator} ÷ ${denominator}) L = ${fixed(removedMl, 3)} L`},
      {text: 'Find the amount left after serving.', equation: `${fixed(initialMl, 3)} − ${fixed(removedMl, 3)} = ${fixed(leftAfterServingMl, 3)} L`},
      {text: 'Add the refill without rounding.', equation: `${fixed(leftAfterServingMl, 3)} + ${addedL} = ${fixed(finalMl, 3)} L`},
      {text: `The thousandths digit is ${lastDigit}. ${lastDigit >= 5 ? 'Round the hundredths up.' : 'Keep the hundredths unchanged.'}`, equation: `${fixed(finalMl, 3)} L ≈ ${answer} L`},
    ],
  );
}
