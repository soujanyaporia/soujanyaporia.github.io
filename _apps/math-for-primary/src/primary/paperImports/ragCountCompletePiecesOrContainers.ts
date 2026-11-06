import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-count-complete-pieces-or-containers',
  level: 3,
  title: 'Cut pieces and fill containers',
  objective: 'Count whole pieces or full containers, then find the length left, the number still there or the difference between two counts.',
  skillIds: ['P3.S.MD.04', 'P3.S.MD.02', 'P3.S.MEASURE.03', 'P3.S.AS.01'],
  canonicalPatternId: 'p3-count-complete-pieces-or-containers',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const start = (hashString(String(seed)) >>> 0) % 3;
  const variant = (start + Math.trunc(index) % 3 + 3) % 3;

  if (variant === 0) {
    const metres = rng.pick([2, 3, 5, 6, 7, 8]);
    const totalCm = metres * 100;
    const pieceCm = rng.pick([3, 6, 7, 8].filter(size => totalCm % size !== 0));
    const pieces = Math.floor(totalCm / pieceCm);
    const usedCm = pieces * pieceCm;
    const leftCm = totalCm - usedCm;

    return {
      key,
      context: [
        `Maya has a cord ${metres} m long.`,
        `She cuts off pieces ${pieceCm} cm long until the cord left over is too short for another piece.`,
      ],
      prompt: 'How many centimetres of cord are left?',
      unit: 'cm',
      answer: String(leftCm),
      hint: 'Write both lengths in centimetres. How many whole pieces will fit?',
      workedSteps: [
        { text: 'Each metre is 100 centimetres.', equation: `${metres} m = ${totalCm} cm` },
        { text: 'Find how many whole pieces fit.', equation: `${totalCm} ÷ ${pieceCm} = ${pieces} remainder ${leftCm}` },
        { text: 'Find the length used by those pieces.', equation: `${pieces} × ${pieceCm} cm = ${usedCm} cm` },
        { text: 'Take the used length from the whole cord.', equation: `${totalCm} cm − ${usedCm} cm = ${leftCm} cm` },
      ],
      explanation: `The ${pieces} pieces use ${usedCm} cm. That leaves ${leftCm} cm, which is shorter than the ${pieceCm} cm needed for another piece.`,
    };
  }

  if (variant === 1) {
    const litresPerTin = rng.pick([3, 5, 6, 7]);
    const filled = rng.int(18, 95);
    const totalLitres = filled * litresPerTin;
    const discarded = rng.int(2, 8);
    const left = filled - discarded;

    return {
      key,
      context: [
        `A paint shop packs all ${totalLitres} L of paint into tins, with ${litresPerTin} L in each tin.`,
        `The shop throws away ${discarded} damaged tins.`,
      ],
      prompt: 'How many tins of paint does the shop have left?',
      unit: 'tins',
      answer: String(left),
      hint: 'Find how many tins the shop filled before it threw any away.',
      workedSteps: [
        { text: 'Divide the total volume by the amount in one tin.', equation: `${totalLitres} ÷ ${litresPerTin} = ${filled} tins` },
        { text: 'Take away the damaged tins.', equation: `${filled} − ${discarded} = ${left} tins` },
      ],
      explanation: `The paint filled ${filled} tins. Of those, ${discarded} were thrown away, leaving ${left} tins of paint.`,
    };
  }

  const greenSize = rng.pick([2, 3, 4]);
  const whiteSize = rng.pick([7, 8, 9]);
  const rollLength = greenSize * whiteSize * rng.pick([4, 7, 11, 13, 16]);
  const greenPieces = rollLength / greenSize;
  const whitePieces = rollLength / whiteSize;
  const extra = greenPieces - whitePieces;

  return {
    key,
    context: [
      `A shop has a green roll of cord ${rollLength} m long. Its white roll of cord is just as long.`,
      `The shop cuts up both rolls completely. Each green piece is ${greenSize} m long and each white piece is ${whiteSize} m long.`,
    ],
    prompt: 'How many more green pieces than white pieces does the shop get?',
    unit: 'pieces',
    answer: String(extra),
    hint: 'Use the full length of one roll for each colour. Find both piece counts before comparing them.',
    workedSteps: [
      { text: 'Count the pieces from the green roll.', equation: `${rollLength} ÷ ${greenSize} = ${greenPieces} pieces` },
      { text: 'Use the same starting length for the white roll.', equation: `${rollLength} ÷ ${whiteSize} = ${whitePieces} pieces` },
      { text: 'Subtract the white piece count from the green piece count.', equation: `${greenPieces} − ${whitePieces} = ${extra} pieces` },
    ],
    explanation: `The shorter cuts give ${greenPieces} green pieces. The same length of white cord gives ${whitePieces} pieces, so there are ${extra} more green pieces.`,
  };
}
