import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p3-quotient-and-remainder',
  level: 3,
  title: 'Find the quotient and the remainder',
  objective: 'Divide a three-digit number by one digit and report both the whole-number quotient and the amount left over.',
  skillIds: ['P3.S.MD.04', 'P3.S.MD.02'],
  canonicalPatternId: 'p3-whole-number-division',
};

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const divisor = rng.int(4, 9);
  const remainder = rng.int(1, divisor - 1);
  const minQuotient = Math.max(100, Math.ceil(600 / divisor));
  const maxQuotient = Math.floor((999 - remainder) / divisor);
  const quotient = rng.int(minQuotient, maxQuotient);
  const dividend = divisor * quotient + remainder;

  const tens = Math.floor(dividend / 10);
  const ones = dividend % 10;
  const tensPerShare = Math.floor(tens / divisor);
  const leftoverTens = tens % divisor;
  const onesToShare = leftoverTens * 10 + ones;
  const onesPerShare = Math.floor(onesToShare / divisor);

  return {
    key,
    display: `${dividend} ÷ ${divisor}`,
    prompt: 'Work out the division. Enter the quotient first and the remainder second.',
    structuredResponse: { kind: 'number-pair', firstLabel: 'Quotient', secondLabel: 'Remainder' },
    answer: JSON.stringify([String(quotient), String(remainder)]),
    hint: 'Share the tens first. Change any leftover tens into ones before you share the ones.',
    workedSteps: [
      { text: `Start with ${tens} tens. Share them equally among ${divisor} groups.`, equation: `${tens} ÷ ${divisor} = ${tensPerShare} R ${leftoverTens}` },
      { text: 'Change the leftover tens into ones and add the ones digit.', equation: `${leftoverTens} × 10 + ${ones} = ${onesToShare}` },
      { text: 'Share these ones. The ones left over are the remainder.', equation: `${onesToShare} ÷ ${divisor} = ${onesPerShare} R ${remainder}` },
      { text: 'Combine the tens and ones in each group to find the quotient.', equation: `${tensPerShare} × 10 + ${onesPerShare} = ${quotient}` },
    ],
    explanation: `Each group gets ${quotient}, with ${remainder} left over. This accounts for the whole number because ${divisor} × ${quotient} + ${remainder} = ${dividend}. The remainder is smaller than ${divisor}.`,
  };
}
