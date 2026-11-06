import { Rng, hashString } from '../../engine/random';
import type { Question } from '../generate';

export const RAG_PATTERN = {
  id: 'p1-rag-subtract-by-place-value',
  level: 1,
  title: 'Subtract by place value',
  objective: 'Subtract ones and tens, trading a ten when needed. Find the difference or its tens digit.',
  skillIds: ['P1.S.AS.05', 'P1.S.WN.02'],
  canonicalPatternId: 'p1-subtract-by-place-value',
};

const formats = ['across-ten', 'tens-digit', 'column'] as const;

export function makeRagQuestion(seed: number, index = 0): Question {
  const key = `${RAG_PATTERN.id}:${seed}:${index}`;
  const rng = new Rng(hashString(key));
  const slot = hashString(String(seed)) % formats.length + Math.trunc(index) % formats.length;
  const format = formats[(slot + formats.length) % formats.length];

  const topTens = rng.pick([3, 4, 5, 8, 9]);
  const bottomTens = format === 'across-ten' ? 0 : rng.int(1, topTens - 2);
  // In the digit question, copying the given ones digit must be a wrong answer.
  const possibleOnes = [2, 3, 4, 5, 6, 7, 8, 9].filter(
    d => format !== 'tens-digit' || 10 - d !== topTens - 1 - bottomTens,
  );
  const bottomOnes = rng.pick(possibleOnes);
  const trade = format !== 'column' || rng.chance(0.5);
  let topOnes = 0;
  if (format !== 'tens-digit') {
    topOnes = trade ? rng.int(0, bottomOnes - 1) : rng.int(bottomOnes, 9);
  }

  const start = 10 * topTens + topOnes;
  const take = 10 * bottomTens + bottomOnes;
  const tensLeft = topTens - Number(trade);
  const onesAvailable = topOnes + (trade ? 10 : 0);
  const tens = tensLeft - bottomTens;
  const ones = onesAvailable - bottomOnes;
  const difference = 10 * tens + ones;

  const workedSteps: NonNullable<Question['workedSteps']> = [];
  if (trade) {
    workedSteps.push({ text: 'Trade one ten for ten ones.', equation: `${start} = ${10 * tensLeft} + ${onesAvailable}` });
  }
  workedSteps.push({ text: 'Subtract the ones.', equation: `${onesAvailable} − ${bottomOnes} = ${ones}` });
  if (bottomTens > 0) {
    workedSteps.push({ text: 'Subtract the tens.', equation: `${tensLeft} − ${bottomTens} = ${tens}` });
  }
  workedSteps.push({ text: 'Put the tens and ones together.', equation: `${10 * tens} + ${ones} = ${difference}` });
  if (format === 'tens-digit') {
    workedSteps.push({ text: `In ${difference}, the digit in the tens place is ${tens}.` });
  }

  const base = {
    key,
    hint: 'Start with the ones. If you need more ones, trade one ten for ten ones.',
    workedSteps,
    explanation: workedSteps.map(s => [s.text, s.equation].filter(Boolean).join(' ')).join(' '),
  };
  const proof = { op: '-' as const, a: start, b: take };
  if (format === 'column') {
    return {
      ...base, prompt: 'Subtract down the columns. Write the answer as one number.',
      picture: {
        type: 'nanyang-p4', layout: 'table', caption: 'Subtract in columns',
        rowHeader: 'Step', columns: ['Tens', 'Ones'],
        rows: [
          { label: 'Start', values: [topTens, topOnes] },
          { label: 'Subtract (−)', values: [bottomTens, bottomOnes] },
          { label: 'Answer', values: [null, null] },
        ],
      },
      answer: String(difference), proof,
    };
  }
  if (format === 'tens-digit') {
    return {
      ...base, prompt: 'Which number goes in the tens box?',
      display: `${start} − ${take} = □ tens and ${ones} ${ones === 1 ? 'one' : 'ones'}`,
      choices: rng.shuffle([tens, ones, 10 * tens, 10 * ones]).map(String),
      answer: String(tens), proof: { op: '-', a: { op: '-', a: topTens, b: 1 }, b: bottomTens },
    };
  }
  return {
    ...base, prompt: 'Choose the number that belongs in the box.',
    display: `${start} − ${take} = □`,
    choices: rng.shuffle([difference, difference + 10, start, difference + 1]).map(String),
    answer: String(difference), proof,
  };
}
